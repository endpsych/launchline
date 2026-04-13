const APP_DISPLAY_NAME_FALLBACK = 'Launchline';
const SETTINGS_SCHEMA_VERSION = 1;

const SETTINGS_DEFAULT = {
  schemaVersion: SETTINGS_SCHEMA_VERSION,
  company: {
    name: 'Launchline',
    namePrimary: 'Launch',
    nameAccent: 'line',
    industry: 'Developer Productivity',
    initials: 'LL',
    showIcon: true,
    showName: true,
  },
  operations: {
    country: 'United States',
    currency: '$',
    timezone: 'UTC',
    regions: ['Default Workspace'],
    language: 'en',
  },
  data: { rawPath: 'data/' },
  legal: { frameworks: [], customLinks: [] },
  integrations: { groq: '', openai: '', gemini: '' },
  llmOperations: {
    selectedProviderId: 'openai',
    providers: {
      openai: {
        label: 'OpenAI',
        baseUrl: 'https://api.openai.com/v1',
        modelId: 'gpt-5.4-mini',
        organization: '',
        project: '',
        docsUrl: 'https://platform.openai.com/docs/overview',
        lastValidation: null,
      },
      anthropic: {
        label: 'Anthropic',
        baseUrl: 'https://api.anthropic.com',
        modelId: 'claude-sonnet-4-5',
        docsUrl: 'https://docs.anthropic.com/',
        lastValidation: null,
      },
      gemini: {
        label: 'Gemini',
        baseUrl: 'https://generativelanguage.googleapis.com',
        modelId: 'gemini-2.5-pro',
        docsUrl: 'https://ai.google.dev/',
        lastValidation: null,
      },
      'azure-openai': {
        label: 'Azure OpenAI',
        baseUrl: 'https://your-resource.openai.azure.com',
        modelId: 'gpt-5.4-mini',
        deployment: '',
        apiVersion: '2024-10-21',
        docsUrl: 'https://learn.microsoft.com/azure/ai-services/openai/',
        lastValidation: null,
      },
      groq: {
        label: 'Groq',
        baseUrl: 'https://api.groq.com/openai/v1',
        modelId: 'llama-3.3-70b-versatile',
        docsUrl: 'https://console.groq.com/docs/overview',
        lastValidation: null,
      },
      grok: {
        label: 'Grok / xAI',
        baseUrl: 'https://api.x.ai/v1',
        modelId: 'grok-4.20-reasoning',
        docsUrl: 'https://docs.x.ai/developers/model-capabilities/legacy/chat-completions',
        lastValidation: null,
      },
      custom: {
        label: 'Custom Endpoint',
        baseUrl: '',
        modelId: '',
        docsUrl: '',
        lastValidation: null,
      },
      local: {
        label: 'Local Model Gateway',
        baseUrl: 'http://localhost:11434/v1',
        modelId: 'llama3.2',
        docsUrl: 'https://ollama.com/',
        lastValidation: null,
      },
    },
    savedPrompts: [],
    promptTestHistory: [],
    evalRunHistory: [],
    runtime: {
      temperature: 0.2,
      maxOutputTokens: 2048,
      timeoutMs: 30000,
      retries: 2,
      enableFallback: false,
      fallbackModelId: '',
    },
  },
  ui: { theme: 'system', density: 'comfortable', reduceMotion: false, compactSidebar: false },
  notifications: { desktop: true, sounds: false, digest: 'daily' },
  privacy: { telemetry: false, crashReports: true, diagnosticsRetentionDays: 30 },
  behavior: { openLastWorkspace: true, autoSaveMinutes: 5, confirmDestructiveActions: true },
  development: {
    primaryUsers: 'Product teams, designers, and builders',
    releaseTheme: 'Readiness workspace',
    successSignal: 'Developers can inspect local setup and production posture from one focused desktop app',
    vision: 'Launchline is a focused Electron desktop app for Python environment management and production-readiness scanning.',
    roadmapTracks: [
      {
        id: 'shell',
        title: 'Shell & Navigation',
        description: 'Core layout, navigation model, titlebar, settings, and workspace structure.',
        status: 'complete',
        nextCheckpoint: 'Keep the Launchline shell stable while the core workflows evolve.',
      },
      {
        id: 'elements',
        title: 'UI Element Library',
        description: 'Showcase pages, reusable primitives, and composed interface patterns.',
        status: 'in_progress',
        nextCheckpoint: 'Document approved components and strengthen reuse guidance',
      },
      {
        id: 'docs',
        title: 'Documentation & Workflow',
        description: 'Instructions for developers and AI tools to extend Launchline safely.',
        status: 'planned',
        nextCheckpoint: 'Create a reusable reference guide and new-app checklist',
      },
      {
        id: 'ai',
        title: 'AI-Assisted Workflows',
        description: 'Plan how future apps can add AI search, copilots, summaries, or automations.',
        status: 'planned',
        nextCheckpoint: 'Define which AI capabilities should be core versus optional',
      },
    ],
    deliveryChecklist: [
      { id: 'branding', title: 'Branding updated', description: 'App name, initials, and shell labels match the intended product.', checked: true },
      { id: 'settings', title: 'Core settings ready', description: 'Launchline has a baseline settings surface ready for product-specific behavior.', checked: true },
      { id: 'pages', title: 'Core workflows identified', description: 'The first set of real product pages is defined before implementation starts.', checked: false },
      { id: 'docs', title: 'Contributor guidance documented', description: 'Developers and AI tools know how to extend the app safely.', checked: false },
      { id: 'release', title: 'Packaging and QA pass defined', description: 'The app has a release checklist before shipping to users.', checked: false },
    ],
    aiFeatures: [
      { id: 'assistant', title: 'Embedded assistant panel', description: 'Context-aware helper for guidance, Q&A, and task support inside the app.', enabled: true, priority: 'Planned', note: 'Best for high-context internal apps' },
      { id: 'search', title: 'Semantic search', description: 'Natural-language retrieval across records, docs, or internal entities.', enabled: true, priority: 'Core', note: 'Strong candidate for apps with large data surfaces' },
      { id: 'summaries', title: 'Auto summaries', description: 'Generate concise recaps for records, dashboards, or activity history.', enabled: true, priority: 'Evaluate', note: 'Useful when dense detail views need quick scanning' },
      { id: 'automation', title: 'Agentic actions', description: 'Allow AI to trigger workflows, complete drafts, or suggest next steps.', enabled: false, priority: 'Later', note: 'Add only when permissions and safety are clear' },
    ],
    notes: 'Use this page as the internal product brief for Launchline. Keep decisions, scope, and AI plans visible here so future contributors stay aligned.',
  },
  pythonTools: {
    manager: 'uv',
    pythonVersion: '3.12',
    projectEnvironment: 'scripts/.venv',
    interpreterPath: 'scripts/.venv/Scripts/python.exe',
    defaultRunCommand: 'uv run',
    enableTaskRunner: true,
    allowAiPackages: true,
    catalogEntries: [],
    catalogOverrides: {},
    pagePythonOverrides: {},
    selectedEnvironmentId: 'primary',
    environmentRegistry: [
      {
        id: 'primary',
        title: 'Primary app environment',
        kind: 'primary',
        manifestPath: 'pyproject.toml',
        venvPath: 'scripts/.venv',
        pythonVersion: '3.12',
        purpose: 'Shared default environment for core Launchline workflows.',
        assignedPackages: [],
      },
    ],
    roadmap: [
      {
        id: 'environment',
        title: 'Environment & Runtime',
        description: 'Keep uv, Python versioning, interpreter paths, and the project virtual environment visible and reproducible.',
        status: 'in_progress',
      },
      {
        id: 'dependencies',
        title: 'Dependencies & Capability Packs',
        description: 'Organize reusable Python packages into pyproject.toml groups that Launchline can enable as needed.',
        status: 'in_progress',
      },
      {
        id: 'tasks',
        title: 'Scripts & Tasks',
        description: 'Expose standard uv run tasks so apps can launch processing, automation, and diagnostics from one surface.',
        status: 'planned',
      },
      {
        id: 'ai',
        title: 'AI Tooling',
        description: 'Plan which AI-oriented Python stacks are optional, supported, or intentionally excluded from Launchline.',
        status: 'planned',
      },
      {
        id: 'logs',
        title: 'Execution Logs',
        description: 'Add reusable logs, run history, and health feedback once live execution is wired in.',
        status: 'later',
      },
    ],
    capabilityPacks: [
      {
        id: 'data',
        title: 'Data & Processing',
        group: 'data',
        enabled: true,
        packages: 'polars',
        description: 'Structured file ingestion, cleaning, and transformation utilities for common app workflows.',
      },
      {
        id: 'automation',
        title: 'Automation',
        group: 'automation',
        enabled: true,
        packages: 'faker',
        description: 'Reliable background workflows, API clients, and reusable task automation helpers.',
      },
      {
        id: 'ai',
        title: 'AI Assistant',
        group: 'ai',
        enabled: false,
        packages: 'openai, instructor, tiktoken',
        description: 'Optional LLM client stack for apps that need assistants, structured extraction, or summarization.',
      },
      {
        id: 'documents',
        title: 'Document Processing',
        group: 'documents',
        enabled: false,
        packages: 'pypdf, python-docx, beautifulsoup4',
        description: 'Document parsing and content extraction helpers for record-heavy or review-heavy apps.',
      },
      {
        id: 'ml',
        title: 'Analysis & ML',
        group: 'ml',
        enabled: false,
        packages: 'seaborn, statsmodels, scikit-learn, shap, xgboost',
        description: 'Heavier analytics and modeling dependencies are best kept optional in Launchline.',
      },
    ],
    tasks: [
      {
        id: 'sync-deps',
        title: 'Sync Environment',
        command: 'uv sync',
        status: 'core',
        description: 'Bring the local project environment into alignment with pyproject.toml and lock state.',
      },
      {
        id: 'run-assistant-evals',
        title: 'Generate Seed Data',
        command: 'uv run python scripts/etl/generate_data.py',
        status: 'planned',
        description: 'Generate local sample data sets when Launchline needs seeded records or fixtures.',
      },
    ],
    aiIntegrations: [
      {
        id: 'openai',
        title: 'OpenAI client stack',
        enabled: false,
        note: 'Use for assistants, structured extraction, or semantic features when Launchline needs hosted AI.',
      },
      {
        id: 'embeddings',
        title: 'Embeddings & retrieval',
        enabled: false,
        note: 'Useful for semantic search, recommendations, or contextual assistants over internal records.',
      },
      {
        id: 'local-nlp',
        title: 'Local NLP utilities',
        enabled: false,
        note: 'Use when the app needs offline parsing, entity extraction, or language heuristics without hosted models.',
      },
    ],
    secretChecklist: [
      {
        id: 'no-storage',
        title: 'Keep secrets out of Launchline settings and roadmap notes',
        description: 'Store API keys and passwords in environment variables or an external secret manager, never in the app UI state.',
        checked: true,
      },
      {
        id: 'gitignore',
        title: 'Ignore local env files in git',
        description: 'Make sure .env and .env.local are excluded before sharing or cloning the app.',
        checked: true,
      },
      {
        id: 'separate-envs',
        title: 'Use separate credentials for local, staging, and production',
        description: 'Avoid reusing one key across environments so Launchline stays safer to test.',
        checked: true,
      },
      {
        id: 'rotation',
        title: 'Review rotation and expiration before release',
        description: 'Add a release step that rotates test keys and confirms production owners before shipping.',
        checked: false,
      },
    ],
    secretPolicies: {
      redactLogs: true,
      preferLocalEnvFiles: true,
      separateCredentialsByEnvironment: true,
      requireReleaseSecretReview: true,
    },
    runtimeSnapshot: null,
    notes: 'Keep Python Tools focused on Launchline capabilities. Prefer uv-managed environments, a root pyproject.toml with grouped dependencies, and task definitions that stay easy to maintain.',
  },
  rotationReminders: {},
  workAnalysis: {
    tasks: [],
    processes: [],
    automationDesigns: [],
    context: { role: '', organization: '', systems: [] },
  },
  dataAnalysis: {
    datasets: [],
    selectedDatasetId: null,
    analysisDatasetId: null,
  },
};

