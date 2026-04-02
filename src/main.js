/* """
main.js
----------------
Core Electron process manager for the Launchline app.
Orchestrates the frameless shell window, Python tooling, and
filesystem-backed Launchline persistence.
""" */

const { app, BrowserWindow, ipcMain, dialog, protocol, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const {
  createWorkspaceStorageId,
  ensureDir,
  readMigratedJson,
  writeJsonAtomic,
} = require('./shared/jsonStorage');
const {
  SETTINGS_DEFAULT,
  SETTINGS_SCHEMA_VERSION,
  deepMerge,
  normalizeSettings,
} = require('./shared/settingsSchema');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const APP_DISPLAY_NAME = 'Launchline';
const DEV_SERVER_PORT = process.env.PORT || '3001';
const DEV_SERVER_URL = `http://localhost:${DEV_SERVER_PORT}`;

app.setName(APP_DISPLAY_NAME);
if (process.platform === 'win32') {
  app.setAppUserModelId('com.launchline');
}
// ── Global Path Constants (Ground Truth) ──────────────────────────────────────
const ROOT_DIR = path.join(__dirname, '..');
const SCRIPTS_DIR = path.join(ROOT_DIR, 'scripts');
const ETL_DIR = path.join(SCRIPTS_DIR, 'etl');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const APP_DATA_ROOT_DIR = path.join(app.getPath('appData'), APP_DISPLAY_NAME);
const APP_RUNTIME_DIR = path.join(APP_DATA_ROOT_DIR, 'runtime');
const USER_DATA_DIR = path.join(APP_DATA_ROOT_DIR, 'user-data');
const SESSION_DATA_DIR = path.join(APP_RUNTIME_DIR, 'session-data');
const LOGS_DIR = path.join(APP_RUNTIME_DIR, 'logs');
const CRASH_DUMPS_DIR = path.join(APP_RUNTIME_DIR, 'crash-dumps');
const APP_STORAGE_DIR = path.join(APP_DATA_ROOT_DIR, 'storage');
const GLOBAL_STORAGE_DIR = path.join(APP_STORAGE_DIR, 'global');
const GLOBAL_SETTINGS_DIR = path.join(GLOBAL_STORAGE_DIR, 'settings');
const GLOBAL_STATE_DIR = path.join(GLOBAL_STORAGE_DIR, 'state');
const WORKSPACES_STORAGE_DIR = path.join(APP_STORAGE_DIR, 'workspaces');
const WORKSPACE_STORAGE_ID = createWorkspaceStorageId(ROOT_DIR);
const WORKSPACE_STORAGE_DIR = path.join(WORKSPACES_STORAGE_DIR, WORKSPACE_STORAGE_ID);
const WORKSPACE_STATE_DIR = path.join(WORKSPACE_STORAGE_DIR, 'state');
const WORKSPACE_HISTORY_DIR = path.join(WORKSPACE_STORAGE_DIR, 'history');
const WORKSPACE_SELECTION_PATH = path.join(GLOBAL_STATE_DIR, 'workspace-state.json');
const DEFAULT_WORKSPACE_STATE = {
  activeWorkspacePath: ROOT_DIR,
  recentWorkspacePaths: [ROOT_DIR],
  workspaceLoadedAt: {
    [ROOT_DIR]: Date.now(),
  },
};

for (const targetDir of [
  DATA_DIR,
  APP_DATA_ROOT_DIR,
  APP_RUNTIME_DIR,
  USER_DATA_DIR,
  SESSION_DATA_DIR,
  LOGS_DIR,
  CRASH_DUMPS_DIR,
  APP_STORAGE_DIR,
  GLOBAL_STORAGE_DIR,
  GLOBAL_SETTINGS_DIR,
  GLOBAL_STATE_DIR,
  WORKSPACES_STORAGE_DIR,
  WORKSPACE_STORAGE_DIR,
  WORKSPACE_STATE_DIR,
  WORKSPACE_HISTORY_DIR,
]) {
  ensureDir(targetDir);
}

app.setPath('userData', USER_DATA_DIR);
app.setPath('sessionData', SESSION_DATA_DIR);
app.setPath('logs', LOGS_DIR);
app.setPath('crashDumps', CRASH_DUMPS_DIR);

// ── Read .env / .env.local into an object (for subprocess env injection) ──────
function loadDotEnvVars() {
  const vars = {};
  for (const name of ['.env', '.env.local']) {
    const p = path.join(ROOT_DIR, name);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq < 1) continue;
      vars[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
    }
  }
  return vars;
}
const RAW_DIR  = path.join(DATA_DIR, 'raw');
const ASSETS_BASE_DIR = path.join(DATA_DIR, 'assets');
const ENTITY_ASSETS_DIR = path.join(ASSETS_BASE_DIR, 'entities');
const STAKEHOLDER_ASSETS_DIR = path.join(ASSETS_BASE_DIR, 'stakeholders');
const PYPROJECT_PATH = path.join(ROOT_DIR, 'pyproject.toml');
const LEGACY_APP_SETTINGS_DIR = path.join(APP_STORAGE_DIR, 'settings');
const LEGACY_APP_STATE_DIR = path.join(APP_STORAGE_DIR, 'state');
const LEGACY_APP_HISTORY_DIR = path.join(APP_STORAGE_DIR, 'history');
const SETTINGS_PATH = path.join(GLOBAL_SETTINGS_DIR, 'settings.json');
const LEGACY_SETTINGS_PATHS = [
  path.join(LEGACY_APP_SETTINGS_DIR, 'settings.json'),
  path.join(SCRIPTS_DIR, 'settings.json'),
];
const NAV_STATE_PATH = path.join(WORKSPACE_STATE_DIR, 'nav-state.json');
const LEGACY_NAV_STATE_PATHS = [
  path.join(LEGACY_APP_STATE_DIR, 'nav-state.json'),
  path.join(DATA_DIR, 'nav-state.json'),
];
const VENV_METADATA_PATH = path.join(WORKSPACE_STATE_DIR, 'venv-meta.json');
const LEGACY_VENV_METADATA_PATHS = [
  path.join(LEGACY_APP_STATE_DIR, 'venv-meta.json'),
  path.join(SCRIPTS_DIR, '.venv-meta.json'),
];
const RUN_HISTORY_PATH = path.join(WORKSPACE_HISTORY_DIR, 'run-history.json');
const LEGACY_RUN_HISTORY_PATHS = [
  path.join(LEGACY_APP_HISTORY_DIR, 'run-history.json'),
  path.join(ROOT_DIR, '.launchline-run-history.json'),
  path.join(ROOT_DIR, '.appcraft-run-history.json'),
];
const COMMAND_LOG_PATH = path.join(WORKSPACE_HISTORY_DIR, 'command-log.json');
const LEGACY_COMMAND_LOG_PATHS = [
  path.join(LEGACY_APP_HISTORY_DIR, 'command-log.json'),
  path.join(ROOT_DIR, '.launchline-command-log.json'),
  path.join(ROOT_DIR, '.appcraft-command-log.json'),
];
const HYGIENE_HISTORY_PATH = path.join(WORKSPACE_HISTORY_DIR, 'hygiene-history.json');
const LEGACY_HYGIENE_HISTORY_PATHS = [
  path.join(LEGACY_APP_HISTORY_DIR, 'hygiene-history.json'),
  path.join(ROOT_DIR, '.launchline-hygiene-history.json'),
  path.join(ROOT_DIR, '.appcraft-hygiene-history.json'),
];
const DICTIONARY_META_PATH = () => path.join(DATA_DIR, 'dictionaryMetadata.json');
const PYTHON_LIST_INSTALLED_PACKAGES_SCRIPT = [
  'import importlib.metadata as md, json',
  'packages = []',
  'seen = set()',
  'for dist in md.distributions():',
  '    name = (dist.metadata.get("Name") or "").strip()',
  '    if not name:',
  '        continue',
  '    key = name.lower()',
  '    if key in seen:',
  '        continue',
  '    seen.add(key)',
  '    packages.append({"name": name, "version": str(dist.version or "").strip()})',
  'print(json.dumps(packages))',
].join('\n');

let mainWindow = null;
let workspaceState = null;

function normalizeWorkspacePath(candidatePath) {
  if (!candidatePath) return null;
  return path.resolve(String(candidatePath));
}

function isInternalWorkspacePath(candidatePath) {
  return normalizeWorkspacePath(candidatePath) === path.resolve(ROOT_DIR);
}

function getWorkspaceScopedDirs(workspacePath) {
  const resolvedPath = normalizeWorkspacePath(workspacePath) || ROOT_DIR;
  const workspaceId = createWorkspaceStorageId(resolvedPath);
  const storageDir = path.join(WORKSPACES_STORAGE_DIR, workspaceId);
  const stateDir = path.join(storageDir, 'state');
  const historyDir = path.join(storageDir, 'history');
  ensureDir(storageDir);
  ensureDir(stateDir);
  ensureDir(historyDir);
  return { id: workspaceId, storageDir, stateDir, historyDir };
}

function buildWorkspaceDescriptor(workspacePath, loadedAtMap = workspaceState?.workspaceLoadedAt) {
  const resolvedPath = normalizeWorkspacePath(workspacePath) || ROOT_DIR;
  const isInternal = isInternalWorkspacePath(resolvedPath);
  const exists = fs.existsSync(resolvedPath);
  return {
    id: isInternal ? 'launchline-internal' : createWorkspaceStorageId(resolvedPath),
    path: resolvedPath,
    name: isInternal ? APP_DISPLAY_NAME : (path.basename(resolvedPath) || resolvedPath),
    exists,
    isInternal,
    kind: isInternal ? 'internal' : 'folder',
    loadedAt: Number(loadedAtMap?.[resolvedPath]) || null,
  };
}

function normalizeWorkspaceState(nextState) {
  const activeWorkspacePath = normalizeWorkspacePath(nextState?.activeWorkspacePath) || ROOT_DIR;
  const recentWorkspacePaths = [
    activeWorkspacePath,
    ...((Array.isArray(nextState?.recentWorkspacePaths) ? nextState.recentWorkspacePaths : [])
      .map(normalizeWorkspacePath)
      .filter(Boolean)),
  ].filter((value, index, values) => values.indexOf(value) === index).slice(0, 8);
  const workspaceLoadedAt = {};

  if (nextState?.workspaceLoadedAt && typeof nextState.workspaceLoadedAt === 'object') {
    for (const [rawPath, rawLoadedAt] of Object.entries(nextState.workspaceLoadedAt)) {
      const resolvedPath = normalizeWorkspacePath(rawPath);
      const numericLoadedAt = Number(rawLoadedAt);
      if (!resolvedPath || !Number.isFinite(numericLoadedAt) || numericLoadedAt <= 0) continue;
      workspaceLoadedAt[resolvedPath] = numericLoadedAt;
    }
  }

  if (Array.isArray(nextState?.recentWorkspaces)) {
    for (const entry of nextState.recentWorkspaces) {
      const resolvedPath = normalizeWorkspacePath(entry?.path || entry);
      const numericLoadedAt = Number(entry?.loadedAt);
      if (!resolvedPath || !Number.isFinite(numericLoadedAt) || numericLoadedAt <= 0) continue;
      workspaceLoadedAt[resolvedPath] = numericLoadedAt;
    }
  }

  const activeLoadedAt = Number(workspaceLoadedAt[activeWorkspacePath]);
  if (!Number.isFinite(activeLoadedAt) || activeLoadedAt <= 0) {
    workspaceLoadedAt[activeWorkspacePath] = Date.now();
  }

  return {
    activeWorkspacePath,
    recentWorkspacePaths,
    workspaceLoadedAt,
  };
}

function readWorkspaceState() {
  return normalizeWorkspaceState(readMigratedJson(WORKSPACE_SELECTION_PATH, [], DEFAULT_WORKSPACE_STATE));
}

function writeWorkspaceState(nextState) {
  workspaceState = normalizeWorkspaceState(nextState);
  writeJsonAtomic(WORKSPACE_SELECTION_PATH, workspaceState);
  return workspaceState;
}

function getActiveWorkspacePath() {
  if (!workspaceState) {
    workspaceState = readWorkspaceState();
  }
  return workspaceState.activeWorkspacePath;
}

function getActiveWorkspaceInfo() {
  const loadedAtMap = workspaceState?.workspaceLoadedAt || {};
  const activeWorkspace = buildWorkspaceDescriptor(getActiveWorkspacePath(), loadedAtMap);
  const recentWorkspaces = (workspaceState?.recentWorkspacePaths || [ROOT_DIR]).map((workspacePath) => buildWorkspaceDescriptor(workspacePath, loadedAtMap));
  return {
    activeWorkspace,
    recentWorkspaces,
    internalWorkspace: buildWorkspaceDescriptor(ROOT_DIR, loadedAtMap),
  };
}

function refreshWorkspaceBindings() {
  initCommandLog();
  if (mainWindow && !mainWindow.isDestroyed()) {
    setupHygieneWatcher(mainWindow);
    mainWindow.webContents.send('workspace:changed', getActiveWorkspaceInfo());
  }
}

function setActiveWorkspacePath(nextWorkspacePath) {
  const resolvedPath = normalizeWorkspacePath(nextWorkspacePath);
  const loadedAt = Date.now();
  if (!resolvedPath) {
    throw new Error('No workspace path provided.');
  }
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Workspace path does not exist: ${resolvedPath}`);
  }
  if (!fs.statSync(resolvedPath).isDirectory()) {
    throw new Error('Workspace path must be a directory.');
  }

  writeWorkspaceState({
    activeWorkspacePath: resolvedPath,
    recentWorkspacePaths: [resolvedPath, ...(workspaceState?.recentWorkspacePaths || [])],
    workspaceLoadedAt: {
      ...(workspaceState?.workspaceLoadedAt || {}),
      [resolvedPath]: loadedAt,
    },
  });
  refreshWorkspaceBindings();
  return getActiveWorkspaceInfo();
}

workspaceState = readWorkspaceState();

// ── Directory Guard ───────────────────────────────────────────────────────────
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log('✅ Created missing data directory at:', DATA_DIR);
  }
  // Ensure asset subdirectories exist
  if (!fs.existsSync(ENTITY_ASSETS_DIR)) fs.mkdirSync(ENTITY_ASSETS_DIR, { recursive: true });
  if (!fs.existsSync(STAKEHOLDER_ASSETS_DIR)) fs.mkdirSync(STAKEHOLDER_ASSETS_DIR, { recursive: true });
}

// ── Venv Python path (resolved after setup) ───────────────────────────────────
let venvPythonPath = null;

function getVenvPython() {
  if (venvPythonPath) return venvPythonPath;
  const isWin   = process.platform === 'win32';
  const guessed = isWin
    ? path.join(SCRIPTS_DIR, '.venv', 'Scripts', 'python.exe')
    : path.join(SCRIPTS_DIR, '.venv', 'bin', 'python');
  return fs.existsSync(guessed) ? guessed : null;
}

function getInterpreterPathForVenv(venvDir) {
  if (!venvDir) return null;
  const isWin = process.platform === 'win32';
  const guessed = isWin
    ? path.join(venvDir, 'Scripts', 'python.exe')
    : path.join(venvDir, 'bin', 'python');
  return fs.existsSync(guessed) ? guessed : null;
}

function getSitePackagesPathForVenv(venvDir) {
  if (!venvDir || !fs.existsSync(venvDir)) return null;
  const winSitePkgs = path.join(venvDir, 'Lib', 'site-packages');
  if (fs.existsSync(winSitePkgs)) return winSitePkgs;
  const libDir = path.join(venvDir, 'lib');
  if (fs.existsSync(libDir)) {
    for (const entry of fs.readdirSync(libDir)) {
      if (entry.startsWith('python')) {
        const sp = path.join(libDir, entry, 'site-packages');
        if (fs.existsSync(sp)) return sp;
      }
    }
  }
  return null;
}

function venvHasInstalledPackages(venvDir) {
  const sitePackagesPath = getSitePackagesPathForVenv(venvDir);
  if (!sitePackagesPath) return false;
  try {
    const entries = fs.readdirSync(sitePackagesPath);
    return entries.some((entry) => !['__pycache__', '_virtualenv.pth', '_virtualenv.py'].includes(entry));
  } catch {
    return false;
  }
}

function resolveProjectVenvDir(workspacePath = getActiveAnalysisRoot()) {
  const resolvedWorkspacePath = normalizeWorkspacePath(workspacePath) || ROOT_DIR;
  const rootVenvDir = path.join(resolvedWorkspacePath, '.venv');
  const scriptsVenvDir = path.join(getWorkspaceScriptsDir(resolvedWorkspacePath), '.venv');
  const candidates = isInternalWorkspacePath(resolvedWorkspacePath)
    ? [scriptsVenvDir, rootVenvDir]
    : [rootVenvDir, scriptsVenvDir];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && venvHasInstalledPackages(candidate)) return candidate;
  }
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return candidates[0];
}

async function setupVenv() {
  const existingVenvPython = getVenvPython();
  if (existingVenvPython) {
    venvPythonPath = existingVenvPython;
    return;
  }

  const setupScript = path.join(SCRIPTS_DIR, 'setup_venv.py');
  if (!fs.existsSync(setupScript)) {
    console.log('[venv] No startup setup script found. Skipping automatic venv setup.');
    return;
  }

  const systemPy    = await findPython();
  if (!systemPy) {
    console.warn('[venv] Python not found — skipping venv setup.');
    return;
  }
  return new Promise((resolve) => {
    let stdout = '';
    const proc = spawn(systemPy, [setupScript, SCRIPTS_DIR]);
    proc.stdout.on('data', d => {
      const line = d.toString();
      stdout += line;
      console.log('[venv]', line.trim());
      const match = line.match(/VENV_PYTHON=(.+)/);
      if (match) venvPythonPath = match[1].trim();
    });
    proc.stderr.on('data', d => console.error('[venv]', d.toString().trim()));
    proc.on('close', (code) => {
      if (code === 0) console.log('[venv] Setup complete. Python:', venvPythonPath);
      else console.warn('[venv] Setup exited with code', code);
      resolve();
    });
    proc.on('error', (err) => {
      console.warn('[venv] Setup error:', err.message);
      resolve();
    });
  });
}

function resolveSourceFile(file) {
  const candidate = path.normalize(path.join(ROOT_DIR, file));
  const rootWithSep = `${ROOT_DIR}${path.sep}`;
  if (candidate !== ROOT_DIR && !candidate.startsWith(rootWithSep)) {
    throw new Error('Requested source file is outside the project root.');
  }
  return candidate;
}

function findSymbolStart(source, symbol) {
  const escaped = symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(`export\\s+default\\s+function\\s+${escaped}\\s*\\(`, 'm'),
    new RegExp(`export\\s+function\\s+${escaped}\\s*\\(`, 'm'),
    new RegExp(`function\\s+${escaped}\\s*\\(`, 'm'),
    new RegExp(`export\\s+const\\s+${escaped}\\s*=`, 'm'),
    new RegExp(`const\\s+${escaped}\\s*=`, 'm'),
    new RegExp(`export\\s+let\\s+${escaped}\\s*=`, 'm'),
    new RegExp(`let\\s+${escaped}\\s*=`, 'm'),
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(source);
    if (match) return match.index;
  }

  return -1;
}

function extractSymbolSnippet(source, symbol) {
  if (!symbol) return source;

  const startIndex = findSymbolStart(source, symbol);
  if (startIndex < 0) return source;

  const openBraceIndex = source.indexOf('{', startIndex);
  if (openBraceIndex < 0) return source.slice(startIndex).trim();

  let depth = 0;
  let quote = null;
  let escape = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = openBraceIndex; index < source.length; index += 1) {
    const char = source[index];
    const nextChar = source[index + 1];

    if (lineComment) {
      if (char === '\n') lineComment = false;
      continue;
    }

    if (blockComment) {
      if (char === '*' && nextChar === '/') {
        blockComment = false;
        index += 1;
      }
      continue;
    }

    if (quote) {
      if (escape) {
        escape = false;
        continue;
      }
      if (char === '\\') {
        escape = true;
        continue;
      }
      if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === '/' && nextChar === '/') {
      lineComment = true;
      index += 1;
      continue;
    }

    if (char === '/' && nextChar === '*') {
      blockComment = true;
      index += 1;
      continue;
    }

    if (char === '\'' || char === '"' || char === '`') {
      quote = char;
      continue;
    }

    if (char === '{') {
      depth += 1;
      continue;
    }

    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return source.slice(startIndex, index + 1).trim();
      }
    }
  }

  return source.slice(startIndex).trim();
}

