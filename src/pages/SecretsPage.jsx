import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Bell, BellOff, Boxes, Calendar, Check, CheckCircle2, ChevronDown, ChevronRight, ChevronUp, Copy, Download, ExternalLink, FileCode2, FileText, HelpCircle, ListChecks, Pencil, RefreshCw, RotateCcw, Search, Shield, Table2, TrendingDown, TrendingUp, Wrench, X } from 'lucide-react';
import { SETTINGS_DEFAULT, useSettings } from '../hooks/useSettings';
import { Section, inputStyle } from '../ui-kit/forms/SettingsLayout';

// ─── Constants ───────────────────────────────────────────────────────────────

const SECRET_PROVIDERS = [
  {
    id: 'openai',
    title: 'OpenAI',
    category: 'AI provider',
    description: 'Hosted models, structured outputs, assistants, and semantic workflows.',
    requiredEnv: ['OPENAI_API_KEY'],
    optionalEnv: ['OPENAI_ORG_ID', 'OPENAI_PROJECT'],
    notes: 'Use project-scoped keys when possible and keep evaluation/test keys separate from production.',
  },
  {
    id: 'anthropic',
    title: 'Anthropic',
    category: 'AI provider',
    description: 'Claude-based assistants, summarization, and reasoning flows.',
    requiredEnv: ['ANTHROPIC_API_KEY'],
    optionalEnv: [],
    notes: 'Treat hosted-model keys as production credentials even in internal tools.',
  },
  {
    id: 'gemini',
    title: 'Google AI / Gemini',
    category: 'AI provider',
    description: 'Gemini and related Google AI Studio workflows.',
    requiredEnv: ['GOOGLE_API_KEY'],
    optionalEnv: ['GOOGLE_CLOUD_PROJECT'],
    notes: 'Document whether the app expects AI Studio or a Google Cloud project flow.',
  },
  {
    id: 'groq',
    title: 'Groq',
    category: 'AI provider',
    description: 'Low-latency hosted inference for assistant and evaluation tasks.',
    requiredEnv: ['GROQ_API_KEY'],
    optionalEnv: [],
    notes: 'Keep Groq keys separate if Launchline only needs experimental assistant features.',
  },
  {
    id: 'azure-openai',
    title: 'Azure OpenAI',
    category: 'AI provider',
    description: 'Enterprise OpenAI deployments with Azure-scoped credentials.',
    requiredEnv: ['AZURE_OPENAI_API_KEY', 'AZURE_OPENAI_ENDPOINT'],
    optionalEnv: ['AZURE_OPENAI_API_VERSION', 'AZURE_OPENAI_DEPLOYMENT'],
    notes: 'This provider usually needs both an API key and an endpoint; keep those paired and environment-specific.',
  },
  {
    id: 'postgres',
    title: 'PostgreSQL',
    category: 'Database',
    description: 'Primary relational datastore or analytics warehouse connection.',
    requiredEnv: ['DATABASE_URL'],
    optionalEnv: ['PGHOST', 'PGPORT', 'PGDATABASE', 'PGUSER', 'PGPASSWORD'],
    notes: 'Prefer one DATABASE_URL for apps, and keep per-field values out of UI state unless absolutely necessary.',
  },
  {
    id: 'redis',
    title: 'Redis',
    category: 'Cache / Queue',
    description: 'Task queue, ephemeral cache, or retrieval index sidecar.',
    requiredEnv: ['REDIS_URL'],
    optionalEnv: ['REDIS_PASSWORD'],
    notes: 'Use isolated credentials if Redis supports both cache and queue workloads.',
  },
  {
    id: 'object-storage',
    title: 'S3 / Object Storage',
    category: 'Storage',
    description: 'Document, export, or artifact storage for Python workflows.',
    requiredEnv: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'],
    optionalEnv: ['AWS_SESSION_TOKEN', 'AWS_REGION', 'S3_BUCKET', 'S3_ENDPOINT'],
    notes: 'Prefer scoped IAM credentials and avoid reusing the same bucket key for unrelated apps.',
  },
  {
    id: 'smtp',
    title: 'SMTP',
    category: 'Messaging',
    description: 'Email delivery, report dispatch, or notification workflows.',
    requiredEnv: ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD'],
    optionalEnv: ['SMTP_PORT', 'SMTP_FROM'],
    notes: 'SMTP credentials often leak through logs; keep log redaction turned on for mail-heavy apps.',
  },
  {
    id: 'llamaparse',
    title: 'LlamaParse',
    category: 'Document parsing',
    description: 'Cloud PDF and document parser by LlamaIndex Inc. — optimized for complex layouts, tables, and figures. Used by the Knowledge Base ingestion bench.',
    requiredEnv: ['LLAMA_CLOUD_API_KEY'],
    optionalEnv: [],
    notes: 'Get your key at cloud.llamaindex.ai. Free tier includes 1,000 pages/day. The key starts with llx-. Required to use the LlamaParse parser in the ingestion bench.',
  },
];

// ─── Styles ──────────────────────────────────────────────────────────────────

const cardGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  gap: 14,
};

const relTime = (ms) => {
  if (!ms) return null;
  const diff = Date.now() - ms;
  const days  = Math.floor(diff / 86_400_000);
  const hours = Math.floor(diff / 3_600_000);
  const mins  = Math.floor(diff / 60_000);
  if (days > 60)  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  if (days > 1)   return `${days}d ago`;
  if (days === 1) return 'yesterday';
  if (hours > 1)  return `${hours}h ago`;
  if (mins  > 1)  return `${mins}m ago`;
  return 'just now';
};

const MULTI_ENV_NAMES = ['.env.test', '.env.production', '.env.staging', '.env.development'];

// ── Issue explainer map — each entry matches hygiene issue strings and provides
//    a detailed explanation panel for the "Why is this flagged?" feature.
const ISSUE_EXPLANATIONS = [
  {
    match: /not gitignored/,
    title: 'File not in .gitignore',
    why: 'Any file not listed in .gitignore can be accidentally committed to git by anyone on the team. Once committed, the credential is permanently in the repository history — even after deletion.',
    fix: 'Add the file name to .gitignore (e.g. echo ".env" >> .gitignore). Use the Fix button to do this automatically.',
    link: 'https://docs.github.com/en/get-started/getting-started-with-git/ignoring-files',
  },
  {
    match: /found in.*git commit/,
    title: 'Credential in git history',
    why: 'This file has been committed to git in the past. Even after deletion, the credential remains accessible via git log and is considered permanently compromised.',
    fix: 'Rotate the affected credentials immediately. Use git filter-repo or BFG Repo Cleaner to purge the history if needed.',
    link: 'https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository',
  },
  {
    match: /missing from \.env\.example/,
    title: 'Key undocumented in .env.example',
    why: '.env.example is the contract between your codebase and new developers. Keys missing from it cause silent failures when someone clones the repo.',
    fix: 'Run "Regenerate .env.example" to rebuild it from .env, or add the missing key manually with a placeholder value.',
    link: 'https://12factor.net/config',
  },
  {
    match: /missing from \.env/,
    title: 'Key in .env.example but not .env',
    why: 'A key is documented as required but has no value in your local .env. Your application may fail silently or throw errors at runtime.',
    fix: 'Add the missing key to your .env with an appropriate value.',
    link: 'https://12factor.net/config',
  },
  {
    match: /credential.*detected in \.env\.example/,
    title: 'Real credential in .env.example',
    why: '.env.example is typically committed to version control. Any real secret value in it is publicly exposed in your repository.',
    fix: 'Replace the real value with a descriptive placeholder (e.g. "sk-your-api-key-here") and regenerate the file.',
    link: null,
  },
  {
    match: /duplicate key/,
    title: 'Duplicate key in env file',
    why: 'When a key appears more than once, the last value wins — but behavior varies by shell and framework. Usually indicates a merge conflict residue or copy-paste error.',
    fix: 'Remove all but one occurrence of the key in the affected file.',
    link: null,
  },
  {
    match: /empty key|empty value/i,
    title: 'Empty env value',
    why: 'A key with no value (KEY=) is an unfilled placeholder. If the application expects a non-empty value it will fail at runtime, often with a confusing or silent error.',
    fix: 'Add a real value, or remove the key if it is no longer needed.',
    link: null,
  },
  {
    match: /non-SCREAMING_SNAKE/,
    title: 'Non-standard key naming',
    why: 'Environment variable names are conventionally SCREAMING_SNAKE_CASE (ALL_CAPS). Mixed-case names can cause cross-platform loading issues and break tools that expect the standard convention.',
    fix: 'Rename the key and update all process.env references in source files.',
    link: null,
  },
  {
    match: /unused env var/,
    title: 'Defined but never used',
    why: 'Keys defined in .env that are never read via process.env in source code are dead config. They add noise and may be leftover from deleted features.',
    fix: 'Remove the unused key from .env and .env.example, or verify it is consumed by a dependency at runtime.',
    link: null,
  },
  {
    match: /hardcoded secret/,
    title: 'Hardcoded secret in source',
    why: 'Tokens, passwords, or API keys embedded directly in source code are visible to anyone with repository access and cannot be rotated without a code change.',
    fix: 'Move the value to .env and read it via process.env. Rotate the secret if it was ever committed.',
    link: null,
  },
  {
    match: /docker-compose/,
    title: 'Docker Compose env var not in .env',
    why: 'docker-compose.yml references env vars missing from .env. Running docker-compose up will fail or produce containers with missing configuration.',
    fix: 'Add the missing keys to .env with appropriate values.',
    link: null,
  },
  {
    match: /GitHub Actions secret/,
    title: 'GitHub Actions secret not documented',
    why: 'Workflow files reference ${{ secrets.KEY }} values absent from .env.example. New contributors and CI environments will not know these secrets are required.',
    fix: 'Add the secret name with a placeholder value to .env.example.',
    link: null,
  },
  {
    match: /\.npmrc.*\.pypirc|hardcoded token/i,
    title: 'Auth token in config file',
    why: '.npmrc and .pypirc files can contain registry auth tokens. If these files are committed, the tokens are publicly exposed.',
    fix: 'Replace hardcoded tokens with variable expansion: //registry.npmjs.org/:_authToken=${NPM_TOKEN}',
    link: null,
  },
  {
    match: /sensitive.*file|key.*cert.*file|cert.*file/i,
    title: 'SSH key or certificate in project',
    why: 'Private keys and certificates should never live inside a project directory. They risk being accidentally committed, shared in archives, or scanned by dependency checkers.',
    fix: 'Move the file to ~/.ssh/ or a secure credential store, and add the pattern to .gitignore.',
    link: null,
  },
  {
    match: /world-readable|group-writable/,
    title: 'Insecure file permissions',
    why: '.env should only be readable by your own user. World-readable permissions allow any user on the same system to read your credentials.',
    fix: 'Run: chmod 600 .env',
    link: null,
  },
  {
    match: /overdue rotation/,
    title: 'Credential rotation overdue',
    why: 'This key was scheduled for rotation but has not been updated. Rotating credentials on a schedule limits the blast radius of an undetected leak.',
    fix: 'Generate a new credential from the provider dashboard, update .env, then clear the reminder.',
    link: null,
  },
  {
    match: /cloud sdk/i,
    title: 'Cloud SDK credentials on disk',
    why: 'Cloud CLI credential files (AWS, GCloud, Azure) contain long-lived tokens. Relying on them instead of env-var-based credentials can lead to accidental production access and makes CI/CD harder to configure consistently.',
    fix: 'Set AWS_ACCESS_KEY_ID, GOOGLE_APPLICATION_CREDENTIALS, or AZURE_CLIENT_ID in .env and use short-lived credentials for local dev.',
    link: null,
  },
];

// ── Pre-commit hook snippets (ready-to-copy) ──────────────────────────────
const HOOK_SNIPPETS = {
  husky: {
    label: 'Husky',
    filename: '.husky/pre-commit',
    code: `#!/bin/sh\n# .husky/pre-commit\nnpx gitleaks protect --staged --redact`,
  },
  precommit: {
    label: 'pre-commit',
    filename: '.pre-commit-config.yaml',
    code: `repos:\n  - repo: https://github.com/zricethezav/gitleaks\n    rev: v8.18.2\n    hooks:\n      - id: gitleaks`,
  },
  lefthook: {
    label: 'Lefthook',
    filename: 'lefthook.yml',
    code: `pre-commit:\n  commands:\n    gitleaks:\n      run: gitleaks protect --staged`,
  },
};

const actionButtonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 14px',
  borderRadius: 10,
  border: '1px solid var(--border)',
  background: 'rgba(14,22,38,0.9)',
  color: 'var(--text)',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
};

const pageWrapStyle = {
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  height: '100%',
};

const pageContentStyle = {
  padding: '28px 32px',
  overflowY: 'auto',
  minHeight: 0,
  flex: 1,
  boxSizing: 'border-box',
};

const pageFooterStyle = {
  borderTop: '1px solid var(--border)',
  background: '#111827',
  flexShrink: 0,
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
};

const terminalHandleStyle = {
  height: 10,
  cursor: 'row-resize',
  borderBottom: '1px solid rgba(91,154,255,0.14)',
  background: 'linear-gradient(180deg, rgba(91,154,255,0.08), rgba(11,18,32,0.18))',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

const termBtnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  borderRadius: 3,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.04)',
  color: 'var(--text)',
  fontWeight: 500,
  letterSpacing: '0.02em',
  textTransform: 'uppercase',
  fontSize: 10,
  cursor: 'pointer',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        width: 44,
        height: 24,
        borderRadius: 999,
        border: `1px solid ${checked ? 'rgba(91,154,255,0.5)' : 'var(--border)'}`,
        background: checked ? 'rgba(91,154,255,0.22)' : 'rgba(255,255,255,0.04)',
        padding: 2,
        cursor: 'pointer',
        position: 'relative',
        flexShrink: 0,
      }}
      aria-pressed={checked}
    >
      <span
        style={{
          display: 'block',
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: checked ? 'var(--primary)' : 'var(--text-muted)',
          transform: `translateX(${checked ? 20 : 0}px)`,
          transition: 'transform 140ms var(--ease), background 140ms var(--ease)',
        }}
      />
    </button>
  );
}

function ToggleRow({ title, description, checked, onChange }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 18,
        padding: '12px 14px',
        border: '1px solid var(--border)',
        borderRadius: 12,
        background: 'rgba(10,15,26,0.48)',
      }}
    >
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{description}</div>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

function StatusPill({ status }) {
  const tone =
    status === 'complete' ? { bg: 'rgba(74,222,128,0.12)', border: 'rgba(74,222,128,0.36)', color: '#4ade80', label: 'Complete' } :
    status === 'in_progress' ? { bg: 'rgba(91,154,255,0.12)', border: 'rgba(91,154,255,0.36)', color: 'var(--primary)', label: 'In Progress' } :
    status === 'later' ? { bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.3)', color: '#f87171', label: 'Later' } :
    { bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.3)', color: '#fbbf24', label: 'Planned' };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 999, background: tone.bg, border: `1px solid ${tone.border}`, color: tone.color, fontSize: 11, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
      {tone.label}
    </span>
  );
}

function ControlCard({ title, subtitle, children }) {
  return (
    <div style={{ padding: '14px 16px', border: '1px solid var(--border)', borderRadius: 14, background: 'rgba(10,15,26,0.45)' }}>
      {title && <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: subtitle ? 4 : 10 }}>{title}</div>}
      {subtitle && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.5 }}>{subtitle}</div>}
      {children}
    </div>
  );
}

