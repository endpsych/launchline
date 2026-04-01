const test = require('node:test');
const assert = require('node:assert/strict');

const {
  SETTINGS_DEFAULT,
  SETTINGS_SCHEMA_VERSION,
  deepMerge,
  normalizeSettings,
} = require('../src/shared/settingsSchema');

test('normalizeSettings applies current schema version and Launchline branding migration', () => {
  const legacy = {
    company: {
      name: 'Repo Readiness',
      namePrimary: 'Repo',
      nameAccent: ' Readiness',
      initials: 'RR',
      industry: 'Generic Product',
    },
    data: {
      rawPath: 'data/',
      dbName: 'repo-readiness.db',
    },
    development: {
      vision: 'Repo Readiness is a focused Electron desktop app for Python environment management and production-readiness scanning.',
    },
    pythonTools: {
      tasks: [
        {
          id: 'profile-data',
          command: 'uv run python scripts/etl/datasets.py catalog data/repo-readiness.db data/raw pipeline_log.json',
        },
      ],
      secretChecklist: [
        {
          id: 'no-storage',
          title: 'Keep secrets out of Repo Readiness settings and roadmap notes',
          checked: true,
        },
      ],
    },
  };

  const normalized = normalizeSettings(legacy);

  assert.equal(normalized.schemaVersion, SETTINGS_SCHEMA_VERSION);
  assert.equal(normalized.company.name, 'Launchline');
  assert.equal(normalized.company.namePrimary, 'Launch');
  assert.equal(normalized.company.nameAccent, 'line');
  assert.equal(normalized.company.initials, 'LL');
  assert.equal(normalized.company.industry, 'Developer Productivity');
  assert.equal(normalized.data.dbName, undefined);
  assert.equal(normalized.development.vision, SETTINGS_DEFAULT.development.vision);
  assert.equal(normalized.pythonTools.tasks.some((task) => task.id === 'profile-data'), false);
  assert.equal(
    normalized.pythonTools.secretChecklist.some((item) => item.title.includes('Repo Readiness')),
    false,
  );
});

test('deepMerge preserves defaults while allowing nested overrides', () => {
  const merged = deepMerge(SETTINGS_DEFAULT, {
    company: { showIcon: false },
    behavior: { autoSaveMinutes: 15 },
  });

  assert.equal(merged.company.showIcon, false);
  assert.equal(merged.company.name, 'Launchline');
  assert.equal(merged.behavior.autoSaveMinutes, 15);
  assert.equal(merged.behavior.confirmDestructiveActions, true);
});
