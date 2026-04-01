const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const nvmrcPath = path.join(repoRoot, '.nvmrc');
const expectedVersion = fs.existsSync(nvmrcPath)
  ? fs.readFileSync(nvmrcPath, 'utf8').trim()
  : '20.18.1';

const actualVersion = process.versions.node || '';
const expectedMajor = expectedVersion.split('.')[0];
const actualMajor = actualVersion.split('.')[0];

if (expectedMajor && actualMajor === expectedMajor) {
  process.exit(0);
}

console.error([
  '',
  `Launchline requires Node ${expectedVersion}.`,
  `Current Node version: ${actualVersion}`,
  '',
  'Recommended fixes:',
  '  1. Run .\\scripts\\dev.ps1 from the repo root',
  `  2. Or run "nvm use ${expectedVersion}" before npm commands`,
  '  3. Or use a tool like Volta/fnm that honors the project pin',
  '',
].join('\n'));

process.exit(1);