const LEGACY_DATASET_COMMANDS = new Set([
  'uv run python scripts/etl/datasets.py catalog data/launchline.db data/raw pipeline_log.json',
]);

function clonePlain(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function deepMerge(base, overrides) {
  const result = { ...(base || {}) };
  for (const key of Object.keys(overrides || {})) {
    const baseValue = base ? base[key] : undefined;
    const overrideValue = overrides[key];
    if (
      overrideValue &&
      typeof overrideValue === 'object' &&
      !Array.isArray(overrideValue) &&
      baseValue &&
      typeof baseValue === 'object' &&
      !Array.isArray(baseValue)
    ) {
      result[key] = deepMerge(baseValue, overrideValue);
    } else {
      result[key] = overrideValue;
    }
  }
  return result;
}

function sanitizeLegacySettings(settings, options = {}) {
  const appDisplayName = options.appDisplayName || APP_DISPLAY_NAME_FALLBACK;
  const normalized = settings && typeof settings === 'object' ? settings : {};

  if (['E-commerce', 'Generic Product'].includes(normalized.company?.industry)) {
    normalized.company = {
      ...normalized.company,
      industry: 'Developer Productivity',
    };
  }

  if (normalized.company?.name === 'AppCraft') {
    normalized.company = {
      ...normalized.company,
      name: appDisplayName,
      namePrimary: 'Launch',
      nameAccent: 'line',
      initials: 'LL',
    };
  } else if (!normalized.company?.namePrimary && normalized.company?.name) {
    normalized.company = {
      ...normalized.company,
      namePrimary: normalized.company.name,
      nameAccent: normalized.company.nameAccent || '',
    };
  }

  if (normalized.data?.dbName) {
    delete normalized.data.dbName;
  }

  if (normalized.pythonTools?.tasks?.length) {
    normalized.pythonTools = {
      ...normalized.pythonTools,
      tasks: normalized.pythonTools.tasks.filter((task) => (
        task?.id !== 'profile-data' && !LEGACY_DATASET_COMMANDS.has(task?.command)
      )),
    };
  }

  return normalized;
}

const SETTINGS_MIGRATIONS = {
  1: (settings, options) => sanitizeLegacySettings(settings, options),
};

function migrateSettings(settings, options = {}) {
  let migrated = clonePlain(settings && typeof settings === 'object' ? settings : {}) || {};
  let schemaVersion = Number.isInteger(migrated.schemaVersion) ? migrated.schemaVersion : 0;

  while (schemaVersion < SETTINGS_SCHEMA_VERSION) {
    const nextVersion = schemaVersion + 1;
    const migrate = SETTINGS_MIGRATIONS[nextVersion];
    if (typeof migrate === 'function') {
      migrated = migrate(migrated, options) || migrated;
    }
    schemaVersion = nextVersion;
  }

  migrated.schemaVersion = SETTINGS_SCHEMA_VERSION;
  return migrated;
}

function normalizeSettings(settings, options = {}) {
  const appDisplayName = options.appDisplayName || APP_DISPLAY_NAME_FALLBACK;
  const sharedPythonProject = options.sharedPythonProject || null;
  const migrated = migrateSettings(settings, { appDisplayName });
  const normalized = deepMerge(clonePlain(SETTINGS_DEFAULT), migrated);
  sanitizeLegacySettings(normalized, { appDisplayName });

  if (normalized.pythonTools?.runtimeSnapshot && sharedPythonProject) {
    normalized.pythonTools.runtimeSnapshot = {
      ...normalized.pythonTools.runtimeSnapshot,
      paths: {
        ...(normalized.pythonTools.runtimeSnapshot.paths || {}),
        ...(sharedPythonProject.paths || {}),
      },
      files: {
        ...(normalized.pythonTools.runtimeSnapshot.files || {}),
        ...(sharedPythonProject.files || {}),
      },
    };
  }

  if (typeof normalized.company?.showIcon !== 'boolean') normalized.company.showIcon = true;
  if (typeof normalized.company?.showName !== 'boolean') normalized.company.showName = true;
  normalized.company.name = `${normalized.company.namePrimary || ''}${normalized.company.nameAccent || ''}`.trim() || appDisplayName;
  normalized.schemaVersion = SETTINGS_SCHEMA_VERSION;

  return normalized;
}

module.exports = {
  SETTINGS_DEFAULT,
  SETTINGS_MIGRATIONS,
  SETTINGS_SCHEMA_VERSION,
  deepMerge,
  migrateSettings,
  normalizeSettings,
  sanitizeLegacySettings,
};
