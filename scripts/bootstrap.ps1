param(
  [switch]$SkipPython
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$nvmrcPath = Join-Path $repoRoot '.nvmrc'
$nodeVersion = if (Test-Path $nvmrcPath) {
  (Get-Content $nvmrcPath -Raw).Trim()
} else {
  '24.14.1'
}

$env:NVM_HOME = if ($env:NVM_HOME) { $env:NVM_HOME } else { [Environment]::GetEnvironmentVariable('NVM_HOME', 'User') }
$env:NVM_SYMLINK = if ($env:NVM_SYMLINK) { $env:NVM_SYMLINK } else { [Environment]::GetEnvironmentVariable('NVM_SYMLINK', 'User') }

$nvmExe = if ($env:NVM_HOME) { Join-Path $env:NVM_HOME 'nvm.exe' } else { Join-Path $env:LOCALAPPDATA 'nvm\nvm.exe' }
$nodeBinDir = if ($env:NVM_SYMLINK) { $env:NVM_SYMLINK } else { 'C:\nvm4w\nodejs' }
$uvCmd = 'uv'

function Resolve-CommandPath {
  param(
    [string[]]$Names,
    [string[]]$PreferredPaths = @()
  )

  foreach ($candidate in $PreferredPaths) {
    if ($candidate -and (Test-Path $candidate)) {
      return $candidate
    }
  }

  foreach ($name in $Names) {
    try {
      $command = Get-Command $name -ErrorAction Stop | Select-Object -First 1
      if ($command -and $command.Source) {
        return $command.Source
      }
      if ($command -and $command.Path) {
        return $command.Path
      }
    } catch {
      continue
    }
  }

  return $null
}

if ($env:NVM_HOME -and -not ($env:Path -split ';' | Where-Object { $_ -eq $env:NVM_HOME })) {
  $env:Path = "$env:NVM_HOME;$env:Path"
}

if (-not ($env:Path -split ';' | Where-Object { $_ -eq $nodeBinDir })) {
  $env:Path = "$nodeBinDir;$env:Path"
}

if (Test-Path $nvmExe) {
  Write-Host "Selecting Node $nodeVersion with nvm..."
  & $nvmExe use $nodeVersion | Out-Host
}

$nodeExe = Resolve-CommandPath -Names @('node', 'node.exe') -PreferredPaths @(
  (Join-Path $nodeBinDir 'node.exe'),
  'C:\Program Files\nodejs\node.exe'
)

$npmCmd = Resolve-CommandPath -Names @('npm.cmd', 'npm') -PreferredPaths @(
  (Join-Path $nodeBinDir 'npm.cmd'),
  'C:\Program Files\nodejs\npm.cmd'
)

if (-not $nodeExe) {
  throw 'Node was not found after running nvm. Install Node 24.x or fix your NVM_SYMLINK configuration.'
}

if (-not $npmCmd) {
  throw 'npm was not found after running nvm. Install Node 24.x or fix your NVM_SYMLINK configuration.'
}

Set-Location $repoRoot

Write-Host 'Installing Node dependencies...'
& $npmCmd install

if (-not $SkipPython) {
  Write-Host 'Attempting Python dependency sync with uv...'
  try {
    & $uvCmd sync --python 3.13
  } catch {
    Write-Warning 'uv sync was skipped or failed. Install uv / Python 3.13 separately if you need Python Tools fully wired.'
  }
}

Write-Host 'Bootstrap complete.'
