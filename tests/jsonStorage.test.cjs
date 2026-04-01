const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  createWorkspaceStorageId,
  readMigratedJson,
  writeJsonAtomic,
} = require('../src/shared/jsonStorage');

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'launchline-storage-test-'));
}

test('writeJsonAtomic writes valid JSON and creates parent directories', () => {
  const tempDir = makeTempDir();
  const targetPath = path.join(tempDir, 'nested', 'settings.json');

  writeJsonAtomic(targetPath, { ok: true, count: 3 });

  const parsed = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
  assert.deepEqual(parsed, { ok: true, count: 3 });
});

test('readMigratedJson copies legacy JSON into the new target path', () => {
  const tempDir = makeTempDir();
  const targetPath = path.join(tempDir, 'storage', 'settings.json');
  const legacyPath = path.join(tempDir, 'legacy-settings.json');
  const payload = { version: 1, name: 'Launchline' };

  fs.writeFileSync(legacyPath, JSON.stringify(payload, null, 2), 'utf8');

  const migrated = readMigratedJson(targetPath, [legacyPath], { fallback: true });
  const copied = JSON.parse(fs.readFileSync(targetPath, 'utf8'));

  assert.deepEqual(migrated, payload);
  assert.deepEqual(copied, payload);
});

test('createWorkspaceStorageId is stable for the same workspace path', () => {
  const workspacePath = 'C:\\Users\\ender\\Documents\\GitHub\\launchline';
  const idA = createWorkspaceStorageId(workspacePath);
  const idB = createWorkspaceStorageId(workspacePath);

  assert.equal(idA, idB);
  assert.match(idA, /^launchline-[a-f0-9]{8}$/);
});