function RuntimeTile({ label, value, hint, tone = 'default' }) {
  const color = tone === 'good' ? '#4ade80' : tone === 'warn' ? '#fbbf24' : tone === 'danger' ? '#f87171' : 'var(--text)';
  return (
    <div style={{ padding: '16px', border: '1px solid var(--border)', borderRadius: 14, background: 'rgba(10,15,26,0.45)', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      {hint && <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{hint}</div>}
    </div>
  );
}

// ─── Sparkline ───────────────────────────────────────────────────────────────
// Renders a tiny SVG polyline from the last N issue-count data points.
// Color is green when trend is flat/improving, red when worsening.
function Sparkline({ entries = [], width = 52, height = 18, n = 20 }) {
  const pts = entries.slice(-n);
  if (pts.length < 2) return null;
  const counts = pts.map((e) => e.count);
  const minV = Math.min(...counts);
  const maxV = Math.max(...counts);
  const range = maxV - minV || 1;
  const padX = 2; const padY = 2;
  const w = width - padX * 2; const h = height - padY * 2;
  const points = counts.map((v, i) => {
    const x = padX + (i / (counts.length - 1)) * w;
    const y = padY + h - ((v - minV) / range) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const last = counts[counts.length - 1];
  const first = counts[0];
  const trend = last < first ? 'improving' : last > first ? 'worsening' : 'stable';
  const color = trend === 'improving' ? '#4ade80' : trend === 'worsening' ? '#f87171' : 'rgba(148,163,184,0.6)';
  const TrendIcon = trend === 'improving' ? TrendingDown : trend === 'worsening' ? TrendingUp : null;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, flexShrink: 0 }} title={`Issue trend over last ${pts.length} checks: ${trend} (${first}→${last})`}>
      <svg width={width} height={height} style={{ verticalAlign: 'middle', opacity: 0.85 }}>
        <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      {TrendIcon && <TrendIcon size={10} style={{ color, flexShrink: 0 }} />}
    </span>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SecretsPage({ embedded = false }) {
  const { settings, setSection } = useSettings();
  const current = settings || SETTINGS_DEFAULT;
  const pythonTools = current.pythonTools || SETTINGS_DEFAULT.pythonTools;
  const secretChecklist = pythonTools.secretChecklist || SETTINGS_DEFAULT.pythonTools.secretChecklist;
  const secretPolicies = pythonTools.secretPolicies || SETTINGS_DEFAULT.pythonTools.secretPolicies;

  const [secretsStatus, setSecretsStatus] = useState({ loading: true, data: null, error: null });

  const expectedSecretVars = useMemo(
    () => [...new Set(SECRET_PROVIDERS.flatMap((p) => [...p.requiredEnv, ...(p.optionalEnv || [])]))],
    []
  );

  function updatePythonTools(key, value) {
    setSection('pythonTools', { ...pythonTools, [key]: value });
  }

  function updateSecretChecklist(id, value) {
    updatePythonTools('secretChecklist', secretChecklist.map((item) => (item.id === id ? { ...item, checked: value } : item)));
  }

  function updateSecretPolicy(key, value) {
    updatePythonTools('secretPolicies', { ...secretPolicies, [key]: value });
  }

  async function loadSecretsStatus() {
    if (!window.electronAPI?.pythonSecretsStatus) {
      setSecretsStatus({ loading: false, data: null, error: 'Secrets status bridge is unavailable.' });
      return;
    }
    setSecretsStatus((s) => ({ ...s, loading: true, error: null }));
    try {
      const status = await window.electronAPI.pythonSecretsStatus({ expectedVars: expectedSecretVars });
      if (!status?.ok) {
        setSecretsStatus({ loading: false, data: null, error: status?.error || 'Unable to load secrets status.' });
        return;
      }
      setSecretsStatus({ loading: false, data: { envPresence: status.envPresence, files: status.files, hygiene: status.hygiene, drift: status.drift ?? null, issues: status.issues ?? null, gitAvailable: status.gitAvailable ?? null, unusedVars: status.unusedVars ?? null, hardcodedSecrets: status.hardcodedSecrets ?? null, dockerCompose: status.dockerCompose ?? null, githubActions: status.githubActions ?? null, configFileScan: status.configFileScan ?? null, sensitiveFiles: status.sensitiveFiles ?? null, preCommitHooks: status.preCommitHooks ?? null, secretsManagers: status.secretsManagers ?? null }, error: null });
      setLastCheckedAt(Date.now());
    } catch (err) {
      setSecretsStatus({ loading: false, data: null, error: err.message });
    }
  }

  async function handleBulkFix() {
    if (allPendingFixes.length === 0 || bulkFixing) return;
    setBulkFixing(true);
    try {
      for (const fix of allPendingFixes) {
        const res = await window.electronAPI.fixHygieneIssue({ action: fix.action, entry: fix.entry });
        if (res?.ok && res?.snapshot) {
          setFixHistory((h) => [...h, { label: fix.label, snapshot: res.snapshot }]);
        }
      }
      await loadSecretsStatus();
    } finally {
      setBulkFixing(false);
    }
  }

  async function handleUndo() {
    const last = fixHistory[fixHistory.length - 1];
    if (!last) return;
    try {
      await window.electronAPI.fixHygieneIssue({ action: 'undoSnapshot', snapshot: last.snapshot });
      setFixHistory((h) => h.slice(0, -1));
      await loadSecretsStatus();
    } catch { /* ignore — user will see stale state until next Run Check */ }
  }

  async function loadVarData() {
    if (!window.electronAPI?.readEnvFile) return;
    setLoadingVarData(true);
    try {
      const filesToLoad = ['.env', '.env.local', ...MULTI_ENV_NAMES].filter((n) => files[n]?.exists);
      if (filesToLoad.length === 0) { setVarData({}); return; }
      const result = await window.electronAPI.readEnvFile({ files: filesToLoad });
      if (result?.ok) setVarData(result.vars);
    } finally {
      setLoadingVarData(false);
    }
  }

  async function handleSaveVar() {
    if (!editingVar) return;
    const { file, key, draft } = editingVar;
    setSavingVar({ file, key });
    try {
      const res = await window.electronAPI.fixHygieneIssue({ action: 'setEnvValue', file, key, value: draft });
      if (!res?.ok) {
        setEditingVar(v => ({ ...v, error: res?.error || 'Save failed — try restarting the app.' }));
        return;
      }
      if (res?.snapshot) {
        setFixHistory((h) => [...h, { label: `Edit ${key} in ${file}`, snapshot: res.snapshot }]);
      }
      setEditingVar(null);
      await loadVarData();
      await loadSecretsStatus();
    } finally {
      setSavingVar(null);
    }
  }

  async function handleCopyRedacted() {
    if (!window.electronAPI?.fixHygieneIssue) return;
    const res = await window.electronAPI.fixHygieneIssue({ action: 'getRedactedEnv' });
    if (res?.ok && res?.text) {
      try { await navigator.clipboard.writeText(res.text); } catch { /* ignore */ }
      setRedactedCopied(true);
      setTimeout(() => setRedactedCopied(false), 2000);
    }
  }

  async function handleRegenerateExample() {
    if (!window.electronAPI?.fixHygieneIssue) return;
    setRegeneratingExample(true);
    try {
      const res = await window.electronAPI.fixHygieneIssue({ action: 'regenerateExample' });
      if (res?.ok && res?.snapshot) {
        setFixHistory((h) => [...h, { label: 'Regenerate .env.example', snapshot: res.snapshot }]);
      }
      await loadSecretsStatus();
    } finally {
      setRegeneratingExample(false);
    }
  }

  // ── Report generation ──────────────────────────────────────────────────────
  function generateMarkdownReport() {
    const ts = new Date().toISOString();
    const data = secretsStatus.data;
    if (!data) return '# Hygiene Report\n\n_No data available — run a check first._\n';
    const { files: f, hygiene: hy, drift: dr, issues: iss, unusedVars: uv, hardcodedSecrets: hs, dockerCompose: dc, githubActions: ga, configFileScan: cf, sensitiveFiles: sf } = data;
    const ALL_ENV = ['.env', '.env.local', ...MULTI_ENV_NAMES];
    const lines = [];
    lines.push(`# Environment Hygiene Report`);
    lines.push(`\n_Generated: ${ts}_\n`);

    // Summary
    lines.push(`## Summary`);
    lines.push(`- **Total issues:** ${hygieneIssueList?.length ?? 'N/A'}`);
    lines.push(`- **Files scanned:** ${ALL_ENV.filter((n) => f[n]?.exists).join(', ') || 'none'}`);
    lines.push('');

    // File Status
    lines.push(`## File Status`);
    lines.push('| File | Present | Gitignored | Vars | Modified |');
    lines.push('|------|---------|------------|------|----------|');
    for (const name of ['.env', '.env.local', '.env.example', '.gitignore', ...MULTI_ENV_NAMES]) {
      const info = f[name];
      if (!info) continue;
      const present = info.exists ? '✅' : '❌';
      let ignored = '—';
      if (name === '.env') ignored = hy.envIgnored == null ? '—' : hy.envIgnored ? '✅' : '⚠️';
      else if (name === '.env.local') ignored = hy.envLocalIgnored == null ? '—' : hy.envLocalIgnored ? '✅' : '⚠️';
      else if (MULTI_ENV_NAMES.includes(name)) ignored = hy.multiEnvIgnored?.[name] == null ? '—' : hy.multiEnvIgnored[name] ? '✅' : '⚠️';
      else ignored = '—';
      const vars = info.varCount != null ? String(info.varCount) : '—';
      const mod = info.modified ? new Date(info.modified).toLocaleString() : '—';
      lines.push(`| \`${name}\` | ${present} | ${ignored} | ${vars} | ${mod} |`);
    }
    lines.push('');

    // Drift
    if (dr) {
      lines.push(`## Drift (.env vs .env.example)`);
      if (dr.inEnvNotExample?.length) lines.push(`- **Keys in .env but not .env.example:** ${dr.inEnvNotExample.join(', ')}`);
      if (dr.inExampleNotEnv?.length) lines.push(`- **Keys in .env.example but not .env:** ${dr.inExampleNotEnv.join(', ')}`);
      if (!dr.inEnvNotExample?.length && !dr.inExampleNotEnv?.length) lines.push('- No drift detected ✅');
      lines.push('');
    }

    // Issues
    if (iss) {
      lines.push(`## Detected Issues`);
      const dupes = ALL_ENV.flatMap((n) => (iss.duplicateKeys?.[n] ?? []).map((k) => `\`${n}\`: \`${k}\``));
      if (dupes.length) lines.push(`### Duplicate Keys\n${dupes.map((d) => `- ${d}`).join('\n')}`);
      const empty = ALL_ENV.flatMap((n) => (iss.emptyKeys?.[n] ?? []).map((k) => `\`${n}\`: \`${k}\``));
      if (empty.length) lines.push(`\n### Empty Values\n${empty.map((e) => `- ${e}`).join('\n')}`);
      const bad = ALL_ENV.flatMap((n) => (iss.badNameKeys?.[n] ?? []).map((k) => `\`${n}\`: \`${k}\``));
      if (bad.length) lines.push(`\n### Naming Convention Violations\n${bad.map((b) => `- ${b}`).join('\n')}`);
      if (iss.exampleLeaks?.length) lines.push(`\n### Credential Leaks in .env.example\n${iss.exampleLeaks.map((k) => `- \`${k}\``).join('\n')}`);
      lines.push('');
    }

    // Unused vars
    if (uv) {
      lines.push(`## Unused Environment Variables`);
      if (uv.unused?.length) lines.push(uv.unused.map((k) => `- \`${k}\``).join('\n'));
      else lines.push('- None found ✅');
      lines.push('');
    }

    // Hardcoded secrets
    if (hs) {
      lines.push(`## Hardcoded Secrets in Source`);
      if (hs.findings?.length) lines.push(hs.findings.map((h) => `- \`${h.relPath}:${h.line}\` — ${h.label}`).join('\n'));
      else lines.push('- None detected ✅');
      lines.push('');
    }

    // Docker Compose
    if (dc) {
      lines.push(`## Docker Compose Cross-Reference`);
      if (dc.missingKeys?.length) lines.push(`Keys referenced in \`${dc.file}\` but missing from .env:\n${dc.missingKeys.map((k) => `- \`${k}\``).join('\n')}`);
      else lines.push(`- All Docker Compose env vars accounted for ✅`);
      lines.push('');
    }

    // GitHub Actions
    if (ga) {
      lines.push(`## GitHub Actions Secrets`);
      if (ga.undocumentedSecrets?.length) lines.push(`Secrets used in workflows but absent from .env.example:\n${ga.undocumentedSecrets.map((k) => `- \`${k}\``).join('\n')}`);
      else lines.push(`- All workflow secrets documented in .env.example ✅`);
      lines.push('');
    }

    // Config files
    if (cf?.length) {
      lines.push(`## Config File Tokens (.npmrc / .pypirc)`);
      lines.push(cf.map((c) => `- \`${c.file}:${c.lineNumber}\` — ${c.label}`).join('\n'));
      lines.push('');
    }

    // Sensitive files
    if (sf?.length) {
      lines.push(`## Sensitive Files Detected`);
      lines.push(sf.map((s) => `- \`${s.relPath}\` (${s.type})`).join('\n'));
      lines.push('');
    }

    // History
    if (issueHistory?.length) {
      lines.push(`## Issue History (last ${Math.min(issueHistory.length, 20)} checks)`);
      lines.push('| Time | Issues |');
      lines.push('|------|--------|');
      for (const entry of issueHistory.slice(-20)) {
        lines.push(`| ${new Date(entry.ts).toLocaleString()} | ${entry.count} |`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  function generateJsonReport() {
    const data = secretsStatus.data;
    const report = {
      generatedAt: new Date().toISOString(),
      summary: { issueCount: hygieneIssueList?.length ?? null, issues: hygieneIssueList ?? [] },
      fileStatus: data?.files ?? {},
      hygiene: data?.hygiene ?? {},
      drift: data?.drift ?? null,
      detectedIssues: data?.issues ?? null,
      unusedVars: data?.unusedVars ?? null,
      hardcodedSecrets: data?.hardcodedSecrets ?? null,
      dockerCompose: data?.dockerCompose ?? null,
      githubActions: data?.githubActions ?? null,
      configFileScan: data?.configFileScan ?? null,
      sensitiveFiles: data?.sensitiveFiles ?? null,
      cloudSdkScan: data?.cloudSdkScan ?? null,
      rotationReminders,
      issueHistory: issueHistory ?? [],
    };
    return JSON.stringify(report, null, 2);
  }

  function generateCsvReport() {
    const ALL_ENV = ['.env', '.env.local', ...MULTI_ENV_NAMES];
    const rows = [['Key', 'File', 'Present in File', 'In .env.example', 'Empty', 'Unused', 'Rotation Due', 'Notes']];
    for (const file of ALL_ENV) {
      if (!files[file]?.exists) continue;
      const fileVars = varData?.[file] ?? [];
      for (const { key } of fileVars) {
        const inExample = Boolean((secretsStatus.data?.drift?.inEnvNotExample ?? []).indexOf(key) === -1 && files['.env.example']?.exists);
        const isEmpty   = (issues?.emptyKeys?.[file] ?? []).includes(key);
        const isUnused  = (unusedVars?.unused ?? []).includes(key);
        const reminder  = rotationReminders[key];
        const overdue   = reminder?.rotateBy ? new Date(reminder.rotateBy) < new Date() : false;
        const notes     = [isEmpty && 'empty value', isUnused && 'unused in source', overdue && 'rotation overdue'].filter(Boolean).join('; ');
        rows.push([key, file, 'Yes', inExample ? 'Yes' : 'No', isEmpty ? 'Yes' : 'No', isUnused ? 'Yes' : 'No', reminder?.rotateBy ?? '', notes]);
      }
    }
    return rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  }

  function generateHtmlReport() {
    const ALL_ENV = ['.env', '.env.local', ...MULTI_ENV_NAMES];
    const ts = new Date().toISOString();
    const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const issueCount = hygieneIssueList?.length ?? 0;
    const scoreColor = issueCount === 0 ? '#4ade80' : issueCount < 5 ? '#fbbf24' : '#f87171';

    const fileRows = ['.env', '.env.local', '.env.example', '.gitignore', ...MULTI_ENV_NAMES].map((name) => {
      const info = files[name];
      if (!info) return '';
      const present = info.exists ? '✅' : '❌';
      let ignored = '—';
      if (name === '.env') ignored = hygiene.envIgnored == null ? '—' : hygiene.envIgnored ? '✅' : '⚠️';
      else if (name === '.env.local') ignored = hygiene.envLocalIgnored == null ? '—' : hygiene.envLocalIgnored ? '✅' : '⚠️';
      else if (MULTI_ENV_NAMES.includes(name)) ignored = hygiene.multiEnvIgnored?.[name] == null ? '—' : hygiene.multiEnvIgnored[name] ? '✅' : '⚠️';
      return `<tr><td><code>${esc(name)}</code></td><td>${present}</td><td>${ignored}</td><td>${info.varCount ?? '—'}</td><td>${info.modified ? new Date(info.modified).toLocaleDateString() : '—'}</td></tr>`;
    }).join('');

    const issueRows = (hygieneIssueList ?? []).map((msg) =>
      `<tr><td style="color:#f87171">⚠</td><td>${esc(msg)}</td></tr>`
    ).join('') || '<tr><td colspan="2" style="color:#4ade80">All checks passed ✅</td></tr>';

    const varRows = ALL_ENV.flatMap((file) => (varData?.[file] ?? []).map(({ key }) => {
      const isEmpty  = (issues?.emptyKeys?.[file] ?? []).includes(key);
      const isUnused = (unusedVars?.unused ?? []).includes(key);
      const reminder = rotationReminders[key];
      const overdue  = reminder?.rotateBy && new Date(reminder.rotateBy) < new Date();
      const flags    = [isEmpty && '<span style="color:#fbbf24">empty</span>', isUnused && '<span style="color:#94a3b8">unused</span>', overdue && '<span style="color:#f87171">rotation overdue</span>'].filter(Boolean).join(' ');
      return `<tr><td><code>${esc(key)}</code></td><td><code style="color:#94a3b8">${esc(file)}</code></td><td>${flags || '—'}</td></tr>`;
    })).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Hygiene Report — ${ts.slice(0,10)}</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0d1829;color:#e2e8f0;padding:32px;line-height:1.6}
  h1{font-size:22px;margin-bottom:4px}h2{font-size:14px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#c084fc;margin:28px 0 10px}
  table{width:100%;border-collapse:collapse;font-size:13px}th{text-align:left;padding:7px 12px;background:rgba(255,255,255,.05);font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#94a3b8}
  td{padding:7px 12px;border-bottom:1px solid rgba(255,255,255,.06)}code{font-family:monospace;background:rgba(255,255,255,.07);padding:1px 5px;border-radius:3px}
  .badge{display:inline-block;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700}
  .meta{font-size:12px;color:#64748b;margin-top:32px}
</style>
</head>
<body>
<h1>Environment Hygiene Report</h1>
<p style="color:#64748b;font-size:13px">Generated: ${esc(ts)}</p>
<span class="badge" style="background:${scoreColor}22;color:${scoreColor};border:1px solid ${scoreColor}55">${issueCount === 0 ? 'All clear' : `${issueCount} issue${issueCount !== 1 ? 's' : ''}`}</span>

<h2>File Status</h2>
<table><thead><tr><th>File</th><th>Present</th><th>Gitignored</th><th>Vars</th><th>Modified</th></tr></thead>
<tbody>${fileRows}</tbody></table>

<h2>Issues</h2>
<table><tbody>${issueRows}</tbody></table>

<h2>Variables</h2>
<table><thead><tr><th>Key</th><th>File</th><th>Flags</th></tr></thead>
<tbody>${varRows || '<tr><td colspan="3" style="color:#64748b">Expand Variables section and refresh to populate.</td></tr>'}</tbody></table>

<p class="meta">Presence check only — never stores or reveals actual secret values.</p>
</body></html>`;
  }

  function handleExportDownload() {
    let content, ext, mime;
    if (reportFormat === 'csv')  { content = generateCsvReport();  ext = 'csv';  mime = 'text/csv'; }
    else if (reportFormat === 'html') { content = generateHtmlReport(); ext = 'html'; mime = 'text/html'; }
    else if (reportFormat === 'json') { content = generateJsonReport(); ext = 'json'; mime = 'application/json'; }
    else                          { content = generateMarkdownReport(); ext = 'md'; mime = 'text/plain'; }
    const filename = `hygiene-report-${new Date().toISOString().slice(0, 10)}.${ext}`;
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  function getReportContent() {
    if (reportFormat === 'csv')  return generateCsvReport();
    if (reportFormat === 'html') return generateHtmlReport();
    if (reportFormat === 'json') return generateJsonReport();
    return generateMarkdownReport();
  }

  function handleExportCopy() {
    navigator.clipboard.writeText(getReportContent()).then(() => {
      setReportCopied(true);
      setTimeout(() => setReportCopied(false), 2000);
    });
  }

  function saveRotationReminder(key, draft) {
    const updated = { ...rotationReminders };
    if (!draft.rotateBy) { delete updated[key]; } else { updated[key] = { rotateBy: draft.rotateBy, note: draft.note || '' }; }
    setSection('rotationReminders', updated);
    setEditingRotation(null);
  }

  // ── Terminal state ─────────────────────────────────────────────────────────
  const [commandLog, setCommandLog] = useState({ loading: false, entries: [], error: null });
  const [terminalHeight, setTerminalHeight] = useState(240);
  const [terminalCollapsed, setTerminalCollapsed] = useState(true);
  const [terminalTab, setTerminalTab] = useState('output');
  const [terminalSearch, setTerminalSearch] = useState('');
  const [terminalInput, setTerminalInput] = useState('');
  const [expandedEntries, setExpandedEntries] = useState(() => new Set());
  const [showProbes, setShowProbes] = useState(false);
  const [runState, setRunState] = useState({ running: false, command: null, result: null });
  const terminalBodyRef = useRef(null);
  const [hoveredHygieneRow, setHoveredHygieneRow] = useState(null);
  const [hoveredHygienePos, setHoveredHygienePos] = useState({ x: 0, y: 0 });
  const [hoveredHeader, setHoveredHeader] = useState(null);
  const [hoveredHeaderPos, setHoveredHeaderPos] = useState({ x: 0, y: 0 });
  const [hoveredBadge, setHoveredBadge] = useState(false);
  const [hoveredBadgePos, setHoveredBadgePos] = useState({ x: 0, y: 0 });
  const [fixingRow, setFixingRow] = useState(null);
  const [bulkFixing, setBulkFixing] = useState(false);
  const [fixHistory, setFixHistory] = useState([]);       // [{ label, snapshot }] — session undo stack
  const [addingExampleKey, setAddingExampleKey] = useState(() => new Set()); // keys being quick-added
  const [lastCheckedAt, setLastCheckedAt] = useState(null);
  const [lastFileChangedAt, setLastFileChangedAt] = useState(null); // latest mtime from watcher
  const [snippetTab, setSnippetTab] = useState('husky');             // active tab in pre-commit snippet picker
  const [copiedSnippet, setCopiedSnippet] = useState(null);         // feedback for snippet copy button
  const [tickNow, setTickNow] = useState(() => Date.now());          // periodically updated for stale calc
  const loadSecretsStatusRef = useRef(null);                         // stable ref to avoid stale closure
  const [copiedPath, setCopiedPath] = useState(null);
  // ── Variables section state ───────────────────────────────────────────────
  const [varsExpanded, setVarsExpanded] = useState(false);
  const [varData, setVarData] = useState(null);    // { [file]: [{key, value, lineNumber}] }
  const [loadingVarData, setLoadingVarData] = useState(false);
  const [varFilter, setVarFilter] = useState('');
  const [editingVar, setEditingVar] = useState(null); // { file, key, draft, confirming }
  const [savingVar, setSavingVar] = useState(null);   // { file, key } being written
  const [peekingVar, setPeekingVar] = useState(null); // key name whose partial value is revealed
  const [redactedCopied, setRedactedCopied] = useState(false);
  const [regeneratingExample, setRegeneratingExample] = useState(false);
  // ── Reporting state ───────────────────────────────────────────────────────
  const [issueHistory, setIssueHistory] = useState(null);   // [{ ts, count }] loaded from disk
  const [reportPanelOpen, setReportPanelOpen] = useState(false);
  const [reportFormat, setReportFormat] = useState('markdown'); // 'markdown' | 'json' | 'csv' | 'html'
  const [reportCopied, setReportCopied] = useState(false);
  // ── Issue explainer state ─────────────────────────────────────────────────
  const [whyFlaggedIssue, setWhyFlaggedIssue] = useState(null); // issue string to explain
  // ── Rotation reminder state ───────────────────────────────────────────────
  const [editingRotation, setEditingRotation] = useState(null); // { key, draft: {rotateBy, note} }

  const terminalFilteredEntries = useMemo(() => {
    let entries = [...commandLog.entries].reverse();
    if (terminalTab === 'problems') entries = entries.filter((e) => !e.ok || e.code !== 0);
    else if (terminalTab === 'output') entries = entries.filter((e) => e.source === 'run' || e.source === 'action');
    if (!showProbes) entries = entries.filter((e) => e.source !== 'probe');
    if (terminalSearch.trim()) {
      const q = terminalSearch.toLowerCase();
      entries = entries.filter((e) =>
        (e.command || '').toLowerCase().includes(q) ||
        (e.stdout || '').toLowerCase().includes(q) ||
        (e.stderr || '').toLowerCase().includes(q)
      );
    }
    return entries;
  }, [commandLog.entries, terminalTab, showProbes, terminalSearch]);

  const problemCount = useMemo(() => commandLog.entries.filter((e) => !e.ok || e.code !== 0).length, [commandLog.entries]);

  const terminalTranscript = useMemo(() => {
    if (!terminalFilteredEntries.length) return '';
    return terminalFilteredEntries.map((entry) => {
      const lines = [`$ ${entry.command}`];
      if (entry.stdout) lines.push(entry.stdout);
      if (entry.stderr) lines.push(`[stderr] ${entry.stderr}`);
      lines.push(`exit ${entry.code} · ${Math.round((entry.durationMs || 0) / 10) / 100}s`);
      return lines.filter(Boolean).join('\n');
    }).join('\n\n');
  }, [terminalFilteredEntries]);

  const terminalStatusText = useMemo(
    () => commandLog.loading ? 'Refreshing…' : `${terminalFilteredEntries.length} entr${terminalFilteredEntries.length === 1 ? 'y' : 'ies'}`,
    [commandLog.loading, terminalFilteredEntries.length]
  );

  // Keep ref pointing at the latest loadSecretsStatus so the watcher closure never goes stale
  loadSecretsStatusRef.current = loadSecretsStatus;

  // Initial load
  useEffect(() => { loadSecretsStatus(); loadCommandLog(); }, []); // eslint-disable-line

  // Clock tick — re-evaluates stale condition every 30 s without forcing heavy recomputation
  useEffect(() => {
    const t = setInterval(() => setTickNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  // Hygiene file watcher — subscribe once; auto-refresh on every file-change event
  useEffect(() => {
    if (!window.electronAPI?.onHygieneFileChanged) return;
    const unsub = window.electronAPI.onHygieneFileChanged(({ changedAt }) => {
      setLastFileChangedAt(changedAt);
      loadSecretsStatusRef.current?.();
    });
    return unsub;
  }, []); // eslint-disable-line

  // Load variable data on mount (needed for peek) and again when Variables section is expanded
  useEffect(() => {
    if (varData === null && !loadingVarData) loadVarData();
  }, []); // eslint-disable-line

  useEffect(() => {
    if (varsExpanded && varData === null && !loadingVarData) loadVarData();
  }, [varsExpanded]); // eslint-disable-line

  // Load issue history on mount
  useEffect(() => {
    if (!window.electronAPI?.hygieneHistory) return;
    window.electronAPI.hygieneHistory({ action: 'read' }).then((res) => {
      if (res?.ok && Array.isArray(res.entries)) setIssueHistory(res.entries);
    }).catch(() => {});
  }, []); // eslint-disable-line

  // Append to issue history each time a check completes (lastCheckedAt changes)
  useEffect(() => {
    if (lastCheckedAt === null || hygieneIssueList === null) return;
    if (!window.electronAPI?.hygieneHistory) return;
    const count = hygieneIssueList.length;
    window.electronAPI.hygieneHistory({ action: 'append', count }).then((res) => {
      if (res?.ok && Array.isArray(res.entries)) setIssueHistory(res.entries);
    }).catch(() => {});
  }, [lastCheckedAt]); // eslint-disable-line

  useEffect(() => {
    if (terminalBodyRef.current) {
      terminalBodyRef.current.scrollTop = terminalBodyRef.current.scrollHeight;
    }
  }, [terminalTranscript]);

  const envPresence = secretsStatus.data?.envPresence || {};

  // Returns a partially-masked value like "llx-cxC••••••••x9" for a given key
  const partialMask = (keyName) => {
    if (!varData) return '••••••••';
    const allRows = Object.values(varData).flat();
    const row = allRows.find(r => r.key === keyName);
    if (!row?.value) return '••••••••';
    const v = row.value;
    if (v.length <= 10) return '•'.repeat(v.length);
    return `${v.slice(0, 6)}${'•'.repeat(Math.max(4, v.length - 10))}${v.slice(-4)}`;
  };
  const files = secretsStatus.data?.files || {};
  const hygiene = secretsStatus.data?.hygiene || {};
  const drift = secretsStatus.data?.drift ?? null;
  const issues = secretsStatus.data?.issues ?? null;
  const gitAvailable = secretsStatus.data?.gitAvailable ?? null;
  const unusedVars = secretsStatus.data?.unusedVars ?? null;
  const hardcodedSecrets = secretsStatus.data?.hardcodedSecrets ?? null;
  const dockerCompose = secretsStatus.data?.dockerCompose ?? null;
  const githubActions = secretsStatus.data?.githubActions ?? null;
  const configFileScan = secretsStatus.data?.configFileScan ?? null;
  const sensitiveFiles = secretsStatus.data?.sensitiveFiles ?? null;
  const preCommitHooks = secretsStatus.data?.preCommitHooks ?? null;
  const secretsManagers = secretsStatus.data?.secretsManagers ?? null;
  const cloudSdkScan = secretsStatus.data?.cloudSdkScan ?? null;
  const gitHistory = hygiene.gitHistory || {};

  // Rotation reminders (persisted in settings)
  const rotationReminders = settings?.rotationReminders ?? {};
  const overdueKeys = Object.entries(rotationReminders)
    .filter(([, v]) => v?.rotateBy && new Date(v.rotateBy) < new Date())
    .map(([k]) => k);

  const presentRequiredCount = SECRET_PROVIDERS.filter((p) => p.requiredEnv.every((n) => envPresence[n])).length;
  const presentEnvCount = expectedSecretVars.filter((n) => envPresence[n]).length;
  const hygieneOkay = Boolean(hygiene.envIgnored && hygiene.envLocalIgnored);
  const checkedChecklistCount = secretChecklist.filter((item) => item.checked).length;

  // Hygiene issue rollup — null means "not yet checked", empty array means all clear
  const hygieneIssueList = secretsStatus.data === null ? null : [
    files['.env']?.exists       && !hygiene.envIgnored      ? '.env is present but not gitignored'       : null,
    files['.env.local']?.exists && !hygiene.envLocalIgnored ? '.env.local is present but not gitignored' : null,
    !files['.env.example']?.exists                          ? '.env.example is missing'                  : null,
    !files['.gitignore']?.exists                            ? '.gitignore is missing'                    : null,
    ...MULTI_ENV_NAMES
      .filter((n) => files[n]?.exists && hygiene.multiEnvIgnored?.[n] === false)
      .map((n) => `${n} is present but not gitignored`),
    ...(['.env', '.env.local', ...MULTI_ENV_NAMES]
      .filter((n) => gitHistory[n]?.found)
      .map((n) => `${n} found in ${gitHistory[n].hitCount} git commit${gitHistory[n].hitCount !== 1 ? 's' : ''} — rotate credentials`)),
    (drift?.inEnvNotExample?.length  ?? 0) > 0 ? `${drift.inEnvNotExample.length} key${drift.inEnvNotExample.length !== 1 ? 's' : ''} in .env missing from .env.example`   : null,
    (drift?.inExampleNotEnv?.length  ?? 0) > 0 ? `${drift.inExampleNotEnv.length} key${drift.inExampleNotEnv.length !== 1 ? 's' : ''} in .env.example missing from .env`   : null,
    issues?.permissionWarning === 'world-readable' ? '.env is world-readable (o+r) — run chmod 600 .env' : null,
    issues?.permissionWarning === 'group-writable' ? '.env is group-writable (g+w) — run chmod 600 .env' : null,
    ...['.env', '.env.local', ...MULTI_ENV_NAMES]
      .filter((n) => (issues?.duplicateKeys?.[n] ?? []).length > 0)
      .map((n) => `${issues.duplicateKeys[n].length} duplicate key${issues.duplicateKeys[n].length !== 1 ? 's' : ''} in ${n}`),
    (issues?.exampleLeaks ?? []).length > 0 ? `${issues.exampleLeaks.length} real credential${issues.exampleLeaks.length !== 1 ? 's' : ''} detected in .env.example` : null,
    ...['.env', '.env.local', ...MULTI_ENV_NAMES]
      .filter((n) => (issues?.emptyKeys?.[n] ?? []).length > 0)
      .map((n) => `${issues.emptyKeys[n].length} empty key${issues.emptyKeys[n].length !== 1 ? 's' : ''} in ${n}`),
    ...['.env', '.env.local', ...MULTI_ENV_NAMES]
      .filter((n) => (issues?.badNameKeys?.[n] ?? []).length > 0)
      .map((n) => `${issues.badNameKeys[n].length} non-SCREAMING_SNAKE key${issues.badNameKeys[n].length !== 1 ? 's' : ''} in ${n}`),
    unusedVars !== null && unusedVars.unused.length > 0
      ? `${unusedVars.unused.length} unused env var${unusedVars.unused.length !== 1 ? 's' : ''} (defined but never read in source)` : null,
    hardcodedSecrets !== null && hardcodedSecrets.findings.length > 0
      ? `${hardcodedSecrets.findings.length} potential hardcoded secret${hardcodedSecrets.findings.length !== 1 ? 's' : ''} in source files` : null,
    dockerCompose !== null && dockerCompose.missingKeys.length > 0
      ? `${dockerCompose.missingKeys.length} docker-compose env key${dockerCompose.missingKeys.length !== 1 ? 's' : ''} missing from .env` : null,
    githubActions !== null && githubActions.undocumentedSecrets.length > 0
      ? `${githubActions.undocumentedSecrets.length} GitHub Actions secret${githubActions.undocumentedSecrets.length !== 1 ? 's' : ''} not in .env.example` : null,
    configFileScan !== null && configFileScan.length > 0
      ? `${configFileScan.length} hardcoded token${configFileScan.length !== 1 ? 's' : ''} detected in .npmrc / .pypirc` : null,
    sensitiveFiles !== null && sensitiveFiles.length > 0
      ? `${sensitiveFiles.length} sensitive key/cert file${sensitiveFiles.length !== 1 ? 's' : ''} found in project` : null,
    // Cloud SDK credential files
    cloudSdkScan?.aws?.found && cloudSdkScan.aws.hasKeys
      ? 'Cloud SDK: AWS credentials file detected — consider using env vars instead' : null,
    cloudSdkScan?.gcloud?.found && cloudSdkScan.gcloud.hasAdc
      ? 'Cloud SDK: GCloud application default credentials detected — consider using env vars instead' : null,
    cloudSdkScan?.azure?.found && cloudSdkScan.azure.hasTokens
      ? 'Cloud SDK: Azure token cache detected — consider using env vars instead' : null,
    // Rotation reminders
    ...overdueKeys.map((k) => `Rotation overdue for ${k} (scheduled: ${rotationReminders[k]?.rotateBy})`),
  ].filter(Boolean);
  const hygieneIssueCount = hygieneIssueList === null ? null : hygieneIssueList.length;

  // Production-readiness checklist — computed from all existing detection data
  const prodChecklist = secretsStatus.data === null ? null : [
    {
      id: 'env-gitignored',
      label: '.env is gitignored',
      pass: !files['.env']?.exists || Boolean(hygiene.envIgnored),
      detail: !files['.env']?.exists ? 'No .env file — safe' : hygiene.envIgnored ? 'Gitignored' : '.env not gitignored',
    },
    {
      id: 'example-present',
      label: '.env.example exists',
      pass: Boolean(files['.env.example']?.exists),
      detail: files['.env.example']?.exists ? 'Present' : 'Missing',
    },
    {
      id: 'no-drift',
      label: '.env in sync with .env.example',
      pass: drift === null || ((drift.inEnvNotExample?.length ?? 0) + (drift.inExampleNotEnv?.length ?? 0) === 0),
      detail: drift === null ? 'Not checked' : ((drift.inEnvNotExample?.length ?? 0) + (drift.inExampleNotEnv?.length ?? 0)) === 0 ? 'In sync' : `${(drift.inEnvNotExample?.length ?? 0) + (drift.inExampleNotEnv?.length ?? 0)} key(s) out of sync`,
    },
    {
      id: 'no-leaks',
      label: 'No real credentials in .env.example',
      pass: (issues?.exampleLeaks ?? []).length === 0,
      detail: (issues?.exampleLeaks ?? []).length === 0 ? 'Clean' : `${issues.exampleLeaks.length} credential(s) detected`,
    },
    {
      id: 'no-hardcoded',
      label: 'No hardcoded secrets in source',
      pass: hardcodedSecrets === null || hardcodedSecrets.findings.length === 0,
      detail: hardcodedSecrets === null ? 'Not scanned' : hardcodedSecrets.findings.length === 0 ? 'Clean' : `${hardcodedSecrets.findings.length} finding(s)`,
    },
    {
      id: 'precommit',
      label: 'Pre-commit hook configured',
      pass: Boolean(preCommitHooks?.hasAnyHook),
      detail: preCommitHooks?.hasAnyHook ? 'Hook detected' : 'No hook found',
    },
    {
      id: 'no-rotation-overdue',
      label: 'No overdue rotation reminders',
      pass: overdueKeys.length === 0,
      detail: overdueKeys.length === 0 ? 'All up to date' : `${overdueKeys.length} key(s) overdue`,
    },
    {
      id: 'no-git-history',
      label: 'No env files in git history',
      pass: !['.env', '.env.local', ...MULTI_ENV_NAMES].some((n) => gitHistory[n]?.found),
      detail: !['.env', '.env.local', ...MULTI_ENV_NAMES].some((n) => gitHistory[n]?.found) ? 'Clean history' : 'Found in commits — rotate credentials',
    },
  ];
  const prodScore = prodChecklist ? prodChecklist.filter((c) => c.pass).length : 0;
  const prodTotal = prodChecklist?.length ?? 0;

  // Stale: last check was >5 min ago AND a watched file was modified after the check completed
  const STALE_MS = 5 * 60 * 1000;
  const isStale = lastCheckedAt !== null
    && tickNow - lastCheckedAt > STALE_MS
    && lastFileChangedAt !== null
    && lastFileChangedAt > lastCheckedAt;

  // All per-row fix actions that are currently pending — used by Fix All and Undo
  const allPendingFixes = secretsStatus.data === null ? [] : [
    files['.env']?.exists       && !hygiene.envIgnored      ? { rowName: '.env',          action: 'addToGitignore', entry: '.env',          label: 'Add .env to .gitignore'       } : null,
    files['.env.local']?.exists && !hygiene.envLocalIgnored ? { rowName: '.env.local',     action: 'addToGitignore', entry: '.env.local',     label: 'Add .env.local to .gitignore' } : null,
    !files['.env.example']?.exists                          ? { rowName: '.env.example',   action: 'createExample',                           label: 'Create .env.example'          } : null,
    !files['.gitignore']?.exists                            ? { rowName: '.gitignore',      action: 'createGitignore',                         label: 'Create .gitignore'            } : null,
    ...MULTI_ENV_NAMES
      .filter((n) => files[n]?.exists && hygiene.multiEnvIgnored?.[n] === false)
      .map((n) => ({ rowName: n, action: 'addToGitignore', entry: n, label: `Add ${n} to .gitignore` })),
  ].filter(Boolean);

  const providerStatus = (provider) => {
    const requiredPresent = provider.requiredEnv.filter((n) => envPresence[n]).length;
    if (provider.requiredEnv.length === 0) return { status: 'planned', label: 'Reference only' };
    if (requiredPresent === provider.requiredEnv.length) return { status: 'complete', label: 'Required vars detected' };
    if (requiredPresent > 0) return { status: 'in_progress', label: `${requiredPresent}/${provider.requiredEnv.length} required vars detected` };
    return { status: 'later', label: 'Missing required vars' };
  };

  const secretNextActions = [
    !hygiene.envIgnored ? 'Add .env to .gitignore before using local provider keys.' : null,
    !hygiene.envLocalIgnored ? 'Ignore .env.local so machine-specific secrets never end up in git.' : null,
    !files['.env.example']?.exists ? 'Create an .env.example file that documents expected variables without real values.' : null,
    SECRET_PROVIDERS.some((p) => p.requiredEnv.length > 0 && !p.requiredEnv.every((n) => envPresence[n]))
      ? 'Document which providers are optional versus required so Launchline contributors know which keys must exist before launch.'
      : null,
    !secretPolicies.redactLogs ? 'Turn log redaction back on before running tasks against providers that use keys or passwords.' : null,
    !secretPolicies.separateCredentialsByEnvironment ? 'Use separate local, staging, and production credentials to reduce blast radius.' : null,
  ].filter(Boolean);

  // ── Terminal functions ─────────────────────────────────────────────────────
  function toggleEntry(id) {
    setExpandedEntries((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function loadCommandLog() {
    if (!window.electronAPI?.readPythonCommandLog) {
      setCommandLog({ loading: false, entries: [], error: 'Command log bridge is unavailable.' });
      return;
    }
    setCommandLog((cur) => ({ ...cur, loading: true, error: null }));
    try {
      const result = await window.electronAPI.readPythonCommandLog();
      if (!result?.ok) {
        setCommandLog({ loading: false, entries: [], error: result?.error || 'Failed to load command log.' });
        return;
      }
      setCommandLog({ loading: false, entries: Array.isArray(result.entries) ? result.entries : [], error: null });
    } catch (err) {
      setCommandLog({ loading: false, entries: [], error: err.message });
    }
  }

  async function clearCommandLog() {
    if (!window.electronAPI?.clearPythonCommandLog) return;
    await window.electronAPI.clearPythonCommandLog();
    await loadCommandLog();
  }

  async function copyTerminalText(value) {
    if (!value) return;
    try { await navigator.clipboard.writeText(value); } catch { /* ignore */ }
  }

  function beginTerminalResize(event) {
    if (terminalCollapsed) return;
    const startY = event.clientY;
    const startHeight = terminalHeight;
    function onMove(e) { setTerminalHeight(Math.max(80, Math.min(600, startHeight - (e.clientY - startY)))); }
    function onUp() { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  async function runCommand(command) {
    if (!window.electronAPI?.runPythonToolCommand || runState.running) return;
    setTerminalCollapsed(false);
    setTerminalTab('output');
    setRunState({ running: true, command, result: null });
    try {
      const result = await window.electronAPI.runPythonToolCommand({ command });
      setRunState({ running: false, command, result });
      await loadCommandLog();
    } catch (err) {
      setRunState({ running: false, command, result: { ok: false, error: err.message } });
      await loadCommandLog();
    }
  }

  function renderTerminalLogViewer() {
    const TABS = [
      { id: 'output',   label: 'Output' },
      { id: 'problems', label: 'Problems' },
      { id: 'terminal', label: 'Terminal' },
    ];
    const emptyMessage = terminalTab === 'problems'
      ? '// No errors logged.'
      : terminalTab === 'output'
      ? '// No user-triggered commands yet.'
      : '// No commands logged yet.';

    return (
      <div style={{ ...pageFooterStyle, height: terminalCollapsed ? 54 : terminalHeight }}>
        {/* Resize handle */}
        <div onMouseDown={beginTerminalResize} style={{ ...terminalHandleStyle, cursor: terminalCollapsed ? 'default' : 'row-resize' }} title="Drag to resize">
          <div style={{ width: 48, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.18)' }} />
        </div>

        {/* Toolbar */}
        <div style={{ padding: '8px 14px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {TABS.map(({ id, label }) => {
                const isActive = terminalTab === id;
                const badge = id === 'problems' && problemCount > 0 ? problemCount : null;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => { setTerminalTab(id); if (terminalCollapsed) setTerminalCollapsed(false); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: isActive ? 'var(--text)' : 'var(--text-muted)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', padding: '4px 10px 6px', borderBottom: isActive ? '1px solid var(--text)' : '1px solid transparent' }}
                  >
                    {label}
                    {badge !== null && (
                      <span style={{ background: '#f87171', color: '#fff', borderRadius: 4, fontSize: 10, padding: '1px 5px', fontWeight: 700, lineHeight: 1.4 }}>{badge}</span>
                    )}
                  </button>
                );
              })}
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 10 }}>{terminalStatusText}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {!terminalCollapsed && (
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Search size={11} style={{ position: 'absolute', left: 7, color: 'var(--text-muted)', pointerEvents: 'none' }} />
                  <input type="text" placeholder="Filter…" value={terminalSearch} onChange={(e) => setTerminalSearch(e.target.value)} style={{ ...inputStyle, width: 120, height: 26, fontSize: 11, padding: '0 8px 0 22px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3 }} />
                </div>
              )}
              <button type="button" onClick={() => setShowProbes((v) => !v)} style={{ ...termBtnStyle, padding: '5px 10px', opacity: showProbes ? 1 : 0.5 }} title={showProbes ? 'Showing all commands' : 'Probes hidden'}>
                {showProbes ? 'All commands' : 'User runs only'}
              </button>
              <button type="button" onClick={() => setTerminalCollapsed((v) => !v)} style={{ ...termBtnStyle, padding: '5px 10px' }}>
                {terminalCollapsed ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {terminalCollapsed ? 'Show' : 'Hide'}
              </button>
              <button type="button" onClick={() => copyTerminalText(terminalTranscript)} disabled={!terminalTranscript} style={{ ...termBtnStyle, padding: '5px 10px', opacity: terminalTranscript ? 1 : 0.35 }} title="Copy all output">
                <Copy size={11} />Copy all
              </button>
              <button type="button" onClick={() => loadCommandLog()} disabled={commandLog.loading} style={{ ...termBtnStyle, padding: '5px 10px', opacity: commandLog.loading ? 0.45 : 1 }}>
                <RefreshCw size={11} />Refresh
              </button>
              <button type="button" onClick={() => clearCommandLog()} disabled={commandLog.entries.length === 0} style={{ ...termBtnStyle, padding: '5px 10px', opacity: commandLog.entries.length === 0 ? 0.35 : 1 }}>
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        {!terminalCollapsed && (
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div ref={terminalBodyRef} className="custom-scrollbar" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 18px 8px', fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.65, userSelect: 'text', WebkitUserSelect: 'text' }}>
              {commandLog.error && <div style={{ color: '#f87171' }}>{commandLog.error}</div>}
              {!commandLog.error && terminalFilteredEntries.length === 0 && <div style={{ color: '#8bbcff' }}>{emptyMessage}</div>}
              {!commandLog.error && terminalFilteredEntries.map((entry, i) => {
                const isError = !entry.ok || entry.code !== 0;
                const accentColor = isError ? 'rgba(248,113,113,0.35)' : 'rgba(52,211,153,0.22)';
                const exitColor   = isError ? '#f87171' : '#34d399';
                const ts = entry.finishedAt || entry.startedAt
                  ? new Date(entry.finishedAt || entry.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                  : '?';
                const dur = `${Math.round((entry.durationMs || 0) / 10) / 100}s`;
                const entryId = entry.id || String(i);
                const isExpanded = expandedEntries.has(entryId);
                const hasOutput = !!(entry.stdout || entry.stderr);
                const entryText = [`$ ${entry.command}`, entry.stdout || '', entry.stderr ? `[stderr] ${entry.stderr}` : '', `exit ${entry.code} · ${dur}`].filter(Boolean).join('\n');
                return (
                  <div key={entryId} style={{ marginBottom: 10, borderLeft: `2px solid ${accentColor}`, paddingLeft: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                      <button type="button" onClick={() => hasOutput && toggleEntry(entryId)} style={{ background: 'none', border: 'none', cursor: hasOutput ? 'pointer' : 'default', padding: '1px 2px', color: hasOutput ? 'var(--text-muted)' : 'transparent', flexShrink: 0, marginTop: 1 }}>
                        {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      </button>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 2 }}>
                          {ts} · <span style={{ color: 'rgba(255,255,255,0.65)' }}>{entry.source || 'run'}</span>
                          {entry.label && entry.label !== entry.command ? ` · ${entry.label}` : ''}
                        </div>
                        <div style={{ color: '#c4d4ff', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span><span style={{ color: 'rgba(255,255,255,0.5)' }}>$ </span>{entry.command}</span>
                          <span style={{ color: exitColor, fontSize: 11, flexShrink: 0 }}>{isError ? '✗' : '✓'} exit {entry.code} · {dur}</span>
                        </div>
                      </div>
                      <button type="button" onClick={() => copyTerminalText(entryText)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', color: 'var(--text-muted)', flexShrink: 0, opacity: 0.6 }} title="Copy this entry">
                        <Copy size={11} />
                      </button>
                    </div>
                    {isExpanded && hasOutput && (
                      <div style={{ marginTop: 5, paddingLeft: 18 }}>
                        {entry.stdout && <pre style={{ margin: '0 0 3px', color: '#8bbcff', whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: 12, background: 'transparent' }}>{entry.stdout}</pre>}
                        {entry.stderr && <pre style={{ margin: '0 0 3px', color: '#fca5a5', whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: 12, background: 'transparent' }}>{entry.stderr}</pre>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Input prompt */}
            <div style={{ flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.07)', padding: '6px 14px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'rgba(255,255,255,0.5)', flexShrink: 0 }}>$</span>
              <input
                type="text"
                placeholder="Run a command…"
                value={terminalInput}
                onChange={(e) => setTerminalInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && terminalInput.trim() && !runState.running) { runCommand(terminalInput.trim()); setTerminalInput(''); } }}
                disabled={runState.running}
                style={{ ...inputStyle, flex: 1, height: 26, fontSize: 12, fontFamily: 'var(--font-mono)', background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, color: '#c4d4ff' }}
              />
              <button type="button" onClick={() => { if (terminalInput.trim()) { runCommand(terminalInput.trim()); setTerminalInput(''); } }} disabled={!terminalInput.trim() || runState.running} style={{ ...termBtnStyle, padding: '4px 12px', opacity: terminalInput.trim() && !runState.running ? 1 : 0.35 }}>
                Run
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={embedded ? {} : pageWrapStyle}>
    <div className={embedded ? '' : 'custom-scrollbar'} style={embedded ? {} : pageContentStyle}>

      <Section title={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <FileCode2 size={16} />
          Environment File Hygiene
          {hygieneIssueCount === null ? null : hygieneIssueCount === 0 ? (
            <span
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#4ade80', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', borderRadius: 999, padding: '2px 8px', lineHeight: 1.5, cursor: 'default' }}
              onMouseEnter={(e) => { const r = e.currentTarget.getBoundingClientRect(); setHoveredBadgePos({ x: r.left, y: r.bottom }); setHoveredBadge(true); }}
              onMouseLeave={() => setHoveredBadge(false)}
            >
              <CheckCircle2 size={10} />All clear
            </span>
          ) : (
            <span
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#f87171', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.28)', borderRadius: 999, padding: '2px 8px', lineHeight: 1.5, cursor: 'default' }}
              onMouseEnter={(e) => { const r = e.currentTarget.getBoundingClientRect(); setHoveredBadgePos({ x: r.left, y: r.bottom }); setHoveredBadge(true); }}
              onMouseLeave={() => setHoveredBadge(false)}
            >
              <AlertTriangle size={10} />{hygieneIssueCount} issue{hygieneIssueCount !== 1 ? 's' : ''}
            </span>
          )}
          {issueHistory && issueHistory.length >= 2 && (
            <Sparkline entries={issueHistory} width={52} height={18} n={20} />
          )}
        </span>
      }>
        {(() => {
          const rows = [
            {
              name: '.env',
              tooltip: {
                what: 'Primary local credentials file',
                why: 'Stores real API keys, passwords, and service URLs used during local development. Must never be committed to version control or included in any repository.',
                implications: [
                  { label: 'Not present', safe: true, text: 'No local credentials stored yet. Safe state — create this file when you start adding real provider keys.' },
                  { label: 'Present and gitignored', safe: true, text: 'Credentials are protected from git. Ideal setup — keys stay local and never appear in repository history.' },
                  { label: 'Present but not gitignored', safe: false, text: 'At risk of being committed. Any provider key in this file could be pushed and permanently exposed in the git history.' },
                ],
              },
              getSafety: (info, hy) => {
                if (!info.exists) return { safe: true, msg: 'Not present — no exposure risk' };
                if (hy.envIgnored) return { safe: true, msg: 'Present and gitignored — safe' };
                return { safe: false, msg: 'Present but not gitignored — at risk' };
              },
              getFixAction: (info, hy) => {
                if (info.exists && !hy.envIgnored) return { action: 'addToGitignore', entry: '.env', label: 'Add to .gitignore' };
                return null;
              },
            },
            {
              name: '.env.local',
              tooltip: {
                what: 'Machine-specific credential overrides',
                why: 'Holds environment variables that differ per developer machine. Often contains real production-level keys used for local testing — never shared across clones.',
                implications: [
                  { label: 'Not present', safe: true, text: 'No machine-specific overrides yet. Safe — create if you need credentials that differ from .env.' },
                  { label: 'Present and gitignored', safe: true, text: 'Local overrides are protected. Each collaborator keeps their own credentials without affecting others.' },
                  { label: 'Present but not gitignored', safe: false, text: 'Machine-specific credentials risk being committed. Add .env.local to .gitignore immediately.' },
                ],
              },
              getSafety: (info, hy) => {
                if (!info.exists) return { safe: true, msg: 'Not present — no exposure risk' };
                if (hy.envLocalIgnored) return { safe: true, msg: 'Present and gitignored — safe' };
                return { safe: false, msg: 'Present but not gitignored — at risk' };
              },
              getFixAction: (info, hy) => {
                if (info.exists && !hy.envLocalIgnored) return { action: 'addToGitignore', entry: '.env.local', label: 'Add to .gitignore' };
                return null;
              },
            },
            {
              name: '.env.example',
              tooltip: {
                what: '.env.example reference file',
                why: 'Should be committed to the repo. Documents every variable the app expects using placeholder values — no real secrets. Acts as the onboarding guide for new contributors.',
                implications: [
                  { label: 'Reference present', safe: true, text: 'New contributors can onboard by copying this file and filling in their own values. Variables are self-documented.' },
                  { label: 'Missing', safe: false, text: 'Anyone cloning the project has no reference for what to configure. Increases onboarding friction and risk of misconfiguration.' },
                ],
              },
              getSafety: (info) => {
                if (info.exists) return { safe: true, msg: 'Reference present — variables documented' };
                return { safe: false, msg: 'Missing — collaborators have no reference' };
              },
              getFixAction: (info) => {
                if (!info.exists) return { action: 'createExample', label: 'Create .env.example' };
                return null;
              },
            },
            {
              name: '.gitignore',
              tooltip: {
                what: 'Git exclusion rules file',
                why: 'The foundation of all secrets protection in git-based projects. Lists files and patterns that git should never track or commit.',
                implications: [
                  { label: 'Present', safe: true, text: 'Git can exclude sensitive files. All other hygiene checks — like .env being gitignored — can only take effect if this file exists.' },
                  { label: 'Missing', safe: false, text: 'Even if .env is listed in a .gitignore that does not exist, secrets will still be committed. This must be created before any other protection works.' },
                ],
              },
              getSafety: (info) => {
                if (info.exists) return { safe: true, msg: 'Present — ready to protect sensitive files' };
                return { safe: false, msg: 'Missing — cannot exclude any files from git' };
              },
              getFixAction: (info) => {
                if (!info.exists) return { action: 'createGitignore', label: 'Create .gitignore' };
                return null;
              },
            },
            // Dynamic multi-env rows — only shown when the file exists on disk
            ...MULTI_ENV_NAMES
              .filter((n) => files[n]?.exists)
              .map((n) => ({
                name: n,
                tooltip: {
                  what: `Environment-specific overrides (${n})`,
                  why: `Contains credentials or settings scoped to a specific environment (${n.replace('.env.', '')}). Should never be committed if it holds real secrets.`,
                  implications: [
                    { label: 'Present and gitignored', safe: true,  text: 'Environment credentials stay local and are not tracked by git.' },
                    { label: 'Present but not gitignored', safe: false, text: 'Environment-specific secrets risk being committed. Add this file to .gitignore.' },
                  ],
                },
                getSafety: (info, hy) => {
                  if (!info.exists) return { safe: true, msg: 'Not present — no exposure risk' };
                  const ignored = hy.multiEnvIgnored?.[n];
                  if (ignored) return { safe: true, msg: 'Present and gitignored — safe' };
                  return { safe: false, msg: 'Present but not gitignored — at risk' };
                },
                getFixAction: (info, hy) => {
                  const ignored = hy.multiEnvIgnored?.[n];
                  if (info.exists && !ignored) return { action: 'addToGitignore', entry: n, label: `Add ${n} to .gitignore` };
                  return null;
                },
              })),
          ];

          const gold = '#e879f9';
          const goldBorder = 'rgba(192,132,252,0.18)';
          const goldRowAlt = 'rgba(192,132,252,0.03)';
          const goldRowBorder = 'rgba(192,132,252,0.1)';
          const hdrStyle = {
            fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
            color: gold, padding: '8px 16px',
            borderBottom: `1px solid ${goldBorder}`, background: 'rgba(20,4,24,0.35)',
            whiteSpace: 'nowrap',
          };
          const cols = 'minmax(100px, 0.5fr) 68px minmax(120px, 1fr) 58px minmax(100px, auto) minmax(160px, 1.4fr) minmax(110px, auto)';

          return (
            <>
            <div style={{ border: `1px solid ${goldBorder}`, borderRadius: 12, background: 'rgba(192,132,252,0.04)', overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: cols }}>
                {/* Header */}
                {(() => {
                  const colDefs = [
                    { key: 'File',     label: 'File',     desc: 'The environment or git config file being checked. Hover the file name for a full description of its role, why it matters, and the implications of each possible result state.' },
                    { key: 'Status',   label: 'Status',   desc: 'Quick-scan safety chip derived from the check result. Safe — file is present and protected, or absent with no risk. At risk — file exists but is unprotected (e.g. not gitignored). Missing — a required file is absent.' },
                    { key: 'Location', label: 'Location', desc: 'Absolute path to the file on disk, truncated when long. Hover the path for the full value. Click the copy icon on the right to copy it to the clipboard.' },
                    { key: 'Vars',     label: 'Vars',     desc: 'Number of key=value entries in the file, excluding blank lines and comments. Gives a quick signal for whether a file is empty or stale. Not applicable to .gitignore.', align: 'right' },
                    { key: 'Modified', label: 'Modified', desc: 'When the file was last written to on disk, shown as a relative time. Hover the value for the exact date and time. Useful for spotting stale or recently rotated credentials.' },
                    { key: 'Result',   label: 'Result',   desc: 'Detailed outcome of the hygiene check — whether the file is present, whether it is gitignored, and the overall safety assessment for that file.' },
                    { key: 'Actions',  label: 'Actions',  desc: 'Per-row actions. Open launches the file in your default editor. Fix applies a one-click automatic repair for the detected issue, such as adding an entry to .gitignore or scaffolding a missing file.' },
                  ];
                  return (
                    <div style={{ display: 'contents' }}>
                      {colDefs.map(({ key, label, align }) => (
                        <div
                          key={key}
                          style={{ ...hdrStyle, textAlign: align || 'left', cursor: 'help', userSelect: 'none' }}
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setHoveredHeaderPos({ x: Math.min(rect.left, window.innerWidth - 276), y: rect.bottom });
                            setHoveredHeader(key);
                          }}
                          onMouseLeave={() => setHoveredHeader(null)}
                        >
                          {label}
                        </div>
                      ))}
                    </div>
                  );
                })()}
                {/* Rows */}
                {rows.map((row, idx) => {
                  const info = files[row.name] || {};
                  const hasData = secretsStatus.data !== null;
                  const safety = hasData ? row.getSafety(info, hygiene) : null;
                  const fixAction = hasData ? row.getFixAction(info, hygiene) : null;
                  const rowBg = idx % 2 === 1 ? goldRowAlt : 'transparent';
                  const cell = { background: rowBg, borderBottom: `1px solid ${goldRowBorder}`, padding: '9px 16px', display: 'flex', alignItems: 'center' };
                  const isFixing = fixingRow === row.name;
                  const chip = !safety ? null
                    : !safety.safe && !info.exists ? { label: 'Missing', color: '#fbbf24',  bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.3)'  }
                    : !safety.safe &&  info.exists ? { label: 'At risk', color: '#f87171',  bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.3)' }
                    :                               { label: 'Safe',     color: '#4ade80',  bg: 'rgba(74,222,128,0.1)',   border: 'rgba(74,222,128,0.25)' };
                  const actionBtnBase = {
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    fontSize: 11, fontWeight: 600, padding: '4px 9px', borderRadius: 6,
                    border: 'none', cursor: 'pointer', flexShrink: 0,
                  };
                  return (
                    <div key={row.name} style={{ display: 'contents' }}>
                      {/* File */}
                      <div
                        style={{ ...cell }}
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setHoveredHygienePos({ x: rect.left, y: rect.bottom });
                          setHoveredHygieneRow(row.name);
                        }}
                        onMouseLeave={() => setHoveredHygieneRow(null)}
                      >
                        <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text)', borderBottom: '1px dashed rgba(232,121,249,0.4)', cursor: 'help' }}>{row.name}</span>
                      </div>
                      {/* Status chip */}
                      <div style={{ ...cell }}>
                        {chip
                          ? <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: chip.color, background: chip.bg, border: `1px solid ${chip.border}`, borderRadius: 4, padding: '2px 6px', lineHeight: 1.4 }}>{chip.label}</span>
                          : <span style={{ fontSize: 12, color: 'rgba(148,163,184,0.25)' }}>—</span>
                        }
                      </div>
                      {/* Location + copy */}
                      <div style={{ ...cell, gap: 5, overflow: 'hidden' }}>
                        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }} title={info.path || ''}>
                          {info.exists ? (info.path || 'Detected in project root') : 'Not present'}
                        </span>
                        {info.path && (
                          <button
                            type="button"
                            title="Copy full path"
                            onClick={() => {
                              navigator.clipboard.writeText(info.path);
                              setCopiedPath(row.name);
                              setTimeout(() => setCopiedPath(null), 1500);
                            }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 3px', color: copiedPath === row.name ? '#4ade80' : 'rgba(148,163,184,0.4)', flexShrink: 0, display: 'flex', alignItems: 'center', transition: 'color 0.15s' }}
                          >
                            {copiedPath === row.name
                              ? <CheckCircle2 size={12} />
                              : <Copy size={12} />
                            }
                          </button>
                        )}
                      </div>
                      {/* Vars */}
                      <div style={{ ...cell, justifyContent: 'flex-end' }}>
                        {info.varCount != null
                          ? <span style={{ fontSize: 12, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: 'var(--text-secondary)' }}>{info.varCount}</span>
                          : <span style={{ fontSize: 12, color: 'rgba(148,163,184,0.3)' }}>—</span>
                        }
                      </div>
                      {/* Modified */}
                      <div style={{ ...cell }}>
                        {info.mtimeMs
                          ? <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }} title={new Date(info.mtimeMs).toLocaleString()}>{relTime(info.mtimeMs)}</span>
                          : <span style={{ fontSize: 12, color: 'rgba(148,163,184,0.3)' }}>—</span>
                        }
                      </div>
                      <div style={{ ...cell, gap: 6 }}>
                        {safety ? (
                          <>
                            {safety.safe
                              ? <CheckCircle2 size={13} style={{ color: '#4ade80', flexShrink: 0 }} />
                              : <AlertTriangle size={13} style={{ color: '#f87171', flexShrink: 0 }} />
                            }
                            <span style={{ fontSize: 12, fontWeight: 600, color: safety.safe ? '#4ade80' : '#f87171', whiteSpace: 'nowrap' }}>
                              {safety.msg}
                            </span>
                          </>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>
                        )}
                      </div>
                      <div style={{ ...cell, gap: 6, flexWrap: 'wrap' }}>
                        {info.exists && info.path && (
                          <button
                            type="button"
                            title={`Open ${row.name} in default editor`}
                            onClick={() => window.electronAPI.openFile(info.path)}
                            style={{ ...actionBtnBase, background: 'rgba(192,132,252,0.12)', color: 'rgba(232,121,249,0.85)' }}
                          >
                            <ExternalLink size={10} />
                            Open
                          </button>
                        )}
                        {fixAction && (
                          <button
                            type="button"
                            title={fixAction.label}
                            disabled={isFixing}
                            onClick={async () => {
                              setFixingRow(row.name);
                              try {
                                const res = await window.electronAPI.fixHygieneIssue({ action: fixAction.action, entry: fixAction.entry });
                                if (res?.ok && res?.snapshot) {
                                  setFixHistory((h) => [...h, { label: fixAction.label, snapshot: res.snapshot }]);
                                }
                                await loadSecretsStatus();
                              } finally {
                                setFixingRow(null);
                              }
                            }}
                            style={{ ...actionBtnBase, background: 'rgba(248,113,113,0.12)', color: isFixing ? 'rgba(248,113,113,0.45)' : '#fca5a5', opacity: isFixing ? 0.7 : 1 }}
                          >
                            <Wrench size={10} />
                            {isFixing ? 'Fixing…' : 'Fix'}
                          </button>
                        )}
                        {!info.exists && !fixAction && (
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>
                        )}
                        {info.exists && !fixAction && !info.path && (
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {hoveredBadge && hygieneIssueList !== null && (
              <div style={{ position: 'fixed', top: hoveredBadgePos.y + 6, left: Math.min(hoveredBadgePos.x, window.innerWidth - 296), zIndex: 9999, width: 300, background: '#0d1829', border: `1px solid ${hygieneIssueCount === 0 ? 'rgba(74,222,128,0.28)' : 'rgba(248,113,113,0.28)'}`, borderRadius: 10, padding: '10px 13px', boxShadow: '0 8px 28px rgba(0,0,0,0.55)', pointerEvents: hygieneIssueList.length > 0 ? 'auto' : 'none' }}>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: hygieneIssueCount === 0 ? '#4ade80' : '#f87171', marginBottom: hygieneIssueList.length ? 8 : 0 }}>
                  {hygieneIssueCount === 0 ? 'All checks passed' : `${hygieneIssueCount} issue${hygieneIssueCount !== 1 ? 's' : ''} detected`}
                </div>
                {hygieneIssueList.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {hygieneIssueList.map((msg, i) => {
                      const hasExplainer = ISSUE_EXPLANATIONS.some((e) => e.match.test(msg));
                      return (
                        <div
                          key={i}
                          onClick={hasExplainer ? () => { setHoveredBadge(false); setWhyFlaggedIssue(msg); } : undefined}
                          style={{ display: 'flex', gap: 7, alignItems: 'flex-start', padding: '3px 5px', borderRadius: 5, cursor: hasExplainer ? 'pointer' : 'default', background: hasExplainer ? 'rgba(255,255,255,0.02)' : 'transparent', transition: 'background 0.1s' }}
                          onMouseEnter={(e) => { if (hasExplainer) e.currentTarget.style.background = 'rgba(192,132,252,0.08)'; }}
                          onMouseLeave={(e) => { if (hasExplainer) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                        >
                          <AlertTriangle size={10} style={{ color: '#f87171', flexShrink: 0, marginTop: 2 }} />
                          <span style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5, flex: 1 }}>{msg}</span>
                          {hasExplainer && <HelpCircle size={10} style={{ color: 'rgba(192,132,252,0.5)', flexShrink: 0, marginTop: 2 }} title="Click to learn why this is flagged" />}
                        </div>
                      );
                    })}
                    <div style={{ fontSize: 9, color: 'rgba(148,163,184,0.35)', marginTop: 3 }}>Click an issue to learn more</div>
                  </div>
                )}
              </div>
            )}
            {hoveredHeader && (() => {
              const colDefs = [
                { key: 'File',     desc: 'The environment or git config file being checked. Hover the file name for a full description of its role, why it matters, and the implications of each possible result state.' },
                { key: 'Status',   desc: 'Quick-scan safety chip derived from the check result. Safe — file is present and protected, or absent with no risk. At risk — file exists but is unprotected (e.g. not gitignored). Missing — a required file is absent.' },
                { key: 'Location', desc: 'Absolute path to the file on disk, truncated when long. Hover the path for the full value. Click the copy icon on the right to copy it to the clipboard.' },
                { key: 'Vars',     desc: 'Number of key=value entries in the file, excluding blank lines and comments. Gives a quick signal for whether a file is empty or stale. Not applicable to .gitignore.' },
                { key: 'Modified', desc: 'When the file was last written to on disk, shown as a relative time. Hover the value for the exact date and time. Useful for spotting stale or recently rotated credentials.' },
                { key: 'Result',   desc: 'Detailed outcome of the hygiene check — whether the file is present, whether it is gitignored, and the overall safety assessment for that file.' },
                { key: 'Actions',  desc: 'Per-row actions. Open launches the file in your default editor. Fix applies a one-click automatic repair for the detected issue, such as adding an entry to .gitignore or scaffolding a missing file.' },
              ];
              const col = colDefs.find((c) => c.key === hoveredHeader);
              if (!col) return null;
              return (
                <div style={{ position: 'fixed', top: hoveredHeaderPos.y + 6, left: hoveredHeaderPos.x, zIndex: 9999, width: 268, background: '#0d1829', border: '1px solid rgba(192,132,252,0.3)', borderRadius: 10, padding: '10px 13px', boxShadow: '0 8px 28px rgba(0,0,0,0.55)', pointerEvents: 'none' }}>
                  <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#e879f9', marginBottom: 5 }}>{col.key}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{col.desc}</div>
                </div>
              );
            })()}
            {hoveredHygieneRow && (() => {
              const hRow = rows.find((r) => r.name === hoveredHygieneRow);
              if (!hRow?.tooltip) return null;
              return (
                <div style={{ position: 'fixed', top: hoveredHygienePos.y + 8, left: hoveredHygienePos.x, zIndex: 9999, width: 320, background: '#0d1829', border: '1px solid rgba(192,132,252,0.35)', borderRadius: 12, padding: '14px 16px', boxShadow: '0 8px 32px rgba(0,0,0,0.6)', pointerEvents: 'none' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#e879f9', marginBottom: 4 }}>{hRow.tooltip.what}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 10, lineHeight: 1.55 }}>{hRow.tooltip.why}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {hRow.tooltip.implications.map((imp) => (
                      <div key={imp.label} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <span style={{ color: imp.safe ? '#4ade80' : '#f87171', flexShrink: 0, fontSize: 12, lineHeight: 1.6 }}>{imp.safe ? '✓' : '✗'}</span>
                        <div>
                          <span style={{ fontSize: 10, fontWeight: 800, color: imp.safe ? '#4ade80' : '#f87171', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{imp.label} · </span>
                          <span style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{imp.text}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
            {/* ── Diagnostic cards: git history + setup drift ────────── */}
            {secretsStatus.data !== null && (() => {
              const cardBase = { borderRadius: 10, padding: '12px 14px' };
              const cardLabel = { fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(192,132,252,0.55)', marginBottom: 9 };
              const histFiles = ['.env', '.env.local', ...MULTI_ENV_NAMES.filter((n) => files[n]?.exists)];
              const hasDrift = drift !== null && (drift.inEnvNotExample.length > 0 || drift.inExampleNotEnv.length > 0);
              const driftBorder = drift === null
                ? 'rgba(192,132,252,0.15)'
                : hasDrift ? 'rgba(251,146,60,0.28)' : 'rgba(74,222,128,0.22)';
              const driftBg = drift === null
                ? 'rgba(192,132,252,0.03)'
                : hasDrift ? 'rgba(251,146,60,0.05)' : 'rgba(74,222,128,0.04)';

              return (
                <>
                <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>

                  {/* ── Git History Exposure ── */}
                  <div style={{ ...cardBase, border: gitAvailable === false ? '1px solid rgba(251,146,60,0.28)' : '1px solid rgba(192,132,252,0.15)', background: gitAvailable === false ? 'rgba(251,146,60,0.05)' : 'rgba(192,132,252,0.03)' }}>
                    <div style={cardLabel}>Git History Exposure</div>
                    {gitAvailable === false ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                          <AlertTriangle size={13} style={{ color: '#fb923c', flexShrink: 0, marginTop: 1 }} />
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#fdba74', lineHeight: 1.5 }}>git is not installed or not in PATH</span>
                        </div>
                        <div style={{ fontSize: 11, color: 'rgba(148,163,184,0.55)', lineHeight: 1.6 }}>
                          History exposure checks require git. Install git and re-run the check to see whether any credential files were ever committed.
                        </div>
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                          {[
                            { label: 'macOS',   cmd: 'brew install git' },
                            { label: 'Ubuntu',  cmd: 'apt install git'  },
                            { label: 'Windows', cmd: 'winget install git.git' },
                          ].map(({ label, cmd }) => (
                            <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(148,163,184,0.4)' }}>{label}</span>
                              <code style={{ fontSize: 10.5, fontFamily: 'var(--font-mono)', color: '#c4d4ff', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 4, padding: '2px 7px' }}>{cmd}</code>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {histFiles.map((name) => {
                            const hist = gitHistory[name];
                            const fExists = files[name]?.exists;
                            const found = hist?.found === true;
                            const commitLine = (label, commit) => (
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, overflow: 'hidden' }}>
                                <span style={{ fontSize: 9, fontWeight: 800, color: 'rgba(251,146,60,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0, minWidth: 40 }}>{label}</span>
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(148,163,184,0.5)', flexShrink: 0 }}>{commit.hash}</span>
                                <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.4)', flexShrink: 0 }} title={commit.date}>{relTime(new Date(commit.date).getTime())}</span>
                                <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.45)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{commit.message}</span>
                              </div>
                            );
                            return (
                              <div key={name} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '7px 10px', borderRadius: 7, background: found ? 'rgba(251,146,60,0.07)' : 'rgba(255,255,255,0.03)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', minWidth: 86, flexShrink: 0 }}>{name}</span>
                                  {found && <><AlertTriangle size={12} style={{ color: '#fb923c', flexShrink: 0 }} /><span style={{ fontSize: 11, fontWeight: 700, color: '#fb923c' }}>Found in {hist.hitCount} commit{hist.hitCount !== 1 ? 's' : ''} — rotate credentials</span></>}
                                  {hist?.found === false && <><CheckCircle2 size={12} style={{ color: '#4ade80', flexShrink: 0 }} /><span style={{ fontSize: 11, fontWeight: 600, color: '#4ade80' }}>Never committed</span></>}
                                  {hist === null && !fExists && <span style={{ fontSize: 11, color: 'rgba(148,163,184,0.35)' }}>File not present</span>}
                                  {hist === null &&  fExists && <span style={{ fontSize: 11, color: 'rgba(148,163,184,0.35)' }}>Not a git repo</span>}
                                </div>
                                {found && (
                                  <div style={{ paddingLeft: 14, display: 'flex', flexDirection: 'column', gap: 3 }}>
                                    {hist.hitCount > 1 && commitLine('First', hist.firstCommit)}
                                    {commitLine(hist.hitCount > 1 ? 'Last' : 'Commit', hist.lastCommit)}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <div style={{ fontSize: 10, color: 'rgba(148,163,184,0.38)', lineHeight: 1.55, marginTop: 9 }}>
                          A file found in git history stays readable in past commits even after being gitignored. Any credentials that were ever committed should be rotated immediately.
                        </div>
                      </>
                    )}
                  </div>

                  {/* ── Setup Drift ── */}
                  <div style={{ ...cardBase, border: `1px solid ${driftBorder}`, background: driftBg }}>
                    <div style={cardLabel}>Setup Drift</div>
                    {drift === null && (() => {
                      const envExists = files['.env']?.exists;
                      const exExists  = files['.env.example']?.exists;
                      if (!envExists && !exExists) return <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Neither .env nor .env.example are present.</span>;
                      if (envExists && !exExists)  return (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                          <AlertTriangle size={13} style={{ color: '#fb923c', flexShrink: 0, marginTop: 1 }} />
                          <span style={{ fontSize: 12, color: '#fdba74', lineHeight: 1.55 }}>No .env.example found — create one to document required variables for collaborators.</span>
                        </div>
                      );
                      if (!envExists && exExists)  return <span style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.55 }}>.env.example is present but there is no local .env to compare against.</span>;
                      return null;
                    })()}
                    {drift !== null && !hasDrift && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <CheckCircle2 size={13} style={{ color: '#4ade80', flexShrink: 0 }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#4ade80' }}>In sync — all keys match between .env and .env.example</span>
                      </div>
                    )}
                    {drift !== null && hasDrift && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {drift.inEnvNotExample.length > 0 && (
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 800, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
                              In .env, missing from .env.example ({drift.inEnvNotExample.length})
                            </div>
                            <div className="custom-scrollbar" style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxHeight: 80, overflowY: 'auto', paddingRight: 2 }}>
                              {drift.inEnvNotExample.map((k) => {
                                const isAdding = addingExampleKey.has(k);
                                return (
                                  <div key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                                    <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#fca5a5', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '4px 0 0 4px', padding: '2px 7px' }}>{k}</span>
                                    <button
                                      type="button"
                                      title={`Append ${k}= to .env.example`}
                                      disabled={isAdding}
                                      onClick={async () => {
                                        setAddingExampleKey((s) => new Set([...s, k]));
                                        try {
                                          const res = await window.electronAPI.fixHygieneIssue({ action: 'appendToExample', key: k });
                                          if (res?.ok && res?.snapshot) {
                                            setFixHistory((h) => [...h, { label: `Add ${k}= to .env.example`, snapshot: res.snapshot }]);
                                          }
                                          await loadSecretsStatus();
                                        } finally {
                                          setAddingExampleKey((s) => { const n = new Set(s); n.delete(k); return n; });
                                        }
                                      }}
                                      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: isAdding ? 'rgba(74,222,128,0.06)' : 'rgba(74,222,128,0.13)', border: '1px solid rgba(74,222,128,0.3)', borderLeft: 'none', borderRadius: '0 4px 4px 0', padding: '2px 6px', cursor: isAdding ? 'wait' : 'pointer', color: '#4ade80', fontSize: 11, fontWeight: 700, lineHeight: 1, flexShrink: 0, opacity: isAdding ? 0.5 : 1, transition: 'background 0.15s' }}
                                    >
                                      {isAdding ? '…' : '+'}
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                            <div style={{ fontSize: 10, color: 'rgba(148,163,184,0.5)', marginTop: 5 }}>Undocumented secrets — click <span style={{ color: '#4ade80', fontWeight: 700 }}>+</span> to append each key as a placeholder to .env.example</div>
                          </div>
                        )}
                        {drift.inExampleNotEnv.length > 0 && (
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
                              In .env.example, missing from .env ({drift.inExampleNotEnv.length})
                            </div>
                            <div className="custom-scrollbar" style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxHeight: 80, overflowY: 'auto', paddingRight: 2 }}>
                              {drift.inExampleNotEnv.map((k) => (
                                <span key={k} style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#fde68a', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 4, padding: '2px 7px', alignSelf: 'flex-start' }}>{k}</span>
                              ))}
                            </div>
                            <div style={{ fontSize: 10, color: 'rgba(148,163,184,0.5)', marginTop: 5 }}>Unconfigured locally — copy from .env.example and fill in your values</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                </div>

                {/* ── File Issues ── */}
                {issues && (() => {
                  const ALL_ENV = ['.env', '.env.local', ...MULTI_ENV_NAMES];
                  const allDupes = ALL_ENV.flatMap((n) => (issues.duplicateKeys?.[n] ?? []).map((k) => ({ file: n, key: k })));
                  const allEmpty = ALL_ENV.flatMap((n) => (issues.emptyKeys?.[n] ?? []).map((k) => ({ file: n, key: k })));
                  const allBad   = ALL_ENV.flatMap((n) => (issues.badNameKeys?.[n] ?? []).map((k) => ({ file: n, key: k })));
                  const leaks    = issues.exampleLeaks || [];
                  const permWarn = issues.permissionWarning;
                  const allClear = allDupes.length === 0 && allEmpty.length === 0 && allBad.length === 0 && leaks.length === 0 && !permWarn;
                  const issueBorder = allClear ? 'rgba(74,222,128,0.22)' : 'rgba(248,113,113,0.28)';
                  const issueBg     = allClear ? 'rgba(74,222,128,0.04)' : 'rgba(248,113,113,0.05)';

                  const keyPill = (k, color, bg, border) => (
                    <span key={k} style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color, background: bg, border: `1px solid ${border}`, borderRadius: 4, padding: '2px 7px' }}>{k}</span>
                  );

                  // Group an array of {file, key} items by file for multi-file display
                  const byFile = (items) => {
                    const map = {};
                    for (const { file, key } of items) { if (!map[file]) map[file] = []; map[file].push(key); }
                    return Object.entries(map);
                  };

                  return (
                    <div style={{ ...cardBase, marginTop: 10, border: `1px solid ${issueBorder}`, background: issueBg }}>
                      <div style={cardLabel}>File Issues</div>

                      {allClear ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <CheckCircle2 size={13} style={{ color: '#4ade80', flexShrink: 0 }} />
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#4ade80' }}>All clear — no duplicate keys, leaks, empty values, or naming issues detected</span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                          {/* Permission warning */}
                          {permWarn && (
                            <div>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                                <AlertTriangle size={13} style={{ color: '#f87171', flexShrink: 0, marginTop: 1 }} />
                                <div>
                                  <span style={{ fontSize: 12, fontWeight: 700, color: '#fca5a5' }}>
                                    .env is {permWarn === 'world-readable' ? 'world-readable (mode o+r)' : 'group-writable (mode g+w)'}
                                  </span>
                                  <div style={{ fontSize: 11, color: 'rgba(148,163,184,0.55)', marginTop: 3 }}>
                                    {permWarn === 'world-readable'
                                      ? 'Any user on this machine can read its contents. Run: chmod 600 .env'
                                      : 'Members of your group can modify this file. Run: chmod 600 .env'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Duplicate keys */}
                          {allDupes.length > 0 && (
                            <div>
                              <div style={{ fontSize: 10, fontWeight: 800, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
                                Duplicate keys ({allDupes.length})
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {byFile(allDupes).map(([file, keys]) => (
                                  <div key={file}>
                                    <div style={{ fontSize: 10, color: 'rgba(148,163,184,0.5)', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>{file}</div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                      {keys.map((k) => keyPill(k, '#fca5a5', 'rgba(248,113,113,0.1)', 'rgba(248,113,113,0.2)'))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <div style={{ fontSize: 10, color: 'rgba(148,163,184,0.5)', marginTop: 5 }}>The last definition wins — earlier values are silently overridden</div>
                            </div>
                          )}

                          {/* Example leaks */}
                          {leaks.length > 0 && (
                            <div>
                              <div style={{ fontSize: 10, fontWeight: 800, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
                                Real credentials in .env.example ({leaks.length})
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {leaks.map(({ key, label }) => (
                                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#fca5a5', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 4, padding: '2px 7px', flexShrink: 0 }}>{key}</span>
                                    <span style={{ fontSize: 11, color: 'rgba(248,113,113,0.7)' }}>{label}</span>
                                  </div>
                                ))}
                              </div>
                              <div style={{ fontSize: 10, color: 'rgba(148,163,184,0.5)', marginTop: 5 }}>Replace real values with placeholders (e.g. YOUR_KEY_HERE) before committing .env.example</div>
                            </div>
                          )}

                          {/* Empty values */}
                          {allEmpty.length > 0 && (
                            <div>
                              <div style={{ fontSize: 10, fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
                                Empty values — KEY= with no value ({allEmpty.length})
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {byFile(allEmpty).map(([file, keys]) => (
                                  <div key={file}>
                                    <div style={{ fontSize: 10, color: 'rgba(148,163,184,0.5)', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>{file}</div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                      {keys.map((k) => keyPill(k, '#fde68a', 'rgba(251,191,36,0.1)', 'rgba(251,191,36,0.25)'))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <div style={{ fontSize: 10, color: 'rgba(148,163,184,0.5)', marginTop: 5 }}>These keys will resolve as empty strings at runtime — fill in values or remove them</div>
                            </div>
                          )}

                          {/* Naming convention violations */}
                          {allBad.length > 0 && (
                            <div>
                              <div style={{ fontSize: 10, fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
                                Non-SCREAMING_SNAKE_CASE keys ({allBad.length})
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {byFile(allBad).map(([file, keys]) => (
                                  <div key={file}>
                                    <div style={{ fontSize: 10, color: 'rgba(148,163,184,0.5)', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>{file}</div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                      {keys.map((k) => keyPill(k, '#fde68a', 'rgba(251,191,36,0.1)', 'rgba(251,191,36,0.25)'))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <div style={{ fontSize: 10, color: 'rgba(148,163,184,0.5)', marginTop: 5 }}>Convention is ALL_CAPS with underscores — lowercase or mixed-case keys may not load correctly in some runtimes</div>
                            </div>
                          )}

                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* ── Integration row: Pre-commit Hooks + Secrets Manager ── */}
                {(preCommitHooks !== null || secretsManagers !== null) && (() => {
                  // ── Pre-commit card helpers ──────────────────────────────
                  const hookOk      = preCommitHooks?.hasSecretsHook === true;
                  const hookWarning = preCommitHooks?.hasAnyHook === true && !hookOk;
                  const hookMissing = preCommitHooks?.hasAnyHook === false;
                  const hookBorder  = hookOk ? 'rgba(74,222,128,0.22)' : 'rgba(251,146,60,0.28)';
                  const hookBg      = hookOk ? 'rgba(74,222,128,0.04)' : 'rgba(251,146,60,0.05)';

                  // Default snippet tab to the first framework that's already installed
                  const detectedFramework = preCommitHooks?.files?.find((f) => f.exists)?.key;

                  // ── Secrets manager card helpers ─────────────────────────
                  const activeManagers = secretsManagers?.filter((m) => m.detected) ?? [];
                  const smBorder = activeManagers.length > 0 ? 'rgba(74,222,128,0.22)' : 'rgba(192,132,252,0.15)';
                  const smBg     = activeManagers.length > 0 ? 'rgba(74,222,128,0.04)' : 'rgba(192,132,252,0.03)';

                  const effectiveSnippetTab = snippetTab ?? detectedFramework ?? 'husky';
                  const activeSnippet = HOOK_SNIPPETS[effectiveSnippetTab];

                  return (
                    <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>

                      {/* ── Pre-commit Hooks ── */}
                      {preCommitHooks !== null && (
                        <div style={{ ...cardBase, border: `1px solid ${hookBorder}`, background: hookBg }}>
                          <div style={cardLabel}>Pre-commit Hooks</div>

                          {/* State: secrets scan already configured — all good */}
                          {hookOk && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                <CheckCircle2 size={13} style={{ color: '#4ade80', flexShrink: 0 }} />
                                <span style={{ fontSize: 12, fontWeight: 600, color: '#4ade80' }}>Secrets scan is configured in pre-commit hooks</span>
                              </div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                {preCommitHooks.files.filter((f) => f.hasSecretsScan).map((f) => (
                                  <span key={f.key} style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: '#4ade80', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 4, padding: '2px 7px' }}>{HOOK_SNIPPETS[f.key]?.filename ?? f.key}</span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* State: hooks exist but none scan for secrets */}
                          {hookWarning && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                                <AlertTriangle size={13} style={{ color: '#fb923c', flexShrink: 0, marginTop: 1 }} />
                                <span style={{ fontSize: 12, color: '#fdba74', lineHeight: 1.55 }}>Pre-commit hooks found but none reference a secrets scanner.</span>
                              </div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                {preCommitHooks.files.filter((f) => f.exists).map((f) => (
                                  <span key={f.key} style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: '#fdba74', background: 'rgba(251,186,74,0.1)', border: '1px solid rgba(251,186,74,0.2)', borderRadius: 4, padding: '2px 7px' }}>{HOOK_SNIPPETS[f.key]?.filename ?? f.key}</span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* State: no hooks at all */}
                          {hookMissing && (
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, marginBottom: 2 }}>
                              <AlertTriangle size={13} style={{ color: '#fb923c', flexShrink: 0, marginTop: 1 }} />
                              <span style={{ fontSize: 12, color: '#fdba74', lineHeight: 1.55 }}>No pre-commit hooks detected. A hook that scans staged files prevents credentials ever reaching the repo.</span>
                            </div>
                          )}

                          {/* Snippet picker — shown whenever no secrets hook is configured */}
                          {!hookOk && (
                            <div style={{ marginTop: 8 }}>
                              {/* Tab row */}
                              <div style={{ display: 'flex', gap: 3, marginBottom: 6 }}>
                                {Object.entries(HOOK_SNIPPETS).map(([key, { label }]) => {
                                  const isActive = effectiveSnippetTab === key;
                                  return (
                                    <button
                                      key={key}
                                      type="button"
                                      onClick={() => setSnippetTab(key)}
                                      style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, border: isActive ? '1px solid rgba(251,186,74,0.4)' : '1px solid rgba(255,255,255,0.08)', background: isActive ? 'rgba(251,186,74,0.12)' : 'transparent', color: isActive ? '#fdba74' : 'rgba(148,163,184,0.5)', cursor: 'pointer', transition: 'all 0.12s' }}
                                    >
                                      {label}
                                    </button>
                                  );
                                })}
                              </div>
                              {/* Filename hint */}
                              <div style={{ fontSize: 10, color: 'rgba(148,163,184,0.45)', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>{activeSnippet.filename}</div>
                              {/* Code block */}
                              <div style={{ position: 'relative', background: 'rgba(0,0,0,0.35)', borderRadius: 6, border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                                <pre style={{ margin: 0, padding: '8px 36px 8px 10px', fontFamily: 'var(--font-mono)', fontSize: 10.5, color: '#c4d4ff', lineHeight: 1.6, whiteSpace: 'pre', overflowX: 'auto' }}>{activeSnippet.code}</pre>
                                <button
                                  type="button"
                                  title="Copy snippet"
                                  onClick={() => {
                                    navigator.clipboard.writeText(activeSnippet.code);
                                    setCopiedSnippet(effectiveSnippetTab);
                                    setTimeout(() => setCopiedSnippet(null), 1500);
                                  }}
                                  style={{ position: 'absolute', top: 5, right: 5, background: copiedSnippet === effectiveSnippetTab ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.06)', border: `1px solid ${copiedSnippet === effectiveSnippetTab ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 4, padding: '3px 5px', cursor: 'pointer', color: copiedSnippet === effectiveSnippetTab ? '#4ade80' : 'rgba(148,163,184,0.6)', display: 'flex', alignItems: 'center', transition: 'all 0.15s' }}
                                >
                                  {copiedSnippet === effectiveSnippetTab ? <CheckCircle2 size={11} /> : <Copy size={11} />}
                                </button>
                              </div>
                              <div style={{ fontSize: 10, color: 'rgba(148,163,184,0.42)', marginTop: 5, lineHeight: 1.55 }}>
                                Scans staged files with <span style={{ color: 'rgba(196,212,255,0.6)', fontFamily: 'var(--font-mono)' }}>gitleaks</span> before each commit — blocks the push if credentials are detected.
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* ── Secrets Manager ── */}
                      {secretsManagers !== null && (
                        <div style={{ ...cardBase, border: `1px solid ${smBorder}`, background: smBg }}>
                          <div style={cardLabel}>Secrets Manager</div>

                          {activeManagers.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                <CheckCircle2 size={13} style={{ color: '#4ade80', flexShrink: 0 }} />
                                <span style={{ fontSize: 12, fontWeight: 600, color: '#4ade80' }}>
                                  Managed secrets flow detected
                                </span>
                              </div>
                              {activeManagers.map((m) => (
                                <div key={m.key} style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '7px 10px', borderRadius: 7, background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.15)' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: '#4ade80' }}>{m.label}</span>
                                    {m.detectedVia && (
                                      <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'rgba(74,222,128,0.55)', background: 'rgba(74,222,128,0.08)', padding: '1px 5px', borderRadius: 4 }}>
                                        {m.detectedVia}
                                      </span>
                                    )}
                                  </div>
                                  <span style={{ fontSize: 11, color: 'rgba(148,163,184,0.6)', lineHeight: 1.5 }}>{m.description}</span>
                                </div>
                              ))}
                              <div style={{ fontSize: 10, color: 'rgba(148,163,184,0.4)', lineHeight: 1.55 }}>
                                Secrets are managed externally — .env files may not be the primary credential source for this project.
                              </div>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.55 }}>
                                No managed secrets flow detected. This project uses plain .env files.
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                {(secretsManagers ?? []).map((m) => (
                                  <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                    <span style={{ fontSize: 9, fontWeight: 800, color: 'rgba(148,163,184,0.3)', letterSpacing: '0.05em', textTransform: 'uppercase', minWidth: 72 }}>{m.label}</span>
                                    <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'rgba(148,163,184,0.3)' }}>
                                      {m.file ?? m.key} not found
                                    </span>
                                  </div>
                                ))}
                              </div>
                              <div style={{ fontSize: 10, color: 'rgba(148,163,184,0.38)', lineHeight: 1.55 }}>
                                Consider a secrets manager to centralise rotation, access control, and audit logs — especially for team or production environments.
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                    </div>
                  );
                })()}

                {/* ── Unused Variables + Hardcoded Secrets ── */}
                {(unusedVars !== null || hardcodedSecrets !== null) && (() => {
                  const uvOk = unusedVars === null || unusedVars.unused.length === 0;
                  const hcOk = hardcodedSecrets === null || hardcodedSecrets.findings.length === 0;
                  return (
                    <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>

                      {/* ── Unused Variables ── */}
                      {unusedVars !== null && (
                        <div style={{ ...cardBase, border: `1px solid ${uvOk ? 'rgba(74,222,128,0.22)' : 'rgba(251,191,36,0.28)'}`, background: uvOk ? 'rgba(74,222,128,0.04)' : 'rgba(251,191,36,0.05)' }}>
                          <div style={cardLabel}>Unused Variables</div>
                          {uvOk ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                              <CheckCircle2 size={13} style={{ color: '#4ade80', flexShrink: 0 }} />
                              <span style={{ fontSize: 12, fontWeight: 600, color: '#4ade80' }}>All env vars are referenced in source</span>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                                <AlertTriangle size={13} style={{ color: '#fbbf24', flexShrink: 0, marginTop: 1 }} />
                                <span style={{ fontSize: 12, fontWeight: 600, color: '#fde68a' }}>{unusedVars.unused.length} var{unusedVars.unused.length !== 1 ? 's' : ''} defined but never read in source</span>
                              </div>
                              <div className="custom-scrollbar" style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxHeight: 90, overflowY: 'auto' }}>
                                {unusedVars.unused.map((k) => (
                                  <span key={k} style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#fde68a', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: 4, padding: '2px 7px' }}>{k}</span>
                                ))}
                              </div>
                              <div style={{ fontSize: 10, color: 'rgba(148,163,184,0.45)', lineHeight: 1.55 }}>
                                Scanned {unusedVars.scannedFiles} source file{unusedVars.scannedFiles !== 1 ? 's' : ''}. Dynamic access via <code style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>process.env[name]</code> is not statically detectable — review before removing.
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* ── Hardcoded Secrets ── */}
                      {hardcodedSecrets !== null && (
                        <div style={{ ...cardBase, border: `1px solid ${hcOk ? 'rgba(74,222,128,0.22)' : 'rgba(248,113,113,0.35)'}`, background: hcOk ? 'rgba(74,222,128,0.04)' : 'rgba(248,113,113,0.07)' }}>
                          <div style={cardLabel}>Hardcoded Secrets</div>
                          {hcOk ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                              <CheckCircle2 size={13} style={{ color: '#4ade80', flexShrink: 0 }} />
                              <span style={{ fontSize: 12, fontWeight: 600, color: '#4ade80' }}>No hardcoded credentials detected in source</span>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                                <AlertTriangle size={13} style={{ color: '#f87171', flexShrink: 0, marginTop: 1 }} />
                                <span style={{ fontSize: 12, fontWeight: 700, color: '#fca5a5' }}>{hardcodedSecrets.findings.length} potential hardcoded secret{hardcodedSecrets.findings.length !== 1 ? 's' : ''} found</span>
                              </div>
                              <div className="custom-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 130, overflowY: 'auto' }}>
                                {hardcodedSecrets.findings.map((f, i) => (
                                  <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 1, padding: '5px 8px', borderRadius: 6, background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.15)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#fca5a5', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.relPath}</span>
                                      <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(248,113,113,0.6)', flexShrink: 0 }}>:{f.lineNumber}</span>
                                    </div>
                                    <span style={{ fontSize: 10, color: 'rgba(248,113,113,0.65)' }}>{f.label}</span>
                                  </div>
                                ))}
                              </div>
                              <div style={{ fontSize: 10, color: 'rgba(148,163,184,0.45)', lineHeight: 1.55 }}>
                                Scanned {hardcodedSecrets.scannedFiles} source file{hardcodedSecrets.scannedFiles !== 1 ? 's' : ''}. Move these values to .env and read them via <code style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>process.env</code>. Rotate any exposed credentials immediately.
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                    </div>
                  );
                })()}

                {/* ── Docker Compose + GitHub Actions ── */}
                {(dockerCompose !== null || githubActions !== null) && (() => {
                  // Docker Compose card tone
                  const dcOk      = dockerCompose === null || dockerCompose.missingKeys.length === 0;
                  const dcBorder  = dockerCompose === null ? 'rgba(192,132,252,0.15)'
                    : dcOk ? 'rgba(74,222,128,0.22)' : 'rgba(251,146,60,0.3)';
                  const dcBg      = dockerCompose === null ? 'rgba(192,132,252,0.03)'
                    : dcOk ? 'rgba(74,222,128,0.04)' : 'rgba(251,146,60,0.05)';
                  // GitHub Actions card tone
                  const gaOk      = githubActions === null || githubActions.undocumentedSecrets.length === 0;
                  const gaBorder  = githubActions === null ? 'rgba(192,132,252,0.15)'
                    : gaOk ? 'rgba(74,222,128,0.22)' : 'rgba(251,146,60,0.3)';
                  const gaBg      = githubActions === null ? 'rgba(192,132,252,0.03)'
                    : gaOk ? 'rgba(74,222,128,0.04)' : 'rgba(251,146,60,0.05)';
                  const cardBase  = { borderRadius: 10, padding: '12px 14px' };
                  const cardLabel = { fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(192,132,252,0.55)', marginBottom: 9 };
                  const keyPill   = (k) => <span key={k} style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: '#fdba74', background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.25)', borderRadius: 4, padding: '1px 6px' }}>{k}</span>;

                  return (
                    <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>

                      {/* Docker Compose */}
                      {dockerCompose !== null && (
                        <div style={{ ...cardBase, border: `1px solid ${dcBorder}`, background: dcBg }}>
                          <div style={cardLabel}>Docker Compose</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                              {dcOk
                                ? <CheckCircle2 size={13} style={{ color: '#4ade80', flexShrink: 0, marginTop: 1 }} />
                                : <AlertTriangle size={13} style={{ color: '#fb923c', flexShrink: 0, marginTop: 1 }} />
                              }
                              <span style={{ fontSize: 12, fontWeight: 600, color: dcOk ? '#4ade80' : '#fdba74' }}>
                                {dcOk
                                  ? `All ${dockerCompose.referencedKeys.length} referenced key${dockerCompose.referencedKeys.length !== 1 ? 's' : ''} present in .env`
                                  : `${dockerCompose.missingKeys.length} key${dockerCompose.missingKeys.length !== 1 ? 's' : ''} referenced in ${dockerCompose.file} missing from .env`
                                }
                              </span>
                            </div>
                            {!dcOk && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                {dockerCompose.missingKeys.map(keyPill)}
                              </div>
                            )}
                            {dockerCompose.referencedKeys.length > 0 && dcOk && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                                {dockerCompose.referencedKeys.map((k) => (
                                  <span key={k} style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'rgba(74,222,128,0.6)', background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.15)', borderRadius: 4, padding: '1px 6px' }}>{k}</span>
                                ))}
                              </div>
                            )}
                            <div style={{ fontSize: 10, color: 'rgba(148,163,184,0.4)', lineHeight: 1.55 }}>
                              Parsed from <span style={{ fontFamily: 'var(--font-mono)', color: 'rgba(196,212,255,0.45)' }}>{dockerCompose.file}</span>
                              {dockerCompose.envFileRefs.length > 0 && ` · env_file: ${dockerCompose.envFileRefs.join(', ')}`}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* GitHub Actions */}
                      {githubActions !== null && (
                        <div style={{ ...cardBase, border: `1px solid ${gaBorder}`, background: gaBg }}>
                          <div style={cardLabel}>GitHub Actions Secrets</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {githubActions.workflowCount === 0 ? (
                              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>No workflow files found in .github/workflows/</span>
                            ) : gaOk ? (
                              <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                  <CheckCircle2 size={13} style={{ color: '#4ade80', flexShrink: 0 }} />
                                  <span style={{ fontSize: 12, fontWeight: 600, color: '#4ade80' }}>
                                    All {githubActions.referencedSecrets.length} secrets documented in .env.example
                                  </span>
                                </div>
                                {githubActions.referencedSecrets.length > 0 && (
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                                    {githubActions.referencedSecrets.map((k) => (
                                      <span key={k} style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'rgba(74,222,128,0.6)', background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.15)', borderRadius: 4, padding: '1px 6px' }}>{k}</span>
                                    ))}
                                  </div>
                                )}
                              </>
                            ) : (
                              <>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                                  <AlertTriangle size={13} style={{ color: '#fb923c', flexShrink: 0, marginTop: 1 }} />
                                  <span style={{ fontSize: 12, fontWeight: 600, color: '#fdba74' }}>
                                    {githubActions.undocumentedSecrets.length} secret{githubActions.undocumentedSecrets.length !== 1 ? 's' : ''} not in .env.example
                                  </span>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                  {githubActions.undocumentedSecrets.map(keyPill)}
                                </div>
                              </>
                            )}
                            <div style={{ fontSize: 10, color: 'rgba(148,163,184,0.4)', lineHeight: 1.55 }}>
                              Scanned {githubActions.workflowCount} workflow file{githubActions.workflowCount !== 1 ? 's' : ''} · GitHub-provided tokens (GITHUB_TOKEN etc.) excluded
                            </div>
                          </div>
                        </div>
                      )}

                    </div>
                  );
                })()}

                {/* ── Config files + SSH/Cert files ── */}
                {(configFileScan !== null || sensitiveFiles !== null) && (() => {
                  const cfOk  = configFileScan === null || configFileScan.length === 0;
                  const sfOk  = sensitiveFiles === null || sensitiveFiles.length === 0;
                  const cardBase  = { borderRadius: 10, padding: '12px 14px' };
                  const cardLabel = { fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(192,132,252,0.55)', marginBottom: 9 };

                  return (
                    <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>

                      {/* .npmrc / .pypirc */}
                      {configFileScan !== null && (
                        <div style={{ ...cardBase, border: `1px solid ${cfOk ? 'rgba(74,222,128,0.22)' : 'rgba(248,113,113,0.35)'}`, background: cfOk ? 'rgba(74,222,128,0.04)' : 'rgba(248,113,113,0.06)' }}>
                          <div style={cardLabel}>.npmrc / .pypirc</div>
                          {cfOk ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                              <CheckCircle2 size={13} style={{ color: '#4ade80', flexShrink: 0 }} />
                              <span style={{ fontSize: 12, fontWeight: 600, color: '#4ade80' }}>No hardcoded tokens detected</span>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                                <AlertTriangle size={13} style={{ color: '#f87171', flexShrink: 0, marginTop: 1 }} />
                                <span style={{ fontSize: 12, fontWeight: 700, color: '#fca5a5' }}>
                                  {configFileScan.length} hardcoded token{configFileScan.length !== 1 ? 's' : ''} found
                                </span>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                {configFileScan.map((f, i) => (
                                  <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '5px 9px', borderRadius: 6, background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.15)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                      <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: '#fca5a5', flex: 1 }}>{f.file}</span>
                                      <span style={{ fontSize: 9, color: 'rgba(248,113,113,0.5)', flexShrink: 0 }}>:{f.lineNumber}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                      <span style={{ fontSize: 10, color: 'rgba(248,113,113,0.7)' }}>{f.label}</span>
                                      <code style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'rgba(196,212,255,0.45)', background: 'rgba(0,0,0,0.25)', borderRadius: 3, padding: '0 4px' }}>{f.preview}</code>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <div style={{ fontSize: 10, color: 'rgba(148,163,184,0.45)', lineHeight: 1.55 }}>
                                Move these tokens to env vars and reference them as environment variables instead
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* SSH / certificate files */}
                      {sensitiveFiles !== null && (
                        <div style={{ ...cardBase, border: `1px solid ${sfOk ? 'rgba(74,222,128,0.22)' : 'rgba(248,113,113,0.35)'}`, background: sfOk ? 'rgba(74,222,128,0.04)' : 'rgba(248,113,113,0.06)' }}>
                          <div style={cardLabel}>SSH / Certificate Files</div>
                          {sfOk ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                              <CheckCircle2 size={13} style={{ color: '#4ade80', flexShrink: 0 }} />
                              <span style={{ fontSize: 12, fontWeight: 600, color: '#4ade80' }}>No private key or cert files found in project</span>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                                <AlertTriangle size={13} style={{ color: '#f87171', flexShrink: 0, marginTop: 1 }} />
                                <span style={{ fontSize: 12, fontWeight: 700, color: '#fca5a5' }}>
                                  {sensitiveFiles.length} sensitive file{sensitiveFiles.length !== 1 ? 's' : ''} found in project tree
                                </span>
                              </div>
                              <div className="custom-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 130, overflowY: 'auto' }}>
                                {sensitiveFiles.map((f, i) => (
                                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', borderRadius: 5, background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.14)' }}>
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#fca5a5', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.relPath}</span>
                                    <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(248,113,113,0.55)', flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{f.type}</span>
                                  </div>
                                ))}
                              </div>
                              <div style={{ fontSize: 10, color: 'rgba(148,163,184,0.45)', lineHeight: 1.55 }}>
                                Ensure these files are in .gitignore and consider moving them outside the project directory
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                    </div>
                  );
                })()}

                {/* ── Cloud SDK Credentials ── */}
                {cloudSdkScan !== null && (() => {
                  const providers = [
                    {
                      key: 'aws',
                      label: 'AWS',
                      found: cloudSdkScan.aws?.found,
                      active: cloudSdkScan.aws?.found && cloudSdkScan.aws?.hasKeys,
                      detail: cloudSdkScan.aws?.found
                        ? `${cloudSdkScan.aws.profileCount} profile${cloudSdkScan.aws.profileCount !== 1 ? 's' : ''} — ${cloudSdkScan.aws.profiles?.join(', ') || 'default'}`
                        : 'No credentials file found',
                      hint: 'Use AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_SESSION_TOKEN in .env',
                    },
                    {
                      key: 'gcloud',
                      label: 'GCloud',
                      found: cloudSdkScan.gcloud?.found,
                      active: cloudSdkScan.gcloud?.found && cloudSdkScan.gcloud?.hasAdc,
                      detail: cloudSdkScan.gcloud?.found
                        ? `ADC present (type: ${cloudSdkScan.gcloud.credType})`
                        : 'No application_default_credentials.json found',
                      hint: 'Use GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_CLOUD_PROJECT in .env',
                    },
                    {
                      key: 'azure',
                      label: 'Azure',
                      found: cloudSdkScan.azure?.found,
                      active: cloudSdkScan.azure?.found && cloudSdkScan.azure?.hasTokens,
                      detail: cloudSdkScan.azure?.found
                        ? `~/.azure found${cloudSdkScan.azure.hasTokens ? ' — MSAL token cache present' : ''}${cloudSdkScan.azure.subscriptionCount ? ` (${cloudSdkScan.azure.subscriptionCount} subscription${cloudSdkScan.azure.subscriptionCount !== 1 ? 's' : ''})` : ''}`
                        : 'No ~/.azure directory found',
                      hint: 'Use AZURE_CLIENT_ID / AZURE_CLIENT_SECRET / AZURE_TENANT_ID in .env',
                    },
                  ];
                  const anyActive = providers.some((p) => p.active);
                  return (
                    <div style={{ marginTop: 10, border: `1px solid ${anyActive ? 'rgba(251,191,36,0.3)' : 'rgba(74,222,128,0.22)'}`, borderRadius: 10, padding: '12px 14px', background: anyActive ? 'rgba(251,191,36,0.04)' : 'rgba(74,222,128,0.03)' }}>
                      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(192,132,252,0.55)', marginBottom: 10 }}>Cloud SDK Credentials</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                        {providers.map((p) => (
                          <div key={p.key} style={{ borderRadius: 8, padding: '10px 12px', border: `1px solid ${p.active ? 'rgba(251,191,36,0.3)' : 'rgba(74,222,128,0.2)'}`, background: p.active ? 'rgba(251,191,36,0.06)' : 'rgba(74,222,128,0.04)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                              <span style={{ fontSize: 12, fontWeight: 800, color: p.active ? '#fbbf24' : '#4ade80' }}>{p.label}</span>
                              {p.active
                                ? <AlertTriangle size={11} style={{ color: '#fbbf24' }} />
                                : <CheckCircle2 size={11} style={{ color: '#4ade80' }} />
                              }
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: p.active ? 6 : 0 }}>{p.detail}</div>
                            {p.active && <div style={{ fontSize: 9, color: 'rgba(251,191,36,0.6)', lineHeight: 1.55, fontStyle: 'italic' }}>{p.hint}</div>}
                          </div>
                        ))}
                      </div>
                      {anyActive && (
                        <div style={{ marginTop: 8, fontSize: 10, color: 'rgba(148,163,184,0.45)', lineHeight: 1.6 }}>
                          CLI-managed credentials are convenient but make it harder to replicate environments in CI/CD and team setups. Consider mapping them to .env variables for portability.
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* ── Production Readiness Checklist ── */}
                {prodChecklist !== null && (() => {
                  const scoreColor = prodScore === prodTotal ? '#4ade80' : prodScore >= prodTotal * 0.75 ? '#fbbf24' : '#f87171';
                  const barWidth = prodTotal > 0 ? Math.round((prodScore / prodTotal) * 100) : 0;
                  return (
                    <div style={{ marginTop: 10, border: `1px solid ${prodScore === prodTotal ? 'rgba(74,222,128,0.25)' : 'rgba(192,132,252,0.2)'}`, borderRadius: 10, padding: '12px 14px', background: prodScore === prodTotal ? 'rgba(74,222,128,0.03)' : 'rgba(192,132,252,0.03)' }}>
                      {/* Header row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <ListChecks size={14} style={{ color: '#c084fc', flexShrink: 0 }} />
                        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(192,132,252,0.55)', flex: 1 }}>Production Readiness</span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: scoreColor }}>{prodScore}/{prodTotal}</span>
                      </div>
                      {/* Progress bar */}
                      <div style={{ height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.07)', marginBottom: 10, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${barWidth}%`, borderRadius: 999, background: scoreColor, transition: 'width 0.4s' }} />
                      </div>
                      {/* Checklist items */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' }}>
                        {prodChecklist.map((item) => (
                          <div key={item.id} style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
                            <span style={{ fontSize: 13, lineHeight: 1, flexShrink: 0, color: item.pass ? '#4ade80' : '#f87171' }}>{item.pass ? '✓' : '✗'}</span>
                            <div>
                              <span style={{ fontSize: 11, color: item.pass ? 'var(--text-secondary)' : 'var(--text)' }}>{item.label}</span>
                              <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.45)', marginLeft: 5 }}>{item.detail}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* ── Variables section ── */}
                {(files['.env']?.exists || files['.env.local']?.exists) && (() => {
                  const allRows = varData
                    ? Object.entries(varData).flatMap(([file, vars]) => vars.map((v) => ({ ...v, file })))
                    : [];
                  const q = varFilter.trim().toLowerCase();
                  const filtered = q
                    ? allRows.filter((r) => r.key.toLowerCase().includes(q) || r.file.toLowerCase().includes(q))
                    : allRows;

                  const fileChipColor = (file) => {
                    if (file === '.env')       return { color: '#a78bfa', bg: 'rgba(167,139,250,0.1)',  border: 'rgba(167,139,250,0.25)' };
                    if (file === '.env.local') return { color: '#7dd3fc', bg: 'rgba(125,211,252,0.1)',  border: 'rgba(125,211,252,0.25)' };
                    return                            { color: '#fdba74', bg: 'rgba(251,186,74,0.1)',   border: 'rgba(251,186,74,0.25)' };
                  };

                  return (
                    <div style={{ marginTop: 10, border: '1px solid rgba(192,132,252,0.12)', borderRadius: 10, background: 'rgba(10,15,26,0.45)', overflow: 'hidden' }}>
                      {/* Collapsible header */}
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', cursor: 'pointer', userSelect: 'none' }}
                        onClick={() => setVarsExpanded((v) => !v)}
                      >
                        {varsExpanded
                          ? <ChevronDown  size={13} style={{ color: 'rgba(232,121,249,0.55)', flexShrink: 0 }} />
                          : <ChevronRight size={13} style={{ color: 'rgba(232,121,249,0.55)', flexShrink: 0 }} />
                        }
                        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(232,121,249,0.65)' }}>Variables</span>
                        {varData !== null && (
                          <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.4)', fontVariantNumeric: 'tabular-nums' }}>
                            {allRows.length} key{allRows.length !== 1 ? 's' : ''}
                          </span>
                        )}
                        {varsExpanded && (
                          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }} onClick={(e) => e.stopPropagation()}>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                              <Search size={11} style={{ position: 'absolute', left: 7, color: 'var(--text-muted)', pointerEvents: 'none' }} />
                              <input
                                type="text"
                                placeholder="Filter keys…"
                                value={varFilter}
                                onChange={(e) => setVarFilter(e.target.value)}
                                style={{ ...inputStyle, width: 164, height: 26, fontSize: 11, padding: '0 8px 0 22px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 4 }}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => loadVarData()}
                              disabled={loadingVarData}
                              title="Reload variable list"
                              style={{ background: 'none', border: 'none', cursor: loadingVarData ? 'wait' : 'pointer', padding: '3px 5px', color: 'rgba(148,163,184,0.4)', display: 'flex', alignItems: 'center', flexShrink: 0 }}
                            >
                              <RefreshCw size={11} style={{ opacity: loadingVarData ? 0.4 : 1 }} />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Body */}
                      {varsExpanded && (
                        <div style={{ borderTop: '1px solid rgba(192,132,252,0.08)' }}>
                          {loadingVarData && (
                            <div style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-muted)' }}>Loading…</div>
                          )}
                          {!loadingVarData && varData !== null && filtered.length === 0 && (
                            <div style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-muted)' }}>
                              {q ? 'No keys match the filter.' : 'No variables found.'}
                            </div>
                          )}
                          {!loadingVarData && varData !== null && filtered.map(({ file, key, value }, idx) => {
                            const isEditing  = editingVar?.file === file && editingVar?.key === key;
                            const isSaving   = savingVar?.file === file && savingVar?.key === key;
                            const chips      = fileChipColor(file);
                            const rowBg      = idx % 2 === 1 ? 'rgba(192,132,252,0.02)' : 'transparent';
                            const editBase   = { display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 5, cursor: 'pointer', border: 'none', flexShrink: 0 };

                            return (
                              <div
                                key={`${file}-${key}`}
                                style={{ padding: '7px 14px', background: rowBg, borderBottom: '1px solid rgba(192,132,252,0.05)', display: 'flex', alignItems: 'center', gap: 10, minHeight: 36 }}
                              >
                                {/* File chip */}
                                <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: chips.color, background: chips.bg, border: `1px solid ${chips.border}`, borderRadius: 4, padding: '1px 5px', flexShrink: 0, fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>{file}</span>
                                {/* Key name */}
                                <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text)', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>{key}</span>
                                {/* Value / editor */}
                                <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                                  {isEditing ? (
                                    editingVar.confirming ? (
                                      /* ── Confirm step ── */
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, flex: 1, flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: 11, color: '#fdba74', lineHeight: 1.5 }}>
                                          Write <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{key}=</code><code style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: editingVar.draft ? '#c4d4ff' : 'rgba(251,191,36,0.6)', fontStyle: editingVar.draft ? 'normal' : 'italic' }}>{editingVar.draft || '(empty)'}</code> to <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{file}</code>?
                                        </span>
                                        <button type="button" onClick={handleSaveVar} disabled={isSaving} style={{ ...editBase, background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.35)', color: isSaving ? 'rgba(74,222,128,0.4)' : '#4ade80', cursor: isSaving ? 'wait' : 'pointer' }}>
                                          <Check size={10} />{isSaving ? 'Writing…' : 'Confirm'}
                                        </button>
                                        <button type="button" onClick={() => setEditingVar((ev) => ({ ...ev, confirming: false }))} style={{ ...editBase, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                          Back
                                        </button>
                                      </div>
                                    ) : (
                                      /* ── Edit input ── */
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                                        <input
                                          type="text"
                                          value={editingVar.draft}
                                          onChange={(e) => setEditingVar((ev) => ({ ...ev, draft: e.target.value }))}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter')  setEditingVar((ev) => ({ ...ev, confirming: true }));
                                            if (e.key === 'Escape') setEditingVar(null);
                                          }}
                                          autoFocus
                                          style={{ ...inputStyle, flex: 1, height: 26, fontSize: 11, fontFamily: 'var(--font-mono)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(192,132,252,0.35)', borderRadius: 4, color: 'var(--text)' }}
                                        />
                                        <button type="button" onClick={() => setEditingVar((ev) => ({ ...ev, confirming: true }))} style={{ ...editBase, background: 'rgba(192,132,252,0.1)', border: '1px solid rgba(192,132,252,0.35)', color: 'rgba(232,121,249,0.85)', cursor: 'pointer' }}>
                                          <Check size={10} />Save
                                        </button>
                                        <button type="button" onClick={() => setEditingVar(null)} title="Cancel" style={{ background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 5, cursor: 'pointer', padding: '3px 6px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                                          <X size={10} />
                                        </button>
                                      </div>
                                    )
                                  ) : (
                                    /* ── Masked display ── */
                                    <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: value ? '0.1em' : 'normal', color: value ? 'rgba(148,163,184,0.3)' : 'rgba(251,191,36,0.5)', fontStyle: value ? 'normal' : 'italic' }}>
                                      {value ? '•••••' : 'empty'}
                                    </span>
                                  )}
                                </div>
                                {/* Pencil edit button — hidden while editing */}
                                {!isEditing && (
                                  <button
                                    type="button"
                                    title={`Edit ${key}`}
                                    onClick={() => setEditingVar({ file, key, draft: value, confirming: false })}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '3px 5px', color: 'rgba(148,163,184,0.28)', flexShrink: 0, display: 'flex', alignItems: 'center', transition: 'color 0.15s' }}
                                    onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(232,121,249,0.65)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(148,163,184,0.28)'; }}
                                  >
                                    <Pencil size={11} />
                                  </button>
                                )}
                                {/* Rotation reminder bell — shown when not in edit mode */}
                                {!isEditing && (() => {
                                  const reminder = rotationReminders[key];
                                  const isOverdue = reminder?.rotateBy && new Date(reminder.rotateBy) < new Date();
                                  const isEditingThis = editingRotation?.key === key;
                                  return (
                                    <div style={{ position: 'relative', flexShrink: 0 }}>
                                      <button
                                        type="button"
                                        title={reminder?.rotateBy ? `Rotate by: ${reminder.rotateBy}${reminder.note ? ` — ${reminder.note}` : ''}` : 'Set rotation reminder'}
                                        onClick={() => setEditingRotation(isEditingThis ? null : { key, draft: { rotateBy: reminder?.rotateBy ?? '', note: reminder?.note ?? '' } })}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '3px 5px', color: isOverdue ? '#f87171' : reminder?.rotateBy ? '#fbbf24' : 'rgba(148,163,184,0.28)', flexShrink: 0, display: 'flex', alignItems: 'center', transition: 'color 0.15s' }}
                                        onMouseEnter={(e) => { if (!isOverdue && !reminder?.rotateBy) e.currentTarget.style.color = 'rgba(251,191,36,0.6)'; }}
                                        onMouseLeave={(e) => { if (!isOverdue && !reminder?.rotateBy) e.currentTarget.style.color = 'rgba(148,163,184,0.28)'; }}
                                      >
                                        {reminder?.rotateBy ? <Bell size={11} /> : <BellOff size={11} />}
                                      </button>
                                      {/* Rotation popover */}
                                      {isEditingThis && (
                                        <div style={{ position: 'absolute', right: 0, top: '100%', zIndex: 200, width: 240, background: '#0d1829', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 10, padding: '12px 14px', boxShadow: '0 8px 28px rgba(0,0,0,0.6)' }}
                                          onClick={(e) => e.stopPropagation()}>
                                          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#fbbf24', marginBottom: 8 }}>Rotation Reminder — {key}</div>
                                          <label style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>Rotate by</label>
                                          <input
                                            type="date"
                                            value={editingRotation.draft.rotateBy}
                                            onChange={(e) => setEditingRotation((er) => ({ ...er, draft: { ...er.draft, rotateBy: e.target.value } }))}
                                            style={{ ...inputStyle, width: '100%', height: 28, fontSize: 11, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 5, color: 'var(--text)', marginBottom: 8, padding: '0 8px', colorScheme: 'dark' }}
                                          />
                                          <label style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>Note (optional)</label>
                                          <input
                                            type="text"
                                            placeholder="e.g. Rotate every 90 days"
                                            value={editingRotation.draft.note}
                                            onChange={(e) => setEditingRotation((er) => ({ ...er, draft: { ...er.draft, note: e.target.value } }))}
                                            style={{ ...inputStyle, width: '100%', height: 26, fontSize: 11, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 5, color: 'var(--text)', marginBottom: 10 }}
                                          />
                                          <div style={{ display: 'flex', gap: 6 }}>
                                            <button type="button" onClick={() => saveRotationReminder(key, editingRotation.draft)}
                                              style={{ flex: 1, fontSize: 11, fontWeight: 700, padding: '5px 10px', borderRadius: 6, border: '1px solid rgba(251,191,36,0.35)', background: 'rgba(251,191,36,0.1)', color: '#fbbf24', cursor: 'pointer' }}>
                                              Save
                                            </button>
                                            {reminder?.rotateBy && (
                                              <button type="button" onClick={() => saveRotationReminder(key, { rotateBy: '', note: '' })}
                                                style={{ fontSize: 11, fontWeight: 700, padding: '5px 8px', borderRadius: 6, border: '1px solid rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.08)', color: '#f87171', cursor: 'pointer' }}>
                                                Clear
                                              </button>
                                            )}
                                            <button type="button" onClick={() => setEditingRotation(null)}
                                              style={{ fontSize: 11, padding: '5px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                              Cancel
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}

                </>
              );
            })()}
            </>
          );
        })()}
        {secretsStatus.error ? (
          <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 12, border: '1px solid rgba(248,113,113,0.24)', background: 'rgba(248,113,113,0.08)', color: '#fca5a5', fontSize: 13 }}>
            {secretsStatus.error}
          </div>
        ) : null}
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Run Check */}
          <button
            type="button"
            onClick={() => loadSecretsStatus()}
            disabled={secretsStatus.loading || bulkFixing}
            title="Scan all environment files and git hygiene in one pass"
            style={{ ...actionButtonStyle, fontSize: 12, padding: '6px 14px', opacity: (secretsStatus.loading || bulkFixing) ? 0.6 : 1, flexShrink: 0 }}
          >
            <RefreshCw size={12} />
            {secretsStatus.loading ? 'Checking…' : 'Run Check'}
          </button>
          {/* Fix All — shown only when there are pending fixable rows */}
          {allPendingFixes.length > 0 && (
            <button
              type="button"
              onClick={handleBulkFix}
              disabled={bulkFixing || secretsStatus.loading}
              title={`Apply all ${allPendingFixes.length} available fix${allPendingFixes.length !== 1 ? 'es' : ''} in sequence`}
              style={{ ...actionButtonStyle, fontSize: 12, padding: '6px 14px', background: 'rgba(248,113,113,0.1)', borderColor: 'rgba(248,113,113,0.3)', color: (bulkFixing || secretsStatus.loading) ? 'rgba(252,165,165,0.45)' : '#fca5a5', opacity: (bulkFixing || secretsStatus.loading) ? 0.7 : 1, flexShrink: 0 }}
            >
              <Wrench size={12} />
              {bulkFixing ? 'Fixing…' : `Fix all (${allPendingFixes.length})`}
            </button>
          )}
          {/* Regenerate .env.example — visible when .env exists */}
          {files['.env']?.exists && (
            <button
              type="button"
              onClick={handleRegenerateExample}
              disabled={regeneratingExample || secretsStatus.loading}
              title="Rebuild .env.example from .env — strips all values, preserves key names, comments, and order"
              style={{ ...actionButtonStyle, fontSize: 12, padding: '6px 14px', background: 'rgba(251,191,36,0.08)', borderColor: 'rgba(251,191,36,0.28)', color: (regeneratingExample || secretsStatus.loading) ? 'rgba(253,186,116,0.4)' : '#fdba74', opacity: (regeneratingExample || secretsStatus.loading) ? 0.7 : 1, flexShrink: 0 }}
            >
              <RefreshCw size={12} />
              {regeneratingExample ? 'Regenerating…' : 'Regenerate .env.example'}
            </button>
          )}
          {/* Copy redacted .env — visible when .env exists */}
          {files['.env']?.exists && (
            <button
              type="button"
              onClick={handleCopyRedacted}
              title="Copy .env to clipboard with all values replaced by *** — safe for bug reports and team chat"
              style={{ ...actionButtonStyle, fontSize: 12, padding: '6px 14px', background: redactedCopied ? 'rgba(74,222,128,0.1)' : 'rgba(125,211,252,0.08)', borderColor: redactedCopied ? 'rgba(74,222,128,0.3)' : 'rgba(125,211,252,0.28)', color: redactedCopied ? '#4ade80' : '#7dd3fc', flexShrink: 0, transition: 'all 0.15s' }}
            >
              {redactedCopied ? <CheckCircle2 size={12} /> : <Copy size={12} />}
              {redactedCopied ? 'Copied!' : 'Copy redacted .env'}
            </button>
          )}
          {/* Export hygiene report */}
          {secretsStatus.data && (
            <button
              type="button"
              onClick={() => setReportPanelOpen(true)}
              title="Export a Markdown or JSON snapshot of the current hygiene state"
              style={{ ...actionButtonStyle, fontSize: 12, padding: '6px 14px', background: 'rgba(192,132,252,0.08)', borderColor: 'rgba(192,132,252,0.28)', color: '#c084fc', flexShrink: 0 }}
            >
              <FileText size={12} />
              Export report
            </button>
          )}
          {/* Spacer */}
          <span style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7, flex: 1 }}>
            Presence check only — never stores or reveals actual secret values.
          </span>
          {/* Undo last fix — shown when session fix history is non-empty */}
          {fixHistory.length > 0 && (
            <button
              type="button"
              onClick={handleUndo}
              disabled={secretsStatus.loading || bulkFixing}
              title={`Undo: ${fixHistory[fixHistory.length - 1]?.label}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 7, border: '1px solid rgba(192,132,252,0.22)', background: 'rgba(192,132,252,0.08)', color: (secretsStatus.loading || bulkFixing) ? 'rgba(232,121,249,0.35)' : 'rgba(232,121,249,0.75)', cursor: (secretsStatus.loading || bulkFixing) ? 'not-allowed' : 'pointer', flexShrink: 0, transition: 'opacity 0.15s' }}
            >
              <RotateCcw size={11} />
              Undo
            </button>
          )}
          {lastCheckedAt && !secretsStatus.loading && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
              {isStale && (
                <span
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#fb923c', background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.28)', borderRadius: 999, padding: '2px 8px', lineHeight: 1.5, whiteSpace: 'nowrap' }}
                  title="A watched file was modified after the last check. Click Run Check to refresh."
                >
                  <AlertTriangle size={9} />
                  Results may be outdated
                </span>
              )}
              <span style={{ fontSize: 11, color: 'rgba(148,163,184,0.45)', whiteSpace: 'nowrap' }} title={new Date(lastCheckedAt).toLocaleString()}>
                Checked {relTime(lastCheckedAt)}
              </span>
            </span>
          )}
        </div>
      </Section>

      <Section title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Shield size={16} /> Secrets Management</span>}>
        {(() => {
          const orng = '#fb923c';
          const orngBorder = 'rgba(251,146,60,0.18)';
          const orngRowAlt = 'rgba(251,146,60,0.03)';
          const orngRowBorder = 'rgba(251,146,60,0.1)';
          const hdr = {
            fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
            color: orng, padding: '8px 16px',
            borderBottom: `1px solid ${orngBorder}`, background: 'rgba(24,10,2,0.35)',
            whiteSpace: 'nowrap',
          };
          const cols = 'minmax(180px, 1fr) minmax(100px, auto) minmax(300px, 2fr)';
          const smRows = [
            {
              metric: 'Providers requiring keys',
              value: String(SECRET_PROVIDERS.length),
              tone: 'default',
              notes: 'Reference providers and infrastructure surfaces that usually need env-based credentials.',
            },
            {
              metric: 'Providers ready',
              value: `${presentRequiredCount}/${SECRET_PROVIDERS.length}`,
              tone: presentRequiredCount === SECRET_PROVIDERS.length ? 'good' : 'warn',
              notes: 'Providers whose required environment variables are currently detected.',
            },
            {
              metric: 'Expected env vars present',
              value: `${presentEnvCount}/${expectedSecretVars.length}`,
              tone: presentEnvCount > 0 ? 'good' : 'warn',
              notes: 'Presence check only. Launchline never shows the underlying secret values.',
            },
            {
              metric: 'Git hygiene',
              value: hygieneOkay ? 'Protected' : 'Needs review',
              tone: hygieneOkay ? 'good' : 'warn',
              notes: '.env and .env.local should be ignored before Launchline starts using real credentials.',
            },
          ];
          const toneColor = (t) => t === 'good' ? '#4ade80' : t === 'warn' ? '#fbbf24' : t === 'danger' ? '#f87171' : 'var(--text)';
          return (
            <div style={{ border: `1px solid ${orngBorder}`, borderRadius: 12, background: 'rgba(251,146,60,0.04)', overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: cols }}>
                <div style={{ display: 'contents' }}>
                  <div style={hdr}>Metric</div>
                  <div style={hdr}>Value</div>
                  <div style={hdr}>Notes</div>
                </div>
                {smRows.map((row, idx) => {
                  const rowBg = idx % 2 === 1 ? orngRowAlt : 'transparent';
                  const cell = { background: rowBg, borderBottom: `1px solid ${orngRowBorder}`, padding: '10px 16px', display: 'flex', alignItems: 'center' };
                  return (
                    <div key={row.metric} style={{ display: 'contents' }}>
                      <div style={{ ...cell }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{row.metric}</span>
                      </div>
                      <div style={{ ...cell }}>
                        <span style={{ fontSize: 18, fontWeight: 800, color: toneColor(row.tone), lineHeight: 1 }}>{row.value}</span>
                      </div>
                      <div style={{ ...cell }}>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{row.notes}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </Section>

      <Section title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Boxes size={16} /> Expected Environment Variables</span>}>
        {(() => {
          const blue = '#60a5fa';
          const blueBorder = 'rgba(96,165,250,0.18)';
          const blueRowAlt = 'rgba(96,165,250,0.03)';
          const blueRowBorder = 'rgba(96,165,250,0.1)';
          const hdr = {
            fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
            color: blue, padding: '8px 16px',
            borderBottom: `1px solid ${blueBorder}`, background: 'rgba(2,8,24,0.35)',
            whiteSpace: 'nowrap',
          };
          const cols = 'minmax(140px, 0.8fr) auto minmax(240px, 1.6fr) minmax(220px, 1.4fr)';
          const statusStyle = (s) => {
            if (s === 'complete')    return { color: '#4ade80', bg: 'rgba(74,222,128,0.1)',   border: 'rgba(74,222,128,0.28)',  label: 'Complete' };
            if (s === 'in_progress') return { color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.28)',  label: 'In Progress' };
            if (s === 'later')       return { color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.28)', label: 'Missing' };
            return                          { color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.2)', label: 'Reference' };
          };
          return (
            <div style={{ border: `1px solid ${blueBorder}`, borderRadius: 12, background: 'rgba(96,165,250,0.04)', overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: cols }}>
                <div style={{ display: 'contents' }}>
                  <div style={hdr}>Provider</div>
                  <div style={hdr}>Status</div>
                  <div style={hdr}>Variables</div>
                  <div style={hdr}>Notes</div>
                </div>
                {SECRET_PROVIDERS.map((provider, idx) => {
                  const state = providerStatus(provider);
                  const ss = statusStyle(state.status);
                  const rowBg = idx % 2 === 1 ? blueRowAlt : 'transparent';
                  const cell = { background: rowBg, borderBottom: `1px solid ${blueRowBorder}`, padding: '10px 16px', display: 'flex', alignItems: 'flex-start' };
                  return (
                    <div key={provider.id} style={{ display: 'contents' }}>
                      {/* Provider */}
                      <div style={{ ...cell, flexDirection: 'column', gap: 3, justifyContent: 'center' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>{provider.title}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.3 }}>{provider.category}</span>
                      </div>
                      {/* Status */}
                      <div style={{ ...cell, alignItems: 'center' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 9px', borderRadius: 999, background: ss.bg, border: `1px solid ${ss.border}`, color: ss.color, fontSize: 11, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                          {ss.label}
                        </span>
                      </div>
                      {/* Variables */}
                      <div style={{ ...cell, flexDirection: 'column', gap: 8 }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                          {provider.requiredEnv.map((name) => {
                            const present = envPresence[name];
                            const isEditingThis = editingVar?.key === name && editingVar?.file === '.env';
                            const isSavingThis  = savingVar?.key === name  && savingVar?.file === '.env';
                            if (isEditingThis) {
                              return (
                                <div key={name} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                                  <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#60a5fa' }}>{name}=</span>
                                  <input
                                    autoFocus
                                    type="text"
                                    placeholder="paste value…"
                                    value={editingVar.draft}
                                    onChange={e => setEditingVar(v => ({ ...v, draft: e.target.value, error: null }))}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') handleSaveVar();
                                      if (e.key === 'Escape') setEditingVar(null);
                                    }}
                                    style={{ fontSize: 11, fontFamily: 'var(--font-mono)', background: 'rgba(96,165,250,0.08)', border: `1px solid ${editingVar.error ? 'rgba(248,113,113,0.5)' : 'rgba(96,165,250,0.35)'}`, borderRadius: 5, padding: '3px 8px', color: '#e2e8f0', outline: 'none', width: 220 }}
                                  />
                                  <button onClick={handleSaveVar} disabled={isSavingThis}
                                    style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 5, cursor: 'pointer', border: 'none', background: '#60a5fa', color: '#0f172a' }}>
                                    {isSavingThis ? '…' : 'Save'}
                                  </button>
                                  <button onClick={() => setEditingVar(null)}
                                    style={{ fontSize: 10, padding: '3px 8px', borderRadius: 5, cursor: 'pointer', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)' }}>
                                    Cancel
                                  </button>
                                  </div>
                                  {editingVar.error && (
                                    <span style={{ fontSize: 10, color: '#f87171' }}>⚠ {editingVar.error}</span>
                                  )}
                                </div>
                              );
                            }
                            return (
                              <div key={name} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 8px', borderRadius: 999, border: `1px solid ${present ? 'rgba(74,222,128,0.28)' : 'rgba(96,165,250,0.24)'}`, background: present ? 'rgba(74,222,128,0.1)' : 'rgba(96,165,250,0.1)', color: present ? '#4ade80' : '#60a5fa', fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                                  {name}
                                  {!present ? (
                                    <button
                                      title={`Set ${name}`}
                                      onClick={() => setEditingVar({ file: '.env', key: name, draft: '', confirming: false })}
                                      style={{ fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 4, cursor: 'pointer', border: '1px solid rgba(96,165,250,0.4)', background: 'rgba(96,165,250,0.15)', color: '#60a5fa', lineHeight: 1.4, marginLeft: 2 }}>
                                      Set
                                    </button>
                                  ) : (
                                    <>
                                      <button
                                        title="Peek at partial value"
                                        onClick={() => setPeekingVar(v => v === name ? null : name)}
                                        style={{ fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 4, cursor: 'pointer', border: '1px solid rgba(74,222,128,0.35)', background: peekingVar === name ? 'rgba(74,222,128,0.2)' : 'rgba(74,222,128,0.08)', color: '#4ade80', lineHeight: 1.4, marginLeft: 2 }}>
                                        {peekingVar === name ? '▲' : '👁'}
                                      </button>
                                      <button
                                        title={`Change ${name}`}
                                        onClick={() => { setPeekingVar(null); setEditingVar({ file: '.env', key: name, draft: '', confirming: false }); }}
                                        style={{ fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 4, cursor: 'pointer', border: '1px solid rgba(74,222,128,0.35)', background: 'rgba(74,222,128,0.08)', color: '#4ade80', lineHeight: 1.4 }}>
                                        ✎
                                      </button>
                                    </>
                                  )}
                                </span>
                                {present && peekingVar === name && (
                                  <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: '#94a3b8', padding: '2px 6px', background: 'rgba(255,255,255,0.04)', borderRadius: 4, border: '1px solid rgba(255,255,255,0.08)', letterSpacing: '0.04em' }}>
                                    {partialMask(name)}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        {provider.optionalEnv?.length ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: 2 }}>opt</span>
                            {provider.optionalEnv.map((name) => (
                              <span key={name} style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 8px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)', fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                                {name}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      {/* Notes */}
                      <div style={{ ...cell, alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{provider.notes}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </Section>

      <Section title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><CheckCircle2 size={16} /> Non-secret Checklist</span>}>
        <div style={{ display: 'grid', gap: 12 }}>
          {secretChecklist.map((item) => (
            <ToggleRow key={item.id} title={item.title} description={item.description} checked={!!item.checked} onChange={(value) => updateSecretChecklist(item.id, value)} />
          ))}
        </div>
        <div style={{ marginTop: 14, fontSize: 12, color: 'var(--text-secondary)' }}>
          {checkedChecklistCount}/{secretChecklist.length} checklist safeguards are currently enabled in the current Launchline plan.
        </div>
      </Section>

      <Section title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Shield size={16} /> Secret-handling Policies</span>}>
        <div style={{ display: 'grid', gap: 12 }}>
          <ToggleRow title="Redact sensitive logs and command output" description="Keep this on when Python tasks might touch API clients, SMTP, or database credentials." checked={!!secretPolicies.redactLogs} onChange={(value) => updateSecretPolicy('redactLogs', value)} />
          <ToggleRow title="Prefer .env.local over shared .env files" description="Machine-specific env files reduce accidental reuse of credentials across clones." checked={!!secretPolicies.preferLocalEnvFiles} onChange={(value) => updateSecretPolicy('preferLocalEnvFiles', value)} />
          <ToggleRow title="Separate credentials by environment" description="Use distinct keys for local, staging, and production so one leak does not affect every environment." checked={!!secretPolicies.separateCredentialsByEnvironment} onChange={(value) => updateSecretPolicy('separateCredentialsByEnvironment', value)} />
          <ToggleRow title="Require a release-time secrets review" description="Add a pre-release check that confirms test keys are removed and production ownership is documented." checked={!!secretPolicies.requireReleaseSecretReview} onChange={(value) => updateSecretPolicy('requireReleaseSecretReview', value)} />
        </div>
      </Section>

      <Section title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><RefreshCw size={16} /> Recommended Next Actions</span>}>
        <ControlCard
          title={secretNextActions.length > 0 ? 'Security follow-up' : 'Secrets posture looks healthy'}
          subtitle={secretNextActions.length > 0 ? 'Use these actions to keep sensitive configuration out of app settings and safer across environments.' : 'Current secrets guidance, env coverage, and file hygiene all look solid.'}
        >
          {secretNextActions.length > 0 ? (
            <div style={{ display: 'grid', gap: 10 }}>
              {secretNextActions.map((action, index) => (
                <div key={`${index}-${action}`} style={{ display: 'grid', gridTemplateColumns: '28px minmax(0, 1fr)', gap: 12, alignItems: 'start', padding: '12px 14px', border: '1px solid var(--border)', borderRadius: 12, background: 'rgba(10,15,26,0.48)' }}>
                  <div style={{ width: 28, height: 28, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'rgba(91,154,255,0.16)', border: '1px solid rgba(91,154,255,0.28)', color: 'var(--primary)', fontSize: 12, fontWeight: 800 }}>
                    {index + 1}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{action}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              Keep the policy checklist visible for Launchline, and continue documenting expected provider variables through .env.example instead of inside settings pages.
            </div>
          )}
        </ControlCard>
      </Section>

    </div>
    {renderTerminalLogViewer()}

    {/* ── Export Hygiene Report modal ─────────────────────────────────────── */}
    {reportPanelOpen && (
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      >
        <div style={{ width: '100%', maxWidth: 760, maxHeight: '82vh', display: 'flex', flexDirection: 'column', background: '#0d1829', border: '1px solid rgba(192,132,252,0.32)', borderRadius: 14, boxShadow: '0 24px 72px rgba(0,0,0,0.7)', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: '1px solid rgba(192,132,252,0.15)', flexShrink: 0 }}>
            <FileText size={15} style={{ color: '#c084fc' }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', flex: 1 }}>Hygiene Report Export</span>
            {/* Format toggle */}
            <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 3 }}>
              {[
                { id: 'markdown', label: 'Markdown', icon: FileText },
                { id: 'json',     label: 'JSON',     icon: FileText },
                { id: 'csv',      label: 'CSV',      icon: Table2   },
                { id: 'html',     label: 'HTML',     icon: FileCode2 },
              ].map(({ id: fmt, label }) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => { setReportFormat(fmt); setReportCopied(false); }}
                  style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 5, border: 'none', cursor: 'pointer', background: reportFormat === fmt ? 'rgba(192,132,252,0.22)' : 'transparent', color: reportFormat === fmt ? '#c084fc' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', transition: 'all 0.12s' }}
                >
                  {label}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setReportPanelOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, display: 'flex', borderRadius: 5 }} title="Close">
              <X size={16} />
            </button>
          </div>
          {/* Preview */}
          <pre
            style={{ flex: 1, overflowY: 'auto', margin: 0, padding: '14px 18px', fontSize: 11, lineHeight: 1.65, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.25)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
            className="custom-scrollbar"
          >
            {getReportContent()}
          </pre>
          {/* Footer actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 18px', borderTop: '1px solid rgba(192,132,252,0.15)', flexShrink: 0, background: 'rgba(0,0,0,0.12)' }}>
            <button
              type="button"
              onClick={handleExportCopy}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 8, border: `1px solid ${reportCopied ? 'rgba(74,222,128,0.3)' : 'rgba(192,132,252,0.28)'}`, background: reportCopied ? 'rgba(74,222,128,0.1)' : 'rgba(192,132,252,0.08)', color: reportCopied ? '#4ade80' : '#c084fc', cursor: 'pointer', transition: 'all 0.15s' }}
            >
              {reportCopied ? <CheckCircle2 size={12} /> : <Copy size={12} />}
              {reportCopied ? 'Copied!' : 'Copy to clipboard'}
            </button>
            <button
              type="button"
              onClick={handleExportDownload}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(125,211,252,0.28)', background: 'rgba(125,211,252,0.08)', color: '#7dd3fc', cursor: 'pointer' }}
            >
              <Download size={12} />
              Download .{reportFormat === 'markdown' ? 'md' : reportFormat === 'csv' ? 'csv' : reportFormat === 'html' ? 'html' : 'json'}
            </button>
            <span style={{ flex: 1 }} />
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Snapshot as of {lastCheckedAt ? new Date(lastCheckedAt).toLocaleString() : 'last check'}
            </span>
          </div>
        </div>
      </div>
    )}

    {/* ── "Why is this flagged?" explainer modal ────────────────────────── */}
    {whyFlaggedIssue && (() => {
      const expl = ISSUE_EXPLANATIONS.find((e) => e.match.test(whyFlaggedIssue));
      if (!expl) return null;
      return (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 10001, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
        >
          <div style={{ width: '100%', maxWidth: 520, background: '#0d1829', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 14, boxShadow: '0 24px 72px rgba(0,0,0,0.7)', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: '1px solid rgba(248,113,113,0.15)', background: 'rgba(248,113,113,0.05)' }}>
              <HelpCircle size={15} style={{ color: '#f87171', flexShrink: 0 }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#fca5a5', flex: 1 }}>{expl.title}</span>
              <button type="button" onClick={() => setWhyFlaggedIssue(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, display: 'flex', borderRadius: 5 }}>
                <X size={16} />
              </button>
            </div>
            {/* Flagged issue */}
            <div style={{ margin: '14px 18px 0', padding: '8px 12px', background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.18)', borderRadius: 7, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <AlertTriangle size={12} style={{ color: '#f87171', flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 11, color: '#fca5a5', lineHeight: 1.55 }}>{whyFlaggedIssue}</span>
            </div>
            <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Why */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(248,113,113,0.65)', marginBottom: 5 }}>Why this matters</div>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65 }}>{expl.why}</p>
              </div>
              {/* How to fix */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(74,222,128,0.65)', marginBottom: 5 }}>How to fix</div>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65 }}>{expl.fix}</p>
              </div>
              {/* Link */}
              {expl.link && (
                <a href={expl.link} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#60a5fa', textDecoration: 'none' }}>
                  <ExternalLink size={11} />
                  Learn more
                </a>
              )}
            </div>
            <div style={{ padding: '10px 18px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setWhyFlaggedIssue(null)} style={{ fontSize: 12, fontWeight: 600, padding: '6px 16px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)', cursor: 'pointer' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      );
    })()}
    </div>
  );
}
