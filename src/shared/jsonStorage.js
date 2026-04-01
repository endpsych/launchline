const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function readJsonWithSource(paths, fallback) {
  for (const candidatePath of paths) {
    if (!candidatePath || !fs.existsSync(candidatePath)) continue;
    try {
      return {
        value: JSON.parse(fs.readFileSync(candidatePath, 'utf8')),
        sourcePath: candidatePath,
      };
    } catch {
      continue;
    }
  }
  return { value: fallback, sourcePath: null };
}

function readJsonFromPaths(paths, fallback) {
  return readJsonWithSource(paths, fallback).value;
}

function writeTextAtomic(filePath, content) {
  ensureDir(path.dirname(filePath));
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tempPath, content, 'utf8');
  fs.renameSync(tempPath, filePath);
}

function writeJsonAtomic(filePath, value) {
  writeTextAtomic(filePath, JSON.stringify(value, null, 2));
}

function readMigratedJson(targetPath, legacyPaths, fallback) {
  const { value, sourcePath } = readJsonWithSource([targetPath, ...(legacyPaths || [])], fallback);
  if (sourcePath && sourcePath !== targetPath && !fs.existsSync(targetPath)) {
    try {
      writeJsonAtomic(targetPath, value);
    } catch {}
  }
  return value;
}

function sanitizePathSegment(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

function createWorkspaceStorageId(workspacePath) {
  const resolved = path.resolve(String(workspacePath || '.'));
  const slug = sanitizePathSegment(path.basename(resolved)) || 'workspace';
  const hash = crypto.createHash('sha1').update(resolved).digest('hex').slice(0, 8);
  return `${slug}-${hash}`;
}

module.exports = {
  createWorkspaceStorageId,
  ensureDir,
  readJsonFromPaths,
  readJsonWithSource,
  readMigratedJson,
  sanitizePathSegment,
  writeJsonAtomic,
  writeTextAtomic,
};
