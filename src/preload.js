/* """
preload.js
----------------
Electron preload script for the Launchline app.
Bridges the main process and the renderer process via contextBridge.
Exposes only the runtime APIs still needed by the standalone UI showcase.
""" */

const { contextBridge, ipcRenderer, webFrame } = require('electron');

// Disable Chromium's built-in pinch/Ctrl+scroll zoom entirely
webFrame.setZoomFactor(1);
webFrame.setVisualZoomLevelLimits(1, 1);

contextBridge.exposeInMainWorld('electronAPI', {
  // Settings persistence
  readSettings:     ()       => ipcRenderer.invoke('settings:read'),
  writeSettings:    (settings) => ipcRenderer.invoke('settings:write', settings),
  settingsStorageInfo: () => ipcRenderer.invoke('settings:storage-info'),
  exportSettings: () => ipcRenderer.invoke('settings:export'),
  importSettings: () => ipcRenderer.invoke('settings:import'),
  resetSettings: () => ipcRenderer.invoke('settings:reset'),

  // Development helpers
  readSourceSnippet: (payload) => ipcRenderer.invoke('dev:read-source-snippet', payload),
  pythonUvStatus: () => ipcRenderer.invoke('python:uv-status'),
  pythonStatus: () => ipcRenderer.invoke('python:python-status'),
  pythonVenvStatus: () => ipcRenderer.invoke('python:venv-status'),
  pythonAvailableRuntimes: () => ipcRenderer.invoke('python:available-runtimes'),
  createPythonVenv: (payload) => ipcRenderer.invoke('python:create-venv', payload),
  rebuildPythonVenv: (payload) => ipcRenderer.invoke('python:rebuild-venv', payload),
  deletePythonVenv: () => ipcRenderer.invoke('python:delete-venv'),
  syncPythonVenv: () => ipcRenderer.invoke('python:sync-venv'),
  pythonDependencySummary: () => ipcRenderer.invoke('python:dependency-summary'),
  pythonSecretsStatus: (payload) => ipcRenderer.invoke('python:secrets-status', payload),
  runPythonToolCommand: (payload) => ipcRenderer.invoke('python:run-tool-command', payload),
  readPythonCommandLog: () => ipcRenderer.invoke('python:read-command-log'),
  clearPythonCommandLog: () => ipcRenderer.invoke('python:clear-command-log'),
  readRunHistory: () => ipcRenderer.invoke('python:read-run-history'),
  clearRunHistory: () => ipcRenderer.invoke('python:clear-run-history'),
  getFooterStatus: () => ipcRenderer.invoke('python:footer-status'),
  readPythonProjectConfig: () => ipcRenderer.invoke('python:read-project-config'),
  writePythonProjectConfig: (payload) => ipcRenderer.invoke('python:write-project-config', payload),
  getLastPage: ()         => ipcRenderer.invoke('nav:get-last-page'),
  setLastPage: (pageId)   => ipcRenderer.invoke('nav:set-last-page', pageId),

  // Window Controls
  windowMinimize:    () => ipcRenderer.invoke('window:minimize'),
  windowMaximize:    () => ipcRenderer.invoke('window:maximize'),
  windowClose:       () => ipcRenderer.invoke('window:close'),
  windowIsMaximized: () => ipcRenderer.invoke('window:is-maximized'),
  revealPathInFolder: (targetPath) => ipcRenderer.invoke('shell:reveal-path', targetPath),
  openTerminalAtPath: (targetPath) => ipcRenderer.invoke('shell:open-terminal', targetPath),
  openFile:           (filePath)   => ipcRenderer.invoke('shell:open-file', filePath),
  fixHygieneIssue:   (payload)    => ipcRenderer.invoke('python:fix-hygiene', payload),
  readEnvFile:       (payload)    => ipcRenderer.invoke('python:read-env-file', payload),
  hygieneHistory:    (payload)    => ipcRenderer.invoke('python:hygiene-history', payload),
  containerStatus:   ()           => ipcRenderer.invoke('python:container-status'),
  cicdStatus:        ()           => ipcRenderer.invoke('python:cicd-status'),
  monitoringStatus:      ()       => ipcRenderer.invoke('python:monitoring-status'),
  dataVersioningStatus:  ()       => ipcRenderer.invoke('python:data-versioning-status'),
  modelRegistryStatus:      ()    => ipcRenderer.invoke('python:model-registry-status'),
  disasterRecoveryStatus:   ()    => ipcRenderer.invoke('python:disaster-recovery-status'),
  auditLoggingStatus:       ()    => ipcRenderer.invoke('python:audit-logging-status'),
  accessControlStatus:      ()    => ipcRenderer.invoke('python:access-control-status'),

  // Hygiene file watcher — returns an unsubscribe function
  onHygieneFileChanged: (cb) => {
    const handler = (_, data) => cb(data);
    ipcRenderer.on('hygiene:file-changed', handler);
    return () => ipcRenderer.removeListener('hygiene:file-changed', handler);
  },
  // PyMuPDF local parser server
  pymupdfStart:  () => ipcRenderer.invoke('parsers:pymupdf-start'),
  pymupdfStop:   () => ipcRenderer.invoke('parsers:pymupdf-stop'),
  pymupdfStatus: () => ipcRenderer.invoke('parsers:pymupdf-status'),

});