ipcMain.handle('dev:read-source-snippet', async (event, { file, symbol }) => {
  try {
    if (!file) {
      return { ok: false, error: 'No source file was provided.' };
    }

    const sourcePath = resolveSourceFile(file);
    if (!fs.existsSync(sourcePath)) {
      return { ok: false, error: `Source file not found: ${file}` };
    }

    const source = fs.readFileSync(sourcePath, 'utf8');
    const code = extractSymbolSnippet(source, symbol);

    return {
      ok: true,
      file,
      symbol: symbol || null,
      code,
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// ── IPC: Settings ─────────────────────────────────────────────────────────────
function readSettings() {
  try {
    const saved = readMigratedJson(SETTINGS_PATH, LEGACY_SETTINGS_PATHS, SETTINGS_DEFAULT);
    const normalized = normalizeSettings(saved, {
      appDisplayName: APP_DISPLAY_NAME,
      sharedPythonProject: getSharedPythonProjectSnapshot(),
    });
    if (!fs.existsSync(SETTINGS_PATH)) writeSettings(normalized);
    return normalized;
  } catch {
    return normalizeSettings(SETTINGS_DEFAULT, { appDisplayName: APP_DISPLAY_NAME });
  }
}

function getActiveAnalysisRoot() {
  return getActiveWorkspacePath();
}

function getWorkspaceStatePaths(workspacePath = getActiveWorkspacePath()) {
  return getWorkspaceScopedDirs(workspacePath);
}

function getInternalLegacyPaths(legacyPaths, workspacePath) {
  return isInternalWorkspacePath(workspacePath) ? legacyPaths : [];
}

function getActiveVenvMetadataPath(workspacePath = getActiveWorkspacePath()) {
  return path.join(getWorkspaceStatePaths(workspacePath).stateDir, 'venv-meta.json');
}

function getActiveCommandLogPath(workspacePath = getActiveWorkspacePath()) {
  return path.join(getWorkspaceStatePaths(workspacePath).historyDir, 'command-log.json');
}

function getActiveRunHistoryPath(workspacePath = getActiveWorkspacePath()) {
  return path.join(getWorkspaceStatePaths(workspacePath).historyDir, 'run-history.json');
}

function getActiveHygieneHistoryPath() {
  return path.join(getWorkspaceScopedDirs(getActiveWorkspacePath()).historyDir, 'hygiene-history.json');
}

function getWorkspaceScriptsDir(workspacePath = getActiveAnalysisRoot()) {
  return path.join(normalizeWorkspacePath(workspacePath) || ROOT_DIR, 'scripts');
}

function getWorkspaceDependencySourcePaths(workspacePath = getActiveAnalysisRoot()) {
  const resolvedWorkspacePath = normalizeWorkspacePath(workspacePath) || ROOT_DIR;
  const requirementsCandidates = [
    path.join(resolvedWorkspacePath, 'requirements.txt'),
    path.join(resolvedWorkspacePath, 'requirements-dev.txt'),
    path.join(resolvedWorkspacePath, 'requirements.in'),
    path.join(resolvedWorkspacePath, 'requirements', 'base.txt'),
    path.join(resolvedWorkspacePath, 'requirements', 'dev.txt'),
    path.join(getWorkspaceScriptsDir(resolvedWorkspacePath), 'etl', 'requirements.txt'),
  ];

  return {
    workspaceRoot: resolvedWorkspacePath,
    scriptsDir: getWorkspaceScriptsDir(resolvedWorkspacePath),
    pyprojectPath: path.join(resolvedWorkspacePath, 'pyproject.toml'),
    uvLockPath: path.join(resolvedWorkspacePath, 'uv.lock'),
    requirementsPath: requirementsCandidates.find((candidate) => fs.existsSync(candidate)) || requirementsCandidates[0],
  };
}

function writeSettings(settings) {
  writeJsonAtomic(SETTINGS_PATH, normalizeSettings(settings, {
    appDisplayName: APP_DISPLAY_NAME,
    sharedPythonProject: getSharedPythonProjectSnapshot(),
  }));
}

function buildStorageInfo() {
  const analysisWorkspace = getActiveWorkspaceInfo().activeWorkspace;
  const analysisWorkspaceStorage = getWorkspaceScopedDirs(analysisWorkspace.path);
  return {
    appName: APP_DISPLAY_NAME,
    schemaVersion: SETTINGS_SCHEMA_VERSION,
    workspace: {
      id: analysisWorkspaceStorage.id,
      rootPath: analysisWorkspace.path,
      storagePath: analysisWorkspaceStorage.storageDir,
      statePath: analysisWorkspaceStorage.stateDir,
      historyPath: analysisWorkspaceStorage.historyDir,
    },
    global: {
      appDataRoot: APP_DATA_ROOT_DIR,
      storagePath: APP_STORAGE_DIR,
      settingsPath: SETTINGS_PATH,
    },
    runtime: {
      runtimePath: APP_RUNTIME_DIR,
      userDataPath: USER_DATA_DIR,
      sessionDataPath: SESSION_DATA_DIR,
      logsPath: LOGS_DIR,
      crashDumpsPath: CRASH_DUMPS_DIR,
    },
    analysisWorkspace,
    internalWorkspace: buildWorkspaceDescriptor(ROOT_DIR),
  };
}

function exportSettingsToFile(targetPath) {
  const normalized = readSettings();
  writeJsonAtomic(targetPath, normalized);
  return { ok: true, path: targetPath };
}

function importSettingsFromFile(sourcePath) {
  if (!sourcePath || !fs.existsSync(sourcePath)) {
    return { ok: false, error: 'Selected settings file was not found.' };
  }

  const raw = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'Settings import expects a JSON object.' };
  }

  const normalized = normalizeSettings(deepMerge(SETTINGS_DEFAULT, raw), {
    appDisplayName: APP_DISPLAY_NAME,
    sharedPythonProject: getSharedPythonProjectSnapshot(),
  });
  writeSettings(normalized);
  return { ok: true, settings: normalized, path: sourcePath };
}

ipcMain.handle('settings:read',  async () => readSettings());
ipcMain.handle('settings:write', async (event, settings) => {
  try { writeSettings(settings); return { error: null }; }
  catch (err) { return { error: err.message }; }
});
ipcMain.handle('settings:storage-info', async () => buildStorageInfo());
ipcMain.handle('settings:export', async () => {
  try {
    const defaultPath = path.join(app.getPath('documents'), 'launchline-settings.json');
    const result = await dialog.showSaveDialog({
      title: 'Export Launchline settings',
      defaultPath,
      filters: [{ name: 'JSON Files', extensions: ['json'] }],
    });
    if (result.canceled || !result.filePath) return { ok: false, canceled: true };
    return exportSettingsToFile(result.filePath);
  } catch (err) {
    return { ok: false, error: err.message };
  }
});
ipcMain.handle('settings:import', async () => {
  try {
    const result = await dialog.showOpenDialog({
      title: 'Import Launchline settings',
      properties: ['openFile'],
      filters: [{ name: 'JSON Files', extensions: ['json'] }],
    });
    if (result.canceled || !result.filePaths?.[0]) return { ok: false, canceled: true };
    return importSettingsFromFile(result.filePaths[0]);
  } catch (err) {
    return { ok: false, error: err.message };
  }
});
ipcMain.handle('settings:reset', async () => {
  try {
    const resetSettings = normalizeSettings(SETTINGS_DEFAULT, {
      appDisplayName: APP_DISPLAY_NAME,
      sharedPythonProject: getSharedPythonProjectSnapshot(),
    });
    writeSettings(resetSettings);
    return { ok: true, settings: resetSettings };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// ── IPC: Workspace state ──────────────────────────────────────────────────────
ipcMain.handle('workspace:get-state', async () => getActiveWorkspaceInfo());
ipcMain.handle('workspace:pick-folder', async () => {
  try {
    const result = await dialog.showOpenDialog({
      title: 'Choose a workspace to analyze',
      defaultPath: getActiveWorkspacePath(),
      properties: ['openDirectory'],
    });
    if (result.canceled || !result.filePaths?.[0]) return { ok: false, canceled: true };
    return { ok: true, state: setActiveWorkspacePath(result.filePaths[0]) };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});
ipcMain.handle('workspace:set-active', async (event, workspacePath) => {
  try {
    return { ok: true, state: setActiveWorkspacePath(workspacePath) };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});
ipcMain.handle('workspace:use-internal', async () => {
  try {
    return { ok: true, state: setActiveWorkspacePath(ROOT_DIR) };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// ── IPC: Navigation state ─────────────────────────────────────────────────────
ipcMain.handle('nav:get-last-page', async () => {
  try {
    const payload = readMigratedJson(NAV_STATE_PATH, LEGACY_NAV_STATE_PATHS, { lastPage: null });
    return payload?.lastPage || null;
  } catch {}
  return null;
});

ipcMain.handle('nav:set-last-page', async (event, pageId) => {
  try {
    ensureDataDir();
    writeJsonAtomic(NAV_STATE_PATH, { lastPage: pageId });
  } catch {}
});

ipcMain.handle('shell:open-path', async (event, filePath) => {
  const errMsg = await shell.openPath(filePath);
  return errMsg || null; // empty string means success; non-empty is an error message
});

async function findPython() {
  const candidates = ['python', 'python3', 'py'];
  for (const cmd of candidates) {
    try {
      await new Promise((resolve, reject) => {
        const p = spawn(cmd, ['--version']);
        p.on('close', (code) => code === 0 ? resolve() : reject());
        p.on('error', reject);
      });
      return cmd;
    } catch { continue; }
  }
  return null;
}

const PYTHON_COMMAND_LOG_LIMIT = 150;
const PYTHON_COMMAND_LOG = [];

function initCommandLog() {
  PYTHON_COMMAND_LOG.length = 0;
  try {
    const parsed = readMigratedJson(
      getActiveCommandLogPath(),
      getInternalLegacyPaths(LEGACY_COMMAND_LOG_PATHS, getActiveWorkspacePath()),
      []
    );
    if (Array.isArray(parsed)) {
      // Only restore persisted (non-probe) entries; probes are session-only
      PYTHON_COMMAND_LOG.push(...parsed.slice(0, PYTHON_COMMAND_LOG_LIMIT));
    }
  } catch {}
}

function appendPythonCommandLog(entry) {
  PYTHON_COMMAND_LOG.unshift({
    id: `pycmd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ...entry,
  });
  if (PYTHON_COMMAND_LOG.length > PYTHON_COMMAND_LOG_LIMIT) {
    PYTHON_COMMAND_LOG.length = PYTHON_COMMAND_LOG_LIMIT;
  }
  // Persist run/action entries to disk (probes are session-only noise)
    if (entry.source === 'run' || entry.source === 'action') {
      try {
        const toSave = PYTHON_COMMAND_LOG.filter((e) => e.source === 'run' || e.source === 'action');
        writeJsonAtomic(getActiveCommandLogPath(), toSave.slice(0, PYTHON_COMMAND_LOG_LIMIT));
      } catch {}
    }
  }

// ── Run History (persisted JSON log) ─────────────────────────────────────────
const RUN_HISTORY_LIMIT = 200;

function loadRunHistory() {
  try {
    const parsed = readMigratedJson(
      getActiveRunHistoryPath(),
      getInternalLegacyPaths(LEGACY_RUN_HISTORY_PATHS, getActiveWorkspacePath()),
      []
    );
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function appendRunHistory(entry) {
  try {
    const history = loadRunHistory();
    history.unshift(entry);
    if (history.length > RUN_HISTORY_LIMIT) history.length = RUN_HISTORY_LIMIT;
    writeJsonAtomic(getActiveRunHistoryPath(), history);
  } catch (err) {
    console.warn('[run-history] Failed to write run history:', err.message);
  }
}

function runCommandCapture(command, args = [], options = {}) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    let stdout = '';
    let stderr = '';
    const cwd = options.cwd || ROOT_DIR;
    const env = options.env ? { ...process.env, ...options.env } : process.env;
    const commandString = [command, ...(args || [])].filter(Boolean).join(' ');

    const proc = spawn(command, args, { cwd, env });
    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });
    proc.on('close', (code) => {
      const result = {
        ok: code === 0,
        code,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      };
      appendPythonCommandLog({
        source: options.source || 'probe',
        label: options.label || null,
        cwd,
        command: commandString,
        ok: result.ok,
        code: result.code,
        stdout: stripAnsi(result.stdout),
        stderr: stripAnsi(result.stderr),
        startedAt,
        finishedAt: Date.now(),
        durationMs: Date.now() - startedAt,
      });
      resolve(result);
    });
    proc.on('error', (error) => {
      const result = {
        ok: false,
        code: -1,
        stdout: '',
        stderr: error.message,
      };
      appendPythonCommandLog({
        source: options.source || 'probe',
        label: options.label || null,
        cwd,
        command: commandString,
        ok: false,
        code: -1,
        stdout: '',
        stderr: stripAnsi(error.message),
        startedAt,
        finishedAt: Date.now(),
        durationMs: Date.now() - startedAt,
      });
      resolve(result);
    });
  });
}

function parseTomlStringArray(content, fieldName) {
  const match = content.match(new RegExp(`${fieldName}\\s*=\\s*\\[((?:.|\\r|\\n)*?)\\]`, 'm'));
  if (!match) return [];
  return match[1]
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line)
    .map((line) => line.replace(/,$/, '').trim())
    .filter((line) => line.startsWith('"') && line.endsWith('"'))
    .map((line) => line.slice(1, -1));
}

function parseTomlScalar(content, fieldName) {
  const match = content.match(new RegExp(`${fieldName}\\s*=\\s*"([^"]*)"`, 'm'));
  return match ? match[1] : '';
}

function parseDependencyGroups(content) {
  const groupsMatch = content.match(/\[dependency-groups\]([\s\S]*?)(\n\[|$)/m);
  if (!groupsMatch) return {};
  const section = groupsMatch[1];
  const result = {};
  const pattern = /([A-Za-z0-9_-]+)\s*=\s*\[((?:.|\r|\n)*?)\]/g;
  let match;
  while ((match = pattern.exec(section)) !== null) {
    const groupName = match[1];
    const values = match[2]
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line)
      .map((line) => line.replace(/,$/, '').trim())
      .filter((line) => line.startsWith('"') && line.endsWith('"'))
      .map((line) => line.slice(1, -1));
    result[groupName] = values;
  }
  return result;
}

function formatTomlArray(values) {
  if (!Array.isArray(values) || values.length === 0) return '[]';
  return `[\n${values.map((value) => `  "${value}",`).join('\n')}\n]`;
}

function readPythonProjectConfig(workspacePath = getActiveAnalysisRoot()) {
  const workspaceRoot = normalizeWorkspacePath(workspacePath) || ROOT_DIR;
  const workspaceName = path.basename(workspaceRoot) || 'workspace';
  const { pyprojectPath, requirementsPath } = getWorkspaceDependencySourcePaths(workspaceRoot);

  if (!fs.existsSync(pyprojectPath)) {
    return {
      exists: false,
      metadata: {
        name: workspaceName,
        version: '0.1.0',
        description: isInternalWorkspacePath(workspaceRoot)
          ? 'uv-managed Python workspace for Launchline utilities and local data tooling.'
          : `Python workspace configuration for ${workspaceName}.`,
        requiresPython: '>=3.12',
      },
      dependencies: [],
      groups: {},
    };
  }

  const content = fs.readFileSync(pyprojectPath, 'utf8');
  const stat = fs.statSync(pyprojectPath);
  const buildBackendMatch = content.match(/\[build-system\][\s\S]*?build-backend\s*=\s*"([^"]+)"/m);
  const dependencies = parseTomlStringArray(content, 'dependencies');
  const groups = parseDependencyGroups(content);
  return {
    exists: true,
    mtime: stat.mtime?.toISOString() || null,
    buildBackend: buildBackendMatch?.[1] || null,
    metadata: {
      name: parseTomlScalar(content, 'name') || workspaceName,
      version: parseTomlScalar(content, 'version') || '0.1.0',
      description: parseTomlScalar(content, 'description') || '',
      requiresPython: parseTomlScalar(content, 'requires-python') || '>=3.12',
    },
    dependencies,
    groups,
    dependencyCount: dependencies.length,
    groupCounts: Object.fromEntries(Object.entries(groups).map(([k, v]) => [k, v.length])),
    requirementsPath: fs.existsSync(requirementsPath) ? requirementsPath : null,
  };
}

function buildPythonProjectToml(config, workspacePath = getActiveAnalysisRoot()) {
  const { requirementsPath, workspaceRoot } = getWorkspaceDependencySourcePaths(workspacePath);
  const relativeRequirementsPath = fs.existsSync(requirementsPath)
    ? path.relative(workspaceRoot, requirementsPath).replace(/\\/g, '/')
    : 'requirements.txt';
  const metadata = config.metadata || {};
  const dependencies = Array.isArray(config.dependencies) ? config.dependencies : [];
  const groups = config.groups || {};

  const orderedGroupNames = Object.keys(groups).sort((a, b) => a.localeCompare(b));

  return `[project]
name = "${metadata.name || 'launchline-python-tools'}"
version = "${metadata.version || '0.1.0'}"
description = "${(metadata.description || '').replace(/"/g, '\\"')}"
requires-python = "${metadata.requiresPython || '>=3.12'}"
dependencies = ${formatTomlArray(dependencies)}

[dependency-groups]
${orderedGroupNames.map((groupName) => `${groupName} = ${formatTomlArray(groups[groupName])}`).join('\n')}

[tool.uv]
package = false

[tool.launchline]
workspace-root = "."
python-dir = "."
requirements-fallback = "${relativeRequirementsPath}"
`;
}

function tokenizeCommand(command) {
  if (!command || typeof command !== 'string') return [];
  const matches = command.match(/"[^"]*"|'[^']*'|\S+/g) || [];
  return matches.map((token) => token.replace(/^['"]|['"]$/g, ''));
}

function resolveAllowedExecutable(commandToken, workspaceRoot = getActiveAnalysisRoot()) {
  if (!commandToken) {
    throw new Error('No command token provided.');
  }

  if (['uv', 'python', 'python3', 'py'].includes(commandToken)) {
    return commandToken;
  }

  const resolvedWorkspaceRoot = normalizeWorkspacePath(workspaceRoot) || ROOT_DIR;
  const candidate = path.normalize(path.join(resolvedWorkspaceRoot, commandToken));
  const rootWithSep = `${resolvedWorkspaceRoot}${path.sep}`;
  if (candidate !== resolvedWorkspaceRoot && !candidate.startsWith(rootWithSep)) {
    throw new Error('Command is outside the selected workspace.');
  }

  const baseName = path.basename(candidate).toLowerCase();
  if (!['python', 'python.exe', 'uv', 'uv.exe'].includes(baseName)) {
    throw new Error('Only uv and Python executables are allowed from the tool runner.');
  }

  return candidate;
}

function stripAnsi(value) {
  return String(value || '').replace(/\u001b\[[0-9;]*m/g, '');
}

async function findCommandPath(commandToken) {
  const locator = process.platform === 'win32' ? 'where' : 'which';
  const result = await runCommandCapture(locator, [commandToken], {
    source: 'probe',
    label: `Locate ${commandToken}`,
  });
  if (!result.ok) {
    return null;
  }
  const firstMatch = (result.stdout || result.stderr || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
  return firstMatch || null;
}

async function getAvailablePythonRuntimes() {
  const runtimes = [];
  const seenPaths = new Set();

  async function addRuntimeCandidate({ runtimePath, label, source, isDefault = false }) {
    const normalizedPath = runtimePath ? path.normalize(runtimePath).toLowerCase() : null;
    if (normalizedPath && seenPaths.has(normalizedPath)) {
      return;
    }

    let resolvedVersion = null;
    let resolvedBuild = null;
    let probeOk = false;
    let probeError = null;
    if (runtimePath) {
      const probe = await runCommandCapture(runtimePath, ['--version'], {
        source: 'probe',
        label: 'Inspect available Python runtime',
      });
      probeOk = !!probe?.ok;
      if (probe.ok) {
        const cleaned = stripAnsi(probe.stdout || probe.stderr);
        const match = cleaned.match(/^Python\s+(.+)$/i);
        resolvedVersion = (match?.[1] || cleaned || '').trim() || null;

        const detailedProbe = await runCommandCapture(runtimePath, ['-VV'], {
          source: 'probe',
          label: 'Inspect available Python runtime build',
        });
        if (detailedProbe?.ok) {
          const detailedText = stripAnsi(detailedProbe.stdout || detailedProbe.stderr);
          const detailedLines = detailedText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
          const primaryLine = detailedLines[0] || '';
          const buildMatch = primaryLine.match(/^Python\s+[^\s]+\s*(.*)$/i);
          const buildParts = [
            (buildMatch?.[1] || '').trim(),
            ...detailedLines.slice(1),
          ].filter(Boolean);
          resolvedBuild = buildParts.join(' | ') || null;
        }
      } else {
        probeError = stripAnsi(probe?.stderr || probe?.stdout || 'Unable to inspect runtime');
      }
    }

    const runtime = {
      label: label || (resolvedVersion ? `Python ${resolvedVersion}` : 'Python runtime'),
      version: resolvedVersion,
      build: resolvedBuild,
      path: runtimePath || null,
      source: source || 'system',
      isDefault: Boolean(isDefault),
      ok: probeOk,
      error: probeError,
    };

    runtimes.push(runtime);
    if (normalizedPath) {
      seenPaths.add(normalizedPath);
    }
  }

  if (process.platform === 'win32') {
    const pyLauncher = await findCommandPath('py');
    if (pyLauncher) {
      const pyList = await runCommandCapture('py', ['-0p'], {
        source: 'probe',
        label: 'Discover available Python runtimes',
      });
      if (pyList.ok) {
        const lines = stripAnsi(pyList.stdout || pyList.stderr)
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean);

        for (const line of lines) {
          const pathMatch = line.match(/([A-Za-z]:\\.*)$/);
          if (!pathMatch) continue;
          const runtimePath = pathMatch[1].trim();
          const descriptor = line.slice(0, line.lastIndexOf(runtimePath)).replace(/\*/g, '').trim();
          await addRuntimeCandidate({
            runtimePath,
            label: descriptor || 'Python launcher runtime',
            source: 'py launcher',
            isDefault: /\*/.test(line),
          });
        }
      }
    }
  }

  const defaultPython = await findPython();
  if (defaultPython && defaultPython !== 'py' && runtimes.length === 0) {
    const defaultPythonPath = await findCommandPath(defaultPython);
    await addRuntimeCandidate({
      runtimePath: defaultPythonPath,
      label: `Default ${defaultPython}`,
      source: 'default command',
      isDefault: true,
    });
  }

  const defaultRuntime =
    runtimes.find((runtime) => runtime.isDefault) ||
    runtimes[0] ||
    null;

  return {
    checkedAt: new Date().toISOString(),
    count: runtimes.length,
    preview: runtimes
      .slice(0, 6)
      .map((runtime) => {
        const baseLabel = runtime.version ? `Python ${runtime.version}` : runtime.label;
        return runtime.ok ? baseLabel : `${baseLabel} (unverified)`;
      }),
    defaultRuntime,
    runtimes,
  };
}

function getSharedPythonProjectSnapshot() {
  const workspaceRoot = getActiveAnalysisRoot();
  const { pyprojectPath, uvLockPath, requirementsPath, scriptsDir } = getWorkspaceDependencySourcePaths(workspaceRoot);
  const resolvedVenvDir = resolveProjectVenvDir(workspaceRoot);
  const interpreterPath = getInterpreterPathForVenv(resolvedVenvDir)
    || (isInternalWorkspacePath(workspaceRoot) ? getVenvPython() : null);

  let requirementPackages = [];
  if (fs.existsSync(requirementsPath)) {
    requirementPackages = fs.readFileSync(requirementsPath, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'));
  }

  // Use readPythonProjectConfig for rich pyproject.toml parsing (deps + groups)
  const projectConfig = fs.existsSync(pyprojectPath) ? readPythonProjectConfig() : null;
  const pyprojectPackages = projectConfig?.dependencies || [];
  const pyprojectGroups = projectConfig?.groups || {};

  const allDeclaredPackages = [...requirementPackages, ...pyprojectPackages];

  // Classify version constraints
  function classifySpec(spec) {
    const s = String(spec).split(';')[0].trim();
    if (/==/.test(s)) return 'pinned';
    if (/[><=!~]/.test(s)) return 'ranged';
    return 'unconstrained';
  }
  const allSpecs = allDeclaredPackages;
  const constraintSummary = {
    pinned: allSpecs.filter((s) => classifySpec(s) === 'pinned').length,
    ranged: allSpecs.filter((s) => classifySpec(s) === 'ranged').length,
    unconstrained: allSpecs.filter((s) => classifySpec(s) === 'unconstrained').length,
  };

  // Sync: packages only in one source (skip if either source is absent)
  const reqNameSet = new Set(requirementPackages.map(parseRequirementName).filter(Boolean));
  const projNameSet = new Set(pyprojectPackages.map(parseRequirementName).filter(Boolean));
  const onlyInRequirements = requirementPackages
    .filter((p) => { const n = parseRequirementName(p); return n && !projNameSet.has(n); });
  const onlyInPyproject = pyprojectPackages
    .filter((p) => { const n = parseRequirementName(p); return n && !reqNameSet.has(n); });

  return {
    workspace: buildWorkspaceDescriptor(workspaceRoot),
    paths: {
      projectRoot: workspaceRoot,
      scriptsDir: fs.existsSync(scriptsDir) ? scriptsDir : null,
      venvDir: resolvedVenvDir,
      interpreterPath: interpreterPath || null,
      requirementsPath: fs.existsSync(requirementsPath) ? requirementsPath : null,
      pyprojectPath: fs.existsSync(pyprojectPath) ? pyprojectPath : null,
      uvLockPath: fs.existsSync(uvLockPath) ? uvLockPath : null,
    },
    files: {
      hasVenv: fs.existsSync(resolvedVenvDir),
      hasRequirements: fs.existsSync(requirementsPath),
      hasPyproject: fs.existsSync(pyprojectPath),
      hasUvLock: fs.existsSync(uvLockPath),
    },
    dependencySummary: {
      // legacy fields (kept for backward compat)
      requirementsCount: requirementPackages.length,
      packages: allDeclaredPackages,
      // split sources
      requirementsPackages: requirementPackages,
      pyprojectPackages,
      pyprojectGroups,
      // constraint analysis
      constraintSummary,
      // sync analysis (only meaningful when both sources exist)
      onlyInRequirements,
      onlyInPyproject,
    },
  };
}

function parseRequirementName(spec) {
  return String(spec || '')
    .replace(/\s*#.*$/, '')
    .trim()
    .match(/^[A-Za-z0-9_.-]+/)?.[0]
    ?.toLowerCase() || null;
}

function parseLockfilePackages(lockfilePath) {
  if (!lockfilePath || !fs.existsSync(lockfilePath)) return [];
  try {
    const content = fs.readFileSync(lockfilePath, 'utf8');
    return content.split('[[package]]').slice(1).map((chunk) => {
      const name = chunk.match(/\nname\s*=\s*"([^"]+)"/)?.[1];
      const version = chunk.match(/\nversion\s*=\s*"([^"]+)"/)?.[1];
      return name ? { name: name.toLowerCase(), version: version || '' } : null;
    }).filter(Boolean);
  } catch {
    return [];
  }
}

function getSitePackagesPath(interpreterPath) {
  if (!interpreterPath) return null;
  const venvRoot = path.dirname(path.dirname(interpreterPath));
  const winSitePkgs = path.join(venvRoot, 'Lib', 'site-packages');
  if (fs.existsSync(winSitePkgs)) return winSitePkgs;
  const libDir = path.join(venvRoot, 'lib');
  if (fs.existsSync(libDir)) {
    for (const entry of fs.readdirSync(libDir)) {
      if (entry.startsWith('python')) {
        const sp = path.join(libDir, entry, 'site-packages');
        if (fs.existsSync(sp)) return sp;
      }
    }
  }
  return null;
}

function getPackageDistInfo(sitePackagesPath, name, version) {
  try {
    const normalizedName = name.replace(/-/g, '_');
    const distInfoDir = path.join(sitePackagesPath, `${normalizedName}-${version}.dist-info`);
    let sizeBytes = null;
    let summary = null;
    let homepage = null;
    let requiresPython = null;
    const recordPath = path.join(distInfoDir, 'RECORD');
    if (fs.existsSync(recordPath)) {
      let total = 0;
      for (const line of fs.readFileSync(recordPath, 'utf8').split('\n')) {
        const parts = line.trim().split(',');
        if (parts.length >= 3) {
          const size = parseInt(parts[2], 10);
          if (!isNaN(size)) total += size;
        }
      }
      if (total > 0) sizeBytes = total;
    }
    const metadataPath = path.join(distInfoDir, 'METADATA');
    if (fs.existsSync(metadataPath)) {
      for (const line of fs.readFileSync(metadataPath, 'utf8').split('\n')) {
        const trimmed = line.trim();
        if (!summary && trimmed.startsWith('Summary:')) {
          summary = trimmed.slice('Summary:'.length).trim() || null;
        } else if (!homepage && trimmed.startsWith('Home-page:')) {
          const url = trimmed.slice('Home-page:'.length).trim();
          if (url && url !== 'UNKNOWN') homepage = url;
        } else if (!homepage && trimmed.startsWith('Project-URL:')) {
          const rest = trimmed.slice('Project-URL:'.length).trim();
          const commaIdx = rest.indexOf(',');
          if (commaIdx !== -1) {
            const label = rest.slice(0, commaIdx).trim().toLowerCase();
            const url = rest.slice(commaIdx + 1).trim();
            if (['homepage', 'home', 'source', 'source code', 'repository'].includes(label) && url && url !== 'UNKNOWN') {
              homepage = url;
            }
          }
        } else if (!requiresPython && trimmed.startsWith('Requires-Python:')) {
          requiresPython = trimmed.slice('Requires-Python:'.length).trim() || null;
        }
      }
    }
    return { sizeBytes, summary, homepage, requiresPython };
  } catch {
    return { sizeBytes: null, summary: null, homepage: null, requiresPython: null };
  }
}

function getDirectorySize(targetDir) {
  if (!targetDir || !fs.existsSync(targetDir)) return 0;

  const stat = fs.statSync(targetDir);
  if (stat.isFile()) return stat.size;

  let total = 0;
  for (const entry of fs.readdirSync(targetDir, { withFileTypes: true })) {
    const entryPath = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      total += getDirectorySize(entryPath);
    } else if (entry.isFile()) {
      total += fs.statSync(entryPath).size;
    }
  }
  return total;
}

function readVenvMetadata(workspacePath = getActiveWorkspacePath()) {
  try {
    return readMigratedJson(
      getActiveVenvMetadataPath(workspacePath),
      getInternalLegacyPaths(LEGACY_VENV_METADATA_PATHS, workspacePath),
      null
    );
  } catch {
    return null;
  }
}

function writeVenvMetadata(metadata, workspacePath = getActiveWorkspacePath()) {
  try {
    writeJsonAtomic(getActiveVenvMetadataPath(workspacePath), metadata);
  } catch {}
}

function deleteVenvMetadata(workspacePath = getActiveWorkspacePath()) {
  try {
    const metadataPath = getActiveVenvMetadataPath(workspacePath);
    if (fs.existsSync(metadataPath)) {
      fs.rmSync(metadataPath, { force: true });
    }
  } catch {}
}

async function getVirtualEnvironmentDetails(shared) {
  const venvLocation = shared.paths.venvDir || null;
  const interpreterExists = !!(shared.paths.interpreterPath && fs.existsSync(shared.paths.interpreterPath));
  const venvDetected = shared.files.hasVenv;
  const venvStat = venvDetected && venvLocation && fs.existsSync(venvLocation)
    ? fs.statSync(venvLocation)
    : null;

  const interpreterProbe = interpreterExists
    ? await runCommandCapture(shared.paths.interpreterPath, ['--version'], {
        source: 'probe',
        label: 'Check virtual environment interpreter',
      })
    : null;

  const uvPathForPackageProbe = interpreterExists ? await findCommandPath('uv') : null;
  const lockfileStat = shared.files.hasUvLock && shared.paths.uvLockPath ? (() => { try { return fs.statSync(shared.paths.uvLockPath); } catch { return null; } })() : null;

  const [packageProbe, outdatedProbe, lockStaleProbe] = await Promise.all([
    interpreterExists
      ? runCommandCapture(shared.paths.interpreterPath, ['-c', PYTHON_LIST_INSTALLED_PACKAGES_SCRIPT], {
          source: 'probe',
          label: 'Check virtual environment packages',
        })
      : Promise.resolve(null),
    interpreterExists && uvPathForPackageProbe
      ? runCommandCapture(uvPathForPackageProbe, ['pip', 'list', '--outdated', '--format=json', '--python', shared.paths.interpreterPath], {
          source: 'probe',
          label: 'Check outdated packages',
        })
      : Promise.resolve(null),
    shared.files.hasUvLock && uvPathForPackageProbe
      ? runCommandCapture(uvPathForPackageProbe, ['lock', '--check'], {
          source: 'probe',
          label: 'Check lockfile staleness',
        })
      : Promise.resolve(null),
  ]);

  const outdatedMap = new Map();
  if (outdatedProbe?.ok) {
    try {
      const parsed = JSON.parse(outdatedProbe.stdout || '[]');
      for (const item of parsed) {
        if (item?.name) outdatedMap.set(item.name.toLowerCase(), String(item.latest_version || '').trim());
      }
    } catch {
      // uv may emit plain-text for --outdated; parse "Package  Version  Latest  Type" table
      for (const line of (outdatedProbe.stdout || '').split('\n').slice(2)) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 3) outdatedMap.set(parts[0].toLowerCase(), parts[2]);
      }
    }
  }

  const expectedPackages = (shared.dependencySummary?.packages || [])
    .map(parseRequirementName)
    .filter(Boolean);
  const directPackageSet = new Set(expectedPackages);

  let packageCount = null;
  let installedPackageNames = [];
  let packages = [];
  if (packageProbe?.ok) {
    try {
      const parsed = JSON.parse(packageProbe.stdout || '[]');
      if (Array.isArray(parsed)) {
        const sitePackagesPath = interpreterExists ? getSitePackagesPath(shared.paths.interpreterPath) : null;
        packageCount = parsed.length;
        installedPackageNames = parsed
          .map((item) => String(item?.name || '').trim().toLowerCase())
          .filter(Boolean);
        packages = parsed
          .filter((item) => item?.name)
          .map((item) => {
            const nameLower = String(item.name).toLowerCase();
            const distInfo = sitePackagesPath ? getPackageDistInfo(sitePackagesPath, item.name, item.version) : {};
            return {
              name: String(item.name).trim(),
              version: String(item.version || '').trim(),
              sizeBytes: distInfo.sizeBytes ?? null,
              summary: distInfo.summary ?? null,
              homepage: distInfo.homepage ?? null,
              requiresPython: distInfo.requiresPython ?? null,
              direct: directPackageSet.has(nameLower),
              latestVersion: outdatedMap.get(nameLower) ?? null,
            };
          });
      }
    } catch {
      packageCount = null;
    }
  }

  let syncStatus = 'Not available';
  const hasDependencySource = shared.files.hasRequirements || shared.files.hasPyproject;
  const pythonSignalsDetected = hasDependencySource || venvDetected;
  const sourceLabel = shared.files.hasRequirements && shared.files.hasPyproject
    ? 'requirements.txt + pyproject.toml'
    : shared.files.hasPyproject
        ? 'pyproject.toml'
        : 'requirements.txt';

  if (!pythonSignalsDetected) {
    syncStatus = 'No Python project signals yet';
  } else if (!venvDetected) {
    syncStatus = 'Environment missing';
  } else if (!hasDependencySource) {
    syncStatus = 'No dependency source';
  } else if (!packageProbe?.ok) {
    syncStatus = 'Unable to verify';
  } else if (expectedPackages.length === 0) {
    syncStatus = shared.files.hasPyproject ? 'Managed by pyproject.toml' : 'No declared dependencies';
  } else {
    const installedSet = new Set(installedPackageNames);
    const missingPackages = expectedPackages.filter((pkg) => !installedSet.has(pkg));
    syncStatus = missingPackages.length === 0
      ? `Aligned with ${sourceLabel}`
      : `${missingPackages.length} package(s) missing from ${sourceLabel}`;
  }

  const warnings = [];
  if (!pythonSignalsDetected) {
    warnings.push('No pyproject.toml, requirements.txt, or .venv detected in this workspace.');
  }
  if (!venvDetected) {
    warnings.push('Environment folder is missing.');
  }
  if (venvDetected && !interpreterExists) {
    warnings.push('Interpreter is missing from the environment.');
  }
  if (venvDetected && interpreterExists && !packageProbe?.ok) {
    warnings.push('Installed packages could not be inspected.');
  }
  if (venvDetected && shared.files.hasUvLock && syncStatus !== 'Managed by pyproject.toml' && !syncStatus.startsWith('Aligned')) {
    warnings.push('Lockfile exists, but the environment may not be synchronized.');
  }
  if (venvDetected && shared.files.hasPyproject && !shared.files.hasUvLock) {
    warnings.push('pyproject.toml exists without uv.lock.');
  }

  const metadata = readVenvMetadata();

  return {
    detected: venvDetected,
    location: venvLocation,
    interpreterPath: interpreterExists ? shared.paths.interpreterPath : null,
    interpreterVersion: interpreterProbe?.ok ? stripAnsi(interpreterProbe.stdout || interpreterProbe.stderr) : null,
    packageCount,
    packages,
    lastUpdated: venvStat?.mtime ? venvStat.mtime.toISOString() : null,
    lastChecked: new Date().toISOString(),
    sizeBytes: venvDetected ? getDirectorySize(venvLocation) : null,
    syncStatus,
    healthWarnings: warnings,
    creationMethod: metadata?.createdWith || 'Unknown',
    lockfile: (() => {
      if (!shared.files.hasUvLock) return { present: false };
      const lockfilePackages = parseLockfilePackages(shared.paths.uvLockPath);
      const installedSet = new Set(installedPackageNames);
      const lockfileSet = new Set(lockfilePackages.map((p) => p.name));
      const notInstalledPackages = lockfilePackages.filter((p) => !installedSet.has(p.name)).map((p) => p.name);
      const extraPackages = installedPackageNames.filter((n) => !lockfileSet.has(n));
      return {
        present: true,
        mtime: lockfileStat?.mtime?.toISOString() || null,
        stale: lockStaleProbe ? !lockStaleProbe.ok : null,
        packageCount: lockfilePackages.length || null,
        notInstalledCount: notInstalledPackages.length,
        notInstalledPackages,
        extraInEnvCount: extraPackages.length,
        extraPackages,
      };
    })(),
    error: venvDetected ? null : 'Virtual environment not found',
  };
}

ipcMain.handle('python:uv-status', async () => {
  try {
    const uvVersion = await runCommandCapture('uv', ['--version'], {
      source: 'probe',
      label: 'Check uv installation',
    });
    const uvPath = uvVersion.ok ? await findCommandPath('uv') : null;
    const uvSelfVersion = uvVersion.ok ? await runCommandCapture('uv', ['self', 'version'], {
      source: 'probe',
      label: 'Check uv version in use',
    }) : null;

    const cleanUvVersion = stripAnsi(uvVersion.ok ? (uvVersion.stdout || uvVersion.stderr) : '');
    const cleanUvSelfVersion = stripAnsi(uvSelfVersion?.ok ? (uvSelfVersion.stdout || uvSelfVersion.stderr) : '');

    return {
      ok: true,
      manager: {
        installed: uvVersion.ok,
        version: cleanUvSelfVersion || cleanUvVersion || null,
        path: uvPath,
        error: uvVersion.ok ? null : (uvVersion.stderr || 'uv not found'),
      },
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('python:python-status', async () => {
  try {
    const shared = getSharedPythonProjectSnapshot();
    const available = await getAvailablePythonRuntimes();
    const defaultRuntime = available.defaultRuntime;
    const fallbackCommand = (await findPython()) || 'python';
    const activePython = defaultRuntime?.path
      ? await runCommandCapture(defaultRuntime.path, ['-VV'], {
          source: 'probe',
          label: 'Check default system Python',
        })
      : await runCommandCapture(fallbackCommand, ['-VV'], {
          source: 'probe',
          label: 'Check system Python',
        });

    const cleanPythonVersion = stripAnsi(activePython.ok ? (activePython.stdout || activePython.stderr) : '');

    return {
      ok: true,
      python: {
        installed: activePython.ok,
        version: activePython.ok ? cleanPythonVersion : null,
        path: defaultRuntime?.path || null,
        defaultRuntime,
        availableRuntimes: available,
        checkedAt: new Date().toISOString(),
        error: activePython.ok ? null : (activePython.stderr || 'Python not found'),
      },
      paths: shared.paths,
      files: shared.files,
      dependencySummary: shared.dependencySummary,
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('python:venv-status', async () => {
  try {
    const shared = getSharedPythonProjectSnapshot();

    return {
      ok: true,
      venv: await getVirtualEnvironmentDetails(shared),
      paths: shared.paths,
      files: shared.files,
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('python:available-runtimes', async () => {
  try {
    return {
      ok: true,
      availableRuntimes: await getAvailablePythonRuntimes(),
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('python:dependency-summary', async () => {
  try {
    const shared = getSharedPythonProjectSnapshot();
    return {
      ok: true,
      dependencySummary: shared.dependencySummary,
      paths: shared.paths,
      files: shared.files,
    };
  } catch (err) {
    console.error('[dep-summary] error:', err.message, err.stack);
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('python:create-venv', async (event, payload) => {
  try {
    const shared = getSharedPythonProjectSnapshot();
    const workspaceRoot = shared.paths.projectRoot || getActiveAnalysisRoot();
    const targetDir = shared.paths.venvDir;
    const requestedRuntimePath = payload?.runtimePath ? path.normalize(String(payload.runtimePath)) : null;
    const requestedRuntimeVersion = payload?.runtimeVersion ? String(payload.runtimeVersion) : null;

    if (shared.files.hasVenv && shared.paths.interpreterPath && fs.existsSync(shared.paths.interpreterPath)) {
      return {
        ok: true,
        alreadyExists: true,
        method: null,
        venv: await getVirtualEnvironmentDetails(shared),
        paths: shared.paths,
        files: shared.files,
      };
    }

    let result = null;
    let method = null;
    const requestedRuntimeAvailable = requestedRuntimePath ? fs.existsSync(requestedRuntimePath) : true;
    if (requestedRuntimePath && !requestedRuntimeAvailable) {
      return { ok: false, error: `Requested Python runtime is not available: ${requestedRuntimePath}` };
    }

    const uvPath = await findCommandPath('uv');
    if (uvPath) {
      method = 'uv';
      const args = ['venv'];
      if (requestedRuntimePath) {
        args.push('--python', requestedRuntimePath);
      }
      args.push(targetDir);
      result = await runCommandCapture('uv', args, {
        source: 'action',
        label: 'Create virtual environment',
        cwd: workspaceRoot,
      });
    } else {
      const pythonCommand = requestedRuntimePath || await findPython();
      if (!pythonCommand) {
        return { ok: false, error: 'Neither uv nor Python is available to create a virtual environment.' };
      }
      method = 'python';
      result = await runCommandCapture(pythonCommand, ['-m', 'venv', targetDir], {
        source: 'action',
        label: 'Create virtual environment',
        cwd: workspaceRoot,
      });
    }

    writeVenvMetadata({
      createdWith: requestedRuntimeVersion ? `${method}:${requestedRuntimeVersion}` : method,
      lastAction: 'create',
      updatedAt: new Date().toISOString(),
    });

    const refreshed = getSharedPythonProjectSnapshot();
    if (refreshed.paths.interpreterPath && fs.existsSync(refreshed.paths.interpreterPath)) {
      venvPythonPath = refreshed.paths.interpreterPath;
    }

    return {
      ok: !!result?.ok,
      method,
      result,
      venv: await getVirtualEnvironmentDetails(refreshed),
      paths: refreshed.paths,
      files: refreshed.files,
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('python:rebuild-venv', async (event, payload) => {
  try {
    const shared = getSharedPythonProjectSnapshot();
    const workspaceRoot = shared.paths.projectRoot || getActiveAnalysisRoot();
    const targetDir = shared.paths.venvDir;
    const startedAt = Date.now();
    const requestedRuntimePath = payload?.runtimePath ? path.normalize(String(payload.runtimePath)) : null;
    const requestedRuntimeVersion = payload?.runtimeVersion ? String(payload.runtimeVersion) : null;

    if (shared.files.hasVenv) {
      fs.rmSync(targetDir, { recursive: true, force: true });
      appendPythonCommandLog({
        source: 'action',
        label: 'Rebuild virtual environment',
        cwd: workspaceRoot,
        command: `remove ${targetDir}`,
        ok: true,
        code: 0,
        stdout: `Removed existing virtual environment at ${targetDir}`,
        stderr: '',
        startedAt,
        finishedAt: Date.now(),
        durationMs: Date.now() - startedAt,
      });
    }
    deleteVenvMetadata();

    let result = null;
    let method = null;
    const requestedRuntimeAvailable = requestedRuntimePath ? fs.existsSync(requestedRuntimePath) : true;
    if (requestedRuntimePath && !requestedRuntimeAvailable) {
      return { ok: false, error: `Requested Python runtime is not available: ${requestedRuntimePath}` };
    }

    const uvPath = await findCommandPath('uv');
    if (uvPath) {
      method = 'uv';
      const args = ['venv'];
      if (requestedRuntimePath) {
        args.push('--python', requestedRuntimePath);
      }
      args.push(targetDir);
      result = await runCommandCapture('uv', args, {
        source: 'action',
        label: 'Rebuild virtual environment',
        cwd: workspaceRoot,
      });
    } else {
      const pythonCommand = requestedRuntimePath || await findPython();
      if (!pythonCommand) {
        return { ok: false, error: 'Neither uv nor Python is available to rebuild a virtual environment.' };
      }
      method = 'python';
      result = await runCommandCapture(pythonCommand, ['-m', 'venv', targetDir], {
        source: 'action',
        label: 'Rebuild virtual environment',
        cwd: workspaceRoot,
      });
    }

    writeVenvMetadata({
      createdWith: requestedRuntimeVersion ? `${method}:${requestedRuntimeVersion}` : method,
      lastAction: 'rebuild',
      updatedAt: new Date().toISOString(),
    });

    const refreshed = getSharedPythonProjectSnapshot();
    if (refreshed.paths.interpreterPath && fs.existsSync(refreshed.paths.interpreterPath)) {
      venvPythonPath = refreshed.paths.interpreterPath;
    }

    return {
      ok: !!result?.ok,
      method,
      result,
      venv: await getVirtualEnvironmentDetails(refreshed),
      paths: refreshed.paths,
      files: refreshed.files,
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('python:delete-venv', async () => {
  try {
    const shared = getSharedPythonProjectSnapshot();
    const workspaceRoot = shared.paths.projectRoot || getActiveAnalysisRoot();
    const targetDir = shared.paths.venvDir;
    const startedAt = Date.now();

    if (shared.files.hasVenv) {
      fs.rmSync(targetDir, { recursive: true, force: true });
      appendPythonCommandLog({
        source: 'action',
        label: 'Delete virtual environment',
        cwd: workspaceRoot,
        command: `remove ${targetDir}`,
        ok: true,
        code: 0,
        stdout: `Removed virtual environment at ${targetDir}`,
        stderr: '',
        startedAt,
        finishedAt: Date.now(),
        durationMs: Date.now() - startedAt,
      });
    }

    deleteVenvMetadata();
    venvPythonPath = null;

    const refreshed = getSharedPythonProjectSnapshot();
    return {
      ok: true,
      venv: await getVirtualEnvironmentDetails(refreshed),
      paths: refreshed.paths,
      files: refreshed.files,
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('python:sync-venv', async () => {
  try {
    const shared = getSharedPythonProjectSnapshot();
    const workspaceRoot = shared.paths.projectRoot || getActiveAnalysisRoot();
    if (!shared.files.hasVenv || !shared.paths.interpreterPath || !fs.existsSync(shared.paths.interpreterPath)) {
      return { ok: false, error: 'Virtual environment is missing, so it cannot be synchronized.' };
    }

    let result = null;
    let method = null;
    const uvPath = await findCommandPath('uv');

      if (uvPath && shared.files.hasPyproject) {
        method = 'uv';
        result = await runCommandCapture('uv', ['sync', '--active'], {
          source: 'action',
          label: 'Sync virtual environment',
          cwd: workspaceRoot,
          env: {
            VIRTUAL_ENV: shared.paths.venvDir,
          },
      });
    } else if (shared.files.hasRequirements) {
      method = 'pip';
        result = await runCommandCapture(shared.paths.interpreterPath, ['-m', 'pip', 'install', '-r', shared.paths.requirementsPath], {
          source: 'action',
          label: 'Sync virtual environment',
          cwd: workspaceRoot,
        });
    } else {
      return { ok: false, error: 'No pyproject.toml or requirements.txt source is available for sync.' };
    }

    const refreshed = getSharedPythonProjectSnapshot();
    return {
      ok: !!result?.ok,
      method,
      result,
      venv: await getVirtualEnvironmentDetails(refreshed),
      paths: refreshed.paths,
      files: refreshed.files,
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('python:secrets-status', async (event, payload) => {
  try {
    const workspaceRoot = getActiveAnalysisRoot();
    const expectedVars = Array.isArray(payload?.expectedVars)
      ? [...new Set(payload.expectedVars.map((item) => String(item || '').trim()).filter(Boolean))]
      : [];

    // ── File metadata ──────────────────────────────────────────────────────────
    const MULTI_ENV_NAMES = ['.env.test', '.env.production', '.env.staging', '.env.development'];
    const ENV_LIKE = new Set(['.env', '.env.local', '.env.example', ...MULTI_ENV_NAMES]);
    const getFileMeta = (name) => {
      const filePath = path.join(workspaceRoot, name);
      const exists = fs.existsSync(filePath);
      if (!exists) return { exists: false, path: null, mtimeMs: null, varCount: null };
      const stat = fs.statSync(filePath);
      let varCount = null;
      if (ENV_LIKE.has(name)) {
        varCount = fs
          .readFileSync(filePath, 'utf8')
          .split(/\r?\n/)
          .filter((l) => { const t = l.trim(); return t && !t.startsWith('#') && t.includes('='); })
          .length;
      }
      return { exists: true, path: filePath, mtimeMs: stat.mtimeMs, varCount };
    };

    const rootFiles = ['.env', '.env.local', '.env.example', '.gitignore', ...MULTI_ENV_NAMES];
    const files = Object.fromEntries(rootFiles.map((name) => [name, getFileMeta(name)]));

    // ── .gitignore matching ────────────────────────────────────────────────────
    let gitignoreText = '';
    if (files['.gitignore']?.exists) {
      gitignoreText = fs.readFileSync(files['.gitignore'].path, 'utf8');
    }
    const gitignoreLines = gitignoreText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'));
    const matchesIgnore = (candidate) =>
      gitignoreLines.some((line) => line === candidate || line === `${candidate}/` || line === `${candidate}*` || line === '*env' || line === '*.env');

    // ── Git availability check ────────────────────────────────────────────────
    // Run `git --version` once. If the binary is missing or not in PATH the
    // history checks below are skipped entirely and gitAvailable is returned so
    // the UI can show a clear "git not installed" message instead of silence.
    const gitAvailable = await new Promise((resolve) => {
      try {
        const p = spawn('git', ['--version']);
        p.on('close', (code) => resolve(code === 0));
        p.on('error', () => resolve(false));
      } catch { resolve(false); }
    });

    // ── Git history exposure check ─────────────────────────────────────────────
    // Returns { found, hitCount, firstCommit, lastCommit } or null if git unavailable.
    const gitLogCheck = (fileName) =>
      new Promise((resolve) => {
        let settled = false;
        const done = (val) => { if (!settled) { settled = true; resolve(val); } };
        const timer = setTimeout(() => done(null), 5000);
        try {
          // tformat appends a terminating newline after every entry so groups-of-3 split is safe.
          const proc = spawn('git', ['log', '--format=tformat:%H%n%ai%n%s', '--', fileName], {
            cwd: workspaceRoot,
          });
          let out = '';
          proc.stdout.on('data', (d) => { out += d.toString(); });
          proc.on('close', () => {
            clearTimeout(timer);
            const lines = out.trim().split('\n').filter(Boolean);
            if (lines.length === 0) { done({ found: false }); return; }
            const commits = [];
            for (let i = 0; i + 2 < lines.length; i += 3) {
              commits.push({
                hash:    lines[i].trim().slice(0, 7),
                date:    lines[i + 1].trim(),
                message: lines[i + 2].trim(),
              });
            }
            if (commits.length === 0) { done({ found: false }); return; }
            done({
              found:       true,
              hitCount:    commits.length,
              lastCommit:  commits[0],
              firstCommit: commits[commits.length - 1],
            });
          });
          proc.on('error', () => { clearTimeout(timer); done(null); });
        } catch { clearTimeout(timer); done(null); }
      });

    const GIT_HISTORY_FILES = ['.env', '.env.local', ...MULTI_ENV_NAMES];
    const gitHistoryResults = gitAvailable
      ? await Promise.all(GIT_HISTORY_FILES.map((f) => gitLogCheck(f)))
      : GIT_HISTORY_FILES.map(() => null);
    const gitHistoryMap = Object.fromEntries(GIT_HISTORY_FILES.map((f, i) => [f, gitHistoryResults[i]]));

    // ── Template drift detection ───────────────────────────────────────────────
    const extractEnvKeys = (filePath) => {
      try {
        return [
          ...new Set(
            fs.readFileSync(filePath, 'utf8')
              .split(/\r?\n/)
              .map((l) => l.trim())
              .filter((l) => l && !l.startsWith('#') && l.includes('='))
              .map((l) => l.slice(0, l.indexOf('=')).trim())
              .filter(Boolean)
          ),
        ];
      } catch { return []; }
    };

    let drift = null;
    if (files['.env'].exists && files['.env.example'].exists) {
      const envKeys = new Set(extractEnvKeys(files['.env'].path));
      const exKeys  = new Set(extractEnvKeys(files['.env.example'].path));
      drift = {
        inEnvNotExample: [...envKeys].filter((k) => !exKeys.has(k)),
        inExampleNotEnv: [...exKeys].filter((k) => !envKeys.has(k)),
      };
    }

    // ── Duplicate key detection ───────────────────────────────────────────────
    const findDuplicateKeys = (filePath) => {
      try {
        const keys = fs.readFileSync(filePath, 'utf8')
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter((l) => l && !l.startsWith('#') && l.includes('='))
          .map((l) => l.slice(0, l.indexOf('=')).trim())
          .filter(Boolean);
        const seen = new Set();
        const dupes = new Set();
        for (const k of keys) { if (seen.has(k)) dupes.add(k); seen.add(k); }
        return [...dupes];
      } catch { return []; }
    };

    // ── Suspicious values in .env.example ────────────────────────────────────
    const SECRET_PATTERNS = [
      { regex: /^sk-proj-[A-Za-z0-9_-]{20,}$/,  label: 'OpenAI project key'              },
      { regex: /^sk-[A-Za-z0-9]{20,}$/,          label: 'OpenAI API key'                  },
      { regex: /^ghp_[A-Za-z0-9]{36,}$/,         label: 'GitHub personal access token'    },
      { regex: /^ghs_[A-Za-z0-9]{36,}$/,         label: 'GitHub Actions token'            },
      { regex: /^gho_[A-Za-z0-9]{36,}$/,         label: 'GitHub OAuth token'              },
      { regex: /^github_pat_[A-Za-z0-9_]{59,}$/, label: 'GitHub fine-grained PAT'         },
      { regex: /^AIza[0-9A-Za-z_-]{35}$/,        label: 'Google API key'                  },
      { regex: /^AKIA[0-9A-Z]{16}$/,             label: 'AWS access key ID'               },
      { regex: /^sk_live_[A-Za-z0-9]{24,}$/,     label: 'Stripe live secret key'          },
      { regex: /^sk_test_[A-Za-z0-9]{24,}$/,     label: 'Stripe test secret key'          },
      { regex: /^xoxb-[0-9A-Za-z-]{40,}$/,       label: 'Slack bot token'                 },
      { regex: /^xoxp-[0-9A-Za-z-]{40,}$/,       label: 'Slack user token'                },
      { regex: /^EAA[A-Za-z0-9]{80,}$/,          label: 'Meta / Facebook access token'    },
      { regex: /^[0-9a-fA-F]{40}$/,              label: 'SHA-1 hex token (40 chars)'      },
      { regex: /^[0-9a-fA-F]{64}$/,              label: 'SHA-256 hex token (64 chars)'    },
    ];

    const PLACEHOLDER_RE = /^(<[^>]+>|\$\{[^}]+\}|your[_\-]|YOUR[_\-]|MY[_\-]|example|EXAMPLE|placeholder|PLACEHOLDER|changeme|CHANGEME|xxx|XXX|todo|TODO|\.{3,})$/i;

    const scanExampleForLeaks = (filePath) => {
      try {
        const leaks = [];
        for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
          const stripped = line.trim();
          if (!stripped || stripped.startsWith('#')) continue;
          const eqIdx = stripped.indexOf('=');
          if (eqIdx === -1) continue;
          const key   = stripped.slice(0, eqIdx).trim();
          const value = stripped.slice(eqIdx + 1).trim();
          if (!value || PLACEHOLDER_RE.test(value)) continue;
          for (const { regex, label } of SECRET_PATTERNS) {
            if (regex.test(value)) { leaks.push({ key, label }); break; }
          }
        }
        return leaks;
      } catch { return []; }
    };

    // ── File permission check (non-Windows only) ──────────────────────────────
    const checkFilePermission = (filePath) => {
      if (process.platform === 'win32') return null;
      try {
        const mode = fs.statSync(filePath).mode;
        if (mode & 0o004) return 'world-readable';
        if (mode & 0o020) return 'group-writable';
        return null;
      } catch { return null; }
    };

    // ── Source file walker (shared by unused-var + hardcoded-secret scans) ──────
    const SRC_EXTS   = new Set(['.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs', '.py', '.vue', '.svelte']);
    const SKIP_DIRS  = new Set(['node_modules', '.git', 'dist', 'build', '.venv', '__pycache__', '.next', '.nuxt', 'coverage', '.cache', '.parcel-cache', 'out', '.output']);
    const walkSrc = (dir, acc = [], depth = 0) => {
      if (depth > 10) return acc;
      try {
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
          if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) walkSrc(path.join(dir, e.name), acc, depth + 1); }
          else if (e.isFile() && SRC_EXTS.has(path.extname(e.name))) acc.push(path.join(dir, e.name));
        }
      } catch (_) {}
      return acc;
    };

    // ── Empty value detection ─────────────────────────────────────────────────
    // Returns keys whose value is blank (KEY= with nothing after the equals sign).
    const findEmptyKeys = (filePath) => {
      try {
        return fs.readFileSync(filePath, 'utf8')
          .split(/\r?\n/)
          .filter((l) => { const t = l.trim(); return t && !t.startsWith('#') && t.includes('='); })
          .filter((l) => l.slice(l.indexOf('=') + 1).trim() === '')
          .map((l) => l.slice(0, l.indexOf('=')).trim())
          .filter(Boolean);
      } catch { return []; }
    };

    // ── Naming convention check ───────────────────────────────────────────────
    // Flags keys that don't follow SCREAMING_SNAKE_CASE.
    const SCREAMING_RE = /^[A-Z][A-Z0-9_]*$/;
    const findBadNameKeys = (filePath) => {
      try {
        return fs.readFileSync(filePath, 'utf8')
          .split(/\r?\n/)
          .filter((l) => { const t = l.trim(); return t && !t.startsWith('#') && t.includes('='); })
          .map((l) => l.slice(0, l.indexOf('=')).trim())
          .filter((k) => k && !SCREAMING_RE.test(k));
      } catch { return []; }
    };

    // ── Unused variable scan ──────────────────────────────────────────────────
    // Collects all keys from .env + .env.local, then scans source files for
    // references via process.env.KEY / import.meta.env.KEY (JS/TS) or
    // os.environ / os.getenv (Python).  Dynamic access (process.env[name])
    // cannot be statically detected and is noted in the UI.
    const scanUnusedVars = () => {
      const primaryFiles = ['.env', '.env.local'].filter((n) => files[n]?.exists);
      const allKeys = [...new Set(primaryFiles.flatMap((n) => extractEnvKeys(files[n].path)))];
      if (allKeys.length === 0) return { unused: [], scannedFiles: 0 };
      const srcFiles = walkSrc(workspaceRoot);
      const referenced = new Set();
      const JS_RE = /(?:process\.env|import\.meta\.env)\.([A-Z_][A-Z0-9_]*)/g;
      const PY_RE = /os\.(?:environ(?:\.get)?|getenv)\s*[\[(]['"]([A-Z_][A-Z0-9_]*)['"]/g;
      for (const fp of srcFiles) {
        try {
          const stat = fs.statSync(fp);
          if (stat.size > 500_000) continue;
          const content = fs.readFileSync(fp, 'utf8');
          const re = path.extname(fp) === '.py' ? PY_RE : JS_RE;
          re.lastIndex = 0;
          let m;
          while ((m = re.exec(content)) !== null) referenced.add(m[1]);
        } catch (_) {}
      }
      return { unused: allKeys.filter((k) => !referenced.has(k)), scannedFiles: srcFiles.length };
    };

    // ── Hardcoded secrets scan ────────────────────────────────────────────────
    // Scans source files for literal credential values — high-precision token
    // prefix patterns plus a generic credential-assignment pattern requiring a
    // 20+ char value to reduce false positives.  Lines that already read from
    // process.env / os.environ are skipped.
    const HC_PATTERNS = [
      { re: /['"`](sk-proj-[A-Za-z0-9_-]{20,})['"`]/,       label: 'OpenAI project key'       },
      { re: /['"`](sk-[A-Za-z0-9]{20,})['"`]/,              label: 'OpenAI API key'            },
      { re: /['"`](ghp_[A-Za-z0-9]{36,})['"`]/,             label: 'GitHub PAT'                },
      { re: /['"`](ghs_[A-Za-z0-9]{36,})['"`]/,             label: 'GitHub Actions token'      },
      { re: /['"`](github_pat_[A-Za-z0-9_]{59,})['"`]/,     label: 'GitHub fine-grained PAT'   },
      { re: /['"`](AKIA[0-9A-Z]{16})['"`]/,                 label: 'AWS access key'            },
      { re: /['"`](sk_live_[A-Za-z0-9]{24,})['"`]/,         label: 'Stripe live key'           },
      { re: /['"`](xoxb-[0-9A-Za-z-]{40,})['"`]/,           label: 'Slack bot token'           },
      { re: /['"`](AIza[0-9A-Za-z_-]{35})['"`]/,            label: 'Google API key'            },
      { re: /['"`](EAA[A-Za-z0-9]{80,})['"`]/,              label: 'Meta access token'         },
      { re: /(?:api[_-]?key|api[_-]?secret|access[_-]?token|auth[_-]?token|secret[_-]?key)\s*[:=]\s*['"`]([A-Za-z0-9+/=._~@$%^*()\-]{20,})['"`]/i, label: 'credential assignment' },
      { re: /['"`]Bearer\s+([A-Za-z0-9._~+/-]{20,})['"`]/i, label: 'Bearer token literal'      },
    ];
    const scanHardcodedSecrets = () => {
      const srcFiles = walkSrc(workspaceRoot);
      const findings = [];
      outer: for (const fp of srcFiles) {
        const base = path.basename(fp);
        if (base.startsWith('.env')) continue;
        try {
          const stat = fs.statSync(fp);
          if (stat.size > 500_000) continue;
          const lines = fs.readFileSync(fp, 'utf8').split(/\r?\n/);
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const t = line.trim();
            if (!t || t.startsWith('//') || t.startsWith('#') || t.startsWith('*')) continue;
            if (t.includes('process.env') || t.includes('import.meta.env') || t.includes('os.environ') || t.includes('os.getenv')) continue;
            for (const { re, label } of HC_PATTERNS) {
              if (re.test(line)) {
                findings.push({ relPath: path.relative(workspaceRoot, fp).replace(/\\/g, '/'), lineNumber: i + 1, label });
                break;
              }
            }
            if (findings.length >= 50) break outer;
          }
        } catch (_) {}
      }
      return { findings, scannedFiles: srcFiles.length };
    };

    // ── Assemble file issues ──────────────────────────────────────────────────
    const ALL_ENV_FILES = ['.env', '.env.local', ...MULTI_ENV_NAMES];
    const issues = {
      duplicateKeys: Object.fromEntries(
        ALL_ENV_FILES.map((n) => [n, files[n]?.exists ? findDuplicateKeys(files[n].path) : []])
      ),
      exampleLeaks:      files['.env.example'].exists ? scanExampleForLeaks(files['.env.example'].path) : [],
      permissionWarning: files['.env'].exists         ? checkFilePermission(files['.env'].path)         : null,
      emptyKeys: Object.fromEntries(
        ALL_ENV_FILES.map((n) => [n, files[n]?.exists ? findEmptyKeys(files[n].path) : []])
      ),
      badNameKeys: Object.fromEntries(
        ALL_ENV_FILES.map((n) => [n, files[n]?.exists ? findBadNameKeys(files[n].path) : []])
      ),
    };

    const unusedVars      = scanUnusedVars();
    const hardcodedSecrets = scanHardcodedSecrets();

    // ── Pre-commit hook detection ─────────────────────────────────────────────
    // Looks for .husky/pre-commit, .pre-commit-config.yaml, and lefthook.yml,
    // then checks whether the contents reference a known secrets-scanning tool.
    const PRE_COMMIT_FILE_DEFS = [
      { key: 'husky',     filePath: path.join(workspaceRoot, '.husky', 'pre-commit') },
      { key: 'precommit', filePath: path.join(workspaceRoot, '.pre-commit-config.yaml') },
      { key: 'lefthook',  filePath: path.join(workspaceRoot, 'lefthook.yml') },
    ];
    const SECRETS_SCAN_RE = /trufflehog|gitleaks|detect[_-]secrets|secretlint|talisman|git[_-]secrets/i;

    const preCommitHookFiles = PRE_COMMIT_FILE_DEFS.map(({ key, filePath }) => {
      const exists = fs.existsSync(filePath);
      let hasSecretsScan = false;
      if (exists) {
        try { hasSecretsScan = SECRETS_SCAN_RE.test(fs.readFileSync(filePath, 'utf8')); } catch (_) {}
      }
      return { key, exists, hasSecretsScan };
    });
    const preCommitHooks = {
      files:          preCommitHookFiles,
      hasAnyHook:     preCommitHookFiles.some((f) => f.exists),
      hasSecretsHook: preCommitHookFiles.some((f) => f.hasSecretsScan),
    };

    // ── Secrets manager detection ─────────────────────────────────────────────
    // Presence of these files indicates the project uses a managed secrets flow
    // rather than (or in addition to) plain .env files.
    const SECRETS_MANAGER_DEFS = [
      { key: 'dotenv-vault', file: '.env.vault',     label: 'Dotenv Vault', description: 'Encrypted vault managed by dotenv-vault CLI — secrets are stored encrypted in the repo'  },
      { key: 'doppler',      file: 'doppler.yaml',   label: 'Doppler',      description: 'Doppler cloud secrets manager — variables are injected at runtime, not stored in files'      },
      { key: 'infisical',    file: 'infisical.json',  label: 'Infisical',   description: 'Infisical open-source secrets manager — centralised rotation and access-control dashboard' },
      { key: 'bitwarden',    file: 'bw-secrets.json', pkg: '@bitwarden/sdk-secrets-manager', label: 'Bitwarden', description: 'Bitwarden Secrets Manager — open-source credential vault with secrets automation SDK' },
    ];
    // Read package.json deps once so each def can also detect via SDK presence
    let _pkgDeps = {};
    try {
      const _pkg = JSON.parse(fs.readFileSync(path.join(workspaceRoot, 'package.json'), 'utf8'));
      _pkgDeps = { ...(_pkg.dependencies || {}), ...(_pkg.devDependencies || {}) };
    } catch { /* no package.json or parse error — skip pkg check */ }

    const secretsManagers = SECRETS_MANAGER_DEFS.map(({ key, file, pkg, label, description }) => {
      const fileDetected = fs.existsSync(path.join(workspaceRoot, file));
      const pkgDetected  = pkg ? (pkg in _pkgDeps) : false;
      return {
        key, label, description, file,
        detected:    fileDetected || pkgDetected,
        detectedVia: fileDetected ? file : pkgDetected ? pkg : null,
      };
    });

    // ── Docker Compose cross-reference ───────────────────────────────────────
    // Parses docker-compose.yml (and common aliases) for environment: and
    // env_file: blocks and flags keys that exist there but not in .env.
    const scanDockerCompose = () => {
      const candidates = ['docker-compose.yml', 'docker-compose.yaml', 'compose.yml', 'compose.yaml'];
      const composePath = candidates.map((n) => path.join(workspaceRoot, n)).find((p) => fs.existsSync(p));
      if (!composePath) return null;
      try {
        const lines = fs.readFileSync(composePath, 'utf8').split(/\r?\n/);
        const referencedKeys = new Set();
        const envFileRefs    = new Set();
        let mode        = null; // 'env' | 'envfile' | null
        let blockIndent = -1;

        for (const line of lines) {
          if (!line.trim() || line.trim().startsWith('#')) continue;
          const indent  = line.search(/\S/);
          const content = line.trim();

          // Exit block when a non-list key appears at or above block indent level
          if (mode !== null && indent <= blockIndent && !content.startsWith('-')) {
            mode = null; blockIndent = -1;
          }
          if (/^environment\s*:/.test(content)) { mode = 'env';     blockIndent = indent; continue; }
          if (/^env_file\s*:/.test(content))    { mode = 'envfile'; blockIndent = indent; continue; }

          if (mode === 'env' && indent > blockIndent) {
            // List style:  - KEY or  - KEY=value or  - KEY=${VAR}
            const list = content.match(/^-\s+([A-Za-z_][A-Za-z0-9_]*)(?:[=:]|\s*$)/);
            if (list) { referencedKeys.add(list[1]); continue; }
            // Map style:  KEY: value  /  KEY: ${VAR}
            const map = content.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:/);
            if (map) referencedKeys.add(map[1]);
          }
          if (mode === 'envfile' && indent > blockIndent) {
            const m = content.match(/^-?\s*(\.env\S*)/);
            if (m) envFileRefs.add(m[1]);
          }
        }

        const envKeys    = new Set(files['.env']?.exists ? extractEnvKeys(files['.env'].path) : []);
        const missingKeys = [...referencedKeys].filter((k) => !envKeys.has(k)).sort();
        return {
          file:           path.basename(composePath),
          referencedKeys: [...referencedKeys].sort(),
          missingKeys,
          envFileRefs:    [...envFileRefs],
        };
      } catch { return null; }
    };
    const dockerCompose = scanDockerCompose();

    // ── GitHub Actions secret audit ───────────────────────────────────────────
    // Walks .github/workflows/*.yml and extracts ${{ secrets.NAME }} references,
    // then flags any that are absent from .env.example (the documented set).
    const scanGitHubActionsSecrets = () => {
      const workflowsDir = path.join(workspaceRoot, '.github', 'workflows');
      if (!fs.existsSync(workflowsDir)) return null;
      try {
        const workflowFiles = fs.readdirSync(workflowsDir)
          .filter((f) => /\.(yml|yaml)$/i.test(f))
          .map((f) => path.join(workflowsDir, f));
        if (workflowFiles.length === 0) return { workflowCount: 0, referencedSecrets: [], undocumentedSecrets: [] };

        const SECRET_RE = /\$\{\{\s*secrets\.([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g;
        // GitHub-provided automatically — no .env.example entry needed
        const GITHUB_BUILTIN = new Set(['GITHUB_TOKEN', 'ACTIONS_RUNNER_DEBUG', 'ACTIONS_STEP_DEBUG']);
        const referencedSecrets = new Set();

        for (const fp of workflowFiles) {
          try {
            let m; const content = fs.readFileSync(fp, 'utf8');
            SECRET_RE.lastIndex = 0;
            while ((m = SECRET_RE.exec(content)) !== null) referencedSecrets.add(m[1]);
          } catch (_) {}
        }

        const exampleKeys       = new Set(files['.env.example']?.exists ? extractEnvKeys(files['.env.example'].path) : []);
        const undocumentedSecrets = [...referencedSecrets]
          .filter((k) => !exampleKeys.has(k) && !GITHUB_BUILTIN.has(k))
          .sort();
        return {
          workflowCount:      workflowFiles.length,
          referencedSecrets:  [...referencedSecrets].sort(),
          undocumentedSecrets,
        };
      } catch { return null; }
    };
    const githubActions = scanGitHubActionsSecrets();

    // ── Config file credential scan ───────────────────────────────────────────
    // Checks .npmrc (project + global) and .pypirc (project + global) for literal
    // auth tokens and passwords that should instead live in env vars.
    const scanConfigFiles = () => {
      const findings = [];
      const homeDir  = (() => { try { return require('os').homedir(); } catch { return ''; } })();
      const PLACEHOLDER_RE = /^\$\{|^%|^<YOUR|^xxx|^INSERT|^REPLACE/i;

      // .npmrc — look for _authToken lines
      const NPMRC_RE = /^(?:\/\/[^:=\s]+:)?_authToken\s*=\s*(.+)/;
      const npmrcPaths = [
        { file: path.join(workspaceRoot, '.npmrc'),       label: '.npmrc (project)' },
        { file: path.join(homeDir,  '.npmrc'),       label: '.npmrc (global)'  },
      ];
      for (const { file: fp, label } of npmrcPaths) {
        if (!fp || !fs.existsSync(fp)) continue;
        try {
          fs.readFileSync(fp, 'utf8').split(/\r?\n/).forEach((line, i) => {
            const m = line.trim().match(NPMRC_RE);
            if (!m) return;
            const token = m[1].trim();
            if (PLACEHOLDER_RE.test(token) || !token) return;
            findings.push({ file: label, lineNumber: i + 1, label: 'npm _authToken', preview: token.slice(0, 6) + '…' });
          });
        } catch (_) {}
      }

      // .pypirc — look for password= inside [pypi] / [testpypi] sections
      const pypircPaths = [
        { file: path.join(workspaceRoot, '.pypirc'), label: '.pypirc (project)' },
        { file: path.join(homeDir,  '.pypirc'), label: '.pypirc (global)'  },
      ];
      for (const { file: fp, label } of pypircPaths) {
        if (!fp || !fs.existsSync(fp)) continue;
        try {
          let inSection = false;
          fs.readFileSync(fp, 'utf8').split(/\r?\n/).forEach((line, i) => {
            const t = line.trim();
            if (/^\[.+\]/.test(t)) { inSection = /^\[(pypi|testpypi|distutils)\]/i.test(t); return; }
            if (!inSection) return;
            const m = t.match(/^password\s*=\s*(.+)/i);
            if (!m) return;
            const pw = m[1].trim();
            if (PLACEHOLDER_RE.test(pw) || pw.length < 8) return;
            findings.push({ file: label, lineNumber: i + 1, label: 'PyPI password', preview: pw.slice(0, 6) + '…' });
          });
        } catch (_) {}
      }

      return findings;
    };
    const configFileScan = scanConfigFiles();

    // ── SSH / certificate file detection ─────────────────────────────────────
    // Warns when private-key or cert files are present in the project tree.
    const scanSensitiveFiles = () => {
      const findings = [];
      const SSH_NAMES = new Set(['id_rsa', 'id_dsa', 'id_ecdsa', 'id_ed25519']);
      const KEY_EXTS  = new Set(['.pem', '.p12', '.pfx', '.key', '.p8']);
      const SCAN_DIRS = ['', 'certs', 'cert', 'keys', 'ssl', '.ssh', 'secrets'].map((d) => path.join(workspaceRoot, d));

      for (const dir of SCAN_DIRS) {
        if (!fs.existsSync(dir)) continue;
        try {
          for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            if (!entry.isFile()) continue;
            const name = entry.name;
            const ext  = path.extname(name).toLowerCase();
            if (!SSH_NAMES.has(name) && !KEY_EXTS.has(ext)) continue;
            const relPath = path.relative(workspaceRoot, path.join(dir, name)).replace(/\\/g, '/');
            const type =
              SSH_NAMES.has(name)        ? 'SSH private key'     :
              ext === '.pem'             ? 'PEM certificate/key' :
              ext === '.p12' || ext === '.pfx' ? 'PKCS#12 keystore'   :
              ext === '.key'             ? 'Private key file'    :
                                           'Certificate/key file';
            findings.push({ relPath, type });
          }
        } catch (_) {}
      }
      return findings;
    };
    const sensitiveFiles = scanSensitiveFiles();

    // ── Cloud SDK credential file scan ────────────────────────────────────────
    // Warns when ~/.aws/credentials, gcloud ADC, or ~/.azure token caches exist,
    // suggesting the developer is relying on CLI-managed creds instead of env vars.
    const scanCloudSdkCredentials = () => {
      try {
        const homeDir = require('os').homedir();
        const result = { aws: null, gcloud: null, azure: null };

        // AWS — ~/.aws/credentials (or %USERPROFILE%\.aws\credentials on Windows)
        const awsCredPath = path.join(homeDir, '.aws', 'credentials');
        if (fs.existsSync(awsCredPath)) {
          try {
            const content = fs.readFileSync(awsCredPath, 'utf8');
            const profiles = (content.match(/^\[.+\]/gm) || []).map((p) => p.slice(1, -1));
            const hasKeys    = /aws_access_key_id\s*=/i.test(content);
            const hasSecrets = /aws_secret_access_key\s*=/i.test(content);
            result.aws = { found: true, path: awsCredPath, profileCount: profiles.length, hasKeys, hasSecrets, profiles: profiles.slice(0, 10) };
          } catch { result.aws = { found: true, path: awsCredPath, profileCount: 0, hasKeys: false, hasSecrets: false }; }
        } else {
          result.aws = { found: false };
        }

        // GCloud — application_default_credentials.json
        const gcloudPath = process.platform === 'win32'
          ? path.join(process.env.APPDATA || path.join(homeDir, 'AppData', 'Roaming'), 'gcloud', 'application_default_credentials.json')
          : path.join(homeDir, '.config', 'gcloud', 'application_default_credentials.json');
        if (fs.existsSync(gcloudPath)) {
          try {
            const creds = JSON.parse(fs.readFileSync(gcloudPath, 'utf8'));
            result.gcloud = { found: true, path: gcloudPath, hasAdc: true, credType: creds.type || 'unknown' };
          } catch { result.gcloud = { found: true, path: gcloudPath, hasAdc: true, credType: 'unknown' }; }
        } else {
          result.gcloud = { found: false };
        }

        // Azure — ~/.azure/ directory
        const azureDir = path.join(homeDir, '.azure');
        if (fs.existsSync(azureDir)) {
          const hasTokens  = fs.existsSync(path.join(azureDir, 'msal_token_cache.json'));
          const hasProfile = fs.existsSync(path.join(azureDir, 'azureProfile.json'));
          let subscriptionCount = 0;
          if (hasProfile) {
            try { subscriptionCount = (JSON.parse(fs.readFileSync(path.join(azureDir, 'azureProfile.json'), 'utf8')).subscriptions || []).length; } catch {}
          }
          result.azure = { found: true, path: azureDir, hasTokens, hasProfile, subscriptionCount };
        } else {
          result.azure = { found: false };
        }

        return result;
      } catch { return null; }
    };
    const cloudSdkScan = scanCloudSdkCredentials();

    // ── Env var presence ──────────────────────────────────────────────────────
    // Check both process.env and the actual .env / .env.local files on disk,
    // so that newly-written keys are detected without an app restart.
    const envFileVars = new Set();
    for (const ef of ['.env', '.env.local']) {
      const efPath = path.join(workspaceRoot, ef);
      if (fs.existsSync(efPath)) {
        for (const line of fs.readFileSync(efPath, 'utf8').split(/\r?\n/)) {
          const t = line.trim();
          if (!t || t.startsWith('#')) continue;
          const eqIdx = t.indexOf('=');
          if (eqIdx > 0) {
            const k = t.slice(0, eqIdx).trim();
            const v = t.slice(eqIdx + 1).trim();
            if (v) envFileVars.add(k);
          }
        }
      }
    }
    const envPresence = Object.fromEntries(
      expectedVars.map((name) => [name, Boolean(process.env[name]) || envFileVars.has(name)])
    );

    return {
      ok: true,
      envPresence,
      files,
      hygiene: {
        envIgnored:        matchesIgnore('.env'),
        envLocalIgnored:   matchesIgnore('.env.local'),
        envExampleIgnored: matchesIgnore('.env.example'),
        multiEnvIgnored:   Object.fromEntries(MULTI_ENV_NAMES.map((n) => [n, matchesIgnore(n)])),
        gitHistory:        gitHistoryMap,
      },
      drift,
      issues,
      gitAvailable,
      unusedVars,
      hardcodedSecrets,
      dockerCompose,
      githubActions,
      configFileScan,
      sensitiveFiles,
      preCommitHooks,
      secretsManagers,
      cloudSdkScan,
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('python:read-project-config', async () => {
  try {
    return { ok: true, config: readPythonProjectConfig(getActiveAnalysisRoot()) };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('python:write-project-config', async (event, payload) => {
  try {
    const workspaceRoot = getActiveAnalysisRoot();
    const current = readPythonProjectConfig(workspaceRoot);
    const { pyprojectPath } = getWorkspaceDependencySourcePaths(workspaceRoot);
    const next = {
      metadata: {
        ...current.metadata,
        ...(payload?.metadata || {}),
      },
      dependencies: Array.isArray(payload?.dependencies) ? payload.dependencies : current.dependencies,
      groups: payload?.groups && typeof payload.groups === 'object' ? payload.groups : current.groups,
    };

    fs.writeFileSync(pyprojectPath, buildPythonProjectToml(next, workspaceRoot), 'utf8');
    return { ok: true, config: readPythonProjectConfig(workspaceRoot) };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('python:run-tool-command', async (event, { command }) => {
  const startedAt = Date.now();
  try {
    const workspaceRoot = getActiveAnalysisRoot();
    const tokens = tokenizeCommand(command);
    if (tokens.length === 0) {
      return { ok: false, error: 'No command was provided.' };
    }

    const executable = resolveAllowedExecutable(tokens[0], workspaceRoot);
    const args = tokens.slice(1);
    const result = await runCommandCapture(executable, args, {
      cwd: workspaceRoot,
      source: 'run',
      label: command,
    });

    const durationMs = Date.now() - startedAt;
    const CAPTURE_LIMIT = 2000;

    appendRunHistory({
      id: `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      command,
      ok: result.ok,
      exitCode: result.code,
      durationMs,
      startedAt,
      stdout: (result.stdout || '').slice(-CAPTURE_LIMIT),
      stderr: (result.stderr || '').slice(-CAPTURE_LIMIT),
    });

    return {
      ...result,
      command,
      durationMs,
    };
  } catch (err) {
    const durationMs = Date.now() - startedAt;
    appendRunHistory({
      id: `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      command,
      ok: false,
      exitCode: -1,
      durationMs,
      startedAt,
      stdout: '',
      stderr: err.message,
    });
    return {
      ok: false,
      code: -1,
      command,
      stdout: '',
      stderr: err.message,
      durationMs,
      error: err.message,
    };
  }
});

ipcMain.handle('python:read-command-log', async () => {
  try {
    return { ok: true, entries: PYTHON_COMMAND_LOG };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('python:clear-command-log', async () => {
  try {
    PYTHON_COMMAND_LOG.length = 0;
    try { writeJsonAtomic(getActiveCommandLogPath(), []); } catch {}
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('python:read-run-history', async () => {
  try {
    const entries = loadRunHistory();
    return { ok: true, entries };
  } catch (err) {
    return { ok: false, error: err.message, entries: [] };
  }
});

ipcMain.handle('python:clear-run-history', async () => {
  try {
    writeJsonAtomic(getActiveRunHistoryPath(), []);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// Lightweight — no subprocesses, purely filesystem + cached data.
ipcMain.handle('python:footer-status', async () => {
  try {
    const shared = getSharedPythonProjectSnapshot();
    const meta = readVenvMetadata();
    const pythonSignalsDetected = shared.files.hasVenv || shared.files.hasPyproject || shared.files.hasRequirements;

    // Parse python version from metadata's createdWith field (e.g. "uv:3.12.3")
    let pythonVersion = null;
    if (meta?.createdWith) {
      const parts = String(meta.createdWith).split(':');
      if (parts.length > 1 && parts[1]) pythonVersion = parts[1].trim();
    }

    const history = loadRunHistory();
    const lastRun = history.length > 0 ? {
      command: history[0].command,
      ok: history[0].ok,
      durationMs: history[0].durationMs,
      startedAt: history[0].startedAt,
    } : null;

    return {
      ok: true,
      venv: {
        exists: shared.files.hasVenv,
        interpreterOk: !!(shared.paths.interpreterPath && fs.existsSync(shared.paths.interpreterPath)),
        lockfileExists: shared.files.hasUvLock,
        pythonVersion,
        pythonSignalsDetected,
        projectDetected: pythonSignalsDetected,
        workspaceName: shared.workspace?.name || 'Workspace',
      },
      lastRun,
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// ── IPC: Window controls ─────────────────────────────────────────────────────
ipcMain.handle('window:minimize', () => { BrowserWindow.getFocusedWindow()?.minimize(); });
ipcMain.handle('window:maximize', () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) { win.isMaximized() ? win.unmaximize() : win.maximize(); }
});
ipcMain.handle('window:close', () => { BrowserWindow.getFocusedWindow()?.close(); });
ipcMain.handle('window:is-maximized', () => BrowserWindow.getFocusedWindow()?.isMaximized() || false);
ipcMain.handle('shell:reveal-path', async (event, targetPath) => {
  try {
    const candidate = String(targetPath || '').trim();
    if (!candidate) {
      return { ok: false, error: 'No path provided.' };
    }

    if (fs.existsSync(candidate)) {
      const stats = fs.statSync(candidate);
      if (stats.isDirectory()) {
        const result = await shell.openPath(candidate);
        return result ? { ok: false, error: result } : { ok: true };
      }
      shell.showItemInFolder(candidate);
      return { ok: true };
    }

    const parentDir = path.dirname(candidate);
    if (parentDir && fs.existsSync(parentDir)) {
      const result = await shell.openPath(parentDir);
      return result ? { ok: false, error: result } : { ok: true };
    }

    return { ok: false, error: 'Path not found.' };
  } catch (error) {
    return { ok: false, error: error.message || 'Unable to open folder.' };
  }
});

ipcMain.handle('shell:open-file', async (event, targetPath) => {
  try {
    const candidate = String(targetPath || '').trim();
    if (!candidate) return { ok: false, error: 'No path provided.' };
    if (!fs.existsSync(candidate)) return { ok: false, error: 'File not found.' };
    const result = await shell.openPath(candidate);
    return result ? { ok: false, error: result } : { ok: true };
  } catch (error) {
    return { ok: false, error: error.message || 'Unable to open file.' };
  }
});

ipcMain.handle('python:fix-hygiene', async (event, payload) => {
  try {
    const workspaceRoot = getActiveAnalysisRoot();
    const { action } = payload || {};
    const gitignorePath = path.join(workspaceRoot, '.gitignore');
    const envPath       = path.join(workspaceRoot, '.env');
    const examplePath   = path.join(workspaceRoot, '.env.example');

    if (action === 'addToGitignore') {
      const entry = String(payload.entry || '').trim();
      if (!entry) return { ok: false, error: 'No entry specified.' };
      const prevContent = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, 'utf8') : '';
      const lines = prevContent.split(/\r?\n/).map(l => l.trim());
      if (!lines.includes(entry)) {
        const separator = prevContent.length && !prevContent.endsWith('\n') ? '\n' : '';
        fs.writeFileSync(gitignorePath, prevContent + separator + entry + '\n', 'utf8');
      }
      return { ok: true, snapshot: { path: gitignorePath, content: prevContent } };
    }

    if (action === 'createGitignore') {
      if (fs.existsSync(gitignorePath)) return { ok: false, error: '.gitignore already exists.' };
      const template = [
        '# Environment / secrets',
        '.env',
        '.env.local',
        '',
        '# Python',
        '__pycache__/',
        '*.py[cod]',
        '.venv/',
        '',
        '# Node',
        'node_modules/',
        'dist/',
        '',
      ].join('\n');
      fs.writeFileSync(gitignorePath, template, 'utf8');
      return { ok: true, snapshot: { path: gitignorePath, content: null } };
    }

    if (action === 'createExample') {
      if (fs.existsSync(examplePath)) return { ok: false, error: '.env.example already exists.' };
      let content = '';
      if (fs.existsSync(envPath)) {
        const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
        content = lines
          .map(line => {
            const stripped = line.trim();
            if (!stripped || stripped.startsWith('#')) return line;
            const eqIdx = stripped.indexOf('=');
            if (eqIdx === -1) return line;
            return stripped.slice(0, eqIdx + 1);
          })
          .join('\n');
      } else {
        content = '# Add your environment variables here\n# KEY=\n';
      }
      fs.writeFileSync(examplePath, content, 'utf8');
      return { ok: true, snapshot: { path: examplePath, content: null } };
    }

    if (action === 'appendToExample') {
      const key = String(payload.key || '').trim();
      if (!key) return { ok: false, error: 'No key specified.' };
      const prevContent = fs.existsSync(examplePath) ? fs.readFileSync(examplePath, 'utf8') : '';
      const alreadyPresent = prevContent.split(/\r?\n/).some(l => l.trim().startsWith(key + '='));
      if (!alreadyPresent) {
        const separator = prevContent.length && !prevContent.endsWith('\n') ? '\n' : '';
        fs.writeFileSync(examplePath, prevContent + separator + key + '=\n', 'utf8');
      }
      return { ok: true, snapshot: { path: examplePath, content: prevContent } };
    }

    if (action === 'undoSnapshot') {
      const snapPath    = String(payload.snapshot?.path    || '').trim();
      const snapContent = payload.snapshot?.content;
      if (!snapPath) return { ok: false, error: 'No file path in snapshot.' };
      if (snapContent === null || snapContent === undefined) {
        if (fs.existsSync(snapPath)) fs.unlinkSync(snapPath);
      } else {
        fs.writeFileSync(snapPath, snapContent, 'utf8');
      }
      return { ok: true };
    }

    if (action === 'regenerateExample') {
      if (!fs.existsSync(envPath)) return { ok: false, error: '.env not found — cannot generate .env.example' };
      const prevContent = fs.existsSync(examplePath) ? fs.readFileSync(examplePath, 'utf8') : null;
      const snapshot = { path: examplePath, content: prevContent };
      const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
      const out = lines.map((line) => {
        const t = line.trim();
        if (!t || t.startsWith('#')) return line;
        const eqIdx = line.indexOf('=');
        if (eqIdx < 0) return line;
        const key = line.slice(0, eqIdx).trimEnd();
        return `${key}=`;
      });
      fs.writeFileSync(examplePath, out.join('\n'), 'utf8');
      return { ok: true, snapshot };
    }

    if (action === 'setEnvValue') {
      const WRITABLE = new Set(['.env', '.env.local', '.env.test', '.env.production', '.env.staging', '.env.development']);
      const targetFile = String(payload.file || '.env').trim();
      if (!WRITABLE.has(targetFile)) return { ok: false, error: `Not allowed to write to "${targetFile}".` };
      const targetPath = path.join(ROOT_DIR, targetFile);
      if (!fs.existsSync(targetPath)) return { ok: false, error: `${targetFile} not found.` };
      const key = String(payload.key || '').trim();
      if (!key) return { ok: false, error: 'key is required.' };
      const value = String(payload.value ?? '');
      const prevContent = fs.readFileSync(targetPath, 'utf8');
      const snapshot = { path: targetPath, content: prevContent };
      const lines = prevContent.split(/\r?\n/);
      let found = false;
      const out = lines.map((line) => {
        const eqIdx = line.indexOf('=');
        if (eqIdx < 0) return line;
        const k = line.slice(0, eqIdx).trim();
        if (k !== key || found) return line;
        found = true;
        return `${key}=${value}`;
      });
      if (!found) {
        // Key doesn't exist yet — append it on a new line
        const needsNewline = out.length > 0 && out[out.length - 1].trim() !== '';
        if (needsNewline) out.push('');
        out.push(`${key}=${value}`);
      }
      fs.writeFileSync(targetPath, out.join('\n'), 'utf8');
      return { ok: true, snapshot };
    }

    if (action === 'getRedactedEnv') {
      if (!fs.existsSync(envPath)) return { ok: false, error: '.env not found.' };
      const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
      const out = lines.map((line) => {
        const t = line.trim();
        if (!t || t.startsWith('#')) return line;
        const eqIdx = line.indexOf('=');
        if (eqIdx < 0) return line;
        const key = line.slice(0, eqIdx).trimEnd();
        const val = line.slice(eqIdx + 1);
        if (!val.trim()) return line;
        return `${key}=***`;
      });
      return { ok: true, text: out.join('\n') };
    }

    return { ok: false, error: `Unknown action: ${action}` };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// Returns all key/value pairs from the requested env files — used by the
// inline variable editor in the UI.  Only files that are safe to read from
// the project root are allowed.
ipcMain.handle('python:read-env-file', async (event, payload) => {
  try {
    const workspaceRoot = getActiveAnalysisRoot();
    const ALLOWED = new Set(['.env', '.env.local', '.env.test', '.env.production', '.env.staging', '.env.development']);
    const requested = Array.isArray(payload?.files) ? payload.files : ['.env'];
    const result = {};
    for (const name of requested) {
      if (!ALLOWED.has(name)) { result[name] = []; continue; }
      const fp = path.join(workspaceRoot, name);
      if (!fs.existsSync(fp)) { result[name] = []; continue; }
      const lines = fs.readFileSync(fp, 'utf8').split(/\r?\n/);
      const vars = [];
      for (let i = 0; i < lines.length; i++) {
        const t = lines[i].trim();
        if (!t || t.startsWith('#')) continue;
        const eqIdx = lines[i].indexOf('=');
        if (eqIdx < 0) continue;
        const key = lines[i].slice(0, eqIdx).trim();
        const value = lines[i].slice(eqIdx + 1);
        if (key) vars.push({ key, value, lineNumber: i + 1 });
      }
      result[name] = vars;
    }
    return { ok: true, vars: result };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// Persist / read issue-count history for the sparkline in SecretsPage.
// File: <app-data>/Launchline/storage/history/hygiene-history.json
// Format: { "entries": [{ "ts": <epoch-ms>, "count": <number> }, ...] }  (max 50)
ipcMain.handle('python:hygiene-history', async (event, payload) => {
  try {
    const historyPath = getActiveHygieneHistoryPath();
    const { action, count } = payload || {};

    const readEntries = () => {
      const payload = readMigratedJson(historyPath, LEGACY_HYGIENE_HISTORY_PATHS, { entries: [] });
      return Array.isArray(payload?.entries) ? payload.entries : [];
    };

    if (action === 'append') {
      let entries = readEntries();
      entries.push({ ts: Date.now(), count: Number(count) || 0 });
      if (entries.length > 50) entries = entries.slice(-50);
      writeJsonAtomic(historyPath, { entries });
      return { ok: true, entries };
    }

    if (action === 'read') {
      return { ok: true, entries: readEntries() };
    }

    return { ok: false, error: 'Unknown action' };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// ── Container Status ──────────────────────────────────────────────────────────
ipcMain.handle('python:container-status', async () => {
  try {
    const workspaceRoot = getActiveAnalysisRoot();
    const workspaceRelative = (targetPath) => path.relative(workspaceRoot, targetPath).replace(/\\/g, '/');
    // ── Dockerfile scanner ────────────────────────────────────────────────
    const DOCKERFILE_DIRS = [
      workspaceRoot,
      path.join(workspaceRoot, 'docker'),
      path.join(workspaceRoot, 'deploy'),
      path.join(workspaceRoot, '.docker'),
    ];

    function findDockerfiles() {
      const found = [];
      for (const dir of DOCKERFILE_DIRS) {
        if (!fs.existsSync(dir)) continue;
        let entries;
        try { entries = fs.readdirSync(dir); } catch { continue; }
        for (const e of entries) {
          if (/^Dockerfile(\..+)?$/.test(e)) found.push(path.join(dir, e));
        }
      }
      return [...new Set(found)];
    }

    function parseDockerfile(filePath) {
      let lines;
      try { lines = fs.readFileSync(filePath, 'utf8').split('\n'); } catch { return null; }
      const relPath = workspaceRelative(filePath);
      let fromImages = [], hasUser = false, hasExpose = false, runCount = 0, stageCount = 0;
      for (const raw of lines) {
        const line = raw.trim();
        if (!line || line.startsWith('#')) continue;
        const upper = line.toUpperCase();
        if (upper.startsWith('FROM ')) {
          stageCount++;
          const parts = line.split(/\s+/);
          const img = (parts[0].toUpperCase() === 'FROM' ? parts[1] : parts[0]) || '';
          if (img && !img.startsWith('--')) fromImages.push(img);
        }
        if (upper.startsWith('USER '))   hasUser = true;
        if (upper.startsWith('EXPOSE ')) hasExpose = true;
        if (upper.startsWith('RUN '))    runCount++;
      }
      const latestImages = fromImages.filter(img => {
        if (img.toLowerCase() === 'scratch') return false;
        const lastColon = img.lastIndexOf(':');
        const lastSlash = img.lastIndexOf('/');
        if (lastColon <= lastSlash) return true; // no tag = implies latest
        return img.slice(lastColon + 1) === 'latest';
      });
      return {
        relPath, fromImages, stageCount, runCount,
        checks: {
          imagePinned:    latestImages.length === 0,
          unpinnedImages: latestImages,
          hasNonRootUser: hasUser,
          hasExpose,
          isMultiStage:   stageCount > 1,
          highLayerCount: runCount > 8,
        },
      };
    }

    // ── .dockerignore scanner ─────────────────────────────────────────────
    const CRITICAL_EXCLUSIONS = ['.env', '.git', 'node_modules', '*.log'];

    function scanDockerIgnore() {
      const ignorePath = path.join(workspaceRoot, '.dockerignore');
      if (!fs.existsSync(ignorePath)) return { exists: false, missingExclusions: CRITICAL_EXCLUSIONS };
      let lines;
      try {
        lines = fs.readFileSync(ignorePath, 'utf8').split('\n').map(l => l.trim()).filter(Boolean);
      } catch { return { exists: true, missingExclusions: CRITICAL_EXCLUSIONS }; }
      const missing = CRITICAL_EXCLUSIONS.filter(exc => {
        if (exc.startsWith('*')) {
          const ext = exc.slice(1);
          return !lines.some(l => l === exc || l.endsWith(ext));
        }
        return !lines.some(l => l === exc || l === `/${exc}` || l === `${exc}/`);
      });
      return { exists: true, missingExclusions: missing };
    }

    // ── Extended Docker Compose scanner ───────────────────────────────────
    function scanComposeExtended() {
      const composePaths = [
        'docker-compose.yml', 'docker-compose.yaml',
        'docker-compose.dev.yml', 'docker-compose.prod.yml',
        'compose.yml', 'compose.yaml',
      ].map(n => path.join(workspaceRoot, n));
      const composePath = composePaths.find(p => fs.existsSync(p));
      if (!composePath) return null;

      let lines;
      try { lines = fs.readFileSync(composePath, 'utf8').split('\n'); } catch { return null; }

      const services = {};
      let inServices = false, currentSvc = null, mode = null, modeIndent = 0;
      const allHostPorts = {};

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trimStart();
        const indent = line.length - trimmed.length;

        if (trimmed.startsWith('services:') && indent === 0) { inServices = true; continue; }
        if (inServices && indent === 0 && trimmed && !trimmed.startsWith('#')) inServices = false;
        if (!inServices) continue;

        // Service name at indent 2
        if (indent === 2 && /^\w[\w-]*\s*:/.test(trimmed)) {
          currentSvc = trimmed.replace(/:.*/, '').trim();
          mode = null;
          services[currentSvc] = { name: currentSvc, image: null, ports: [], volumes: [], hasHealthcheck: false, restartPolicy: null };
          continue;
        }
        if (!currentSvc) continue;
        const svc = services[currentSvc];

        if (indent === 4) {
          if (trimmed.startsWith('image:'))       svc.image = trimmed.replace('image:', '').trim().replace(/['"]/g, '');
          if (trimmed.startsWith('restart:'))     svc.restartPolicy = trimmed.replace('restart:', '').trim().replace(/['"]/g, '');
          if (trimmed.startsWith('healthcheck:')) svc.hasHealthcheck = true;
          if (trimmed.startsWith('ports:'))  { mode = 'ports';   modeIndent = 4; continue; }
          if (trimmed.startsWith('volumes:')) { mode = 'volumes'; modeIndent = 4; continue; }
          if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('-')) mode = null;
        }

        if (mode === 'ports'   && indent === 6 && trimmed.startsWith('- ')) {
          const portStr = trimmed.slice(2).replace(/['"]/g, '').trim();
          svc.ports.push(portStr);
          const hostPort = portStr.includes(':') ? portStr.split(':')[0] : portStr;
          if (hostPort) {
            if (!allHostPorts[hostPort]) allHostPorts[hostPort] = [];
            allHostPorts[hostPort].push(currentSvc);
          }
        }
        if (mode === 'volumes' && indent === 6 && trimmed.startsWith('- ')) {
          svc.volumes.push(trimmed.slice(2).replace(/['"]/g, '').trim());
        }
      }

      const serviceList = Object.values(services);
      const portConflicts = Object.entries(allHostPorts)
        .filter(([, svcs]) => svcs.length > 1)
        .map(([port, svcs]) => ({ port, services: svcs }));
      const missingHealthchecks = serviceList.filter(s => !s.hasHealthcheck).map(s => s.name);
      const badRestartPolicies  = serviceList.filter(s => !s.restartPolicy || s.restartPolicy === 'no').map(s => s.name);
      const rootVolumeMounts    = serviceList.flatMap(s =>
        s.volumes.filter(v => /^\.[:\/]/.test(v) || v === '.').map(v => ({ service: s.name, mount: v }))
      );

      return {
        file: workspaceRelative(composePath),
        services: serviceList,
        serviceCount: serviceList.length,
        portConflicts,
        missingHealthchecks,
        badRestartPolicies,
        rootVolumeMounts,
      };
    }

    // ── Kubernetes manifest scanner ───────────────────────────────────────
    const K8S_DIRS = ['k8s', 'kubernetes', 'deploy', 'helm', 'manifests', 'charts', 'infra'];
    const K8S_WORKLOAD_KINDS = new Set(['Deployment', 'StatefulSet', 'DaemonSet', 'Job', 'CronJob', 'Pod']);

    function walkK8sDir(dir, acc) {
      let entries;
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
      for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) walkK8sDir(full, acc);
        else if (/\.ya?ml$/.test(e.name)) acc.push(full);
      }
    }

    function parseK8sManifest(filePath) {
      let lines;
      try { lines = fs.readFileSync(filePath, 'utf8').split('\n'); } catch { return null; }
      const relPath = workspaceRelative(filePath);
      let kind = null, name = null, namespace = null;
      for (const line of lines) {
        const t = line.trim();
        if (!kind && t.startsWith('kind:'))       kind      = t.replace('kind:', '').trim().replace(/['"]/g, '');
        if (!name && /^name:\s/.test(t))          name      = t.replace('name:', '').trim().replace(/['"]/g, '');
        if (!namespace && t.startsWith('namespace:')) namespace = t.replace('namespace:', '').trim().replace(/['"]/g, '');
      }
      if (!kind) return null;

      let hasLimits = false, hasLiveness = false, hasReadiness = false;
      let hasLatestTag = false, replicas = null;
      const secretRefs = [];

      if (K8S_WORKLOAD_KINDS.has(kind)) {
        for (const line of lines) {
          const t = line.trim();
          if (t.startsWith('replicas:')) replicas = parseInt(t.replace('replicas:', '').trim(), 10);
          if (t.startsWith('image:')) {
            const img = t.replace('image:', '').trim().replace(/['"]/g, '');
            const lastColon = img.lastIndexOf(':');
            const lastSlash = img.lastIndexOf('/');
            if (lastColon <= lastSlash || img.slice(lastColon + 1) === 'latest') hasLatestTag = true;
          }
          if (t === 'limits:')                hasLimits    = true;
          if (t.startsWith('livenessProbe:')) hasLiveness  = true;
          if (t.startsWith('readinessProbe:'))hasReadiness = true;
          if (t.startsWith('secretKeyRef:') || t.startsWith('secretRef:')) secretRefs.push({ manifest: relPath, kind });
        }
      }

      return {
        relPath, kind, name: name || '(unnamed)', namespace: namespace || 'default',
        checks: {
          missingResourceLimits: K8S_WORKLOAD_KINDS.has(kind) && !hasLimits,
          missingLiveness:       K8S_WORKLOAD_KINDS.has(kind) && !hasLiveness,
          missingReadiness:      K8S_WORKLOAD_KINDS.has(kind) && !hasReadiness,
          hasLatestTag,
          singleReplica:         replicas !== null && replicas === 1,
        },
        secretRefs,
      };
    }

    function scanK8sManifests() {
      const files = [];
      for (const dir of K8S_DIRS) {
        const full = path.join(workspaceRoot, dir);
        if (fs.existsSync(full)) walkK8sDir(full, files);
      }
      if (files.length === 0) return null;
      const manifests = files.map(parseK8sManifest).filter(Boolean);
      if (manifests.length === 0) return null;
      return {
        manifestCount: manifests.length,
        manifests: manifests.map(m => ({ relPath: m.relPath, kind: m.kind, name: m.name, namespace: m.namespace })),
        checks: {
          missingResourceLimits: manifests.filter(m => m.checks.missingResourceLimits).map(m => m.relPath),
          missingProbes:         manifests.filter(m => m.checks.missingLiveness || m.checks.missingReadiness)
                                          .map(m => ({ path: m.relPath, missing: [m.checks.missingLiveness && 'liveness', m.checks.missingReadiness && 'readiness'].filter(Boolean) })),
          latestImageTags:       manifests.filter(m => m.checks.hasLatestTag).map(m => m.relPath),
          defaultNamespace:      manifests.filter(m => m.namespace === 'default' && K8S_WORKLOAD_KINDS.has(m.kind)).map(m => m.relPath),
          singleReplicas:        manifests.filter(m => m.checks.singleReplica).map(m => m.relPath),
        },
        secretRefs: manifests.flatMap(m => m.secretRefs),
      };
    }

    // ── Run all scans ─────────────────────────────────────────────────────
    const dockerfileFiles = findDockerfiles();
    const dockerfiles     = dockerfileFiles.map(parseDockerfile).filter(Boolean);
    const dockerIgnore    = scanDockerIgnore();
    const compose         = scanComposeExtended();
    const k8s             = scanK8sManifests();

    // ── Readiness score ───────────────────────────────────────────────────
    const scoreChecks = [
      { id: 'dockerfile_present',    label: 'Dockerfile present',               pass: dockerfiles.length > 0 },
      { id: 'image_pinned',          label: 'Base image pinned (no :latest)',    pass: dockerfiles.length > 0 && dockerfiles.every(d => d.checks.imagePinned) },
      { id: 'non_root_user',         label: 'Non-root USER instruction',         pass: dockerfiles.length > 0 && dockerfiles.every(d => d.checks.hasNonRootUser) },
      { id: 'dockerignore_exists',   label: '.dockerignore present',             pass: dockerIgnore.exists },
      { id: 'dockerignore_complete', label: '.dockerignore excludes .env & .git',pass: dockerIgnore.exists && dockerIgnore.missingExclusions.length === 0 },
      { id: 'compose_healthchecks',  label: 'Compose services have healthchecks',pass: !compose || compose.missingHealthchecks.length === 0 },
      { id: 'no_latest_k8s',         label: 'No :latest tags in K8s manifests', pass: !k8s || k8s.checks.latestImageTags.length === 0 },
      { id: 'k8s_resource_limits',   label: 'K8s resource limits defined',      pass: !k8s || k8s.checks.missingResourceLimits.length === 0 },
    ];
    const passed = scoreChecks.filter(c => c.pass).length;

    return { ok: true, dockerfiles, dockerIgnore, compose, k8s, score: { passed, total: scoreChecks.length, checks: scoreChecks } };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// ── CI/CD Status ──────────────────────────────────────────────────────────────
ipcMain.handle('python:cicd-status', async () => {
  try {
    const { execSync } = require('child_process');
    const workspaceRoot = getActiveAnalysisRoot();

    // ── Provider detection ────────────────────────────────────────────────
    const PROVIDERS = [
      { id: 'github',    label: 'GitHub Actions',        file: '.github/workflows',        dir: true  },
      { id: 'gitlab',    label: 'GitLab CI',             file: '.gitlab-ci.yml',           dir: false },
      { id: 'jenkins',   label: 'Jenkins',               file: 'Jenkinsfile',              dir: false },
      { id: 'circleci',  label: 'CircleCI',              file: '.circleci/config.yml',     dir: false },
      { id: 'travis',    label: 'Travis CI',             file: '.travis.yml',              dir: false },
      { id: 'azure',     label: 'Azure Pipelines',       file: 'azure-pipelines.yml',      dir: false },
      { id: 'bitbucket', label: 'Bitbucket Pipelines',   file: 'bitbucket-pipelines.yml',  dir: false },
      { id: 'drone',     label: 'Drone CI',              file: '.drone.yml',               dir: false },
    ];

    const detectedProviders = PROVIDERS.map(p => {
      const full = path.join(workspaceRoot, p.file);
      const exists = p.dir ? fs.existsSync(full) && fs.statSync(full).isDirectory() : fs.existsSync(full);
      return { ...p, exists };
    });

    // ── GitHub Actions deep scan ──────────────────────────────────────────
    const WORKFLOWS_DIR = path.join(workspaceRoot, '.github', 'workflows');
    const UNPINNED_RE   = /uses:\s*([^@\s]+)@(v\d[\w.-]*|main|master|latest)/;
    const SECRET_RE     = /\$\{\{\s*secrets\.(\w+)\s*\}\}/g;
    const TIMEOUT_RE    = /timeout-minutes\s*:/;
    const PERM_WIDE_RE  = /permissions\s*:\s*(write-all|admin)/;

    function scanGitHubWorkflows() {
      if (!fs.existsSync(WORKFLOWS_DIR)) return null;
      let files;
      try { files = fs.readdirSync(WORKFLOWS_DIR).filter(f => /\.ya?ml$/.test(f)); } catch { return null; }
      if (files.length === 0) return null;

      const workflows = files.map(file => {
        const fullPath = path.join(WORKFLOWS_DIR, file);
        let content;
        try { content = fs.readFileSync(fullPath, 'utf8'); } catch { return null; }
        const lines = content.split('\n');

        const issues = [];
        let triggers = [];
        let hasTimeout = false;
        let hasWidePerms = false;
        const unpinnedActions = [];
        const secretsUsed = [];
        const deployKeywords = ['deploy', 'release', 'publish', 'push', 'ship'];
        let isDeployWorkflow = false;
        let protectedBranches = [];

        for (const line of lines) {
          const t = line.trim();

          // Triggers
          if (/^\s*on\s*:/.test(line) || /^\s*push\s*:/.test(line) || /^\s*pull_request\s*:/.test(line)) {
            if (t.startsWith('push:'))         triggers.push('push');
            if (t.startsWith('pull_request:')) triggers.push('pull_request');
            if (t.startsWith('schedule:'))     triggers.push('schedule');
            if (t.startsWith('workflow_dispatch:')) triggers.push('manual');
          }

          // Branch filters
          const branchMatch = t.match(/^\s*-\s+['"]?(main|master|develop|release|production|staging)['"]?/);
          if (branchMatch) protectedBranches.push(branchMatch[1]);

          // Timeout
          if (TIMEOUT_RE.test(line)) hasTimeout = true;

          // Wide permissions
          if (PERM_WIDE_RE.test(line)) { hasWidePerms = true; issues.push('Wide permissions (write-all)'); }

          // Unpinned actions
          const unpinnedMatch = line.match(UNPINNED_RE);
          if (unpinnedMatch) unpinnedActions.push(`${unpinnedMatch[1]}@${unpinnedMatch[2]}`);

          // Secrets referenced
          let m;
          while ((m = SECRET_RE.exec(line)) !== null) {
            if (!secretsUsed.includes(m[1])) secretsUsed.push(m[1]);
          }

          // Deploy detection
          const lower = t.toLowerCase();
          if (deployKeywords.some(k => lower.includes(k))) isDeployWorkflow = true;
        }

        // Parse triggers from 'on:' block more reliably
        if (triggers.length === 0) {
          const onMatch = content.match(/^on\s*:\s*\[([^\]]+)\]/m);
          if (onMatch) triggers = onMatch[1].split(',').map(t => t.trim().replace(/['"]/g, ''));
        }

        if (!hasTimeout) issues.push('No job timeout defined');
        if (unpinnedActions.length > 0) issues.push(`${unpinnedActions.length} unpinned action(s)`);

        return {
          file,
          triggers: [...new Set(triggers)],
          hasTimeout,
          hasWidePerms,
          unpinnedActions: [...new Set(unpinnedActions)],
          secretsUsed,
          isDeployWorkflow,
          protectedBranches: [...new Set(protectedBranches)],
          issues,
        };
      }).filter(Boolean);

      // Cross-reference secrets against .env.example
      const examplePath = path.join(workspaceRoot, '.env.example');
      let exampleKeys = [];
      if (fs.existsSync(examplePath)) {
        try {
          exampleKeys = fs.readFileSync(examplePath, 'utf8')
            .split('\n')
            .map(l => l.trim())
            .filter(l => l && !l.startsWith('#') && l.includes('='))
            .map(l => l.split('=')[0].trim());
        } catch {}
      }
      const GITHUB_BUILTIN = new Set(['GITHUB_TOKEN', 'ACTIONS_RUNNER_DEBUG', 'ACTIONS_STEP_DEBUG']);
      const allWorkflowSecrets = [...new Set(workflows.flatMap(w => w.secretsUsed))].filter(s => !GITHUB_BUILTIN.has(s));
      const undocumentedSecrets = allWorkflowSecrets.filter(s => !exampleKeys.includes(s));

      return {
        workflowCount: workflows.length,
        workflows,
        allSecrets: allWorkflowSecrets,
        undocumentedSecrets,
        hasDeployWorkflow: workflows.some(w => w.isDeployWorkflow),
      };
    }

    // ── GitLab CI scan ────────────────────────────────────────────────────
    function scanGitLabCI() {
      const ciPath = path.join(workspaceRoot, '.gitlab-ci.yml');
      if (!fs.existsSync(ciPath)) return null;
      let content;
      try { content = fs.readFileSync(ciPath, 'utf8'); } catch { return null; }
      const lines = content.split('\n');

      const stages = [];
      const jobs = [];
      let currentJob = null;
      const issues = [];

      for (const line of lines) {
        const t = line.trim();
        if (t.startsWith('stages:')) continue;
        // Stage list items
        if (/^\s{2}-\s+\w/.test(line) && !currentJob) stages.push(t.slice(2));
        // Job names (top-level keys that aren't reserved)
        const RESERVED = new Set(['stages', 'variables', 'cache', 'include', 'default', 'workflow', 'image']);
        if (/^\w[\w-]*\s*:/.test(t) && !RESERVED.has(t.replace(':', '').trim())) {
          currentJob = t.replace(':', '').trim();
          jobs.push({ name: currentJob, stage: null, hasTimeout: false, image: null });
        }
        if (currentJob && t.startsWith('stage:')) {
          jobs[jobs.length - 1].stage = t.replace('stage:', '').trim().replace(/['"]/g, '');
        }
        if (currentJob && t.startsWith('timeout:')) jobs[jobs.length - 1].hasTimeout = true;
        if (currentJob && t.startsWith('image:'))   jobs[jobs.length - 1].image = t.replace('image:', '').trim().replace(/['"]/g, '');
      }

      const jobsWithoutTimeout = jobs.filter(j => !j.hasTimeout).map(j => j.name);
      if (jobsWithoutTimeout.length > 0) issues.push(`${jobsWithoutTimeout.length} job(s) without timeout`);

      return { stages, jobCount: jobs.length, jobs, issues };
    }

    // ── Deployment frequency (git log) ────────────────────────────────────
    function getDeploymentMetrics() {
      try {
        const gitDir = path.join(workspaceRoot, '.git');
        if (!fs.existsSync(gitDir)) return null;
        // Commits to main/master in the last 30 days
        const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const out = execSync(
          `git -C "${workspaceRoot}" log --oneline --since="${since}" --no-merges 2>nul || git -C "${workspaceRoot}" log --oneline --since="${since}" --no-merges 2>/dev/null`,
          { encoding: 'utf8', timeout: 5000, stdio: ['pipe', 'pipe', 'ignore'] }
        ).trim();
        const commits = out ? out.split('\n').filter(Boolean).length : 0;
        // Tags (releases)
        const tags = execSync(
          `git -C "${workspaceRoot}" tag --sort=-creatordate 2>nul || git -C "${workspaceRoot}" tag --sort=-creatordate 2>/dev/null`,
          { encoding: 'utf8', timeout: 5000, stdio: ['pipe', 'pipe', 'ignore'] }
        ).trim();
        const tagList = tags ? tags.split('\n').filter(Boolean).slice(0, 5) : [];
        return { commitsLast30Days: commits, recentTags: tagList };
      } catch { return null; }
    }

    // ── Run all scans ─────────────────────────────────────────────────────
    const github    = scanGitHubWorkflows();
    const gitlab    = scanGitLabCI();
    const metrics   = getDeploymentMetrics();
    const providers = detectedProviders;

    // ── Readiness score ───────────────────────────────────────────────────
    const anyCI = providers.some(p => p.exists);
    const ghWorkflows = github?.workflows ?? [];
    const scoreChecks = [
      { id: 'ci_present',         label: 'CI provider configured',                     pass: anyCI },
      { id: 'has_pr_trigger',     label: 'CI runs on pull requests',                   pass: ghWorkflows.some(w => w.triggers.includes('pull_request')) || !!gitlab },
      { id: 'has_deploy',         label: 'Deployment workflow present',                pass: !!github?.hasDeployWorkflow },
      { id: 'timeouts_set',       label: 'Job timeouts configured',                    pass: ghWorkflows.length > 0 && ghWorkflows.every(w => w.hasTimeout) },
      { id: 'actions_pinned',     label: 'Actions pinned to specific versions',        pass: ghWorkflows.length > 0 && ghWorkflows.every(w => w.unpinnedActions.length === 0) },
      { id: 'secrets_documented', label: 'CI secrets documented in .env.example',      pass: !github || github.undocumentedSecrets.length === 0 },
      { id: 'no_wide_perms',      label: 'No overly-wide permissions',                 pass: ghWorkflows.every(w => !w.hasWidePerms) },
    ];
    const passed = scoreChecks.filter(c => c.pass).length;

    return { ok: true, providers, github, gitlab, metrics, score: { passed, total: scoreChecks.length, checks: scoreChecks } };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// ── Monitoring Status ─────────────────────────────────────────────────────────
ipcMain.handle('python:monitoring-status', async () => {
  try {
    const workspaceRoot = getActiveAnalysisRoot();
    const workspaceRelative = (targetPath) => path.relative(workspaceRoot, targetPath).replace(/\\/g, '/');
    // ── Read package.json deps ────────────────────────────────────────────
    function readPackageDeps() {
      const pkgPath = path.join(workspaceRoot, 'package.json');
      if (!fs.existsSync(pkgPath)) return {};
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        return { ...pkg.dependencies, ...pkg.devDependencies };
      } catch { return {}; }
    }

    function readPyDeps() {
      const tomlPath = path.join(workspaceRoot, 'pyproject.toml');
      const reqPath  = path.join(workspaceRoot, 'requirements.txt');
      const deps = [];
      if (fs.existsSync(tomlPath)) {
        try {
          const content = fs.readFileSync(tomlPath, 'utf8');
          const matches = content.match(/["']?([\w\-]+)[\w\-]*[>=<\s]*[\d.]*["']?/g) || [];
          deps.push(...matches.map(m => m.replace(/['">=<\s\d.]/g, '').toLowerCase()));
        } catch {}
      }
      if (fs.existsSync(reqPath)) {
        try {
          const lines = fs.readFileSync(reqPath, 'utf8').split('\n');
          deps.push(...lines.map(l => l.split(/[>=<!]/)[0].trim().toLowerCase()).filter(Boolean));
        } catch {}
      }
      return deps;
    }

    const jsDeps  = readPackageDeps();
    const pyDeps  = readPyDeps();
    const hasDep  = (name) => !!jsDeps[name];
    const hasPyDep = (name) => pyDeps.includes(name.toLowerCase());

    // ── Logging library detection ─────────────────────────────────────────
    const JS_LOGGERS = [
      { id: 'winston',  label: 'Winston',   structured: true  },
      { id: 'pino',     label: 'Pino',      structured: true  },
      { id: 'bunyan',   label: 'Bunyan',    structured: true  },
      { id: 'morgan',   label: 'Morgan',    structured: false },
      { id: 'log4js',   label: 'log4js',    structured: false },
      { id: 'tslog',    label: 'tslog',     structured: true  },
      { id: 'roarr',    label: 'Roarr',     structured: true  },
      { id: 'loglevel', label: 'loglevel',  structured: false },
    ];
    const PY_LOGGERS = [
      { id: 'loguru',              label: 'Loguru',             structured: true  },
      { id: 'structlog',           label: 'structlog',          structured: true  },
      { id: 'python-json-logger',  label: 'python-json-logger', structured: true  },
      { id: 'logbook',             label: 'Logbook',            structured: false },
    ];

    const detectedLoggers = [
      ...JS_LOGGERS.filter(l => hasDep(l.id)).map(l => ({ ...l, lang: 'JS' })),
      ...PY_LOGGERS.filter(l => hasPyDep(l.id)).map(l => ({ ...l, lang: 'PY' })),
    ];
    const hasStdlibLogging = pyDeps.includes('logging') ||
      (() => {
        try {
          const dirs = ['src', 'app', '.'];
          for (const d of dirs) {
            const full = path.join(workspaceRoot, d);
            if (!fs.existsSync(full)) continue;
            const files = fs.readdirSync(full).filter(f => f.endsWith('.py')).slice(0, 5);
            for (const f of files) {
              const c = fs.readFileSync(path.join(full, f), 'utf8');
              if (/import logging/.test(c)) return true;
            }
          }
        } catch {}
        return false;
      })();
    if (hasStdlibLogging && !detectedLoggers.find(l => l.id === 'logging')) {
      detectedLoggers.push({ id: 'logging', label: 'logging (stdlib)', structured: false, lang: 'PY' });
    }
    const hasStructuredLogging = detectedLoggers.some(l => l.structured);

    // ── Error tracking detection ──────────────────────────────────────────
    const ERROR_TRACKERS = [
      { id: '@sentry/node',          label: 'Sentry (Node)',       pkg: 'js' },
      { id: '@sentry/react',         label: 'Sentry (React)',      pkg: 'js' },
      { id: '@sentry/nextjs',        label: 'Sentry (Next.js)',    pkg: 'js' },
      { id: 'rollbar',               label: 'Rollbar',             pkg: 'js' },
      { id: '@bugsnag/js',           label: 'Bugsnag',             pkg: 'js' },
      { id: '@honeybadger-io/js',    label: 'Honeybadger',         pkg: 'js' },
      { id: 'logrocket',             label: 'LogRocket',           pkg: 'js' },
      { id: 'newrelic',              label: 'New Relic (Node)',     pkg: 'js' },
      { id: 'sentry-sdk',            label: 'Sentry (Python)',     pkg: 'py' },
      { id: 'rollbar',               label: 'Rollbar (Python)',    pkg: 'py' },
      { id: 'bugsnag',               label: 'Bugsnag (Python)',    pkg: 'py' },
      { id: 'honeybadger',           label: 'Honeybadger (Python)',pkg: 'py' },
      { id: 'newrelic',              label: 'New Relic (Python)',  pkg: 'py' },
    ];
    const detectedTrackers = ERROR_TRACKERS.filter(t =>
      t.pkg === 'js' ? hasDep(t.id) : hasPyDep(t.id)
    );

    // ── Tracing SDK detection ─────────────────────────────────────────────
    const TRACING_LIBS = [
      { id: '@opentelemetry/api',              label: 'OpenTelemetry API',       pkg: 'js' },
      { id: '@opentelemetry/sdk-node',         label: 'OpenTelemetry SDK (Node)',pkg: 'js' },
      { id: '@opentelemetry/auto-instrumentations-node', label: 'OTel Auto-Instrumentation', pkg: 'js' },
      { id: 'dd-trace',                        label: 'Datadog APM (dd-trace)',  pkg: 'js' },
      { id: 'elastic-apm-node',                label: 'Elastic APM',             pkg: 'js' },
      { id: '@newrelic/telemetry-sdk',         label: 'New Relic Telemetry',     pkg: 'js' },
      { id: 'opentelemetry-api',               label: 'OpenTelemetry API',       pkg: 'py' },
      { id: 'opentelemetry-sdk',               label: 'OpenTelemetry SDK',       pkg: 'py' },
      { id: 'opentelemetry-instrumentation',   label: 'OTel Instrumentation',    pkg: 'py' },
      { id: 'ddtrace',                         label: 'Datadog APM',             pkg: 'py' },
      { id: 'elastic-apm',                     label: 'Elastic APM',             pkg: 'py' },
    ];
    const detectedTracing = TRACING_LIBS.filter(t =>
      t.pkg === 'js' ? hasDep(t.id) : hasPyDep(t.id)
    );

    // ── Metrics exporters detection ───────────────────────────────────────
    const METRICS_LIBS = [
      { id: 'prom-client',                              label: 'prom-client (Prometheus)',   pkg: 'js' },
      { id: 'hot-shots',                                label: 'hot-shots (StatsD/Datadog)', pkg: 'js' },
      { id: 'statsd-client',                            label: 'StatsD client',              pkg: 'js' },
      { id: '@opentelemetry/exporter-prometheus',       label: 'OTel Prometheus exporter',   pkg: 'js' },
      { id: '@opentelemetry/exporter-metrics-otlp-http',label: 'OTel OTLP metrics',          pkg: 'js' },
      { id: 'prometheus-client',                        label: 'prometheus-client',          pkg: 'py' },
      { id: 'statsd',                                   label: 'statsd (Python)',             pkg: 'py' },
      { id: 'datadog',                                  label: 'Datadog (Python)',            pkg: 'py' },
      { id: 'opentelemetry-exporter-prometheus',        label: 'OTel Prometheus (Python)',   pkg: 'py' },
    ];
    const detectedMetrics = METRICS_LIBS.filter(t =>
      t.pkg === 'js' ? hasDep(t.id) : hasPyDep(t.id)
    );

    // ── Health endpoint scan ──────────────────────────────────────────────
    const HEALTH_PATHS = ['/health', '/healthz', '/livez', '/readyz', '/ping', '/status', '/_health'];
    const HEALTH_RE    = new RegExp(`['"\`](${HEALTH_PATHS.map(p => p.replace('/', '\\/')).join('|')})['"\`]`, 'i');
    const SRC_EXTS_H   = new Set(['.js', '.ts', '.jsx', '.tsx', '.mjs', '.py']);
    const SKIP_DIRS_H  = new Set(['node_modules', '.git', 'dist', 'build', '.venv', '__pycache__']);

    function walkForHealth(dir, found, depth = 0) {
      if (depth > 5) return;
      let entries;
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
      for (const e of entries) {
        if (SKIP_DIRS_H.has(e.name)) continue;
        const full = path.join(dir, e.name);
        if (e.isDirectory()) { walkForHealth(full, found, depth + 1); continue; }
        if (!SRC_EXTS_H.has(path.extname(e.name))) continue;
        try {
          const content = fs.readFileSync(full, 'utf8');
          const lines   = content.split('\n');
          for (let i = 0; i < lines.length; i++) {
            if (HEALTH_RE.test(lines[i])) {
              const match = lines[i].match(HEALTH_RE);
              if (match) {
                const relPath = workspaceRelative(full);
                if (!found.find(f => f.path === relPath && f.endpoint === match[1])) {
                  found.push({ path: relPath, endpoint: match[1], line: i + 1 });
                }
              }
            }
          }
        } catch {}
      }
    }

    const healthEndpoints = [];
    walkForHealth(workspaceRoot, healthEndpoints);

    // ── Alert rules detection ─────────────────────────────────────────────
    const ALERT_FILES = [
      { file: 'prometheus.yml',              label: 'Prometheus config'        },
      { file: 'prometheus.yaml',             label: 'Prometheus config'        },
      { file: 'alerts.yml',                  label: 'Alert rules'              },
      { file: 'alerts.yaml',                 label: 'Alert rules'              },
      { file: 'alert_rules.yml',             label: 'Alert rules'              },
      { file: 'alertmanager.yml',            label: 'Alertmanager config'      },
      { file: 'alertmanager.yaml',           label: 'Alertmanager config'      },
      { file: '.datadog-ci.yml',             label: 'Datadog CI config'        },
      { file: 'datadog.yaml',                label: 'Datadog config'           },
      { file: 'datadog.json',                label: 'Datadog config'           },
      { file: 'grafana/provisioning',        label: 'Grafana provisioning',    dir: true },
      { file: 'monitoring',                  label: 'Monitoring directory',    dir: true },
      { file: 'observability',               label: 'Observability directory', dir: true },
    ];

    const detectedAlerts = ALERT_FILES
      .map(a => {
        const full = path.join(workspaceRoot, a.file);
        const exists = a.dir
          ? fs.existsSync(full) && fs.statSync(full).isDirectory()
          : fs.existsSync(full);
        return exists ? { file: a.file, label: a.label } : null;
      })
      .filter(Boolean);

    // ── Readiness score ───────────────────────────────────────────────────
    const scoreChecks = [
      { id: 'has_logger',      label: 'Logging library detected',          pass: detectedLoggers.length > 0 },
      { id: 'structured_logs', label: 'Structured / JSON logging',         pass: hasStructuredLogging },
      { id: 'error_tracking',  label: 'Error tracking integrated',         pass: detectedTrackers.length > 0 },
      { id: 'health_endpoint', label: 'Health endpoint present',           pass: healthEndpoints.length > 0 },
      { id: 'tracing',         label: 'Tracing / APM SDK configured',      pass: detectedTracing.length > 0 },
      { id: 'metrics',         label: 'Metrics exporter configured',       pass: detectedMetrics.length > 0 },
      { id: 'alert_rules',     label: 'Alert rules or dashboards defined', pass: detectedAlerts.length > 0 },
    ];
    const passed = scoreChecks.filter(c => c.pass).length;

    return {
      ok: true,
      logging:        { libraries: detectedLoggers, hasStructured: hasStructuredLogging },
      errorTracking:  detectedTrackers,
      tracing:        detectedTracing,
      metrics:        detectedMetrics,
      healthEndpoints,
      alertRules:     detectedAlerts,
      score:          { passed, total: scoreChecks.length, checks: scoreChecks },
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// ── Data Versioning Status ────────────────────────────────────────────────────
ipcMain.handle('python:data-versioning-status', async () => {
  try {
    const workspaceRoot = getActiveAnalysisRoot();
    const workspaceRelative = (targetPath) => path.relative(workspaceRoot, targetPath).replace(/\\/g, '/');
    // ── Helpers ───────────────────────────────────────────────────────────
    function exists(rel)    { return fs.existsSync(path.join(workspaceRoot, rel)); }
    function isDir(rel)     { try { return fs.statSync(path.join(workspaceRoot, rel)).isDirectory(); } catch { return false; } }
    function readText(rel)  { try { return fs.readFileSync(path.join(workspaceRoot, rel), 'utf8'); } catch { return ''; } }
    function readPkgDeps() {
      try {
        const pkg = JSON.parse(fs.readFileSync(path.join(workspaceRoot, 'package.json'), 'utf8'));
        return { ...pkg.dependencies, ...pkg.devDependencies };
      } catch { return {}; }
    }
    function readPyDeps() {
      const deps = [];
      const toml = readText('pyproject.toml');
      if (toml) deps.push(...(toml.match(/["']?([\w\-]+)[\w\-]*["']?/g) || []).map(m => m.replace(/['"]/g, '').toLowerCase()));
      const req  = readText('requirements.txt');
      if (req)  deps.push(...req.split('\n').map(l => l.split(/[>=<!]/)[0].trim().toLowerCase()).filter(Boolean));
      const reqDev = readText('requirements-dev.txt');
      if (reqDev) deps.push(...reqDev.split('\n').map(l => l.split(/[>=<!]/)[0].trim().toLowerCase()).filter(Boolean));
      return deps;
    }

    const jsDeps   = readPkgDeps();
    const pyDeps   = readPyDeps();
    const hasDep   = (n) => !!jsDeps[n];
    const hasPyDep = (n) => pyDeps.includes(n.toLowerCase());

    // ── DVC detection ─────────────────────────────────────────────────────
    const hasDvcDir      = isDir('.dvc');
    const hasDvcYaml     = exists('dvc.yaml');
    const hasDvcLock     = exists('dvc.lock');
    const hasDvcIgnore   = exists('.dvcignore');
    const dvcConfigText  = readText('.dvc/config');
    const dvcRemotes     = [];
    if (dvcConfigText) {
      const remoteMatches = dvcConfigText.matchAll(/\[core\]|remote\s+"([^"]+)"/g);
      for (const m of remoteMatches) { if (m[1]) dvcRemotes.push(m[1]); }
      // Also detect url lines
      const urlMatches = dvcConfigText.matchAll(/url\s*=\s*(.+)/g);
      for (const m of urlMatches) { if (m[1] && !dvcRemotes.includes(m[1].trim())) dvcRemotes.push(m[1].trim()); }
    }
    const dvcStages  = [];
    if (hasDvcYaml) {
      const dvcYamlText = readText('dvc.yaml');
      const stageMatches = dvcYamlText.matchAll(/^  (\w[\w\-]+):/gm);
      for (const m of stageMatches) dvcStages.push(m[1]);
    }
    // Count .dvc pointer files
    const dvcPointerFiles = [];
    function walkDvcPointers(dir, depth = 0) {
      if (depth > 4) return;
      let entries;
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
      const SKIP = new Set(['node_modules', '.git', 'dist', 'build', '.venv', '__pycache__']);
      for (const e of entries) {
        if (SKIP.has(e.name)) continue;
        const full = path.join(dir, e.name);
        if (e.isDirectory()) { walkDvcPointers(full, depth + 1); continue; }
        if (e.name.endsWith('.dvc')) {
          dvcPointerFiles.push(workspaceRelative(full));
        }
      }
    }
    if (hasDvcDir) walkDvcPointers(workspaceRoot);

    const dvc = {
      found:        hasDvcDir || hasDvcYaml,
      hasDvcDir,
      hasDvcYaml,
      hasDvcLock,
      hasDvcIgnore,
      remotes:      dvcRemotes,
      stages:       dvcStages,
      pointerFiles: dvcPointerFiles,
    };

    // ── Table format detection (Delta Lake, Iceberg, Hudi) ────────────────
    const TABLE_FORMATS = [
      { id: 'delta-spark',         label: 'Delta Lake (PySpark)',   pkg: 'py' },
      { id: 'deltalake',           label: 'Delta Lake (Python)',     pkg: 'py' },
      { id: 'delta',               label: 'Delta Lake (delta)',      pkg: 'py' },
      { id: 'pyiceberg',           label: 'Apache Iceberg',          pkg: 'py' },
      { id: 'apache-iceberg',      label: 'Apache Iceberg',          pkg: 'py' },
      { id: 'hudi',                label: 'Apache Hudi',             pkg: 'py' },
      { id: 'pyspark',             label: 'PySpark',                 pkg: 'py' },
      { id: '@delta-io/delta-sharing', label: 'Delta Sharing',       pkg: 'js' },
    ];
    const detectedFormats = TABLE_FORMATS.filter(f =>
      f.pkg === 'js' ? hasDep(f.id) : hasPyDep(f.id)
    );
    // Also check for _delta_log directories (materialised Delta tables)
    const hasDeltaLog = isDir('_delta_log') || (() => {
      try {
        const entries = fs.readdirSync(workspaceRoot, { withFileTypes: true });
        return entries.some(e => e.isDirectory() && e.name === '_delta_log');
      } catch { return false; }
    })();
    if (hasDeltaLog && !detectedFormats.find(f => f.id === 'delta-spark')) {
      detectedFormats.push({ id: '_delta_log', label: 'Delta Lake (_delta_log found)', pkg: 'fs' });
    }

    // ── Feature store detection ───────────────────────────────────────────
    const FEATURE_STORES = [
      { id: 'feast',             label: 'Feast',               pkg: 'py', configFile: 'feature_store.yaml'       },
      { id: 'tecton',            label: 'Tecton',              pkg: 'py', configFile: null                       },
      { id: 'hopsworks',         label: 'Hopsworks',           pkg: 'py', configFile: null                       },
      { id: 'featureform',       label: 'Featureform',         pkg: 'py', configFile: null                       },
      { id: 'butterfree',        label: 'Butterfree',          pkg: 'py', configFile: null                       },
      { id: 'mlflow',            label: 'MLflow',              pkg: 'py', configFile: null                       },
      { id: 'vertexai',          label: 'Vertex AI',           pkg: 'py', configFile: null                       },
      { id: 'google-cloud-aiplatform', label: 'Vertex AI Feature Store', pkg: 'py', configFile: null            },
    ];
    const detectedFeatureStores = FEATURE_STORES
      .filter(fs_ => (fs_.pkg === 'js' ? hasDep(fs_.id) : hasPyDep(fs_.id)) ||
                     (fs_.configFile && exists(fs_.configFile)))
      .map(fs_ => ({ ...fs_, configFound: !!(fs_.configFile && exists(fs_.configFile)) }));

    // ── Large binary file audit ───────────────────────────────────────────
    const LARGE_EXTS   = new Set(['.pkl', '.pickle', '.pt', '.pth', '.onnx', '.h5', '.hdf5', '.pb', '.bin', '.npy', '.npz']);
    const DATA_EXTS    = new Set(['.parquet', '.csv', '.tsv', '.jsonl', '.arrow', '.feather', '.avro']);
    const SKIP_DIRS_B  = new Set(['node_modules', '.git', 'dist', 'build', '.venv', '__pycache__', '.dvc']);
    const largeModelFiles = [];
    const largeDataFiles  = [];
    const MAX_FILES = 40;

    function walkLargeFiles(dir, depth = 0) {
      if (depth > 4) return;
      if (largeModelFiles.length + largeDataFiles.length >= MAX_FILES) return;
      let entries;
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
      for (const e of entries) {
        if (SKIP_DIRS_B.has(e.name)) continue;
        const full = path.join(dir, e.name);
        if (e.isDirectory()) { walkLargeFiles(full, depth + 1); continue; }
        const ext = path.extname(e.name).toLowerCase();
        if (LARGE_EXTS.has(ext)) {
          try {
            const size = fs.statSync(full).size;
            largeModelFiles.push({ file: workspaceRelative(full), size });
          } catch {}
        } else if (DATA_EXTS.has(ext)) {
          try {
            const size = fs.statSync(full).size;
            largeDataFiles.push({ file: workspaceRelative(full), size });
          } catch {}
        }
      }
    }
    walkLargeFiles(workspaceRoot);

    // Sort by size descending, cap at 10 each
    const fmtSize = (b) => b >= 1e9 ? `${(b/1e9).toFixed(1)} GB` : b >= 1e6 ? `${(b/1e6).toFixed(1)} MB` : `${(b/1024).toFixed(0)} KB`;
    largeModelFiles.sort((a, b) => b.size - a.size);
    largeDataFiles.sort((a, b) => b.size - a.size);
    const modelFiles = largeModelFiles.slice(0, 10).map(f => ({ ...f, sizeLabel: fmtSize(f.size) }));
    const dataFiles  = largeDataFiles.slice(0, 10).map(f => ({ ...f, sizeLabel: fmtSize(f.size) }));
    const untrackedLargeFiles = [...largeModelFiles, ...largeDataFiles].filter(f => {
      // A file is "tracked by DVC" if a corresponding .dvc pointer exists
      return !dvcPointerFiles.some(p => p === f.file + '.dvc' || p.startsWith(path.dirname(f.file)));
    });

    // ── Data contract / schema detection ─────────────────────────────────
    const CONTRACT_FILES = [
      { file: 'data-contract.yaml',  label: 'Data contract (YAML)'          },
      { file: 'data-contract.yml',   label: 'Data contract (YML)'           },
      { file: 'data-contracts',      label: 'Data contracts directory', dir: true },
      { file: 'contracts',           label: 'Contracts directory',      dir: true },
      { file: 'schema.yaml',         label: 'Schema definition (YAML)'      },
      { file: 'schema.yml',          label: 'Schema definition (YML)'       },
      { file: 'schema.json',         label: 'Schema definition (JSON)'      },
      { file: 'schemas',             label: 'Schemas directory',        dir: true },
      { file: 'great_expectations',  label: 'Great Expectations suite', dir: true },
      { file: 'great_expectations.yml', label: 'Great Expectations config'  },
    ];
    const detectedContracts = CONTRACT_FILES
      .map(c => {
        const full = path.join(workspaceRoot, c.file);
        const found = c.dir
          ? fs.existsSync(full) && fs.statSync(full).isDirectory()
          : fs.existsSync(full);
        return found ? { file: c.file, label: c.label } : null;
      })
      .filter(Boolean);

    // Avro / Protobuf schema files
    const schemaFileExts = ['.avsc', '.proto', '.avdl'];
    const schemaFiles = [];
    function walkSchemaFiles(dir, depth = 0) {
      if (depth > 4 || schemaFiles.length > 20) return;
      let entries;
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
      const SKIP = new Set(['node_modules', '.git', 'dist', 'build', '.venv', '__pycache__']);
      for (const e of entries) {
        if (SKIP.has(e.name)) continue;
        const full = path.join(dir, e.name);
        if (e.isDirectory()) { walkSchemaFiles(full, depth + 1); continue; }
        if (schemaFileExts.includes(path.extname(e.name))) {
          schemaFiles.push({ file: workspaceRelative(full), type: path.extname(e.name).slice(1) });
        }
      }
    }
    walkSchemaFiles(workspaceRoot);

    // ── Readiness score ───────────────────────────────────────────────────
    const scoreChecks = [
      { id: 'dvc_configured',    label: 'DVC configured',                    pass: dvc.found },
      { id: 'dvc_remote',        label: 'DVC remote storage defined',        pass: dvc.remotes.length > 0 },
      { id: 'table_format',      label: 'Modern table format (Delta/Iceberg)', pass: detectedFormats.length > 0 },
      { id: 'feature_store',     label: 'Feature store integrated',          pass: detectedFeatureStores.length > 0 },
      { id: 'data_contracts',    label: 'Data contracts or schemas defined', pass: detectedContracts.length > 0 || schemaFiles.length > 0 },
      { id: 'no_large_untracked',label: 'Large files tracked (not loose)',   pass: untrackedLargeFiles.length === 0 || dvc.pointerFiles.length > 0 },
      { id: 'data_validation',   label: 'Data validation framework',         pass: hasPyDep('great-expectations') || hasPyDep('great_expectations') || detectedContracts.some(c => c.label.includes('Great')) },
    ];
    const passed = scoreChecks.filter(c => c.pass).length;

    return {
      ok: true,
      dvc,
      tableFormats:   detectedFormats,
      featureStores:  detectedFeatureStores,
      modelFiles,
      dataFiles,
      untrackedCount: untrackedLargeFiles.length,
      contracts:      detectedContracts,
      schemaFiles,
      score: { passed, total: scoreChecks.length, checks: scoreChecks },
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// ── Model Registry Status ─────────────────────────────────────────────────────
ipcMain.handle('python:model-registry-status', async () => {
  try {
    const workspaceRoot = getActiveAnalysisRoot();
    const workspaceRelative = (targetPath) => path.relative(workspaceRoot, targetPath).replace(/\\/g, '/');
    // ── Helpers ───────────────────────────────────────────────────────────
    function exists(rel)   { return fs.existsSync(path.join(workspaceRoot, rel)); }
    function isDir(rel)    { try { return fs.statSync(path.join(workspaceRoot, rel)).isDirectory(); } catch { return false; } }
    function readText(rel) { try { return fs.readFileSync(path.join(workspaceRoot, rel), 'utf8'); } catch { return ''; } }
    function readPyDeps() {
      const deps = [];
      ['pyproject.toml', 'requirements.txt', 'requirements-dev.txt', 'setup.cfg', 'Pipfile'].forEach(f => {
        const txt = readText(f);
        if (txt) deps.push(...txt.split('\n').map(l => l.split(/[>=<![\s]/)[0].trim().toLowerCase()).filter(l => /^[a-z]/.test(l)));
      });
      return [...new Set(deps)];
    }
    function readJsDeps() {
      try { const p = JSON.parse(readText('package.json')); return { ...p.dependencies, ...p.devDependencies }; } catch { return {}; }
    }

    const pyDeps   = readPyDeps();
    const jsDeps   = readJsDeps();
    const hasPy    = (n) => pyDeps.includes(n.toLowerCase());
    const hasJs    = (n) => !!jsDeps[n];

    // ── Experiment tracking detection ─────────────────────────────────────
    const TRACKERS = [
      { id: 'mlflow',           label: 'MLflow',              url: 'mlflow.org',        pkg: 'py', configFile: null,              dirCheck: 'mlruns' },
      { id: 'wandb',            label: 'Weights & Biases',    url: 'wandb.ai',          pkg: 'py', configFile: null,              dirCheck: 'wandb'  },
      { id: 'neptune',          label: 'Neptune',             url: 'neptune.ai',        pkg: 'py', configFile: '.neptune',        dirCheck: null     },
      { id: 'neptune-client',   label: 'Neptune',             url: 'neptune.ai',        pkg: 'py', configFile: null,              dirCheck: null     },
      { id: 'comet-ml',         label: 'Comet ML',            url: 'comet.ml',          pkg: 'py', configFile: '.comet.config',   dirCheck: null     },
      { id: 'clearml',          label: 'ClearML',             url: 'clear.ml',          pkg: 'py', configFile: 'clearml.conf',    dirCheck: null     },
      { id: 'determined',       label: 'Determined AI',       url: 'determined.ai',     pkg: 'py', configFile: null,              dirCheck: null     },
      { id: 'optuna',           label: 'Optuna',              url: 'optuna.org',        pkg: 'py', configFile: null,              dirCheck: null     },
      { id: 'ray',              label: 'Ray / Ray Tune',      url: 'ray.io',            pkg: 'py', configFile: null,              dirCheck: null     },
      { id: 'tensorboard',      label: 'TensorBoard',         url: 'tensorflow.org',    pkg: 'py', configFile: null,              dirCheck: 'runs'   },
      { id: 'aim',              label: 'Aim',                 url: 'aimstack.io',       pkg: 'py', configFile: null,              dirCheck: '.aim'   },
      { id: 'dvclive',          label: 'DVCLive',             url: 'dvc.org/doc/dvclive',pkg:'py', configFile: 'dvclive',         dirCheck: 'dvclive'},
    ];
    const detectedTrackers = TRACKERS
      .filter((t, idx, arr) => arr.findIndex(x => x.label === t.label && x !== t) === idx || true) // keep all, dedup by label later
      .filter(t => hasPy(t.id) || (t.configFile && exists(t.configFile)) || (t.dirCheck && (isDir(t.dirCheck) || exists(t.dirCheck))))
      .reduce((acc, t) => {              // deduplicate by label
        if (!acc.find(x => x.label === t.label)) acc.push(t);
        return acc;
      }, []);

    // MLflow-specific: parse mlflow.yaml or detect tracking URI env
    const mlflowConfig = readText('mlflow.yaml') || readText('.mlflow/config');
    const mlflowTrackingUri = mlflowConfig.match(/tracking_uri\s*[:=]\s*(.+)/)?.[1]?.trim() || null;
    const mlrunsFound = isDir('mlruns');
    const mlflowRegisteredModelsDir = isDir('mlruns/models') || (() => {
      try {
        const mlrunsPath = path.join(workspaceRoot, 'mlruns');
        if (!fs.existsSync(mlrunsPath)) return false;
        // If any subdirectory has a RegisteredModels or models dir it's using the registry
        const entries = fs.readdirSync(mlrunsPath, { withFileTypes: true });
        return entries.some(e => e.isDirectory() && (e.name === 'models' || e.name === '.trash'));
      } catch { return false; }
    })();

    // ── Model serving / registry detection ───────────────────────────────
    const SERVING = [
      { id: 'bentoml',           label: 'BentoML',             pkg: 'py', configFile: 'bentofile.yaml'    },
      { id: 'seldon-core',       label: 'Seldon Core',         pkg: 'py', configFile: null                },
      { id: 'kserve',            label: 'KServe',              pkg: 'py', configFile: null                },
      { id: 'torchserve',        label: 'TorchServe',          pkg: 'py', configFile: 'config.properties' },
      { id: 'fastapi',           label: 'FastAPI (serving)',   pkg: 'py', configFile: null                },
      { id: 'tritonclient',      label: 'Triton Inference',    pkg: 'py', configFile: null                },
      { id: 'grpc',              label: 'gRPC (model API)',    pkg: 'py', configFile: null                },
      { id: 'onnxruntime',       label: 'ONNX Runtime',        pkg: 'py', configFile: null                },
      { id: 'onnxruntime-gpu',   label: 'ONNX Runtime (GPU)',  pkg: 'py', configFile: null                },
      { id: 'huggingface-hub',   label: 'Hugging Face Hub',    pkg: 'py', configFile: null                },
      { id: 'transformers',      label: 'Transformers (HF)',   pkg: 'py', configFile: null                },
    ];
    // Also check for Triton config.pbtxt files
    const tritonConfigs = [];
    function walkTriton(dir, depth = 0) {
      if (depth > 4 || tritonConfigs.length > 10) return;
      let entries;
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
        const SKIP = new Set(['node_modules', '.git', 'dist', 'build', '.venv', '__pycache__']);
      for (const e of entries) {
        if (SKIP.has(e.name)) continue;
        if (e.isDirectory()) { walkTriton(path.join(dir, e.name), depth + 1); continue; }
        if (e.name === 'config.pbtxt') tritonConfigs.push(workspaceRelative(path.join(dir, e.name)));
      }
    }
    walkTriton(workspaceRoot);

    const detectedServing = SERVING
      .filter(s => hasPy(s.id) || (s.configFile && exists(s.configFile)))
      .reduce((acc, s) => { if (!acc.find(x => x.label === s.label)) acc.push(s); return acc; }, []);
    if (tritonConfigs.length > 0 && !detectedServing.find(s => s.id === 'tritonclient')) {
      detectedServing.push({ id: 'triton-config', label: 'Triton Inference Server', pkg: 'fs', configFile: null });
    }

    // ── Model artifact audit ──────────────────────────────────────────────
    const MODEL_EXTS  = new Set(['.pkl', '.pickle', '.pt', '.pth', '.onnx', '.h5', '.hdf5', '.pb', '.bin', '.safetensors', '.ckpt', '.joblib', '.cbm', '.xgb']);
    const SKIP_M      = new Set(['node_modules', '.git', 'dist', 'build', '.venv', '__pycache__', 'mlruns']);
    const modelArtifacts = [];

    function walkArtifacts(dir, depth = 0) {
      if (depth > 5 || modelArtifacts.length > 30) return;
      let entries;
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
      for (const e of entries) {
        if (SKIP_M.has(e.name)) continue;
        const full = path.join(dir, e.name);
        if (e.isDirectory()) { walkArtifacts(full, depth + 1); continue; }
        if (MODEL_EXTS.has(path.extname(e.name).toLowerCase())) {
          try {
            const size = fs.statSync(full).size;
            modelArtifacts.push({ file: workspaceRelative(full), size });
          } catch {}
        }
      }
    }
    walkArtifacts(workspaceRoot);
    modelArtifacts.sort((a, b) => b.size - a.size);
    const fmtSize = (b) => b >= 1e9 ? `${(b/1e9).toFixed(1)} GB` : b >= 1e6 ? `${(b/1e6).toFixed(1)} MB` : `${(b/1024).toFixed(0)} KB`;
    const topArtifacts = modelArtifacts.slice(0, 12).map(f => ({ ...f, sizeLabel: fmtSize(f.size) }));

    // ── Model card detection ──────────────────────────────────────────────
    const MODEL_CARD_FILES = [
      'MODEL_CARD.md', 'model_card.md', 'modelcard.md',
      'MODEL_CARD.yaml', 'model_card.yaml',
    ];
    const modelCardFiles = MODEL_CARD_FILES.filter(f => exists(f));
    // Also check README.md for model card sections
    const readmeText = readText('README.md');
    const hasModelCardSection = /#+\s*(model\s+card|model\s+details|model\s+description|intended\s+use)/i.test(readmeText);
    // Hugging Face README.md YAML front-matter
    const hasHFModelCard = readmeText.startsWith('---') && /license:|language:|tags:|datasets:/i.test(readmeText.slice(0, 500));

    // ── Reproducibility checks ────────────────────────────────────────────
    // Lock files
    const lockFiles = [
      { file: 'poetry.lock',    label: 'poetry.lock'    },
      { file: 'Pipfile.lock',   label: 'Pipfile.lock'   },
      { file: 'requirements.txt', label: 'requirements.txt' },
      { file: 'package-lock.json', label: 'package-lock.json' },
      { file: 'yarn.lock',      label: 'yarn.lock'      },
      { file: 'conda-lock.yml', label: 'conda-lock.yml' },
      { file: 'environment.yml',label: 'environment.yml (conda)' },
    ].filter(l => exists(l.file));

    // Random seed usage in source
    const SEED_RE = /(?:random\.seed|np\.random\.seed|torch\.manual_seed|tf\.random\.set_seed|random_state\s*=|seed\s*=\s*\d)/;
    let hasSeedUsage = false;
    function walkForSeed(dir, depth = 0) {
      if (depth > 4 || hasSeedUsage) return;
      let entries;
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
      const SKIP = new Set(['node_modules', '.git', 'dist', 'build', '.venv', '__pycache__', 'mlruns']);
      for (const e of entries) {
        if (SKIP.has(e.name) || hasSeedUsage) continue;
        const full = path.join(dir, e.name);
        if (e.isDirectory()) { walkForSeed(full, depth + 1); continue; }
        if (!['.py', '.ipynb'].includes(path.extname(e.name))) continue;
        try {
          const content = fs.readFileSync(full, 'utf8');
          if (SEED_RE.test(content)) { hasSeedUsage = true; return; }
        } catch {}
      }
    }
    walkForSeed(workspaceRoot);

    // Training script detection
    const TRAINING_SCRIPTS = ['train.py', 'training.py', 'fit.py', 'run_training.py', 'train.sh', 'train.ipynb'];
    const trainingScripts = TRAINING_SCRIPTS.filter(f => exists(f));
    // Also check for trainer/ or training/ dirs
    const hasTrainingDir = isDir('trainer') || isDir('training') || isDir('scripts');

    // ── Readiness score ───────────────────────────────────────────────────
    const hasModelCard = modelCardFiles.length > 0 || hasModelCardSection || hasHFModelCard;
    const scoreChecks = [
      { id: 'experiment_tracking', label: 'Experiment tracker configured',   pass: detectedTrackers.length > 0                     },
      { id: 'model_registry',      label: 'Model registry or serving layer', pass: detectedServing.length > 0 || mlflowRegisteredModelsDir },
      { id: 'model_card',          label: 'Model card documented',           pass: hasModelCard                                    },
      { id: 'env_pinned',          label: 'Environment pinned (lock file)',   pass: lockFiles.length > 0                           },
      { id: 'seed_pinned',         label: 'Random seed set for reproducibility', pass: hasSeedUsage                               },
      { id: 'training_script',     label: 'Training script present',         pass: trainingScripts.length > 0 || hasTrainingDir   },
      { id: 'artifacts_managed',   label: 'Artifacts tracked (not loose)',   pass: modelArtifacts.length === 0 || mlrunsFound || detectedTrackers.length > 0 },
    ];
    const passed = scoreChecks.filter(c => c.pass).length;

    return {
      ok: true,
      trackers:       detectedTrackers,
      mlflow:         { found: hasPy('mlflow') || mlrunsFound, trackingUri: mlflowTrackingUri, mlrunsFound, registryFound: mlflowRegisteredModelsDir },
      serving:        detectedServing,
      tritonConfigs,
      artifacts:      topArtifacts,
      artifactTotal:  modelArtifacts.length,
      modelCard:      { files: modelCardFiles, hasReadmeSection: hasModelCardSection, isHFCard: hasHFModelCard },
      reproducibility:{ lockFiles, hasSeedUsage, trainingScripts, hasTrainingDir },
      score:          { passed, total: scoreChecks.length, checks: scoreChecks },
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// ── Disaster Recovery Status ──────────────────────────────────────────────────
ipcMain.handle('python:disaster-recovery-status', async () => {
  try {
    const workspaceRoot = getActiveAnalysisRoot();
    const workspaceRelative = (targetPath) => path.relative(workspaceRoot, targetPath).replace(/\\/g, '/');
    // ── Helpers ───────────────────────────────────────────────────────────
    function exists(rel)    { return fs.existsSync(path.join(workspaceRoot, rel)); }
    function isDir(rel)     { try { return fs.statSync(path.join(workspaceRoot, rel)).isDirectory(); } catch { return false; } }
    function readText(rel)  { try { return fs.readFileSync(path.join(workspaceRoot, rel), 'utf8'); } catch { return ''; } }
    function readPyDeps()   {
      const deps = [];
      ['pyproject.toml','requirements.txt','requirements-dev.txt','setup.cfg','Pipfile'].forEach(f => {
        const txt = readText(f);
        if (txt) deps.push(...txt.split('\n').map(l => l.split(/[>=<![\s]/)[0].trim().toLowerCase()).filter(l => /^[a-z]/.test(l)));
      });
      return [...new Set(deps)];
    }
    function readJsDeps() {
      try { const p = JSON.parse(readText('package.json')); return { ...p.dependencies, ...p.devDependencies }; } catch { return {}; }
    }

    const pyDeps = readPyDeps();
    const jsDeps = readJsDeps();
    const hasPy  = (n) => pyDeps.includes(n.toLowerCase());
    const hasJs  = (n) => !!jsDeps[n];

    // ── Backup configuration detection ────────────────────────────────────
    const BACKUP_FILES = [
      { file: 'backup.sh',            label: 'Backup shell script'               },
      { file: 'backup.py',            label: 'Backup Python script'              },
      { file: 'scripts/backup.sh',    label: 'Backup script (scripts/)'          },
      { file: 'scripts/backup.py',    label: 'Backup script (scripts/)'          },
      { file: '.velero',              label: 'Velero config',        dir: true    },
      { file: 'velero',               label: 'Velero manifests',     dir: true    },
      { file: 's3-lifecycle.json',    label: 'S3 lifecycle rules'                },
      { file: 'lifecycle.json',       label: 'S3 lifecycle rules'                },
      { file: '.aws/config',          label: 'AWS config profile'                },
      { file: 'restic.sh',            label: 'Restic backup script'              },
      { file: '.restic',              label: 'Restic config',        dir: true    },
      { file: 'borg-backup.sh',       label: 'Borg backup script'                },
      { file: 'backup',               label: 'Backup directory',     dir: true    },
      { file: 'backups',              label: 'Backups directory',    dir: true    },
    ];
    const detectedBackups = BACKUP_FILES
      .map(b => {
        const full  = path.join(workspaceRoot, b.file);
        const found = b.dir
          ? fs.existsSync(full) && fs.statSync(full).isDirectory()
          : fs.existsSync(full);
        return found ? { file: b.file, label: b.label } : null;
      })
      .filter(Boolean);

    // Scan shell scripts for pg_dump, mysqldump, mongodump, restic, aws s3 cp
    const BACKUP_CMDS = /\b(pg_dump|pg_dumpall|mysqldump|mongodump|mongorestore|restic\s+backup|aws\s+s3\s+(cp|sync)|gsutil\s+cp|rclone\s+sync|borgbackup|borg\s+create)\b/;
    const backupScripts = [];
    function walkForBackupScripts(dir, depth = 0) {
      if (depth > 4 || backupScripts.length > 10) return;
      let entries;
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
      const SKIP = new Set(['node_modules', '.git', 'dist', 'build', '.venv', '__pycache__', 'mlruns']);
      for (const e of entries) {
        if (SKIP.has(e.name)) continue;
        const full = path.join(dir, e.name);
        if (e.isDirectory()) { walkForBackupScripts(full, depth + 1); continue; }
        if (!['.sh', '.bash', '.py', '.sql'].includes(path.extname(e.name).toLowerCase())) continue;
        try {
            const content = fs.readFileSync(full, 'utf8');
          if (BACKUP_CMDS.test(content)) {
            const rel = workspaceRelative(full);
            const match = content.match(BACKUP_CMDS);
            if (!backupScripts.find(s => s.file === rel)) {
              backupScripts.push({ file: rel, tool: match ? match[1].split(/\s/)[0] : 'unknown' });
            }
          }
        } catch {}
      }
    }
    walkForBackupScripts(workspaceRoot);

    // Velero via py dep or k8s manifest check
    const hasVelero = hasPy('velero') || detectedBackups.some(b => b.label.includes('Velero')) ||
      (() => {
        // Walk for velero k8s manifests
        let found = false;
        function walkVelero(dir, depth = 0) {
          if (depth > 4 || found) return;
          let entries;
          try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
          const SKIP = new Set(['node_modules', '.git', '.venv', '__pycache__']);
          for (const e of entries) {
            if (SKIP.has(e.name) || found) continue;
            if (e.isDirectory()) { walkVelero(path.join(dir, e.name), depth + 1); continue; }
            if (['.yaml', '.yml'].includes(path.extname(e.name))) {
              try {
                const c = fs.readFileSync(path.join(dir, e.name), 'utf8');
                if (/kind:\s*(Backup|Schedule|Restore|BackupStorageLocation)/i.test(c) &&
                    /velero/i.test(c)) { found = true; }
              } catch {}
            }
          }
        }
        walkVelero(workspaceRoot);
        return found;
      })();

    // ── Runbook & incident response detection ─────────────────────────────
    const RUNBOOK_FILES = [
      { file: 'RUNBOOK.md',              label: 'Runbook'                     },
      { file: 'runbook.md',              label: 'Runbook'                     },
      { file: 'runbooks',                label: 'Runbooks directory', dir: true},
      { file: 'INCIDENT.md',             label: 'Incident response'           },
      { file: 'INCIDENT_RESPONSE.md',    label: 'Incident response'           },
      { file: 'incident_response.md',    label: 'Incident response'           },
      { file: 'ON_CALL.md',              label: 'On-call guide'               },
      { file: 'oncall.md',               label: 'On-call guide'               },
      { file: 'OPERATIONS.md',           label: 'Operations guide'            },
      { file: 'ops',                     label: 'Ops directory',    dir: true  },
      { file: 'docs/runbook.md',         label: 'Runbook (docs/)'             },
      { file: 'docs/incident.md',        label: 'Incident response (docs/)'   },
      { file: 'docs/runbooks',           label: 'Runbooks (docs/)', dir: true  },
      { file: 'wiki',                    label: 'Wiki directory',   dir: true  },
      { file: 'playbooks',               label: 'Playbooks directory', dir: true },
    ];
    const detectedRunbooks = RUNBOOK_FILES
      .map(r => {
        const full  = path.join(workspaceRoot, r.file);
        const found = r.dir
          ? fs.existsSync(full) && fs.statSync(full).isDirectory()
          : fs.existsSync(full);
        return found ? { file: r.file, label: r.label } : null;
      })
      .filter(Boolean)
      .reduce((acc, r) => { if (!acc.find(x => x.label === r.label)) acc.push(r); return acc; }, []);

    // ── RTO / RPO documentation detection ────────────────────────────────
    const RTO_RPO_RE  = /\b(RTO|RPO|recovery\s+time|recovery\s+point|failover\s+time|mean\s+time\s+to\s+recover|MTTR|MTTF|SLA|SLO|SLI)\b/i;
    const SLA_FILES   = ['SLA.md', 'sla.md', 'SLO.md', 'slo.md', 'docs/sla.md', 'docs/slo.md', 'SERVICE_LEVEL.md'];
    const detectedSLA = SLA_FILES.filter(f => exists(f));
    let rtoRpoInDocs  = false;
    // Check README and any found runbook files
    const docsToCheck = ['README.md', 'RUNBOOK.md', 'runbook.md', 'OPERATIONS.md', ...detectedRunbooks.map(r => r.file)];
    for (const f of docsToCheck) {
      const txt = readText(f);
      if (txt && RTO_RPO_RE.test(txt)) { rtoRpoInDocs = true; break; }
    }
    const hasRtoDocs = detectedSLA.length > 0 || rtoRpoInDocs;

    // ── Failover / HA detection ───────────────────────────────────────────
    const haConfigs = [];
    // Check K8s manifests for PodDisruptionBudget, topologySpreadConstraints, replicas > 1
    const K8S_HA_RE  = /kind:\s*(PodDisruptionBudget|HorizontalPodAutoscaler)|topologySpreadConstraints|replicas:\s*[2-9]\d*/;
    function walkForHA(dir, depth = 0) {
      if (depth > 5 || haConfigs.length > 15) return;
      let entries;
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
      const SKIP = new Set(['node_modules', '.git', 'dist', 'build', '.venv', '__pycache__', 'mlruns']);
      for (const e of entries) {
        if (SKIP.has(e.name)) continue;
        const full = path.join(dir, e.name);
        if (e.isDirectory()) { walkForHA(full, depth + 1); continue; }
        if (!['.yaml', '.yml', '.tf', '.hcl'].includes(path.extname(e.name).toLowerCase())) continue;
        try {
          const content = fs.readFileSync(full, 'utf8');
          const rel     = workspaceRelative(full);
          if (K8S_HA_RE.test(content)) {
            const match  = content.match(/kind:\s*(\w+)/);
            const reason = content.match(K8S_HA_RE)?.[0]?.slice(0, 40) || 'HA config';
            if (!haConfigs.find(c => c.file === rel)) haConfigs.push({ file: rel, reason });
          }
          // Terraform: multi-region (provider with region, count > 1)
          if (/provider\s+"aws"/.test(content) && /region\s*=/.test(content)) {
            if (!haConfigs.find(c => c.file === rel))
              haConfigs.push({ file: rel, reason: 'AWS provider (Terraform)' });
          }
        } catch {}
      }
    }
    walkForHA(workspaceRoot);

    // nginx / haproxy configs
    const PROXY_FILES = ['nginx.conf', 'haproxy.cfg', 'haproxy.conf', 'nginx', 'traefik.yml', 'traefik.yaml'];
    const proxyFiles  = PROXY_FILES.filter(f => exists(f) || isDir(f));

    // ── Chaos engineering detection ───────────────────────────────────────
    const CHAOS_LIBS = [
      { id: 'chaostoolkit',             label: 'Chaos Toolkit',        pkg: 'py' },
      { id: 'chaostoolkit-kubernetes',  label: 'Chaos Toolkit (K8s)',  pkg: 'py' },
      { id: 'chaostoolkit-aws',         label: 'Chaos Toolkit (AWS)',  pkg: 'py' },
      { id: 'gremlin',                  label: 'Gremlin',              pkg: 'py' },
      { id: 'chaos-monkey',             label: 'Chaos Monkey',         pkg: 'js' },
      { id: 'node-chaos',               label: 'node-chaos',           pkg: 'js' },
    ];
    const detectedChaos = CHAOS_LIBS.filter(c => c.pkg === 'py' ? hasPy(c.id) : hasJs(c.id));

    // Check for chaos/ dir or Litmus ChaosEngine manifests
    const hasChaosDir  = isDir('chaos') || isDir('chaosengineering');
    const chaosManifests = [];
    function walkForChaos(dir, depth = 0) {
      if (depth > 4 || chaosManifests.length > 5) return;
      let entries;
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
      const SKIP = new Set(['node_modules', '.git', 'dist', 'build', '.venv', '__pycache__']);
      for (const e of entries) {
        if (SKIP.has(e.name)) continue;
        const full = path.join(dir, e.name);
        if (e.isDirectory()) { walkForChaos(full, depth + 1); continue; }
        if (['.yaml', '.yml'].includes(path.extname(e.name))) {
          try {
            const content = fs.readFileSync(full, 'utf8');
            if (/kind:\s*(ChaosEngine|ChaosExperiment|ChaosResult)/i.test(content)) {
              chaosManifests.push(workspaceRelative(full));
            }
          } catch {}
        }
      }
    }
    walkForChaos(workspaceRoot);

    // ── Readiness score ───────────────────────────────────────────────────
    const hasBackup    = detectedBackups.length > 0 || backupScripts.length > 0 || hasVelero;
    const hasRunbook   = detectedRunbooks.length > 0;
    const hasHA        = haConfigs.length > 0 || proxyFiles.length > 0;
    const hasChaos     = detectedChaos.length > 0 || hasChaosDir || chaosManifests.length > 0;

    const scoreChecks = [
      { id: 'backup_config',   label: 'Backup configuration found',         pass: hasBackup    },
      { id: 'runbook',         label: 'Runbook / incident docs present',    pass: hasRunbook   },
      { id: 'rto_rpo',         label: 'RTO / RPO objectives documented',    pass: hasRtoDocs   },
      { id: 'ha_config',       label: 'HA / failover configuration found',  pass: hasHA        },
      { id: 'chaos',           label: 'Chaos engineering tooling',          pass: hasChaos     },
      { id: 'velero',          label: 'Kubernetes backup (Velero)',          pass: hasVelero    },
      { id: 'sla_defined',     label: 'SLA / SLO objectives defined',       pass: detectedSLA.length > 0 },
    ];
    const passed = scoreChecks.filter(c => c.pass).length;

    return {
      ok: true,
      backup:      { configs: detectedBackups, scripts: backupScripts, velero: hasVelero },
      runbooks:    detectedRunbooks,
      rtoRpo:      { hasDocs: hasRtoDocs, slaFiles: detectedSLA, foundInDocs: rtoRpoInDocs },
      ha:          { configs: haConfigs, proxyFiles },
      chaos:       { libs: detectedChaos, hasDir: hasChaosDir, manifests: chaosManifests },
      score:       { passed, total: scoreChecks.length, checks: scoreChecks },
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// ── Audit Logging Status ──────────────────────────────────────────────────────
ipcMain.handle('python:audit-logging-status', async () => {
  try {
    const workspaceRoot = getActiveAnalysisRoot();
    const workspaceRelative = (targetPath) => path.relative(workspaceRoot, targetPath).replace(/\\/g, '/');
    // ── Helpers ───────────────────────────────────────────────────────────
    function exists(rel)    { return fs.existsSync(path.join(workspaceRoot, rel)); }
    function isDir(rel)     { try { return fs.statSync(path.join(workspaceRoot, rel)).isDirectory(); } catch { return false; } }
    function readText(rel)  { try { return fs.readFileSync(path.join(workspaceRoot, rel), 'utf8'); } catch { return ''; } }
    function readPyDeps() {
      const deps = [];
      ['pyproject.toml','requirements.txt','requirements-dev.txt','setup.cfg','Pipfile'].forEach(f => {
        const txt = readText(f);
        if (txt) deps.push(...txt.split('\n').map(l => l.split(/[>=<![\s]/)[0].trim().toLowerCase()).filter(l => /^[a-z]/.test(l)));
      });
      return [...new Set(deps)];
    }
    function readJsDeps() {
      try { const p = JSON.parse(readText('package.json')); return { ...p.dependencies, ...p.devDependencies }; } catch { return {}; }
    }

    const pyDeps = readPyDeps();
    const jsDeps = readJsDeps();
    const hasPy  = (n) => pyDeps.includes(n.toLowerCase());
    const hasJs  = (n) => !!jsDeps[n];

    // ── Audit library detection ───────────────────────────────────────────
    const AUDIT_LIBS = [
      // JS / Node
      { id: 'audit-log',              label: 'audit-log',                  pkg: 'js', structured: true  },
      { id: 'express-audit-log',      label: 'express-audit-log',          pkg: 'js', structured: true  },
      { id: 'node-audit-logger',      label: 'node-audit-logger',          pkg: 'js', structured: true  },
      { id: 'winston-audit',          label: 'winston-audit',              pkg: 'js', structured: true  },
      { id: 'pino-http',              label: 'pino-http (request logging)', pkg: 'js', structured: true  },
      { id: 'morgan',                 label: 'Morgan (HTTP audit)',         pkg: 'js', structured: false },
      { id: 'sequelize-audit',        label: 'sequelize-audit',            pkg: 'js', structured: true  },
      { id: 'typeorm-auditing',       label: 'typeorm-auditing',           pkg: 'js', structured: true  },
      { id: 'mongoose-audit-trail',   label: 'mongoose-audit-trail',       pkg: 'js', structured: true  },
      // Python
      { id: 'django-auditlog',        label: 'django-auditlog',            pkg: 'py', structured: true  },
      { id: 'django-simple-history',  label: 'django-simple-history',      pkg: 'py', structured: true  },
      { id: 'auditlog',               label: 'auditlog',                   pkg: 'py', structured: true  },
      { id: 'sqlalchemy-history',     label: 'SQLAlchemy-history',         pkg: 'py', structured: true  },
      { id: 'flask-audit',            label: 'flask-audit',                pkg: 'py', structured: true  },
      { id: 'audit-python',           label: 'audit-python',               pkg: 'py', structured: true  },
    ];
    const detectedLibs = AUDIT_LIBS.filter(l => l.pkg === 'js' ? hasJs(l.id) : hasPy(l.id));
    const hasStructuredAudit = detectedLibs.some(l => l.structured);

    // ── Audit call patterns in source ─────────────────────────────────────
    const AUDIT_CALL_RE = /\b(audit(?:Log|log|Event|Trail|trail|Record)?[.(]|log_audit|audit_log[.(]|logAudit[.(]|createAuditEntry|recordAudit|writeAudit)\b/;
    const auditCallFiles = [];
    const DB_MUTATE_RE   = /\b(\.save\(|\.create\(|\.update\(|\.delete\(|\.destroy\(|\.remove\(|\.insert\(|\.upsert\(|INSERT\s+INTO|UPDATE\s+\w|DELETE\s+FROM|db\.run\(|db\.exec\(|cursor\.execute\()\b/i;
    const mutationFiles  = [];
    const mutationsWithAudit = [];

    const SRC_EXTS = new Set(['.js', '.ts', '.jsx', '.tsx', '.mjs', '.py']);
    const SKIP     = new Set(['node_modules', '.git', 'dist', 'build', '.venv', '__pycache__', 'mlruns']);

    function walkSource(dir, depth = 0) {
      if (depth > 5) return;
      let entries;
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
      for (const e of entries) {
        if (SKIP.has(e.name)) continue;
        const full = path.join(dir, e.name);
        if (e.isDirectory()) { walkSource(full, depth + 1); continue; }
        if (!SRC_EXTS.has(path.extname(e.name))) continue;
        try {
          const content = fs.readFileSync(full, 'utf8');
          const rel     = workspaceRelative(full);
          const hasAuditCall = AUDIT_CALL_RE.test(content);
          const hasMutation  = DB_MUTATE_RE.test(content);
          if (hasAuditCall) auditCallFiles.push(rel);
          if (hasMutation)  {
            mutationFiles.push(rel);
            if (hasAuditCall) mutationsWithAudit.push(rel);
          }
        } catch {}
      }
    }
    walkSource(workspaceRoot);

    const mutationCoverage = mutationFiles.length > 0
      ? Math.round((mutationsWithAudit.length / mutationFiles.length) * 100)
      : 100; // no mutations found = no gap

    // ── Log retention policy detection ───────────────────────────────────
    const RETENTION_FILES = [
      { file: 'loki.yaml',                label: 'Loki config'                  },
      { file: 'loki-config.yaml',         label: 'Loki config'                  },
      { file: 'loki.yml',                 label: 'Loki config'                  },
      { file: 'logging.yaml',             label: 'Cloud logging config'         },
      { file: 'logging.yml',              label: 'Cloud logging config'         },
      { file: 'cloud-logging.yaml',       label: 'Cloud logging config'         },
      { file: 'cloudwatch.json',          label: 'CloudWatch config'            },
      { file: 'cloudwatch.yaml',          label: 'CloudWatch config'            },
      { file: 'fluent.conf',              label: 'Fluentd config'               },
      { file: 'fluentd.conf',             label: 'Fluentd config'               },
      { file: '.fluentd',                 label: 'Fluentd config',  dir: true   },
      { file: 'logstash.conf',            label: 'Logstash config'              },
      { file: 'logstash.yml',             label: 'Logstash config'              },
      { file: 'pipelines.yml',            label: 'Logstash pipelines'           },
      { file: 'vector.toml',              label: 'Vector config'                },
      { file: 'vector.yaml',              label: 'Vector config'                },
      { file: 'logrotate.conf',           label: 'Logrotate config'             },
      { file: '/etc/logrotate.d',         label: 'Logrotate rules',  dir: true  },
      { file: 'filebeat.yml',             label: 'Filebeat config'              },
      { file: 'filebeat.yaml',            label: 'Filebeat config'              },
    ];
    const detectedRetention = RETENTION_FILES
      .map(r => {
        const full = path.join(workspaceRoot, r.file);
        const found = r.dir
          ? fs.existsSync(full) && fs.statSync(full).isDirectory()
          : fs.existsSync(full);
        return found ? { file: r.file, label: r.label } : null;
      })
      .filter(Boolean)
      .reduce((acc, r) => { if (!acc.find(x => x.label === r.label)) acc.push(r); return acc; }, []);

    // Also check k8s / docker-compose for log driver config
    const LOG_DRIVER_RE = /log.?driver|logging\.driver|logDriver|fluentd|splunk|awslogs|gelf/i;
    const logDriverFiles = [];
    function walkForLogDriver(dir, depth = 0) {
      if (depth > 4 || logDriverFiles.length > 5) return;
      let entries;
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
      const SKIP2 = new Set(['node_modules', '.git', 'dist', 'build', '.venv', '__pycache__']);
      for (const e of entries) {
        if (SKIP2.has(e.name)) continue;
        const full = path.join(dir, e.name);
        if (e.isDirectory()) { walkForLogDriver(full, depth + 1); continue; }
        if (!['.yaml','.yml','.json'].includes(path.extname(e.name))) continue;
        try {
          const c = fs.readFileSync(full, 'utf8');
          if (LOG_DRIVER_RE.test(c)) {
            logDriverFiles.push(workspaceRelative(full));
          }
        } catch {}
      }
    }
    walkForLogDriver(workspaceRoot);

    // ── PII risk scanner ──────────────────────────────────────────────────
    // Look for log calls that pass potentially-PII objects/strings
    const PII_LOG_RE = /(?:console\.log|logger\.\w+|log\.\w+|logging\.\w+)\s*\([^)]*(?:password|passwd|secret|api.?key|token|ssn|social.?security|credit.?card|card.?number|cvv|email.*user|user.*email|phone|dob|date.?of.?birth|JSON\.stringify\s*\(\s*(?:req\.body|user|payload|data))/i;
    const piiRisks = [];

    function walkForPII(dir, depth = 0) {
      if (depth > 5 || piiRisks.length > 20) return;
      let entries;
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
      for (const e of entries) {
        if (SKIP.has(e.name)) continue;
        const full = path.join(dir, e.name);
        if (e.isDirectory()) { walkForPII(full, depth + 1); continue; }
        if (!SRC_EXTS.has(path.extname(e.name))) continue;
        try {
          const lines = fs.readFileSync(full, 'utf8').split('\n');
          const rel   = workspaceRelative(full);
          for (let i = 0; i < lines.length; i++) {
            if (PII_LOG_RE.test(lines[i]) && !piiRisks.find(p => p.file === rel)) {
              const match = lines[i].match(PII_LOG_RE);
              piiRisks.push({ file: rel, line: i + 1, snippet: match ? match[0].slice(0, 60) : lines[i].trim().slice(0, 60) });
            }
          }
        } catch {}
      }
    }
    walkForPII(workspaceRoot);

    // ── Compliance framework detection ────────────────────────────────────
    const COMPLIANCE_RE = {
      'SOC 2':    /\bSOC\s*2\b/i,
      'GDPR':     /\bGDPR\b/i,
      'HIPAA':    /\bHIPAA\b/i,
      'PCI DSS':  /\bPCI[\s-]DSS\b|\bPCI\b/i,
      'ISO 27001':/\bISO\s*27001\b/i,
      'CCPA':     /\bCCPA\b/i,
      'NIST':     /\bNIST\b/i,
    };
    const COMPLIANCE_DOCS = ['COMPLIANCE.md','compliance.md','SECURITY.md','security.md','docs/compliance.md','docs/security.md','PRIVACY.md','privacy.md','docs/gdpr.md','docs/privacy.md'];
    const complianceFiles = COMPLIANCE_DOCS.filter(f => exists(f));

    const mentionedFrameworks = [];
    const docTexts = [...complianceFiles, 'README.md', 'RUNBOOK.md'].map(f => readText(f)).join('\n');
    for (const [name, re] of Object.entries(COMPLIANCE_RE)) {
      if (re.test(docTexts)) mentionedFrameworks.push(name);
    }

    // ── Readiness score ───────────────────────────────────────────────────
    const hasAuditLib       = detectedLibs.length > 0;
    const hasAuditCalls     = auditCallFiles.length > 0;
    const hasRetention      = detectedRetention.length > 0 || logDriverFiles.length > 0;
    const noPIIRisk         = piiRisks.length === 0;
    const hasCompliance     = mentionedFrameworks.length > 0 || complianceFiles.length > 0;
    const hasMutationAudit  = mutationFiles.length === 0 || mutationCoverage >= 50;

    const scoreChecks = [
      { id: 'audit_lib',        label: 'Audit library detected',            pass: hasAuditLib      },
      { id: 'audit_calls',      label: 'Audit log calls in source',         pass: hasAuditCalls    },
      { id: 'structured_audit', label: 'Structured audit output (JSON)',     pass: hasStructuredAudit || hasAuditCalls },
      { id: 'mutation_audit',   label: 'DB mutations have audit coverage',  pass: hasMutationAudit },
      { id: 'retention',        label: 'Log retention policy configured',   pass: hasRetention     },
      { id: 'pii_safe',         label: 'No PII patterns in log calls',      pass: noPIIRisk        },
      { id: 'compliance',       label: 'Compliance framework referenced',   pass: hasCompliance    },
    ];
    const passed = scoreChecks.filter(c => c.pass).length;

    return {
      ok: true,
      libs:           detectedLibs,
      hasStructuredAudit,
      auditCallFiles,
      mutations:      { total: mutationFiles.length, withAudit: mutationsWithAudit.length, coverage: mutationCoverage, files: mutationFiles.slice(0, 8), covered: mutationsWithAudit.slice(0, 8) },
      retention:      { configs: detectedRetention, logDriverFiles },
      piiRisks:       piiRisks.slice(0, 10),
      compliance:     { files: complianceFiles, frameworks: mentionedFrameworks },
      score:          { passed, total: scoreChecks.length, checks: scoreChecks },
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// ── Access Control Status ─────────────────────────────────────────────────────
ipcMain.handle('python:access-control-status', async () => {
  try {
    const workspaceRoot = getActiveAnalysisRoot();
    const workspaceRelative = (targetPath) => path.relative(workspaceRoot, targetPath).replace(/\\/g, '/');
    // ── Helpers ───────────────────────────────────────────────────────────
    function exists(rel)    { return fs.existsSync(path.join(workspaceRoot, rel)); }
    function isDir(rel)     { try { return fs.statSync(path.join(workspaceRoot, rel)).isDirectory(); } catch { return false; } }
    function readText(rel)  { try { return fs.readFileSync(path.join(workspaceRoot, rel), 'utf8'); } catch { return ''; } }
    function readPyDeps() {
      const deps = [];
      ['pyproject.toml','requirements.txt','requirements-dev.txt','setup.cfg','Pipfile'].forEach(f => {
        const txt = readText(f);
        if (txt) deps.push(...txt.split('\n').map(l => l.split(/[>=<![\s]/)[0].trim().toLowerCase()).filter(l => /^[a-z]/.test(l)));
      });
      return [...new Set(deps)];
    }
    function readJsDeps() {
      try { const p = JSON.parse(readText('package.json')); return { ...p.dependencies, ...p.devDependencies }; } catch { return {}; }
    }

    const pyDeps = readPyDeps();
    const jsDeps = readJsDeps();
    const hasPy  = (n) => pyDeps.includes(n.toLowerCase());
    const hasJs  = (n) => !!jsDeps[n];

    // ── RBAC detection ────────────────────────────────────────────────────
    // Kubernetes RBAC manifests
    const K8S_RBAC_KINDS = new Set(['Role','ClusterRole','RoleBinding','ClusterRoleBinding']);
    const rbacManifests  = [];
    const wildcardRoles  = [];
    const dangerousPerms = []; // secrets, exec, escalate, bind, impersonate
    const DANGEROUS_RE   = /verbs[^:]*:.*\*|resources[^:]*:.*secrets|verb.*exec|escalate|impersonate|bind/i;

    // Casbin / OPA files
    const casbinFiles = [];
    const opaFiles    = [];

    const SKIP_WALK = new Set(['node_modules', '.git', 'dist', 'build', '.venv', '__pycache__', 'mlruns']);

    function walkRBAC(dir, depth = 0) {
      if (depth > 5) return;
      let entries;
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
      for (const e of entries) {
        if (SKIP_WALK.has(e.name)) continue;
        const full = path.join(dir, e.name);
        if (e.isDirectory()) { walkRBAC(full, depth + 1); continue; }
        const ext = path.extname(e.name).toLowerCase();
        const rel = workspaceRelative(full);

        // Rego / OPA
        if (ext === '.rego') { opaFiles.push(rel); continue; }

        // Casbin
        if (e.name === 'rbac_model.conf' || e.name === 'policy.csv' || e.name.endsWith('.casbin')) {
          casbinFiles.push(rel); continue;
        }

        if (!['.yaml', '.yml', '.json'].includes(ext)) continue;
        try {
          const content = fs.readFileSync(full, 'utf8');
          const kindMatch = content.match(/kind:\s*(\w+)/);
          if (kindMatch && K8S_RBAC_KINDS.has(kindMatch[1])) {
            rbacManifests.push({ file: rel, kind: kindMatch[1] });
            // Check for wildcards
            if (/verbs:\s*\n\s*-\s*['"]?\*['"]?|verbs:\s*\[['"]?\*['"]?\]/m.test(content)) {
              wildcardRoles.push(rel);
            }
            // Check for dangerous permissions
            if (DANGEROUS_RE.test(content)) {
              const match = content.match(DANGEROUS_RE);
              dangerousPerms.push({ file: rel, issue: match ? match[0].trim().slice(0, 60) : 'dangerous permission' });
            }
          }
        } catch {}
      }
    }
    walkRBAC(workspaceRoot);

    // Casbin / OPA in deps
    const hasCasbin = hasPy('casbin') || hasJs('casbin') || casbinFiles.length > 0;
    const hasOPA    = hasPy('opa') || hasJs('@open-policy-agent/opa-wasm') || opaFiles.length > 0 ||
                      exists('policy.rego') || isDir('policies');

    // Django / FastAPI RBAC
    const hasDjangoPerm   = hasPy('django') && (() => {
      // Quick check for permission_classes or has_permission in source
      let found = false;
      function walkDjango(dir, depth = 0) {
        if (depth > 4 || found) return;
        let entries;
        try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
        for (const e of entries) {
          if (SKIP_WALK.has(e.name) || found) continue;
          const full = path.join(dir, e.name);
          if (e.isDirectory()) { walkDjango(full, depth + 1); continue; }
          if (e.name.endsWith('.py')) {
            try {
              const c = fs.readFileSync(full, 'utf8');
              if (/permission_classes|has_permission|has_object_permission|@login_required|IsAuthenticated/.test(c)) { found = true; }
            } catch {}
          }
        }
      }
      walkDjango(workspaceRoot);
      return found;
    })();

    // CASL / ACL (Node)
    const hasCASL = hasJs('@casl/ability') || hasJs('@casl/mongoose') || hasJs('casl');
    const hasACL  = hasJs('acl') || hasJs('node-acl') || hasJs('accesscontrol');

    // ── Auth middleware detection ─────────────────────────────────────────
    const AUTH_LIBS = [
      // JWT
      { id: 'jsonwebtoken',          label: 'jsonwebtoken',             pkg: 'js', category: 'JWT'     },
      { id: 'express-jwt',           label: 'express-jwt',             pkg: 'js', category: 'JWT'     },
      { id: 'passport-jwt',          label: 'passport-jwt',            pkg: 'js', category: 'JWT'     },
      { id: 'jose',                  label: 'jose (JWT/JWE)',           pkg: 'js', category: 'JWT'     },
      { id: 'PyJWT',                 label: 'PyJWT',                   pkg: 'py', category: 'JWT'     },
      { id: 'python-jose',           label: 'python-jose',             pkg: 'py', category: 'JWT'     },
      { id: 'djangorestframework-simplejwt', label: 'DRF SimpleJWT',  pkg: 'py', category: 'JWT'     },
      // OAuth / OIDC
      { id: 'passport-oauth2',       label: 'passport-oauth2',         pkg: 'js', category: 'OAuth'   },
      { id: 'openid-client',         label: 'openid-client',           pkg: 'js', category: 'OIDC'    },
      { id: 'next-auth',             label: 'NextAuth.js',             pkg: 'js', category: 'OAuth'   },
      { id: '@auth/core',            label: '@auth/core',              pkg: 'js', category: 'OAuth'   },
      { id: 'authlib',               label: 'Authlib',                 pkg: 'py', category: 'OAuth'   },
      { id: 'social-auth-app-django',label: 'social-auth-app-django',  pkg: 'py', category: 'OAuth'   },
      { id: 'django-allauth',        label: 'django-allauth',          pkg: 'py', category: 'OAuth'   },
      // Sessions
      { id: 'express-session',       label: 'express-session',         pkg: 'js', category: 'Session' },
      { id: 'connect-redis',         label: 'connect-redis',           pkg: 'js', category: 'Session' },
      { id: 'Flask-Login',           label: 'Flask-Login',             pkg: 'py', category: 'Session' },
      { id: 'flask-login',           label: 'Flask-Login',             pkg: 'py', category: 'Session' },
      // Passport
      { id: 'passport',              label: 'Passport.js',             pkg: 'js', category: 'Auth'    },
      // MFA / OTP
      { id: 'speakeasy',             label: 'speakeasy (TOTP/HOTP)',   pkg: 'js', category: 'MFA'     },
      { id: 'otplib',                label: 'otplib (TOTP)',           pkg: 'js', category: 'MFA'     },
      { id: 'pyotp',                 label: 'pyotp',                   pkg: 'py', category: 'MFA'     },
      { id: 'django-otp',            label: 'django-otp',              pkg: 'py', category: 'MFA'     },
      { id: 'qrcode',                label: 'qrcode (MFA setup)',      pkg: 'py', category: 'MFA'     },
    ];
    const detectedAuth = AUTH_LIBS
      .filter(l => l.pkg === 'js' ? hasJs(l.id) : hasPy(l.id))
      .reduce((acc, l) => { if (!acc.find(x => x.label === l.label)) acc.push(l); return acc; }, []);

    const authByCategory = detectedAuth.reduce((acc, l) => {
      if (!acc[l.category]) acc[l.category] = [];
      acc[l.category].push(l);
      return acc;
    }, {});

    // ── OAuth / OIDC config audit ─────────────────────────────────────────
    const OAUTH_CONFIG_FILES = [
      { file: 'oauth.yaml',       label: 'OAuth config'       },
      { file: 'oauth.yml',        label: 'OAuth config'       },
      { file: 'oidc.yaml',        label: 'OIDC config'        },
      { file: 'oidc.yml',         label: 'OIDC config'        },
      { file: '.oauth2',          label: 'OAuth2 config'      },
      { file: 'keycloak.json',    label: 'Keycloak config'    },
      { file: 'auth0.json',       label: 'Auth0 config'       },
      { file: 'okta.yaml',        label: 'Okta config'        },
    ];
    const oauthConfigFiles = OAUTH_CONFIG_FILES.filter(c => exists(c.file));

    // Scan .env files for OAuth-related issues
    const envFiles  = ['.env', '.env.example', '.env.sample', '.env.local', '.env.production'];
    const oauthRisks = [];
    const BROAD_SCOPE_RE = /SCOPE[S]?\s*=.*(?:openid\s+profile\s+email\s+offline_access|read:all|write:all|\*)/i;
    const LOCALHOST_RE   = /REDIRECT_URI\s*=.*localhost|CALLBACK_URL\s*=.*localhost/i;
    for (const ef of envFiles) {
      const txt = readText(ef);
      if (!txt) continue;
      if (BROAD_SCOPE_RE.test(txt))   oauthRisks.push({ file: ef, issue: 'Overly broad OAuth scopes' });
      if (LOCALHOST_RE.test(txt))     oauthRisks.push({ file: ef, issue: 'Localhost redirect URI in config' });
    }

    // ── Service account detection ─────────────────────────────────────────
    const serviceAccounts = [];
    const defaultSAUsages = []; // pods using default SA

    function walkServiceAccounts(dir, depth = 0) {
      if (depth > 5 || serviceAccounts.length > 20) return;
      let entries;
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
      for (const e of entries) {
        if (SKIP_WALK.has(e.name)) continue;
        const full = path.join(dir, e.name);
        if (e.isDirectory()) { walkServiceAccounts(full, depth + 1); continue; }
        if (!['.yaml', '.yml'].includes(path.extname(e.name))) continue;
        try {
          const content = fs.readFileSync(full, 'utf8');
          const rel     = workspaceRelative(full);
          if (/kind:\s*ServiceAccount/i.test(content)) {
            const nameMatch = content.match(/name:\s*(\S+)/);
            serviceAccounts.push({ file: rel, name: nameMatch ? nameMatch[1] : 'unknown' });
          }
          // Detect pods using default SA or automounting token
          if (/kind:\s*(Deployment|StatefulSet|DaemonSet|Pod)/i.test(content)) {
            if (/serviceAccountName:\s*default/.test(content)) defaultSAUsages.push(rel);
            else if (!/automountServiceAccountToken:\s*false/.test(content) && /kind:\s*Pod/i.test(content)) {
              // Pod without explicit automount=false
            }
          }
        } catch {}
      }
    }
    walkServiceAccounts(workspaceRoot);

    // ── Zero-trust / service mesh detection ──────────────────────────────
    const MESH_LIBS = [
      { id: 'istio',         label: 'Istio',           pkg: 'dep-absent', manifestKey: 'kind: (VirtualService|DestinationRule|PeerAuthentication|Gateway)' },
      { id: 'linkerd',       label: 'Linkerd',         pkg: 'dep-absent', manifestKey: 'linkerd.io/' },
      { id: 'consul',        label: 'Consul Connect',  pkg: 'dep-absent', manifestKey: 'consul.hashicorp.com/' },
    ];

    const meshDetected  = [];
    const networkPolicies = [];
    const mtlsConfigs    = [];

    function walkZeroTrust(dir, depth = 0) {
      if (depth > 5) return;
      let entries;
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
      for (const e of entries) {
        if (SKIP_WALK.has(e.name)) continue;
        const full = path.join(dir, e.name);
        if (e.isDirectory()) { walkZeroTrust(full, depth + 1); continue; }
        if (!['.yaml', '.yml'].includes(path.extname(e.name))) continue;
        try {
          const content = fs.readFileSync(full, 'utf8');
          const rel     = workspaceRelative(full);
          if (/kind:\s*NetworkPolicy/i.test(content) && !networkPolicies.find(n => n === rel)) {
            networkPolicies.push(rel);
          }
          if (/kind:\s*PeerAuthentication|mtls:/i.test(content) && !mtlsConfigs.find(m => m === rel)) {
            mtlsConfigs.push(rel);
          }
          for (const m of MESH_LIBS) {
            if (new RegExp(m.manifestKey).test(content) && !meshDetected.find(x => x.label === m.label)) {
              meshDetected.push({ label: m.label, source: 'manifest' });
            }
          }
          if (/linkerd\.io\//i.test(content) && !meshDetected.find(x => x.label === 'Linkerd')) {
            meshDetected.push({ label: 'Linkerd', source: 'annotation' });
          }
        } catch {}
      }
    }
    walkZeroTrust(workspaceRoot);

    // cert-manager
    const hasCertManager = (() => {
      let found = false;
      function walkCert(dir, depth = 0) {
        if (depth > 4 || found) return;
        let entries;
        try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
        for (const e of entries) {
          if (SKIP_WALK.has(e.name) || found) continue;
          const full = path.join(dir, e.name);
          if (e.isDirectory()) { walkCert(full, depth + 1); continue; }
          if (['.yaml', '.yml'].includes(path.extname(e.name))) {
            try {
              const c = fs.readFileSync(full, 'utf8');
              if (/kind:\s*(Certificate|ClusterIssuer|Issuer)/i.test(c) || /cert-manager\.io\//i.test(c)) { found = true; }
            } catch {}
          }
        }
      }
      walkCert(workspaceRoot);
      return found;
    })();

    // ── Readiness score ───────────────────────────────────────────────────
    const hasRBAC       = rbacManifests.length > 0 || hasCasbin || hasOPA || hasDjangoPerm || hasCASL || hasACL;
    const hasAuth       = detectedAuth.length > 0;
    const hasOAuth      = detectedAuth.some(l => ['OAuth','OIDC'].includes(l.category)) || oauthConfigFiles.length > 0;
    const hasMFA        = detectedAuth.some(l => l.category === 'MFA');
    const noWildcards   = wildcardRoles.length === 0;
    const hasZeroTrust  = meshDetected.length > 0 || networkPolicies.length > 0 || mtlsConfigs.length > 0 || hasCertManager;
    const saScoped      = defaultSAUsages.length === 0;

    const scoreChecks = [
      { id: 'rbac',           label: 'RBAC / authorization defined',        pass: hasRBAC      },
      { id: 'auth_middleware',label: 'Auth middleware configured',           pass: hasAuth      },
      { id: 'oauth_oidc',     label: 'OAuth / OIDC integration',            pass: hasOAuth     },
      { id: 'mfa',            label: 'MFA support present',                 pass: hasMFA       },
      { id: 'no_wildcards',   label: 'No wildcard RBAC permissions',        pass: noWildcards  },
      { id: 'zero_trust',     label: 'Zero-trust / network policy',         pass: hasZeroTrust },
      { id: 'sa_scoped',      label: 'Service accounts scoped (not default)',pass: saScoped || serviceAccounts.length > 0 },
    ];
    const passed = scoreChecks.filter(c => c.pass).length;

    return {
      ok: true,
      rbac: {
        manifests:    rbacManifests,
        wildcards:    wildcardRoles,
        dangerous:    dangerousPerms,
        hasCasbin,    casbinFiles,
        hasOPA,       opaFiles,
        hasDjangoPerm,hasCASL, hasACL,
      },
      auth:           { libs: detectedAuth, byCategory: authByCategory },
      oauth:          { configFiles: oauthConfigFiles, risks: oauthRisks },
      serviceAccounts:{ accounts: serviceAccounts, defaultUsages: defaultSAUsages },
      zeroTrust:      { mesh: meshDetected, networkPolicies, mtlsConfigs, hasCertManager },
      score:          { passed, total: scoreChecks.length, checks: scoreChecks },
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});
ipcMain.handle('shell:open-terminal', async (event, targetPath) => {
  try {
    const candidate = String(targetPath || '').trim();
    if (!candidate) {
      return { ok: false, error: 'No path provided.' };
    }

    const existingPath = fs.existsSync(candidate)
      ? candidate
      : (fs.existsSync(path.dirname(candidate)) ? path.dirname(candidate) : null);

    if (!existingPath) {
      return { ok: false, error: 'Path not found.' };
    }

    const stats = fs.statSync(existingPath);
    const launchDir = stats.isDirectory() ? existingPath : path.dirname(existingPath);
    const startedAt = Date.now();

    let launchMethod = 'cmd';
    const windowsTerminalPath = await findCommandPath('wt');

    if (process.platform === 'win32' && windowsTerminalPath) {
      const child = spawn(windowsTerminalPath, ['-d', launchDir], {
        detached: true,
        stdio: 'ignore',
      });
      child.unref();
      launchMethod = 'wt';
      appendPythonCommandLog({
        source: 'action',
        label: 'Open terminal here',
        cwd: ROOT_DIR,
        command: `wt -d "${launchDir}"`,
        ok: true,
        code: 0,
        stdout: `Opened Windows Terminal at ${launchDir}`,
        stderr: '',
        startedAt,
        finishedAt: Date.now(),
        durationMs: Date.now() - startedAt,
      });
      return { ok: true, method: launchMethod, location: launchDir };
    }

    if (process.platform === 'win32') {
      const child = spawn('cmd.exe', ['/c', 'start', '""', 'cmd.exe', '/K', `cd /d "${launchDir}"`], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
      });
      child.unref();
      appendPythonCommandLog({
        source: 'action',
        label: 'Open terminal here',
        cwd: ROOT_DIR,
        command: `cmd.exe /K cd /d "${launchDir}"`,
        ok: true,
        code: 0,
        stdout: `Opened Command Prompt at ${launchDir}`,
        stderr: '',
        startedAt,
        finishedAt: Date.now(),
        durationMs: Date.now() - startedAt,
      });
      return { ok: true, method: launchMethod, location: launchDir };
    }

    const child = spawn('x-terminal-emulator', ['--working-directory', launchDir], {
      detached: true,
      stdio: 'ignore',
    });
    child.unref();
    appendPythonCommandLog({
      source: 'action',
      label: 'Open terminal here',
      cwd: ROOT_DIR,
      command: `x-terminal-emulator --working-directory "${launchDir}"`,
      ok: true,
      code: 0,
      stdout: `Opened terminal at ${launchDir}`,
      stderr: '',
      startedAt,
      finishedAt: Date.now(),
      durationMs: Date.now() - startedAt,
    });
    return { ok: true, method: 'system-terminal', location: launchDir };
  } catch (error) {
    return { ok: false, error: error.message || 'Unable to open terminal.' };
  }
});

// ── Window ────────────────────────────────────────────────────────────────────
// ── Hygiene file watcher ───────────────────────────────────────────────────
// Watches the project root for changes to the four hygiene-relevant files and
// pushes a 'hygiene:file-changed' event to the renderer after a 600 ms debounce
// so rapid successive saves (e.g. editor format-on-save) only fire one check.
const HYGIENE_WATCHED = new Set(['.env', '.env.local', '.gitignore', '.env.example', '.env.test', '.env.production', '.env.staging', '.env.development']);
const hygieneDebounceTimers = {};
let hygieneWatcher = null;

function setupHygieneWatcher(win) {
  // Close any existing watcher first (e.g. on activate when window is recreated)
  if (hygieneWatcher) { try { hygieneWatcher.close(); } catch (_) {} hygieneWatcher = null; }

  try {
    const workspaceRoot = getActiveAnalysisRoot();
    if (!fs.existsSync(workspaceRoot) || !fs.statSync(workspaceRoot).isDirectory()) return;
    const workspaceInfo = buildWorkspaceDescriptor(workspaceRoot);
    hygieneWatcher = fs.watch(workspaceRoot, { persistent: false }, (eventType, filename) => {
      if (!filename || !HYGIENE_WATCHED.has(filename)) return;
      clearTimeout(hygieneDebounceTimers[filename]);
      hygieneDebounceTimers[filename] = setTimeout(() => {
        if (!win.isDestroyed()) {
          win.webContents.send('hygiene:file-changed', {
            file: filename,
            changedAt: Date.now(),
            workspacePath: workspaceInfo.path,
            workspaceId: workspaceInfo.id,
          });
        }
      }, 600);
    });
    hygieneWatcher.on('error', () => {}); // suppress ENOSPC / permission errors silently
  } catch (_) { /* fs.watch may fail on some platforms / network drives — degrade gracefully */ }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400, height: 900, minWidth: 1000, minHeight: 420,
    backgroundColor: '#0A0F1A', title: APP_DISPLAY_NAME, titleBarStyle: 'hiddenInset', frame: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false },
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (/^https?:\/\//i.test(url)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
  win.webContents.on('did-finish-load', () => {
    win.webContents.setZoomFactor(1);
    win.webContents.setVisualZoomLevelLimits(1, 1);
  });
  mainWindow = win;
  setupHygieneWatcher(win);
  win.on('closed', () => {
    if (mainWindow === win) mainWindow = null;
    if (hygieneWatcher) { try { hygieneWatcher.close(); } catch (_) {} hygieneWatcher = null; }
  });
  if (isDev) { win.loadURL(DEV_SERVER_URL); }
  else { win.loadFile(path.join(__dirname, '../build/index.html')); }
}

// ─── PyMuPDF local parser server ──────────────────────────────────────────────

let pymupdfServerProcess = null;
let pymupdfServerLog = '';          // rolling log buffer (last 8 KB)
const PYMUPDF_SERVER_PORT = 7432;
const PYMUPDF_SERVER_SCRIPT = path.join(SCRIPTS_DIR, 'pymupdf_server.py');

function appendServerLog(text) {
  pymupdfServerLog += text;
  if (pymupdfServerLog.length > 8192) pymupdfServerLog = pymupdfServerLog.slice(-8192);
}

ipcMain.handle('parsers:pymupdf-start', async () => {
  if (pymupdfServerProcess) return { ok: true, already: true };
  const shared = getSharedPythonProjectSnapshot();
  const py = shared.paths.interpreterPath;
  if (!py || !fs.existsSync(py)) {
    return { ok: false, error: 'Python interpreter not found. Create or sync the virtual environment first.' };
  }
  if (!fs.existsSync(PYMUPDF_SERVER_SCRIPT)) {
    return { ok: false, error: `Server script not found at ${PYMUPDF_SERVER_SCRIPT}` };
  }
  pymupdfServerLog = '';
  pymupdfServerProcess = spawn(py, [PYMUPDF_SERVER_SCRIPT], {
    cwd: ROOT_DIR,
    env: {
      ...process.env,
      ...loadDotEnvVars(),
      HF_HUB_DISABLE_SYMLINKS_WARNING: '1',
      HUGGINGFACE_HUB_DISABLE_IMPLICIT_TOKEN: '1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  pymupdfServerProcess.stdout.on('data', d => appendServerLog(d.toString()));
  pymupdfServerProcess.stderr.on('data', d => appendServerLog(d.toString()));
  pymupdfServerProcess.on('close', (code) => {
    appendServerLog(`\n[process exited with code ${code}]\n`);
    pymupdfServerProcess = null;
  });
  pymupdfServerProcess.on('error', (err) => { appendServerLog(err.message); pymupdfServerProcess = null; });
  // Give the server up to 5 s to start (imports can be slow)
  await new Promise(r => setTimeout(r, 5000));
  if (!pymupdfServerProcess) {
    return { ok: false, error: pymupdfServerLog.trim() || 'Parser server exited immediately after launch.' };
  }
  return { ok: true };
});

ipcMain.handle('parsers:pymupdf-stop', async () => {
  if (pymupdfServerProcess) {
    pymupdfServerProcess.kill();
    pymupdfServerProcess = null;
  }
  return { ok: true };
});

ipcMain.handle('parsers:pymupdf-status', async () => {
  return { running: !!pymupdfServerProcess, log: pymupdfServerLog };
});

app.on('before-quit', () => {
  if (pymupdfServerProcess) { pymupdfServerProcess.kill(); pymupdfServerProcess = null; }
});

app.whenReady().then(async () => {
  protocol.registerFileProtocol('app-asset', (request, callback) => {
    const url = request.url.replace('app-asset://', '');
    try {
      const decodedUrl = decodeURIComponent(url);
      const filePath = path.normalize(path.join(ASSETS_BASE_DIR, decodedUrl));
      callback({ path: filePath });
    } catch (error) {
      console.error('Failed to resolve asset path', error);
      callback({ error: -6 });
    }
  });

  initCommandLog();
  await setupVenv();
  createWindow();

  // Auto-start the local parser server in the background.
  // Runs after the window is created so startup latency is hidden.
  setImmediate(() => {
    if (pymupdfServerProcess) return;
    const shared = getSharedPythonProjectSnapshot();
    const py = shared.paths.interpreterPath;
    if (!py || !fs.existsSync(py) || !fs.existsSync(PYMUPDF_SERVER_SCRIPT)) return;
    pymupdfServerLog = '';
    pymupdfServerProcess = spawn(py, [PYMUPDF_SERVER_SCRIPT], {
      cwd: ROOT_DIR,
      env: { ...process.env, ...loadDotEnvVars(), HF_HUB_DISABLE_SYMLINKS_WARNING: '1', HUGGINGFACE_HUB_DISABLE_IMPLICIT_TOKEN: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    pymupdfServerProcess.stdout.on('data', d => appendServerLog(d.toString()));
    pymupdfServerProcess.stderr.on('data', d => appendServerLog(d.toString()));
    pymupdfServerProcess.on('close', (code) => { appendServerLog(`\n[process exited with code ${code}]\n`); pymupdfServerProcess = null; });
    pymupdfServerProcess.on('error', (err) => { appendServerLog(err.message); pymupdfServerProcess = null; });
  });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
