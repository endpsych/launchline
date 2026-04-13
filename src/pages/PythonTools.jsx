import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, BarChart2, Box, Boxes, CheckCircle2, ChevronDown, ChevronRight, ChevronUp, Copy, ExternalLink, FileCode2, FolderOpen, HelpCircle, PlayCircle, Plus, RefreshCw, Search, TerminalSquare, Trash2, XCircle } from 'lucide-react';
import { buildCatalogEntryFromPyPI, getCatalogStatusMeta, mergePackageCatalog, normalizeCatalogEntry, normalizeCatalogStatus, PACKAGE_CATALOG_STATUS_OPTIONS } from '../python/packageCatalogUtils';
import { SETTINGS_DEFAULT, useSettings } from '../hooks/useSettings';
import { Section, inputStyle } from '../ui-kit/forms/SettingsLayout';
import { PYTHON_PACKAGE_CATALOG, PYTHON_PACKAGE_CATEGORIES, PYTHON_TECHNICAL_PROPERTY_CATEGORIES } from '../ui-showcase/data/pythonPackageCatalog';
import TabBar from '../components/TabBar';
import Modal from '../components/Modal';
import WorkspaceBanner from '../components/WorkspaceBanner';

const pageWrapStyle = {
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  height: '100%',
};

const pageContentStyle = {
  padding: 28,
  overflowY: 'auto',
  minHeight: 0,
  flex: 1,
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

const helperTextStyle = {
  fontSize: 13,
  color: 'var(--text-secondary)',
  lineHeight: 1.6,
  maxWidth: 860,
};

const cardGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  gap: 14,
};

const PACKAGE_TASK_OPTIONS = ['all', 'api', 'cli', 'data', 'ml', 'documents'];
const PYTHON_TOOL_TABS = [
  { id: 'environment', label: 'Main', icon: FileCode2 },
  { id: 'installs', label: 'Installs', icon: Box },
  { id: 'catalog', label: 'Package Catalog', icon: Boxes },
];
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

// Flat, squared variant for the terminal toolbar — industrial feel
const termBtnStyle = {
  ...actionButtonStyle,
  borderRadius: 3,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.04)',
  fontWeight: 500,
  letterSpacing: '0.02em',
  textTransform: 'uppercase',
  fontSize: 10,
};

function slugifyEnvironmentId(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function formatBytes(value) {
  if (typeof value !== 'number' || Number.isNaN(value) || value < 0) {
    return 'Not available';
  }
  if (value === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const scaled = value / (1024 ** exponent);
  const precision = scaled >= 10 || exponent === 0 ? 0 : 1;
  return `${scaled.toFixed(precision)} ${units[exponent]}`;
}

function formatDateTime(value) {
  if (!value) return 'Not available';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Not available';
  return parsed.toLocaleString();
}

const PYTHON_SECRET_PROVIDERS = [
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
];

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
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{title}</div>
        <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{description}</div>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

function ControlCard({ title, subtitle, children }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 14, background: 'rgba(10,15,26,0.52)', padding: 16 }}>
      {title ? <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{title}</div> : null}
      {subtitle ? <div style={{ marginTop: 5, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{subtitle}</div> : null}
      <div style={{ marginTop: title || subtitle ? 14 : 0 }}>{children}</div>
    </div>
  );
}

function SingleLineCopyValue({ value, onCopy, onOpenFolder }) {
  const [open, setOpen] = useState(false);
  const [activeAction, setActiveAction] = useState(null);
  const [isTruncated, setIsTruncated] = useState(false);
  const valueRef = useRef(null);

  function updateTruncationState() {
    const node = valueRef.current;
    if (!node) {
      setIsTruncated(false);
      return;
    }
    setIsTruncated(node.scrollWidth > node.clientWidth + 1);
  }

  useEffect(() => {
    updateTruncationState();
  }, [value]);

  useEffect(() => {
    const handleResize = () => updateTruncationState();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  function triggerActionGlow(actionKey, action) {
    setActiveAction(actionKey);
    try {
      action?.();
    } finally {
      window.setTimeout(() => {
        setActiveAction((current) => (current === actionKey ? null : current));
      }, 260);
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, width: '100%', position: 'relative' }}>
      <span
        ref={valueRef}
        onMouseEnter={() => {
          updateTruncationState();
          setOpen(valueRef.current ? valueRef.current.scrollWidth > valueRef.current.clientWidth + 1 : false);
        }}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => {
          updateTruncationState();
          setOpen(valueRef.current ? valueRef.current.scrollWidth > valueRef.current.clientWidth + 1 : false);
        }}
        onBlur={() => setOpen(false)}
        tabIndex={0}
        style={{
          minWidth: 0,
          flex: 1,
          fontSize: 12,
          color: 'var(--text)',
          fontFamily: 'var(--font-mono)',
          lineHeight: 1.6,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {value}
      </span>
      {open && isTruncated ? (
        <div
          style={{
            position: 'absolute',
            top: 30,
            left: 0,
            width: 260,
            zIndex: 12,
            padding: '10px 12px',
            borderRadius: 10,
            border: '1px solid var(--border)',
            background: '#0f1726',
            boxShadow: '0 10px 24px rgba(0,0,0,0.35)',
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', marginBottom: 4 }}>
            Full value
          </div>
          <div style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--text-secondary)', wordBreak: 'break-word' }}>
            {value}
          </div>
        </div>
      ) : null}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginLeft: 'auto', flexShrink: 0 }}>
        {onOpenFolder ? (
          <button
            type="button"
            onClick={() => triggerActionGlow('open', () => onOpenFolder?.(value))}
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              border: activeAction === 'open' ? '1px solid rgba(91,154,255,0.38)' : '1px solid var(--border)',
              background: activeAction === 'open' ? 'rgba(91,154,255,0.16)' : 'rgba(255,255,255,0.04)',
              color: activeAction === 'open' ? '#9cc3ff' : 'var(--text-secondary)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              boxShadow: activeAction === 'open' ? '0 0 16px rgba(91,154,255,0.28)' : 'none',
              transition: 'background 120ms ease, border-color 120ms ease, box-shadow 120ms ease, color 120ms ease',
            }}
            aria-label="Open folder for path"
          >
            <FolderOpen size={12} />
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => triggerActionGlow('copy', () => onCopy?.(value))}
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            border: activeAction === 'copy' ? '1px solid rgba(91,154,255,0.38)' : '1px solid var(--border)',
            background: activeAction === 'copy' ? 'rgba(91,154,255,0.16)' : 'rgba(255,255,255,0.04)',
            color: activeAction === 'copy' ? '#9cc3ff' : 'var(--text-secondary)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
            boxShadow: activeAction === 'copy' ? '0 0 16px rgba(91,154,255,0.28)' : 'none',
            transition: 'background 120ms ease, border-color 120ms ease, box-shadow 120ms ease, color 120ms ease',
          }}
          aria-label="Copy value"
        >
          <Copy size={12} />
        </button>
      </div>
    </div>
  );
}

function SingleLineHoverValue({ value }) {
  const [open, setOpen] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);
  const valueRef = useRef(null);

  function updateTruncationState() {
    const node = valueRef.current;
    if (!node) {
      setIsTruncated(false);
      return;
    }
    setIsTruncated(node.scrollWidth > node.clientWidth + 1);
  }

  useEffect(() => {
    updateTruncationState();
  }, [value]);

  useEffect(() => {
    const handleResize = () => updateTruncationState();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div style={{ minWidth: 0, position: 'relative', width: '100%' }}>
      <span
        ref={valueRef}
        onMouseEnter={() => {
          updateTruncationState();
          setOpen(valueRef.current ? valueRef.current.scrollWidth > valueRef.current.clientWidth + 1 : false);
        }}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => {
          updateTruncationState();
          setOpen(valueRef.current ? valueRef.current.scrollWidth > valueRef.current.clientWidth + 1 : false);
        }}
        onBlur={() => setOpen(false)}
        tabIndex={0}
        style={{
          display: 'block',
          minWidth: 0,
          width: '100%',
          fontSize: 12,
          color: 'var(--text)',
          fontFamily: 'var(--font-mono)',
          lineHeight: 1.6,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          outline: 'none',
        }}
      >
        {value}
      </span>
      {open && isTruncated ? (
        <div
          style={{
            position: 'absolute',
            top: 28,
            left: 0,
            width: 260,
            zIndex: 12,
            padding: '10px 12px',
            borderRadius: 10,
            border: '1px solid var(--border)',
            background: '#0f1726',
            boxShadow: '0 10px 24px rgba(0,0,0,0.35)',
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', marginBottom: 4 }}>
            Full value
          </div>
          <div style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--text-secondary)', wordBreak: 'break-word' }}>
            {value}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function InlineValueActionButtons({ value, onCopy, onOpenFolder }) {
  const [activeAction, setActiveAction] = useState(null);

  function triggerActionGlow(actionKey, action) {
    setActiveAction(actionKey);
    try {
      action?.();
    } finally {
      window.setTimeout(() => {
        setActiveAction((current) => (current === actionKey ? null : current));
      }, 260);
    }
  }

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
      {onOpenFolder ? (
        <button
          type="button"
          onClick={() => triggerActionGlow('open', () => onOpenFolder?.(value))}
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            border: activeAction === 'open' ? '1px solid rgba(91,154,255,0.38)' : '1px solid var(--border)',
            background: activeAction === 'open' ? 'rgba(91,154,255,0.16)' : 'rgba(255,255,255,0.04)',
            color: activeAction === 'open' ? '#9cc3ff' : 'var(--text-secondary)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: activeAction === 'open' ? '0 0 16px rgba(91,154,255,0.28)' : 'none',
            transition: 'background 120ms ease, border-color 120ms ease, box-shadow 120ms ease, color 120ms ease',
          }}
          aria-label="Open folder for path"
        >
          <FolderOpen size={12} />
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => triggerActionGlow('copy', () => onCopy?.(value))}
        style={{
          width: 24,
          height: 24,
          borderRadius: 6,
          border: activeAction === 'copy' ? '1px solid rgba(91,154,255,0.38)' : '1px solid var(--border)',
          background: activeAction === 'copy' ? 'rgba(91,154,255,0.16)' : 'rgba(255,255,255,0.04)',
          color: activeAction === 'copy' ? '#9cc3ff' : 'var(--text-secondary)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: activeAction === 'copy' ? '0 0 16px rgba(91,154,255,0.28)' : 'none',
          transition: 'background 120ms ease, border-color 120ms ease, box-shadow 120ms ease, color 120ms ease',
        }}
        aria-label="Copy value"
      >
        <Copy size={12} />
      </button>
    </div>
  );
}

function HoverInfoLabel({ label, description, noWrap = false }) {
  const [tooltipPos, setTooltipPos] = useState(null);
  const anchorRef = useRef(null);

  const handleEnter = () => {
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setTooltipPos({ x: rect.left, y: rect.bottom + 6 });
    }
  };

  return (
    <div
      ref={anchorRef}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', minHeight: 18 }}
      onMouseEnter={handleEnter}
      onMouseLeave={() => setTooltipPos(null)}
      onFocus={handleEnter}
      onBlur={() => setTooltipPos(null)}
    >
      <span
        tabIndex={0}
        style={{
          fontSize: 10,
          fontWeight: 800,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          paddingTop: 3,
          cursor: 'default',
          outline: 'none',
          whiteSpace: noWrap ? 'nowrap' : 'normal',
        }}
      >
        {label}
      </span>
      {tooltipPos ? (
        <div
          style={{
            position: 'fixed',
            top: tooltipPos.y,
            left: tooltipPos.x,
            width: 260,
            zIndex: 9999,
            padding: '10px 12px',
            borderRadius: 10,
            border: '1px solid var(--border)',
            background: '#0f1726',
            boxShadow: '0 10px 24px rgba(0,0,0,0.35)',
            pointerEvents: 'none',
          }}
        >
          <div style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
            {description}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function RuntimeInventoryBadge({ label, color }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.03em',
        background: `${color}15`,
        color,
        border: `1px solid ${color}30`,
        textTransform: 'uppercase',
      }}
    >
      {label}
    </span>
  );
}

function buildPackageArgs(packages) {
  return (packages || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function buildRecipeSyncCommand(recipe) {
  const groups = Object.keys(recipe.groups || {});
  if (groups.length === 0) return 'uv sync';
  return `uv sync ${groups.map((group) => `--group ${group}`).join(' ')}`;
}

function normalizeCommandLogError(errorMessage) {
  const text = String(errorMessage || '');
  if (/No handler registered for 'python:read-command-log'/i.test(text)) {
    return 'Terminal log viewer is not available in the current Electron session yet. Fully restart Launchline so the new Python command-log bridge loads.';
  }
  if (/Command log bridge is unavailable/i.test(text)) {
    return 'Terminal log viewer is not available in this runtime. Fully restart Launchline to enable the Python command-log bridge.';
  }
  return text || 'Unable to read command log.';
}

function normalizeRuntimeProbeError(errorMessage, probeLabel) {
  const text = String(errorMessage || '');
  if (/No handler registered for 'python:venv-status'/i.test(text)) {
    return 'Virtual environment check is not available in the current Electron session yet. Fully restart Launchline so the new virtual-environment bridge loads.';
  }
  if (/No handler registered for 'python:dependency-summary'/i.test(text)) {
    return 'Dependency summary check is not available in the current Electron session yet. Fully restart Launchline so the new dependency-summary bridge loads.';
  }
  if (/No handler registered for 'python:create-venv'/i.test(text)) {
    return 'Virtual environment creation is not available in the current Electron session yet. Fully restart Launchline so the new create-environment bridge loads.';
  }
  if (/No handler registered for 'python:rebuild-venv'/i.test(text)) {
    return 'Virtual environment rebuild is not available in the current Electron session yet. Fully restart Launchline so the new rebuild-environment bridge loads.';
  }
  if (/No handler registered for 'python:delete-venv'/i.test(text)) {
    return 'Virtual environment deletion is not available in the current Electron session yet. Fully restart Launchline so the new delete-environment bridge loads.';
  }
  if (/No handler registered for 'python:sync-venv'/i.test(text)) {
    return 'Virtual environment sync is not available in the current Electron session yet. Fully restart Launchline so the new sync-environment bridge loads.';
  }
  if (/No handler registered for 'python:uv-status'/i.test(text)) {
    return 'UV check is not available in the current Electron session yet. Fully restart Launchline so the new uv-status bridge loads.';
  }
  if (/No handler registered for 'python:python-status'/i.test(text)) {
    return 'Python check is not available in the current Electron session yet. Fully restart Launchline so the new python-status bridge loads.';
  }
  if (/No handler registered for 'python:available-runtimes'/i.test(text)) {
    return 'Python runtime discovery is not available in the current Electron session yet. Fully restart Launchline so the new runtime-discovery bridge loads.';
  }
  if (/No handler registered for 'shell:open-terminal'/i.test(text)) {
    return 'Open terminal is not available in the current Electron session yet. Fully restart Launchline so the new terminal bridge loads.';
  }
  return text || `Unable to inspect ${probeLabel}.`;
}

export default function PythonTools() {
  const { settings, loading, save } = useSettings();
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [runtime, setRuntime] = useState({ loading: false, data: null, error: null });
  const [runtimeLoading, setRuntimeLoading] = useState({ uv: false, python: false, venv: false, availableRuntimes: false, createVenv: false, rebuildVenv: false, deleteVenv: false, syncVenv: false, dependencies: false });
  const [projectConfig, setProjectConfig] = useState({ loading: true, data: null, error: null });
  const [activeTab, setActiveTab] = useState('environment');
  const [packageSearch, setPackageSearch] = useState('');
  const [packageCategory, setPackageCategory] = useState('all');
  const [packageTaskType, setPackageTaskType] = useState('all');
  const [selectedPackageName, setSelectedPackageName] = useState(PYTHON_PACKAGE_CATALOG[0]?.name || '');
  const [newPackageTask, setNewPackageTask] = useState('');
  const [taskSearch, setTaskSearch] = useState('');
  const [showTaskComposer, setShowTaskComposer] = useState(false);
  const [showCatalogManualComposer, setShowCatalogManualComposer] = useState(false);
  const [showCatalogImportComposer, setShowCatalogImportComposer] = useState(false);
  const [manualCatalogDraft, setManualCatalogDraft] = useState({
    name: '',
    category: 'python',
    description: '',
    docsUrl: '',
    status: 'shortlisted',
  });
  const [catalogImportName, setCatalogImportName] = useState('');
  const [catalogImportDraft, setCatalogImportDraft] = useState(null);
  const [catalogImportState, setCatalogImportState] = useState({ loading: false, error: null });
  const [catalogActionMessage, setCatalogActionMessage] = useState(null);
  const [showEnvironmentComposer, setShowEnvironmentComposer] = useState(false);
  const [newEnvironmentDraft, setNewEnvironmentDraft] = useState({
    title: '',
    purpose: '',
    pythonVersion: '3.12',
  });
  const [environmentActionMessage, setEnvironmentActionMessage] = useState(null);
  const [assignmentPackageName, setAssignmentPackageName] = useState('');
  const [assignmentInstallSpec, setAssignmentInstallSpec] = useState('');
  const [assignmentScope, setAssignmentScope] = useState('base');
  const [assignmentGroup, setAssignmentGroup] = useState('');
  const [selectedRuntimePath, setSelectedRuntimePath] = useState('');
  const [runState, setRunState] = useState({
    running: false,
    command: '',
    result: null,
  });
  const [commandLog, setCommandLog] = useState({
    loading: true,
    entries: [],
    error: null,
  });
  const [terminalHeight, setTerminalHeight] = useState(240);
  const [terminalCollapsed, setTerminalCollapsed] = useState(true);
  const [pathsOpen, setPathsOpen] = useState(false);
  const [terminalTab, setTerminalTab] = useState('output');
  const [showProbes, setShowProbes] = useState(false);
  const [terminalSearch, setTerminalSearch] = useState('');
  const [expandedEntries, setExpandedEntries] = useState(() => new Set());
  const [terminalInput, setTerminalInput] = useState('');
  const [uvHelpOpen, setUvHelpOpen] = useState(false);
  const [pythonHelpOpen, setPythonHelpOpen] = useState(false);
  const [pythonCheckHover, setPythonCheckHover] = useState(false);
  const [venvHelpOpen, setVenvHelpOpen] = useState(false);
  const [projectHelpOpen, setProjectHelpOpen] = useState(false);
  const [dependencyHelpOpen, setDependencyHelpOpen] = useState(false);
  const [addDepInput,  setAddDepInput]  = useState('');
  const [addDepGroup,  setAddDepGroup]  = useState('base');
  const [addDepSaving, setAddDepSaving] = useState(false);
  const [depActionMsg, setDepActionMsg] = useState(null);
  const [openTip, setOpenTip] = useState(null);
  const [requiresPythonDraft, setRequiresPythonDraft] = useState('');
  const [requiresPythonSaving, setRequiresPythonSaving] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupSaving, setNewGroupSaving] = useState(false);
  const [catalogAddSpec, setCatalogAddSpec] = useState('');
  const [catalogAddGroup, setCatalogAddGroup] = useState('base');
  const [catalogAddSaving, setCatalogAddSaving] = useState(false);
  const [catalogAddMsg, setCatalogAddMsg] = useState(null);
  const [createPyprojectSaving, setCreatePyprojectSaving] = useState(false);
  const [createVenvHelpOpen, setCreateVenvHelpOpen] = useState(false);
  const [checkVenvHelpOpen, setCheckVenvHelpOpen] = useState(false);
  const [rebuildVenvHelpOpen, setRebuildVenvHelpOpen] = useState(false);
  const [openTerminalVenvHelpOpen, setOpenTerminalVenvHelpOpen] = useState(false);
  const [syncVenvHelpOpen, setSyncVenvHelpOpen] = useState(false);
  const [deleteVenvHelpOpen, setDeleteVenvHelpOpen] = useState(false);
  const [createVenvConfirmOpen, setCreateVenvConfirmOpen] = useState(false);
  const [createModalRuntimePath, setCreateModalRuntimePath] = useState('');
  const [syncVenvConfirmOpen, setSyncVenvConfirmOpen] = useState(false);
  const [rebuildVenvConfirmOpen, setRebuildVenvConfirmOpen] = useState(false);
  const [rebuildModalRuntimePath, setRebuildModalRuntimePath] = useState('');
  const [deleteVenvConfirmOpen, setDeleteVenvConfirmOpen] = useState(false);
  const [targetRuntimeConfirmOpen, setTargetRuntimeConfirmOpen] = useState(false);
  const [pendingTargetRuntimePath, setPendingTargetRuntimePath] = useState('');
  const [pkgSortColumn, setPkgSortColumn] = useState('name');
  const [pkgSortDir, setPkgSortDir] = useState('asc');
  const [pkgSearch, setPkgSearch] = useState('');
  const [depPackagesExpanded, setDepPackagesExpanded] = useState(false);
  const [depSummaryError, setDepSummaryError] = useState(null);
  const [lockfilePackageListModal, setLockfilePackageListModal] = useState(null);
  const runtimeHydratedRef = useRef(false);
  const runtimeDataRef = useRef(null);
  const terminalBodyRef = useRef(null);
  const venvCardRef = useRef(null);
  const pyprojectCardRef = useRef(null);

  const current = draft || settings || SETTINGS_DEFAULT;
  const pythonTools = current.pythonTools || SETTINGS_DEFAULT.pythonTools;
  const pyprojectPackages = useMemo(() => {
    if (!projectConfig.data) return [];
    const base = Array.isArray(projectConfig.data.dependencies) ? projectConfig.data.dependencies : [];
    const grouped = Object.values(projectConfig.data.groups || {}).flatMap((packages) => (Array.isArray(packages) ? packages : []));
    return [...new Set([...base, ...grouped])];
  }, [projectConfig.data]);

  const requirementsOnlyPackages = useMemo(() => {
    const requirements = runtime.data?.dependencySummary?.packages || [];
    if (!requirements.length) return [];
    const pyprojectSet = new Set(pyprojectPackages);
    return requirements.filter((pkg) => !pyprojectSet.has(pkg));
  }, [runtime.data, pyprojectPackages]);
  const catalogOverrides = pythonTools.catalogOverrides || {};
  const customCatalogEntries = Array.isArray(pythonTools.catalogEntries)
    ? pythonTools.catalogEntries.map(normalizeCatalogEntry).filter(Boolean)
    : [];
  const configuredEnvironmentRegistry = Array.isArray(pythonTools.environmentRegistry) && pythonTools.environmentRegistry.length > 0
    ? pythonTools.environmentRegistry
    : SETTINGS_DEFAULT.pythonTools.environmentRegistry;
  const environmentRegistry = useMemo(
    () => configuredEnvironmentRegistry.map((environment) => ({
      ...environment,
      manifestPath: environment.id === 'primary'
        ? (runtime.data?.paths?.pyprojectPath || environment.manifestPath)
        : environment.manifestPath,
      venvPath: environment.id === 'primary'
        ? (runtime.data?.paths?.venvDir || environment.venvPath)
        : environment.venvPath,
      pythonVersion: environment.id === 'primary'
        ? ((runtime.data?.venv?.interpreterVersion || '').replace(/^Python\s+/i, '') || environment.pythonVersion)
        : environment.pythonVersion,
      assignedPackages: Array.isArray(environment.assignedPackages) ? environment.assignedPackages : [],
    })),
    [configuredEnvironmentRegistry, runtime.data]
  );
  const selectedEnvironmentId = pythonTools.selectedEnvironmentId || environmentRegistry[0]?.id || 'primary';
  const selectedEnvironmentManifest = environmentRegistry.find((environment) => environment.id === selectedEnvironmentId) || environmentRegistry[0] || null;

  const migrationReady =
    !!runtime.data?.files?.hasPyproject &&
    (!runtime.data?.files?.hasRequirements || requirementsOnlyPackages.length === 0);
  const packageCatalog = useMemo(
    () => mergePackageCatalog(customCatalogEntries, catalogOverrides),
    [catalogOverrides, customCatalogEntries]
  );
  const workspaceProjectDetected = !!projectConfig.data?.exists || !!runtime.data?.files?.hasPyproject;
  const workspacePythonSignalsDetected = !!runtime.data?.files?.hasPyproject || !!runtime.data?.files?.hasRequirements || !!runtime.data?.files?.hasVenv;
  const workspacePythonDescription = workspaceProjectDetected
    ? 'Launchline found a Python project manifest in the active workspace and can audit its declared environment directly.'
    : workspacePythonSignalsDetected
      ? 'The active workspace has Python signals, but no pyproject.toml manifest yet. Python Tools can still help you inspect and prepare the environment.'
      : 'The active workspace does not currently look like a Python project. Python Tools stays available so you can prepare a Python environment if this workspace grows into one.';
  const filteredPackageCatalog = useMemo(() => {
    const query = packageSearch.trim().toLowerCase();
    return packageCatalog.filter((pkg) => {
      const matchesCategory = packageCategory === 'all' || pkg.category === packageCategory;
      const haystack = [pkg.name, pkg.description, ...(pkg.sampleTasks || [])].join(' ').toLowerCase();
      const matchesSearch = !query || haystack.includes(query);
      const matchesTaskType =
        packageTaskType === 'all' ||
        haystack.includes(packageTaskType === 'documents' ? 'document' : packageTaskType);
      return matchesCategory && matchesSearch && matchesTaskType;
    });
  }, [packageCatalog, packageCategory, packageSearch, packageTaskType]);
  const selectedPackage =
    filteredPackageCatalog.find((pkg) => pkg.name === selectedPackageName) ||
    filteredPackageCatalog[0] ||
    null;
  const selectedAssignmentPackage = useMemo(() => {
    const normalizedAssignmentName = String(assignmentPackageName || selectedPackageName || '').trim().toLowerCase();
    if (!normalizedAssignmentName) return null;
    return packageCatalog.find((pkg) => pkg.name.toLowerCase() === normalizedAssignmentName) || null;
  }, [assignmentPackageName, packageCatalog, selectedPackageName]);

  const dirty = useMemo(
    () => JSON.stringify(current) !== JSON.stringify(settings || SETTINGS_DEFAULT),
    [current, settings]
  );
  const terminalFilteredEntries = useMemo(() => {
    let entries = [...commandLog.entries].reverse();
    if (!showProbes) entries = entries.filter((e) => e.source !== 'probe');
    if (terminalTab === 'problems') entries = entries.filter((e) => !e.ok || e.code !== 0);
    else if (terminalTab === 'output') entries = entries.filter((e) => e.source === 'run' || e.source === 'action');
    if (terminalSearch.trim()) {
      const q = terminalSearch.toLowerCase();
      entries = entries.filter((e) =>
        e.command?.toLowerCase().includes(q) ||
        e.stdout?.toLowerCase().includes(q) ||
        e.stderr?.toLowerCase().includes(q) ||
        e.label?.toLowerCase().includes(q)
      );
    }
    return entries;
  }, [commandLog.entries, terminalTab, showProbes, terminalSearch]);

  const problemCount = useMemo(
    () => commandLog.entries.filter((e) => !e.ok || e.code !== 0).length,
    [commandLog.entries]
  );

  // Plain-text version used only by "Copy log"
  const terminalTranscript = useMemo(() => {
    if (!terminalFilteredEntries.length) return '';
    return terminalFilteredEntries.map((entry) => {
      const ts = entry.finishedAt || entry.startedAt
        ? new Date(entry.finishedAt || entry.startedAt).toLocaleString() : '?';
      const lines = [`[${ts}] ${entry.source || ''}`, `> ${entry.command}`];
      if (entry.stdout) lines.push(entry.stdout);
      if (entry.stderr) lines.push(entry.stderr);
      lines.push(`[exit ${entry.code} · ${Math.round((entry.durationMs || 0) / 10) / 100}s]`);
      return lines.join('\n');
    }).join('\n\n');
  }, [terminalFilteredEntries]);

  const terminalStatusText = useMemo(
    () => commandLog.loading ? 'Refreshing…' : `${terminalFilteredEntries.length} entr${terminalFilteredEntries.length === 1 ? 'y' : 'ies'}`,
    [commandLog.loading, terminalFilteredEntries.length]
  );
  const verifiedAvailableRuntimeOptions = useMemo(() => {
    const runtimeOptions = Array.isArray(runtime.data?.python?.availableRuntimes?.runtimes)
      ? runtime.data.python.availableRuntimes.runtimes
      : [];
    return runtimeOptions.filter((runtimeOption) => runtimeOption?.path && runtimeOption.ok !== false);
  }, [runtime.data?.python?.availableRuntimes?.runtimes]);
  const defaultRuntimeOption = useMemo(
    () => runtime.data?.python?.availableRuntimes?.defaultRuntime || verifiedAvailableRuntimeOptions[0] || null,
    [runtime.data?.python?.availableRuntimes?.defaultRuntime, verifiedAvailableRuntimeOptions]
  );
  const selectedAvailableRuntimeOption = useMemo(
    () => verifiedAvailableRuntimeOptions.find((runtimeOption) => runtimeOption.path === selectedRuntimePath) || defaultRuntimeOption,
    [verifiedAvailableRuntimeOptions, selectedRuntimePath, defaultRuntimeOption]
  );
  const rebuildTargetRuntimeLabel = useMemo(() => {
    return selectedAvailableRuntimeOption
      ? `${selectedAvailableRuntimeOption.version ? `Python ${selectedAvailableRuntimeOption.version}` : selectedAvailableRuntimeOption.label}${selectedAvailableRuntimeOption.isDefault ? ' (Default)' : ''}`
      : 'Default runtime';
  }, [selectedAvailableRuntimeOption]);
  const pendingTargetRuntimeOption = useMemo(
    () => verifiedAvailableRuntimeOptions.find((runtimeOption) => runtimeOption.path === pendingTargetRuntimePath) || null,
    [verifiedAvailableRuntimeOptions, pendingTargetRuntimePath]
  );
  const pendingTargetRuntimeLabel = pendingTargetRuntimeOption
    ? `${pendingTargetRuntimeOption.version ? `Python ${pendingTargetRuntimeOption.version}` : pendingTargetRuntimeOption.label}${pendingTargetRuntimeOption.isDefault ? ' (Default)' : ''}`
    : 'Not available';

  useEffect(() => {
    setNewPackageTask('');
    setTaskSearch('');
    setShowTaskComposer(false);
  }, [selectedPackage?.name]);

  useEffect(() => {
    if (assignmentPackageName || assignmentInstallSpec || !selectedPackage) return;
    setAssignmentInstallSpec(selectedPackage.defaultInstallSpec || selectedPackage.name);
  }, [assignmentInstallSpec, assignmentPackageName, selectedPackage]);

  useEffect(() => {
    if (!projectConfig.data?.metadata?.requiresPython) return;
    setRequiresPythonDraft(projectConfig.data.metadata.requiresPython);
  }, [projectConfig.data?.metadata?.requiresPython]);

  useEffect(() => {
    setCatalogAddSpec(selectedPackage?.defaultInstallSpec || selectedPackage?.name || '');
    setCatalogAddMsg(null);
  }, [selectedPackage?.name]);

  function setSection(sectionKey, nextValue) {
    setDraft((prev) => {
      const base = prev || settings || SETTINGS_DEFAULT;
      return {
        ...base,
        [sectionKey]: nextValue,
      };
    });
  }

  function updatePythonTools(key, value) {
    setSection('pythonTools', {
      ...pythonTools,
      [key]: value,
    });
  }

  async function persistCurrentDraft(nextRoot) {
    setSaving(true);
    try {
      await save(nextRoot);
      setDraft(null);
    } finally {
      setSaving(false);
    }
  }

  async function persistPythonToolsPatch(patch) {
    const baseRoot = draft || settings || SETTINGS_DEFAULT;
    const nextRoot = {
      ...baseRoot,
      pythonTools: {
        ...(baseRoot.pythonTools || SETTINGS_DEFAULT.pythonTools),
        ...patch,
      },
    };
    setDraft(nextRoot);
    await persistCurrentDraft(nextRoot);
  }

  async function upsertCatalogEntry(entry) {
    const normalized = normalizeCatalogEntry(entry);
    if (!normalized) return false;
    const exists = packageCatalog.some((pkg) => pkg.name.toLowerCase() === normalized.name.toLowerCase());
    if (exists) {
      setCatalogActionMessage({
        tone: 'warn',
        text: `${normalized.name} is already in the reference catalog.`,
      });
      return false;
    }
    await persistPythonToolsPatch({
      catalogEntries: [...customCatalogEntries, normalized],
    });
    setCatalogActionMessage({
      tone: 'good',
      text: `${normalized.name} was added to the reference catalog.`,
    });
    setSelectedPackageName(normalized.name);
    return true;
  }

  async function persistCatalogOverride(packageName, partialOverride) {
    if (!packageName) return;
    const nextOverrides = {
      ...catalogOverrides,
      [packageName]: {
        ...(catalogOverrides[packageName] || {}),
        ...partialOverride,
      },
    };
    await persistPythonToolsPatch({
      catalogOverrides: nextOverrides,
    });
  }

  async function addTaskToSelectedPackage() {
    if (!selectedPackage) return;
    const nextTask = newPackageTask.trim();
    if (!nextTask) return;

    const currentTasks = selectedPackage.sampleTasks || [];
    const alreadyExists = currentTasks.some((task) => task.trim().toLowerCase() === nextTask.toLowerCase());
    if (alreadyExists) {
      setCatalogActionMessage({
        tone: 'warn',
        text: `${selectedPackage.name} already includes that task.`,
      });
      return;
    }
    await persistCatalogOverride(selectedPackage.name, {
      sampleTasks: [...currentTasks, nextTask],
    });
    setNewPackageTask('');
    setShowTaskComposer(false);
    setCatalogActionMessage({
      tone: 'good',
      text: `Added a new task to ${selectedPackage.name}.`,
    });
  }

  async function addManualCatalogPackage() {
    const added = await upsertCatalogEntry({
      ...manualCatalogDraft,
      source: 'custom',
      sampleTasks: [],
      technicalProperties: [],
    });
    if (!added) return;
    setManualCatalogDraft({
      name: '',
      category: 'python',
      description: '',
      docsUrl: '',
      status: 'shortlisted',
    });
    setShowCatalogManualComposer(false);
  }

  async function importPackageFromPyPI() {
    const packageName = catalogImportName.trim();
    if (!packageName) return;
    setCatalogImportState({ loading: true, error: null });
    setCatalogImportDraft(null);
    try {
      const response = await fetch(`https://pypi.org/pypi/${encodeURIComponent(packageName)}/json`);
      if (!response.ok) {
        throw new Error(response.status === 404 ? 'Package not found on PyPI.' : 'Unable to reach PyPI right now.');
      }
      const payload = await response.json();
      const nextDraft = buildCatalogEntryFromPyPI(packageName, payload);
      setCatalogImportDraft(nextDraft);
      setCatalogImportState({ loading: false, error: null });
    } catch (error) {
      setCatalogImportState({ loading: false, error: error.message || 'Unable to import package metadata from PyPI.' });
    }
  }

  async function saveImportedCatalogPackage() {
    if (!catalogImportDraft) return;
    const added = await upsertCatalogEntry(catalogImportDraft);
    if (!added) return;
    setCatalogImportDraft(null);
    setCatalogImportName('');
    setShowCatalogImportComposer(false);
  }

  async function updateSelectedPackageStatus(nextStatus) {
    if (!selectedPackage) return;
    const normalizedStatus = normalizeCatalogStatus(nextStatus);
    if (normalizedStatus === normalizeCatalogStatus(selectedPackage.status)) return;
    await persistCatalogOverride(selectedPackage.name, {
      status: normalizedStatus,
    });
    setCatalogActionMessage({
      tone: 'good',
      text: `${selectedPackage.name} is now marked as ${getCatalogStatusMeta(normalizedStatus).label}.`,
    });
  }

  async function persistEnvironmentRegistry(nextRegistry, nextSelectedId = selectedEnvironmentId) {
    await persistPythonToolsPatch({
      environmentRegistry: nextRegistry,
      selectedEnvironmentId: nextSelectedId,
    });
  }

  async function selectEnvironmentManifest(environmentId) {
    if (!environmentId || environmentId === selectedEnvironmentId) return;
    await persistPythonToolsPatch({
      selectedEnvironmentId: environmentId,
    });
  }

  async function createEnvironmentManifestEntry() {
    const title = newEnvironmentDraft.title.trim();
    if (!title) return;
    const nextIdBase = slugifyEnvironmentId(title);
    if (!nextIdBase) return;
    let nextId = nextIdBase;
    let suffix = 2;
    const existingIds = new Set(environmentRegistry.map((environment) => environment.id));
    while (existingIds.has(nextId)) {
      nextId = `${nextIdBase}-${suffix}`;
      suffix += 1;
    }
    const nextEnvironment = {
      id: nextId,
      title,
      kind: 'secondary',
      manifestPath: `python-envs/${nextId}/pyproject.toml`,
      venvPath: `python-envs/${nextId}/.venv`,
      pythonVersion: newEnvironmentDraft.pythonVersion.trim() || pythonTools.pythonVersion || '3.12',
      purpose: newEnvironmentDraft.purpose.trim() || 'Specialized secondary environment.',
      assignedPackages: [],
    };
    await persistEnvironmentRegistry([...environmentRegistry, nextEnvironment], nextId);
    setNewEnvironmentDraft({
      title: '',
      purpose: '',
      pythonVersion: pythonTools.pythonVersion || '3.12',
    });
    setShowEnvironmentComposer(false);
    setEnvironmentActionMessage({
      tone: 'good',
      text: `${nextEnvironment.title} was added to the environment registry.`,
    });
  }

  function handleAssignmentPackageSelection(nextPackageName) {
    setAssignmentPackageName(nextPackageName);
    const matchedPackage = packageCatalog.find((pkg) => pkg.name.toLowerCase() === String(nextPackageName || '').trim().toLowerCase());
    setAssignmentInstallSpec(matchedPackage?.defaultInstallSpec || String(nextPackageName || '').trim());
  }

  async function assignPackageToEnvironmentManifest() {
    if (!selectedEnvironmentManifest) return;
    const normalizedPackageName = String(assignmentPackageName || selectedPackageName || packageCatalog[0]?.name || '').trim();
    if (!normalizedPackageName) return;
    const packageEntry = packageCatalog.find((pkg) => pkg.name.toLowerCase() === normalizedPackageName.toLowerCase());
    if (!packageEntry) {
      setEnvironmentActionMessage({
        tone: 'warn',
        text: 'Choose a package from the curated inventory before assigning it to a manifest.',
      });
      return;
    }
    const normalizedDependencySpec = String(assignmentInstallSpec || packageEntry.defaultInstallSpec || packageEntry.name).trim();
    if (!normalizedDependencySpec) {
      setEnvironmentActionMessage({
        tone: 'warn',
        text: 'Enter an install spec before assigning the package to a manifest.',
      });
      return;
    }
    const normalizedScope = assignmentScope === 'group' ? 'group' : 'base';
    const normalizedGroup = normalizedScope === 'group' ? assignmentGroup.trim() : '';
    if (normalizedScope === 'group' && !normalizedGroup) {
      setEnvironmentActionMessage({
        tone: 'warn',
        text: 'Enter a dependency group name when assigning a package to a group.',
      });
      return;
    }
    const duplicate = selectedEnvironmentManifest.assignedPackages.some((pkg) =>
      pkg.name.toLowerCase() === packageEntry.name.toLowerCase()
      && (pkg.dependencySpec || pkg.name) === normalizedDependencySpec
      && pkg.scope === normalizedScope
      && (pkg.group || '') === normalizedGroup
    );
    if (duplicate) {
      setEnvironmentActionMessage({
        tone: 'warn',
        text: `${normalizedDependencySpec} is already assigned to ${selectedEnvironmentManifest.title}.`,
      });
      return;
    }
    const nextRegistry = environmentRegistry.map((environment) => (
      environment.id === selectedEnvironmentManifest.id
        ? {
            ...environment,
            assignedPackages: [
              ...environment.assignedPackages,
              {
                name: packageEntry.name,
                dependencySpec: normalizedDependencySpec,
                scope: normalizedScope,
                group: normalizedGroup,
                state: environment.kind === 'primary' ? 'planned' : 'planned',
                source: 'inventory',
              },
            ],
          }
        : environment
    ));
    await persistEnvironmentRegistry(nextRegistry, selectedEnvironmentManifest.id);
    setAssignmentPackageName(packageEntry.name);
    setAssignmentInstallSpec(normalizedDependencySpec);
    setAssignmentGroup('');
    setEnvironmentActionMessage({
      tone: 'good',
      text: `${normalizedDependencySpec} was assigned to ${selectedEnvironmentManifest.title}.`,
    });
  }

  async function removeAssignedPackageFromManifest(packageName, dependencySpec, scope, group = '') {
    if (!selectedEnvironmentManifest) return;
    const nextRegistry = environmentRegistry.map((environment) => (
      environment.id === selectedEnvironmentManifest.id
        ? {
            ...environment,
            assignedPackages: environment.assignedPackages.filter((pkg) => !(
              pkg.name === packageName
              && (pkg.dependencySpec || pkg.name) === dependencySpec
              && pkg.scope === scope
              && (pkg.group || '') === (group || '')
            )),
          }
        : environment
    ));
    await persistEnvironmentRegistry(nextRegistry, selectedEnvironmentManifest.id);
    setEnvironmentActionMessage({
      tone: 'good',
      text: `${dependencySpec} was removed from ${selectedEnvironmentManifest.title}.`,
    });
  }

  function getRuntimeSnapshotBase() {
    return runtimeDataRef.current || pythonTools.runtimeSnapshot || {};
  }

  async function persistRuntimeSnapshot(snapshot) {
    const baseSnapshot = getRuntimeSnapshotBase();
    const nextSnapshot = {
      ...baseSnapshot,
      ...(snapshot || {}),
      manager: snapshot?.manager ?? baseSnapshot?.manager ?? null,
      python: snapshot?.python ?? baseSnapshot?.python ?? null,
      paths: snapshot?.paths ?? baseSnapshot?.paths ?? null,
      files: snapshot?.files ?? baseSnapshot?.files ?? null,
      dependencySummary: snapshot?.dependencySummary ?? baseSnapshot?.dependencySummary ?? null,
    };
    runtimeDataRef.current = nextSnapshot;
    updatePythonTools('runtimeSnapshot', nextSnapshot);
    try {
      await save({
        pythonTools: {
          runtimeSnapshot: nextSnapshot,
        },
      });
    } catch {}
  }

  async function commitRuntimeData(patch) {
    const nextData = {
      ...getRuntimeSnapshotBase(),
      ...(patch || {}),
    };
    const nextRuntime = {
      loading: false,
      data: nextData,
      error: null,
    };
    setRuntime(nextRuntime);
    runtimeDataRef.current = nextData;
    runtimeHydratedRef.current = true;
    await persistRuntimeSnapshot(nextData);
    return nextData;
  }

  async function openFolderForPath(targetPath) {
    if (!window.electronAPI?.revealPathInFolder) return;
    const candidate = String(targetPath || '').trim();
    if (!candidate || /^not available$/i.test(candidate)) return;
    try {
      await window.electronAPI.revealPathInFolder(candidate);
    } catch {}
  }

  async function openTerminalForPath(targetPath) {
    if (!window.electronAPI?.openTerminalAtPath) {
      setRuntime((currentRuntime) => ({
        ...currentRuntime,
        error: 'Open terminal bridge is unavailable.',
      }));
      return;
    }
    const candidate = String(targetPath || '').trim();
    if (!candidate || /^not available$/i.test(candidate)) return;
    try {
      const result = await window.electronAPI.openTerminalAtPath(candidate);
      if (!result?.ok) {
        setRuntime((currentRuntime) => ({
          ...currentRuntime,
          error: normalizeRuntimeProbeError(result?.error, 'terminal launch'),
        }));
      }
      await loadCommandLog();
    } catch (error) {
      setRuntime((currentRuntime) => ({
        ...currentRuntime,
        error: normalizeRuntimeProbeError(error.message, 'terminal launch'),
      }));
      await loadCommandLog();
    }
  }

  async function handleSave() {
    if (!dirty) return;
    setSaving(true);
    try {
      await save(draft || current);
      setDraft(null);
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setDraft(settings || SETTINGS_DEFAULT);
  }

  function requestTargetRuntimeSelection(runtimeOption) {
    if (!runtimeOption?.path) return;
    setPendingTargetRuntimePath(runtimeOption.path);
    setTargetRuntimeConfirmOpen(true);
  }

  function confirmTargetRuntimeSelection() {
    if (pendingTargetRuntimePath) {
      setSelectedRuntimePath(pendingTargetRuntimePath);
    }
    setTargetRuntimeConfirmOpen(false);
    setPendingTargetRuntimePath('');
  }

  async function loadProjectConfig() {
    if (!window.electronAPI?.readPythonProjectConfig) {
      setProjectConfig({ loading: false, data: null, error: 'Project config bridge is unavailable.' });
      return;
    }

    setProjectConfig((currentConfig) => ({ ...currentConfig, loading: true, error: null }));

    try {
      const result = await window.electronAPI.readPythonProjectConfig();
      if (!result?.ok) {
        setProjectConfig({ loading: false, data: null, error: result?.error || 'Unable to read pyproject.toml.' });
        return;
      }
      setProjectConfig({ loading: false, data: result.config, error: null });
    } catch (error) {
      setProjectConfig({ loading: false, data: null, error: error.message || 'Unable to read pyproject.toml.' });
    }
  }

  async function loadUvStatus() {
    if (!window.electronAPI?.pythonUvStatus) {
      setRuntime((currentRuntime) => ({ ...currentRuntime, error: 'UV runtime bridge is unavailable.' }));
      return;
    }

    setRuntimeLoading((current) => ({ ...current, uv: true }));
    setRuntime((currentRuntime) => ({ ...currentRuntime, error: null }));

    try {
      const status = await window.electronAPI.pythonUvStatus();
      if (!status?.ok) {
        setRuntime((currentRuntime) => ({ ...currentRuntime, error: status?.error || 'Unable to inspect the local uv installation.' }));
        await loadCommandLog();
        return;
      }
      await commitRuntimeData({
        manager: status.manager,
      });
      await loadCommandLog();
    } catch (error) {
      setRuntime((currentRuntime) => ({ ...currentRuntime, error: normalizeRuntimeProbeError(error.message, 'the local uv installation') }));
      await loadCommandLog();
    } finally {
      setRuntimeLoading((current) => ({ ...current, uv: false }));
    }
  }

  async function loadPythonStatus() {
    if (!window.electronAPI?.pythonStatus) {
      setRuntime((currentRuntime) => ({ ...currentRuntime, error: 'Python status bridge is unavailable.' }));
      return;
    }

    setRuntimeLoading((current) => ({ ...current, python: true }));
    setRuntime((currentRuntime) => ({ ...currentRuntime, error: null }));

    try {
      const status = await window.electronAPI.pythonStatus();
      if (!status?.ok) {
        setRuntime((currentRuntime) => ({ ...currentRuntime, error: status?.error || 'Unable to inspect the local Python runtime.' }));
        await loadCommandLog();
        return;
      }
      await commitRuntimeData({
        python: status.python,
        paths: status.paths,
        files: status.files,
        dependencySummary: status.dependencySummary,
      });
      await loadCommandLog();
    } catch (error) {
      setRuntime((currentRuntime) => ({ ...currentRuntime, error: normalizeRuntimeProbeError(error.message, 'the local Python runtime') }));
      await loadCommandLog();
    } finally {
      setRuntimeLoading((current) => ({ ...current, python: false }));
    }
  }

  async function loadVenvStatus() {
    if (!window.electronAPI?.pythonVenvStatus) {
      setRuntime((currentRuntime) => ({ ...currentRuntime, error: 'Virtual environment status bridge is unavailable.' }));
      return;
    }

    setRuntimeLoading((current) => ({ ...current, venv: true }));
    setRuntime((currentRuntime) => ({ ...currentRuntime, error: null }));

    try {
      const status = await window.electronAPI.pythonVenvStatus();
      if (!status?.ok) {
        setRuntime((currentRuntime) => ({ ...currentRuntime, error: status?.error || 'Unable to inspect the local virtual environment.' }));
        await loadCommandLog();
        return;
      }
      await commitRuntimeData({
        venv: {
          ...(getRuntimeSnapshotBase().venv || {}),
          ...status.venv,
        },
        paths: status.paths,
        files: status.files,
      });
      await loadCommandLog();
    } catch (error) {
      setRuntime((currentRuntime) => ({ ...currentRuntime, error: normalizeRuntimeProbeError(error.message, 'the local virtual environment') }));
      await loadCommandLog();
    } finally {
      setRuntimeLoading((current) => ({ ...current, venv: false }));
    }
  }

  async function loadAvailableRuntimes() {
    if (!window.electronAPI?.pythonAvailableRuntimes) {
      setRuntime((currentRuntime) => ({ ...currentRuntime, error: 'Python runtime discovery bridge is unavailable.' }));
      return;
    }

    setRuntimeLoading((current) => ({ ...current, availableRuntimes: true }));
    setRuntime((currentRuntime) => ({ ...currentRuntime, error: null }));

    try {
      const status = await window.electronAPI.pythonAvailableRuntimes();
      if (!status?.ok) {
        setRuntime((currentRuntime) => ({ ...currentRuntime, error: status?.error || 'Unable to discover available Python runtimes.' }));
        await loadCommandLog();
        return;
      }
      const currentPython = getRuntimeSnapshotBase().python || {};
      await commitRuntimeData({
        python: {
          ...currentPython,
          availableRuntimes: status.availableRuntimes,
        },
      });
      await loadCommandLog();
    } catch (error) {
      setRuntime((currentRuntime) => ({ ...currentRuntime, error: normalizeRuntimeProbeError(error.message, 'available Python runtimes') }));
      await loadCommandLog();
    } finally {
      setRuntimeLoading((current) => ({ ...current, availableRuntimes: false }));
    }
  }

  async function loadDependencySummary() {
    if (!window.electronAPI?.pythonDependencySummary) {
      setDepSummaryError('IPC bridge unavailable — try restarting the app.');
      return;
    }

    setRuntimeLoading((current) => ({ ...current, dependencies: true }));
    setDepSummaryError(null);

    try {
      const status = await window.electronAPI.pythonDependencySummary();
      if (!status?.ok) {
        setDepSummaryError(status?.error || 'Unable to inspect dependency summary.');
        return;
      }
      await commitRuntimeData({
        dependencySummary: status.dependencySummary,
        paths: status.paths,
        files: status.files,
      });
    } catch (error) {
      setDepSummaryError(normalizeRuntimeProbeError(error.message, 'dependency summary'));
    } finally {
      setRuntimeLoading((current) => ({ ...current, dependencies: false }));
    }
  }

  async function addDependency() {
    const spec = addDepInput.trim();
    if (!spec || !projectConfig.data) return;
    setAddDepSaving(true);
    setDepActionMsg(null);
    try {
      const current   = projectConfig.data;
      let newDeps     = [...(current.dependencies || [])];
      let newGroups   = { ...(current.groups || {}) };
      const pkgName   = spec.split(/[>=<!~^,; ]/)[0].toLowerCase();
      if (addDepGroup === 'base') {
        if (!newDeps.some(d => d.toLowerCase().startsWith(pkgName))) {
          newDeps = [...newDeps, spec];
        }
      } else {
        const existing = newGroups[addDepGroup] || [];
        if (!existing.some(d => d.toLowerCase().startsWith(pkgName))) {
          newGroups = { ...newGroups, [addDepGroup]: [...existing, spec] };
        }
      }
      const res = await window.electronAPI.writePythonProjectConfig({ dependencies: newDeps, groups: newGroups });
      if (res?.ok) {
        setProjectConfig(prev => ({ ...prev, data: res.config }));
        setAddDepInput('');
        setDepActionMsg({ text: `Added "${spec}" to ${addDepGroup === 'base' ? 'base dependencies' : `group: ${addDepGroup}`}. Run Sync to install.`, ok: true });
        loadDependencySummary();
      } else {
        setDepActionMsg({ text: res?.error || 'Failed to write pyproject.toml', ok: false });
      }
    } catch (e) {
      setDepActionMsg({ text: e.message, ok: false });
    } finally {
      setAddDepSaving(false);
    }
  }

  async function removeDependency(spec, group) {
    if (!projectConfig.data) return;
    setDepActionMsg(null);
    try {
      const current   = projectConfig.data;
      let newDeps     = [...(current.dependencies || [])];
      let newGroups   = { ...(current.groups || {}) };
      if (!group || group === 'base') {
        newDeps = newDeps.filter(d => d !== spec);
      } else {
        newGroups = { ...newGroups, [group]: (newGroups[group] || []).filter(d => d !== spec) };
      }
      const res = await window.electronAPI.writePythonProjectConfig({ dependencies: newDeps, groups: newGroups });
      if (res?.ok) {
        setProjectConfig(prev => ({ ...prev, data: res.config }));
        setDepActionMsg({ text: `Removed "${spec}". Run Sync to uninstall from venv.`, ok: true });
        loadDependencySummary();
      } else {
        setDepActionMsg({ text: res?.error || 'Failed to write pyproject.toml', ok: false });
      }
    } catch (e) {
      setDepActionMsg({ text: e.message, ok: false });
    }
  }

  async function saveRequiresPython() {
    const value = requiresPythonDraft.trim();
    if (!value || !projectConfig.data) return;
    setRequiresPythonSaving(true);
    setDepActionMsg(null);
    try {
      const res = await window.electronAPI.writePythonProjectConfig({
        metadata: { ...projectConfig.data.metadata, requiresPython: value },
      });
      if (res?.ok) {
        setProjectConfig(prev => ({ ...prev, data: res.config }));
        setDepActionMsg({ text: `requires-python updated to ${value}.`, ok: true });
      } else {
        setDepActionMsg({ text: res?.error || 'Failed to write pyproject.toml', ok: false });
      }
    } catch (e) {
      setDepActionMsg({ text: e.message, ok: false });
    } finally {
      setRequiresPythonSaving(false);
    }
  }

  async function createGroup() {
    const name = newGroupName.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-');
    if (!name || !projectConfig.data) return;
    if (projectConfig.data.groups?.[name] !== undefined) {
      setDepActionMsg({ text: `Group "${name}" already exists.`, ok: false });
      return;
    }
    setNewGroupSaving(true);
    setDepActionMsg(null);
    try {
      const res = await window.electronAPI.writePythonProjectConfig({
        groups: { ...(projectConfig.data.groups || {}), [name]: [] },
      });
      if (res?.ok) {
        setProjectConfig(prev => ({ ...prev, data: res.config }));
        setNewGroupName('');
        setAddDepGroup(name);
        setDepActionMsg({ text: `Created group "${name}". You can now add packages to it.`, ok: true });
      } else {
        setDepActionMsg({ text: res?.error || 'Failed to write pyproject.toml', ok: false });
      }
    } catch (e) {
      setDepActionMsg({ text: e.message, ok: false });
    } finally {
      setNewGroupSaving(false);
    }
  }

  async function deleteGroup(groupName) {
    if (!groupName || !projectConfig.data) return;
    const specs = projectConfig.data.groups?.[groupName] || [];
    if (specs.length > 0) {
      const confirmed = window.confirm(`Delete group "${groupName}"? It still has ${specs.length} package${specs.length > 1 ? 's' : ''} declared. They will be removed from pyproject.toml.`);
      if (!confirmed) return;
    }
    setDepActionMsg(null);
    try {
      const nextGroups = { ...(projectConfig.data.groups || {}) };
      delete nextGroups[groupName];
      const res = await window.electronAPI.writePythonProjectConfig({ groups: nextGroups });
      if (res?.ok) {
        setProjectConfig(prev => ({ ...prev, data: res.config }));
        if (addDepGroup === groupName) setAddDepGroup('base');
        setDepActionMsg({ text: `Deleted group "${groupName}".`, ok: true });
        loadDependencySummary();
      } else {
        setDepActionMsg({ text: res?.error || 'Failed to write pyproject.toml', ok: false });
      }
    } catch (e) {
      setDepActionMsg({ text: e.message, ok: false });
    }
  }

  async function addCatalogPackageToPyproject() {
    const spec = catalogAddSpec.trim();
    if (!spec || !projectConfig.data) return;
    setCatalogAddSaving(true);
    setCatalogAddMsg(null);
    try {
      const current = projectConfig.data;
      const pkgName = spec.split(/[>=<!~^,; ]/)[0].toLowerCase();
      let newDeps = [...(current.dependencies || [])];
      let newGroups = { ...(current.groups || {}) };
      if (catalogAddGroup === 'base') {
        if (newDeps.some(d => d.toLowerCase().startsWith(pkgName))) {
          setCatalogAddMsg({ ok: false, text: `${pkgName} is already in base dependencies.` });
          return;
        }
        newDeps = [...newDeps, spec];
      } else {
        const existing = newGroups[catalogAddGroup] || [];
        if (existing.some(d => d.toLowerCase().startsWith(pkgName))) {
          setCatalogAddMsg({ ok: false, text: `${pkgName} is already in group: ${catalogAddGroup}.` });
          return;
        }
        newGroups = { ...newGroups, [catalogAddGroup]: [...existing, spec] };
      }
      const res = await window.electronAPI.writePythonProjectConfig({ dependencies: newDeps, groups: newGroups });
      if (res?.ok) {
        setProjectConfig(prev => ({ ...prev, data: res.config }));
        setCatalogAddMsg({ ok: true, text: `Added to ${catalogAddGroup === 'base' ? 'base dependencies' : `group: ${catalogAddGroup}`}. Run Sync to install.` });
        loadDependencySummary();
      } else {
        setCatalogAddMsg({ ok: false, text: res?.error || 'Failed to write pyproject.toml' });
      }
    } catch (e) {
      setCatalogAddMsg({ ok: false, text: e.message });
    } finally {
      setCatalogAddSaving(false);
    }
  }

  async function createPyprojectToml() {
    setCreatePyprojectSaving(true);
    setCatalogAddMsg(null);
    try {
      const res = await window.electronAPI.writePythonProjectConfig({});
      if (res?.ok) {
        setProjectConfig({ loading: false, data: res.config, error: null });
        setCatalogAddMsg({ ok: true, text: 'pyproject.toml created. You can now add packages.' });
        loadDependencySummary();
      } else {
        setCatalogAddMsg({ ok: false, text: res?.error || 'Failed to create pyproject.toml' });
      }
    } catch (e) {
      setCatalogAddMsg({ ok: false, text: e.message });
    } finally {
      setCreatePyprojectSaving(false);
    }
  }

  async function createVirtualEnvironment(overrideRuntimePath) {
    if (!window.electronAPI?.createPythonVenv) {
      setRuntime((currentRuntime) => ({ ...currentRuntime, error: 'Virtual environment creation bridge is unavailable.' }));
      return;
    }

    setRuntimeLoading((current) => ({ ...current, createVenv: true }));
    setRuntime((currentRuntime) => ({ ...currentRuntime, error: null }));

    try {
      const pathToUse = overrideRuntimePath !== undefined ? overrideRuntimePath : selectedRuntimePath;
      const selectedRuntime = (getRuntimeSnapshotBase().python?.availableRuntimes?.runtimes || [])
        .find((runtime) => runtime.path === pathToUse);
      const status = await window.electronAPI.createPythonVenv(
        selectedRuntime?.path
          ? { runtimePath: selectedRuntime.path, runtimeVersion: selectedRuntime.version || null }
          : undefined
      );
      if (!status?.ok) {
        setRuntime((currentRuntime) => ({ ...currentRuntime, error: normalizeRuntimeProbeError(status?.error, 'virtual environment creation') }));
        await loadCommandLog();
        return;
      }
      await commitRuntimeData({
        venv: {
          ...(getRuntimeSnapshotBase().venv || {}),
          ...status.venv,
        },
        paths: status.paths,
        files: status.files,
      });
      await loadPythonStatus();
      await loadCommandLog();
    } catch (error) {
      setRuntime((currentRuntime) => ({ ...currentRuntime, error: normalizeRuntimeProbeError(error.message, 'virtual environment creation') }));
      await loadCommandLog();
    } finally {
      setRuntimeLoading((current) => ({ ...current, createVenv: false }));
    }
  }

  async function rebuildVirtualEnvironment(overrideRuntimePath) {
    if (!window.electronAPI?.rebuildPythonVenv) {
      setRuntime((currentRuntime) => ({ ...currentRuntime, error: 'Virtual environment rebuild bridge is unavailable.' }));
      return;
    }

    setRuntimeLoading((current) => ({ ...current, rebuildVenv: true }));
    setRuntime((currentRuntime) => ({ ...currentRuntime, error: null }));

    try {
      const pathToUse = overrideRuntimePath !== undefined ? overrideRuntimePath : selectedRuntimePath;
      const selectedRuntime = (getRuntimeSnapshotBase().python?.availableRuntimes?.runtimes || [])
        .find((runtime) => runtime.path === pathToUse);
      const status = await window.electronAPI.rebuildPythonVenv(
        selectedRuntime?.path
          ? { runtimePath: selectedRuntime.path, runtimeVersion: selectedRuntime.version || null }
          : undefined
      );
      if (!status?.ok) {
        setRuntime((currentRuntime) => ({ ...currentRuntime, error: normalizeRuntimeProbeError(status?.error, 'virtual environment rebuild') }));
        await loadCommandLog();
        return;
      }
      await commitRuntimeData({
        venv: {
          ...(getRuntimeSnapshotBase().venv || {}),
          ...status.venv,
        },
        paths: status.paths,
        files: status.files,
      });
      await loadPythonStatus();
      await loadCommandLog();
    } catch (error) {
      setRuntime((currentRuntime) => ({ ...currentRuntime, error: normalizeRuntimeProbeError(error.message, 'virtual environment rebuild') }));
      await loadCommandLog();
    } finally {
      setRuntimeLoading((current) => ({ ...current, rebuildVenv: false }));
    }
  }

  function requestCreateVirtualEnvironment() {
    if (!window.electronAPI?.createPythonVenv) {
      setRuntime((currentRuntime) => ({ ...currentRuntime, error: 'Virtual environment creation bridge is unavailable.' }));
      return;
    }
    setCreateModalRuntimePath(selectedRuntimePath);
    setCreateVenvConfirmOpen(true);
  }

  async function confirmCreateVirtualEnvironment() {
    setCreateVenvConfirmOpen(false);
    await createVirtualEnvironment(createModalRuntimePath);
  }

  function requestRebuildVirtualEnvironment() {
    if (!window.electronAPI?.rebuildPythonVenv) {
      setRuntime((currentRuntime) => ({ ...currentRuntime, error: 'Virtual environment rebuild bridge is unavailable.' }));
      return;
    }
    setRebuildModalRuntimePath(selectedRuntimePath);
    setRebuildVenvConfirmOpen(true);
  }

  async function confirmRebuildVirtualEnvironment() {
    setRebuildVenvConfirmOpen(false);
    await rebuildVirtualEnvironment(rebuildModalRuntimePath);
  }

  function requestSyncVirtualEnvironment() {
    if (!window.electronAPI?.syncPythonVenv) {
      setRuntime((currentRuntime) => ({ ...currentRuntime, error: 'Virtual environment sync bridge is unavailable.' }));
      return;
    }
    setSyncVenvConfirmOpen(true);
  }

  async function confirmSyncVirtualEnvironment() {
    setSyncVenvConfirmOpen(false);
    await syncVirtualEnvironment();
  }

  async function syncVirtualEnvironment() {
    if (!window.electronAPI?.syncPythonVenv) {
      setRuntime((currentRuntime) => ({ ...currentRuntime, error: 'Virtual environment sync bridge is unavailable.' }));
      return;
    }

    setRuntimeLoading((current) => ({ ...current, syncVenv: true }));
    setRuntime((currentRuntime) => ({ ...currentRuntime, error: null }));

    try {
      const status = await window.electronAPI.syncPythonVenv();
      if (!status?.ok) {
        setRuntime((currentRuntime) => ({ ...currentRuntime, error: normalizeRuntimeProbeError(status?.error, 'virtual environment sync') }));
        await loadCommandLog();
        return;
      }
      await commitRuntimeData({
        venv: {
          ...(getRuntimeSnapshotBase().venv || {}),
          ...status.venv,
        },
        paths: status.paths,
        files: status.files,
      });
      await loadPythonStatus();
      await loadDependencySummary();
      await loadCommandLog();
    } catch (error) {
      setRuntime((currentRuntime) => ({ ...currentRuntime, error: normalizeRuntimeProbeError(error.message, 'virtual environment sync') }));
      await loadCommandLog();
    } finally {
      setRuntimeLoading((current) => ({ ...current, syncVenv: false }));
    }
  }

  async function deleteVirtualEnvironment() {
    if (!window.electronAPI?.deletePythonVenv) {
      setRuntime((currentRuntime) => ({ ...currentRuntime, error: 'Virtual environment delete bridge is unavailable.' }));
      return;
    }
    setDeleteVenvConfirmOpen(true);
  }

  async function confirmDeleteVirtualEnvironment() {
    if (!window.electronAPI?.deletePythonVenv) {
      setRuntime((currentRuntime) => ({ ...currentRuntime, error: 'Virtual environment delete bridge is unavailable.' }));
      return;
    }

    setRuntimeLoading((current) => ({ ...current, deleteVenv: true }));
    setRuntime((currentRuntime) => ({ ...currentRuntime, error: null }));
    setDeleteVenvConfirmOpen(false);

    try {
      const status = await window.electronAPI.deletePythonVenv();
      if (!status?.ok) {
        setRuntime((currentRuntime) => ({ ...currentRuntime, error: normalizeRuntimeProbeError(status?.error, 'virtual environment deletion') }));
        await loadCommandLog();
        return;
      }
      await commitRuntimeData({
        venv: {
          ...(getRuntimeSnapshotBase().venv || {}),
          ...status.venv,
        },
        paths: status.paths,
        files: status.files,
      });
      await loadPythonStatus();
      await loadCommandLog();
    } catch (error) {
      setRuntime((currentRuntime) => ({ ...currentRuntime, error: normalizeRuntimeProbeError(error.message, 'virtual environment deletion') }));
      await loadCommandLog();
    } finally {
      setRuntimeLoading((current) => ({ ...current, deleteVenv: false }));
    }
  }

  async function loadCommandLog() {
    if (!window.electronAPI?.readPythonCommandLog) {
      setCommandLog({ loading: false, entries: [], error: 'Command log bridge is unavailable.' });
      return;
    }

    setCommandLog((currentLog) => ({ ...currentLog, loading: true, error: null }));

    try {
      const result = await window.electronAPI.readPythonCommandLog();
      if (!result?.ok) {
        setCommandLog({ loading: false, entries: [], error: normalizeCommandLogError(result?.error) });
        return;
      }
      const entries = Array.isArray(result.entries) ? result.entries : [];
      setCommandLog({ loading: false, entries, error: null });
    } catch (error) {
      setCommandLog({ loading: false, entries: [], error: normalizeCommandLogError(error.message) });
    }
  }

  function toggleEntry(id) {
    setExpandedEntries((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  useEffect(() => {
    loadProjectConfig();
    loadCommandLog();
  }, []);

  useEffect(() => {
    if (loading || runtimeHydratedRef.current || runtime.data || runtime.error) return;
    const snapshot = pythonTools.runtimeSnapshot;
    if (!snapshot) return;
    setRuntime({ loading: false, data: snapshot, error: null });
    runtimeDataRef.current = snapshot;
    runtimeHydratedRef.current = true;
  }, [loading, pythonTools.runtimeSnapshot, runtime.data, runtime.error]);

  useEffect(() => {
    if (!runtime.data) return;
    runtimeDataRef.current = runtime.data;
  }, [runtime.data]);

  useEffect(() => {
    const runtimeOptions = Array.isArray(runtime.data?.python?.availableRuntimes?.runtimes)
      ? runtime.data.python.availableRuntimes.runtimes.filter((runtime) => runtime?.path && runtime.ok !== false)
      : [];
    if (!runtimeOptions.length) {
      if (selectedRuntimePath) setSelectedRuntimePath('');
      return;
    }
    const selectionStillExists = runtimeOptions.some((runtime) => runtime.path === selectedRuntimePath);
    if (selectionStillExists) return;
    const defaultRuntime = runtime.data?.python?.availableRuntimes?.defaultRuntime;
    setSelectedRuntimePath(defaultRuntime?.path || runtimeOptions[0].path);
  }, [runtime.data?.python?.availableRuntimes, selectedRuntimePath]);

  async function refreshAllRuntimeStatus() {
    await loadUvStatus();
    await loadPythonStatus();
    await loadVenvStatus();
    await loadDependencySummary();
  }

  async function checkPythonRuntimes() {
    await loadPythonStatus();
  }

  async function runCommand(command) {
    if (!window.electronAPI?.runPythonToolCommand || runState.running) return;

    setTerminalCollapsed(false);
    setTerminalTab('output');
    setRunState({
      running: true,
      command,
      result: null,
    });

    try {
      const result = await window.electronAPI.runPythonToolCommand({ command });
      setRunState({
        running: false,
        command,
        result,
      });
      await refreshAllRuntimeStatus();
      await loadProjectConfig();
      await loadCommandLog();
    } catch (error) {
      setRunState({
        running: false,
        command,
        result: {
          ok: false,
          code: -1,
          command,
          stdout: '',
          stderr: error.message || 'Command failed.',
          durationMs: 0,
        },
      });
    }
  }

  async function clearCommandLog() {
    if (!window.electronAPI?.clearPythonCommandLog) return;
    const result = await window.electronAPI.clearPythonCommandLog();
    if (!result?.ok) return;
    await loadCommandLog();
  }

  useEffect(() => {
    if (terminalBodyRef.current) {
      terminalBodyRef.current.scrollTop = terminalBodyRef.current.scrollHeight;
    }
  }, [terminalTranscript]);

  async function copyTerminalText(value) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
    } catch {}
  }

  function beginTerminalResize(event) {
    if (terminalCollapsed) return;
    event.preventDefault();
    const startY = event.clientY;
    const startHeight = terminalHeight;

    function onMove(moveEvent) {
      const delta = startY - moveEvent.clientY;
      const maxHeight = Math.max(220, Math.floor(window.innerHeight * 0.65));
      const nextHeight = Math.min(maxHeight, Math.max(140, startHeight + delta));
      setTerminalHeight(nextHeight);
    }

    function onUp() {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  function RuntimeTile({ label, value, hint, tone = 'default' }) {
    const color = tone === 'good' ? '#4ade80' : tone === 'warn' ? '#fbbf24' : tone === 'danger' ? '#f87171' : 'var(--text)';
    return (
      <div style={{ border: '1px solid var(--border)', borderRadius: 14, background: 'rgba(10,15,26,0.52)', padding: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
          {label}
        </div>
        <div style={{ fontSize: 16, fontWeight: 800, color }}>{value}</div>
        {hint ? <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{hint}</div> : null}
      </div>
    );
  }

  function renderPackageCatalogWorkbench() {
    const catalogAccent = '#4ade80';
    const visibleCategoryCount = new Set(filteredPackageCatalog.map((pkg) => pkg.category)).size;
    const selectedPackagePypiUrl = selectedPackage ? `https://pypi.org/project/${selectedPackage.name}/` : '';
    const selectedPackageDocsUrl = selectedPackage?.docsUrl || '';
    const selectedTechnicalProperties = selectedPackage?.technicalProperties || [];
    const selectedPackageStatusMeta = getCatalogStatusMeta(selectedPackage?.status);
    const catalogAddPkgName = catalogAddSpec.split(/[>=<!~^,; ]/)[0].toLowerCase();
    const catalogPackageAlreadyDeclared = !!selectedPackage && !!projectConfig.data && (
      (projectConfig.data.dependencies || []).some(d => d.toLowerCase().startsWith(catalogAddPkgName)) ||
      Object.values(projectConfig.data.groups || {}).flat().some(d => d.toLowerCase().startsWith(catalogAddPkgName))
    );
    const filteredSelectedTasks = selectedPackage
      ? selectedPackage.sampleTasks.filter((task) => task.toLowerCase().includes(taskSearch.trim().toLowerCase()))
      : [];

    return (
      <Section
        title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#4ade80' }}><Boxes size={16} /> Package Catalog</span>}
        description="Curated reference packages the app can use. This catalog is for discovery, comparison, and understanding rather than reflecting what is currently installed in the environment."
      >
        <div style={{ display: 'flex', flexDirection: 'column', height: '72vh', minHeight: 620, overflow: 'hidden' }}>
          <div style={{ flexShrink: 0, display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: 280 }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                value={packageSearch}
                onChange={(event) => setPackageSearch(event.target.value)}
                placeholder="Search packages..."
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  color: 'var(--text)',
                  fontSize: 12,
                  padding: '7px 12px 7px 32px',
                  outline: 'none',
                }}
              />
            </div>
            <select
              value={packageCategory}
              onChange={(event) => setPackageCategory(event.target.value)}
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: 12, padding: '7px 10px', outline: 'none', cursor: 'pointer' }}
            >
              {PYTHON_PACKAGE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category === 'all' ? 'All categories' : category}
                </option>
              ))}
            </select>
            <select
              value={packageTaskType}
              onChange={(event) => setPackageTaskType(event.target.value)}
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: 12, padding: '7px 10px', outline: 'none', cursor: 'pointer' }}
            >
              {PACKAGE_TASK_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option === 'all' ? 'All task types' : option}
                </option>
              ))}
            </select>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                type="button"
                style={{ background: 'var(--primary)', border: 'none', borderRadius: 6, color: '#fff', fontSize: 12, padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, boxShadow: '0 4px 12px rgba(91, 154, 255, 0.2)', cursor: 'default' }}
              >
                <BarChart2 size={14} /> Categories
              </button>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)' }}>
                {filteredPackageCatalog.length}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowCatalogManualComposer((prev) => !prev);
                setShowCatalogImportComposer(false);
                setCatalogActionMessage(null);
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, border: '1px solid rgba(74,222,128,0.18)', background: showCatalogManualComposer ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.03)', color: showCatalogManualComposer ? catalogAccent : 'var(--text-secondary)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
            >
              <Plus size={13} /> Add package
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCatalogImportComposer((prev) => !prev);
                setShowCatalogManualComposer(false);
                setCatalogActionMessage(null);
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, border: '1px solid rgba(91,154,255,0.18)', background: showCatalogImportComposer ? 'rgba(91,154,255,0.12)' : 'rgba(255,255,255,0.03)', color: showCatalogImportComposer ? '#8bb6ff' : 'var(--text-secondary)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
            >
              <ExternalLink size={13} /> Import from PyPI
            </button>
            <a
              href="https://pypi.org/search/"
              target="_blank"
              rel="noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}
            >
              <ExternalLink size={13} /> Browse PyPI
            </a>
            <button
              type="button"
              disabled={!selectedPackage}
              onClick={() => {
                if (!selectedPackage) return;
                navigator.clipboard.writeText(selectedPackage.name);
              }}
              style={{ background: '#4ade80', border: 'none', borderRadius: 6, color: '#0f172a', fontSize: 12, padding: '7px 16px', cursor: selectedPackage ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, marginLeft: 'auto', opacity: selectedPackage ? 1 : 0.5 }}
            >
              <Copy size={15} /> Copy package name
            </button>
          </div>
          {catalogActionMessage ? (
            <div
              style={{
                flexShrink: 0,
                marginBottom: 14,
                padding: '10px 12px',
                borderRadius: 10,
                border: `1px solid ${catalogActionMessage.tone === 'warn' ? 'rgba(251,191,36,0.18)' : 'rgba(74,222,128,0.18)'}`,
                background: catalogActionMessage.tone === 'warn' ? 'rgba(251,191,36,0.08)' : 'rgba(74,222,128,0.08)',
                color: catalogActionMessage.tone === 'warn' ? '#fbbf24' : '#86efac',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {catalogActionMessage.text}
            </div>
          ) : null}
          {showCatalogManualComposer ? (
            <div style={{ flexShrink: 0, marginBottom: 14, padding: '14px 16px', borderRadius: 12, border: '1px solid rgba(74,222,128,0.14)', background: 'rgba(74,222,128,0.04)', display: 'grid', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: catalogAccent, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Add Reference Package
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                  Curated app catalog entry, not an installed-package record.
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 0.9fr) minmax(160px, 0.7fr) minmax(160px, 0.7fr)', gap: 10 }}>
                <input
                  value={manualCatalogDraft.name}
                  onChange={(event) => setManualCatalogDraft((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Package name"
                  style={{ ...inputStyle, padding: '8px 10px', fontSize: 12, background: 'rgba(255,255,255,0.03)' }}
                />
                <select
                  value={manualCatalogDraft.category}
                  onChange={(event) => setManualCatalogDraft((prev) => ({ ...prev, category: event.target.value }))}
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 12, padding: '8px 10px', outline: 'none', cursor: 'pointer' }}
                >
                  {PYTHON_PACKAGE_CATEGORIES.filter((category) => category !== 'all').map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                <select
                  value={manualCatalogDraft.status}
                  onChange={(event) => setManualCatalogDraft((prev) => ({ ...prev, status: event.target.value }))}
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 12, padding: '8px 10px', outline: 'none', cursor: 'pointer' }}
                >
                  {PACKAGE_CATALOG_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>{getCatalogStatusMeta(status).label}</option>
                  ))}
                </select>
              </div>
              <input
                value={manualCatalogDraft.docsUrl}
                onChange={(event) => setManualCatalogDraft((prev) => ({ ...prev, docsUrl: event.target.value }))}
                placeholder="Documentation URL (optional)"
                style={{ ...inputStyle, padding: '8px 10px', fontSize: 12, background: 'rgba(255,255,255,0.03)' }}
              />
              <textarea
                value={manualCatalogDraft.description}
                onChange={(event) => setManualCatalogDraft((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Short description for why this package matters in the app..."
                rows={3}
                style={{ ...inputStyle, resize: 'vertical', padding: '10px 12px', fontSize: 12, background: 'rgba(255,255,255,0.03)' }}
              />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={addManualCatalogPackage}
                  disabled={!manualCatalogDraft.name.trim() || !manualCatalogDraft.description.trim()}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(74,222,128,0.18)', background: manualCatalogDraft.name.trim() && manualCatalogDraft.description.trim() ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.03)', color: manualCatalogDraft.name.trim() && manualCatalogDraft.description.trim() ? catalogAccent : 'var(--text-muted)', fontSize: 12, fontWeight: 700, cursor: manualCatalogDraft.name.trim() && manualCatalogDraft.description.trim() ? 'pointer' : 'not-allowed' }}
                >
                  <Plus size={13} /> Save package
                </button>
                <button
                  type="button"
                  onClick={() => setShowCatalogManualComposer(false)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                >
                  <XCircle size={13} /> Cancel
                </button>
              </div>
            </div>
          ) : null}
          {showCatalogImportComposer ? (
            <div style={{ flexShrink: 0, marginBottom: 14, padding: '14px 16px', borderRadius: 12, border: '1px solid rgba(91,154,255,0.14)', background: 'rgba(91,154,255,0.05)', display: 'grid', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#8bb6ff', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Import From PyPI
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                  Fetch metadata from the official PyPI API, review it, then add the package to the curated catalog.
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input
                  value={catalogImportName}
                  onChange={(event) => setCatalogImportName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      importPackageFromPyPI();
                    }
                  }}
                  placeholder="Enter a PyPI package name"
                  style={{ ...inputStyle, flex: 1, minWidth: 260, padding: '8px 10px', fontSize: 12, background: 'rgba(255,255,255,0.03)' }}
                />
                <button
                  type="button"
                  onClick={importPackageFromPyPI}
                  disabled={!catalogImportName.trim() || catalogImportState.loading}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(91,154,255,0.18)', background: catalogImportName.trim() ? 'rgba(91,154,255,0.12)' : 'rgba(255,255,255,0.03)', color: catalogImportName.trim() ? '#8bb6ff' : 'var(--text-muted)', fontSize: 12, fontWeight: 700, cursor: catalogImportName.trim() ? 'pointer' : 'not-allowed' }}
                >
                  <ExternalLink size={13} />
                  {catalogImportState.loading ? 'Importing...' : 'Fetch metadata'}
                </button>
              </div>
              {catalogImportState.error ? (
                <div style={{ fontSize: 12, color: '#fbbf24' }}>
                  {catalogImportState.error}
                </div>
              ) : null}
              {catalogImportDraft ? (
                <div style={{ display: 'grid', gap: 10, padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(91,154,255,0.14)', background: 'rgba(10,15,26,0.3)' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#8bb6ff', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Review imported package
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 0.9fr) minmax(160px, 0.7fr) minmax(160px, 0.7fr)', gap: 10 }}>
                    <input
                      value={catalogImportDraft.name}
                      onChange={(event) => setCatalogImportDraft((prev) => ({ ...prev, name: event.target.value }))}
                      placeholder="Package name"
                      style={{ ...inputStyle, padding: '8px 10px', fontSize: 12, background: 'rgba(255,255,255,0.03)' }}
                    />
                    <select
                      value={catalogImportDraft.category}
                      onChange={(event) => setCatalogImportDraft((prev) => ({ ...prev, category: event.target.value }))}
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 12, padding: '8px 10px', outline: 'none', cursor: 'pointer' }}
                    >
                      {PYTHON_PACKAGE_CATEGORIES.filter((category) => category !== 'all').map((category) => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                    <select
                      value={catalogImportDraft.status}
                      onChange={(event) => setCatalogImportDraft((prev) => ({ ...prev, status: event.target.value }))}
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 12, padding: '8px 10px', outline: 'none', cursor: 'pointer' }}
                    >
                      {PACKAGE_CATALOG_STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>{getCatalogStatusMeta(status).label}</option>
                      ))}
                    </select>
                  </div>
                  <input
                    value={catalogImportDraft.docsUrl}
                    onChange={(event) => setCatalogImportDraft((prev) => ({ ...prev, docsUrl: event.target.value }))}
                    placeholder="Documentation URL"
                    style={{ ...inputStyle, padding: '8px 10px', fontSize: 12, background: 'rgba(255,255,255,0.03)' }}
                  />
                  <textarea
                    value={catalogImportDraft.description}
                    onChange={(event) => setCatalogImportDraft((prev) => ({ ...prev, description: event.target.value }))}
                    rows={3}
                    style={{ ...inputStyle, resize: 'vertical', padding: '10px 12px', fontSize: 12, background: 'rgba(255,255,255,0.03)' }}
                  />
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={saveImportedCatalogPackage}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(91,154,255,0.18)', background: 'rgba(91,154,255,0.12)', color: '#8bb6ff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                    >
                      <Plus size={13} /> Add to catalog
                    </button>
                    <button
                      type="button"
                      onClick={() => setCatalogImportDraft(null)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                    >
                      <XCircle size={13} /> Clear
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <div style={{ display: 'flex', flex: 1, gap: 16, overflow: 'hidden', padding: '2px 0 0 0' }}>
            <div
              className="custom-scrollbar"
              style={{ width: 500, flexShrink: 0, overflowY: 'auto', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 8, boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}
            >
              <div style={{ padding: '4px 4px 6px', display: 'grid', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: catalogAccent, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Reference Inventory
                    </div>
                    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                      <button
                        type="button"
                        title="Curated packages available for app modules and tooling. This list is independent from the installed-package inspection in the main environment tab."
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 999,
                          border: '1px solid rgba(74,222,128,0.16)',
                          background: 'rgba(74,222,128,0.08)',
                          color: catalogAccent,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 11,
                          fontWeight: 800,
                          cursor: 'help',
                          padding: 0,
                          lineHeight: 1,
                        }}
                      >
                        ?
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, border: '1px solid rgba(74,222,128,0.16)', background: 'rgba(74,222,128,0.08)', color: catalogAccent, letterSpacing: '0.04em' }}>
                      {filteredPackageCatalog.length} visible
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-secondary)', letterSpacing: '0.04em' }}>
                      {visibleCategoryCount} categories
                    </span>
                  </div>
                </div>
              </div>

              {filteredPackageCatalog.length > 0 ? (
                <div style={{ border: '1px solid rgba(74,222,128,0.14)', borderRadius: 12, background: 'rgba(74,222,128,0.04)', overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(150px, 1.1fr) 118px 118px 68px', gap: 0, flexShrink: 0 }}>
                    {[
                      { key: 'package', label: 'Package' },
                      { key: 'status', label: 'Status' },
                      { key: 'category', label: 'Category' },
                      { key: 'tasks', label: 'Tasks', align: 'right' },
                    ].map((column) => (
                      <div
                        key={column.key}
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          color: catalogAccent,
                          padding: '8px 12px',
                          borderBottom: '1px solid rgba(74,222,128,0.14)',
                          background: 'rgba(10,20,14,0.35)',
                          textAlign: column.align || 'left',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {column.label}
                      </div>
                    ))}
                  </div>

                  <div className="custom-scrollbar" style={{ overflowY: 'auto', minHeight: 0, flex: 1 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(150px, 1.1fr) 118px 118px 68px', gap: 0 }}>
                      {filteredPackageCatalog.map((pkg, idx) => {
                      const active = selectedPackage?.name === pkg.name;
                      const statusMeta = getCatalogStatusMeta(pkg.status);
                      const rowBg = active
                        ? 'rgba(91,154,255,0.08)'
                        : idx % 2 === 1
                          ? 'rgba(74,222,128,0.03)'
                          : 'transparent';
                      const rowBorder = active ? 'rgba(91,154,255,0.14)' : 'rgba(74,222,128,0.08)';
                      const cell = {
                        background: rowBg,
                        borderBottom: `1px solid ${rowBorder}`,
                        padding: '8px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        minWidth: 0,
                        cursor: 'pointer',
                      };

                      return (
                        <div key={pkg.name} style={{ display: 'contents' }}>
                          <div
                            onClick={() => setSelectedPackageName(pkg.name)}
                            style={{ ...cell, gap: 8 }}
                            title={pkg.name}
                          >
                            <Boxes size={11} style={{ color: catalogAccent, flexShrink: 0, opacity: 0.9 }} />
                            <span style={{ fontSize: 12, fontWeight: 700, color: active ? '#fff' : 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {pkg.name}
                            </span>
                          </div>
                          <div onClick={() => setSelectedPackageName(pkg.name)} style={{ ...cell }}>
                            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 999, border: `1px solid ${statusMeta.border}`, background: statusMeta.background, color: statusMeta.color, textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: 1.2, whiteSpace: 'nowrap' }}>
                              {statusMeta.label}
                            </span>
                          </div>
                          <div onClick={() => setSelectedPackageName(pkg.name)} style={{ ...cell }}>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: active ? 'rgba(91,154,255,0.16)' : 'rgba(91,154,255,0.12)', color: '#8bb6ff', textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: 1.2, whiteSpace: 'nowrap' }}>
                              {pkg.category}
                            </span>
                          </div>
                          <div onClick={() => setSelectedPackageName(pkg.name)} style={{ ...cell, justifyContent: 'flex-end' }}>
                            <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)', color: active ? '#fff' : 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                              {pkg.sampleTasks.length}
                            </span>
                          </div>
                        </div>
                      );
                      })}
                    </div>
                  </div>
                </div>
              ) : null}

              {filteredPackageCatalog.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>
                  No packages match the current filters.
                </div>
              )}
            </div>

            <div
              className="custom-scrollbar"
              style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', position: 'relative' }}
            >
              {selectedPackage ? (
                <div style={{ height: '100%', overflowY: 'auto', padding: '18px 20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>

                  {/* Add to pyproject.toml */}
                  {(() => {
                    const noPyproject = !projectConfig.data;
                    const borderCol = catalogPackageAlreadyDeclared
                      ? 'rgba(74,222,128,0.22)'
                      : noPyproject
                        ? 'rgba(251,191,36,0.2)'
                        : 'rgba(139,182,255,0.18)';
                    const bgCol = catalogPackageAlreadyDeclared
                      ? 'rgba(74,222,128,0.05)'
                      : noPyproject
                        ? 'rgba(251,191,36,0.04)'
                        : 'rgba(139,182,255,0.05)';
                    const labelCol = catalogPackageAlreadyDeclared ? catalogAccent : noPyproject ? '#fbbf24' : '#8bb6ff';
                    const label = catalogPackageAlreadyDeclared
                      ? 'Declared in pyproject.toml'
                      : noPyproject
                        ? 'No pyproject.toml'
                        : 'Add to pyproject.toml';
                    return (
                      <div style={{ borderRadius: 12, border: `1px solid ${borderCol}`, background: bgCol, padding: '14px 16px', display: 'grid', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 10, fontWeight: 800, color: labelCol, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            {label}
                          </span>
                          {catalogPackageAlreadyDeclared && (
                            <span style={{ fontSize: 10, color: catalogAccent, fontWeight: 700 }}>Run Sync to install if not yet installed.</span>
                          )}
                        </div>

                        {noPyproject ? (
                          <div style={{ display: 'grid', gap: 10 }}>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                              This workspace doesn't have a <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>pyproject.toml</span> yet. Create one to start managing dependencies with uv.
                            </div>
                            <button
                              type="button"
                              onClick={createPyprojectToml}
                              disabled={createPyprojectSaving}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(251,191,36,0.25)', background: 'rgba(251,191,36,0.08)', color: '#fbbf24', fontSize: 12, fontWeight: 700, cursor: createPyprojectSaving ? 'not-allowed' : 'pointer', width: 'fit-content', opacity: createPyprojectSaving ? 0.6 : 1 }}
                            >
                              <Plus size={13} /> {createPyprojectSaving ? 'Creating…' : 'Create pyproject.toml'}
                            </button>
                          </div>
                        ) : !catalogPackageAlreadyDeclared ? (
                          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
                            <div style={{ display: 'grid', gap: 4, flex: '1 1 160px', minWidth: 140 }}>
                              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Install spec</div>
                              <input
                                value={catalogAddSpec}
                                onChange={e => setCatalogAddSpec(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && addCatalogPackageToPyproject()}
                                placeholder={selectedPackage.name}
                                style={{ ...inputStyle, padding: '7px 10px', fontSize: 12, background: 'rgba(255,255,255,0.03)', fontFamily: 'var(--font-mono)' }}
                              />
                            </div>
                            <div style={{ display: 'grid', gap: 4, flex: '0 0 auto', minWidth: 110 }}>
                              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Section</div>
                              <select
                                value={catalogAddGroup}
                                onChange={e => setCatalogAddGroup(e.target.value)}
                                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 12, padding: '7px 10px', outline: 'none', cursor: 'pointer' }}
                              >
                                <option value="base">base</option>
                                {Object.keys(projectConfig.data?.groups || {}).map(g => (
                                  <option key={g} value={g}>{g}</option>
                                ))}
                              </select>
                            </div>
                            <button
                              type="button"
                              onClick={addCatalogPackageToPyproject}
                              disabled={catalogAddSaving || !catalogAddSpec.trim()}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(139,182,255,0.22)', background: 'rgba(139,182,255,0.1)', color: '#8bb6ff', fontSize: 12, fontWeight: 700, cursor: catalogAddSaving || !catalogAddSpec.trim() ? 'not-allowed' : 'pointer', minHeight: 34, opacity: catalogAddSaving || !catalogAddSpec.trim() ? 0.5 : 1 }}
                            >
                              <Plus size={13} /> {catalogAddSaving ? 'Adding…' : 'Add'}
                            </button>
                          </div>
                        ) : null}

                        {selectedPackage.installVariants?.length > 0 && !catalogPackageAlreadyDeclared && !noPyproject && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Variants</span>
                            {selectedPackage.installVariants.map(v => {
                              const active = catalogAddSpec === v.spec;
                              return (
                                <button
                                  key={v.id}
                                  type="button"
                                  onClick={() => setCatalogAddSpec(v.spec)}
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 999, border: active ? '1px solid rgba(139,182,255,0.3)' : '1px solid rgba(255,255,255,0.08)', background: active ? 'rgba(139,182,255,0.12)' : 'rgba(255,255,255,0.03)', color: active ? '#8bb6ff' : 'var(--text-secondary)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                                  title={v.spec}
                                >
                                  {v.label}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {catalogAddMsg && (
                          <div style={{ fontSize: 12, color: catalogAddMsg.ok ? '#4ade80' : '#f87171', lineHeight: 1.5 }}>
                            {catalogAddMsg.text}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  <div
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      padding: '18px 20px',
                    }}
                  >
                    <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Overview
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                      <div style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(91,154,255,0.14)', background: 'rgba(91,154,255,0.05)' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#8bb6ff', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Formal name</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#8bb6ff', lineHeight: 1.5, wordBreak: 'break-word', fontWeight: 700 }}>
                          {selectedPackage.name}
                        </div>
                        <div style={{ marginTop: 6, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5, wordBreak: 'break-word' }}>
                          Example: uv add {selectedPackage.name}
                        </div>
                      </div>
                      <div style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(74,222,128,0.14)', background: 'rgba(74,222,128,0.05)' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: catalogAccent, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Package focus</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: selectedPackageStatusMeta.color, background: selectedPackageStatusMeta.background, border: `1px solid ${selectedPackageStatusMeta.border}`, padding: '2px 6px', borderRadius: 999 }}>
                            {selectedPackageStatusMeta.label}
                          </span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: 4 }}>
                            {selectedPackage.category}
                          </span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: 4 }}>
                            {selectedPackage.sampleTasks.length} tasks
                          </span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: 4 }}>
                            {selectedPackage.source || 'custom'}
                          </span>
                        </div>
                        <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            Catalog status
                          </div>
                          <select
                            value={normalizeCatalogStatus(selectedPackage.status)}
                            onChange={(event) => updateSelectedPackageStatus(event.target.value)}
                            style={{
                              background: 'rgba(255,255,255,0.05)',
                              border: '1px solid rgba(255,255,255,0.08)',
                              borderRadius: 8,
                              color: 'var(--text)',
                              fontSize: 12,
                              padding: '7px 10px',
                              outline: 'none',
                              cursor: 'pointer',
                              maxWidth: 220,
                            }}
                          >
                            {PACKAGE_CATALOG_STATUS_OPTIONS.map((status) => (
                              <option key={status} value={status}>
                                {getCatalogStatusMeta(status).label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Official links</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          <a
                            href={selectedPackagePypiUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '6px 10px',
                              borderRadius: 6,
                              border: '1px solid rgba(91,154,255,0.14)',
                              background: 'rgba(91,154,255,0.05)',
                              color: '#8bb6ff',
                              textDecoration: 'none',
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          >
                            <ExternalLink size={12} />
                            PyPI
                          </a>
                          {selectedPackageDocsUrl ? (
                            <a
                              href={selectedPackageDocsUrl}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '6px 10px',
                                borderRadius: 6,
                                border: '1px solid rgba(74,222,128,0.14)',
                                background: 'rgba(74,222,128,0.05)',
                                color: catalogAccent,
                                textDecoration: 'none',
                                fontSize: 12,
                                fontWeight: 700,
                              }}
                            >
                              <ExternalLink size={12} />
                              Documentation
                            </a>
                          ) : null}
                        </div>
                      </div>
                      <div style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', gridColumn: '1 / -1' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Description</div>
                        <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>
                          {selectedPackage.description}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      padding: '18px 20px 20px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <FileCode2 size={16} style={{ color: catalogAccent }} />
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Technical Properties</span>
                    </div>
                    {selectedTechnicalProperties.length ? (
                      <div style={{ display: 'grid', gap: 12 }}>
                        {selectedTechnicalProperties.map((item) => {
                          const propertyMeta = PYTHON_TECHNICAL_PROPERTY_CATEGORIES[item.category] || {
                            label: item.category,
                            description: '',
                          };
                          const toneColor = item.relevance === 'medium' ? '#fbbf24' : catalogAccent;
                          const toneBg = item.relevance === 'medium' ? 'rgba(251,191,36,0.08)' : 'rgba(74,222,128,0.08)';
                          const toneBorder = item.relevance === 'medium' ? 'rgba(251,191,36,0.18)' : 'rgba(74,222,128,0.16)';

                          return (
                            <div
                              key={`${item.category}-${item.value}`}
                              style={{
                                borderRadius: 10,
                                border: '1px solid var(--border)',
                                background: 'rgba(255,255,255,0.02)',
                                padding: '14px 16px',
                                display: 'grid',
                                gap: 10,
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                                <div style={{ display: 'grid', gap: 4 }}>
                                  <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                    {propertyMeta.label}
                                  </div>
                                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                                    {item.value}
                                  </div>
                                </div>
                                <div style={{ fontSize: 10, fontWeight: 700, color: toneColor, background: toneBg, border: `1px solid ${toneBorder}`, padding: '3px 8px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                  {item.relevance || 'high'} relevance
                                </div>
                              </div>
                              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                {item.summary}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                                  {propertyMeta.description}
                                </div>
                                {item.sources?.length ? (
                                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    {item.sources.map((link) => (
                                      <a
                                        key={`${item.category}-${item.value}-${link.url}`}
                                        href={link.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: 6,
                                          padding: '5px 9px',
                                          borderRadius: 6,
                                          border: '1px solid rgba(255,255,255,0.08)',
                                          background: 'rgba(255,255,255,0.03)',
                                          color: '#8bb6ff',
                                          textDecoration: 'none',
                                          fontSize: 11,
                                          fontWeight: 700,
                                        }}
                                      >
                                        <ExternalLink size={11} />
                                        {link.label}
                                      </a>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ borderRadius: 10, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)', padding: '14px 16px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        No curated technical properties have been added for this package yet.
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      padding: '18px 20px 20px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Boxes size={16} style={{ color: catalogAccent }} />
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Tasks</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <div style={{ position: 'relative', width: 250 }}>
                          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                          <input
                            value={taskSearch}
                            onChange={(event) => setTaskSearch(event.target.value)}
                            placeholder="Search tasks..."
                            style={{
                              ...inputStyle,
                              width: '100%',
                              padding: '7px 10px 7px 31px',
                              fontSize: 12,
                              background: 'rgba(255,255,255,0.03)',
                            }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowTaskComposer((prev) => !prev)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '7px 12px',
                            borderRadius: 8,
                            border: '1px solid rgba(74,222,128,0.18)',
                            background: showTaskComposer ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.03)',
                            color: showTaskComposer ? catalogAccent : 'var(--text-secondary)',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          <Plus size={13} />
                          Add task
                        </button>
                      </div>
                    </div>
                    {showTaskComposer ? (
                      <div style={{ marginBottom: 12, padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(74,222,128,0.14)', background: 'rgba(74,222,128,0.04)', display: 'grid', gap: 10 }}>
                        <div style={{ fontSize: 10, fontWeight: 800, color: catalogAccent, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          New task
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <input
                            value={newPackageTask}
                            onChange={(event) => setNewPackageTask(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                event.preventDefault();
                                addTaskToSelectedPackage();
                              }
                            }}
                            placeholder="Write the new task..."
                            style={{
                              ...inputStyle,
                              flex: 1,
                              minWidth: 240,
                              padding: '7px 10px',
                              fontSize: 12,
                              background: 'rgba(255,255,255,0.03)',
                            }}
                          />
                          <button
                            type="button"
                            onClick={addTaskToSelectedPackage}
                            disabled={!newPackageTask.trim()}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '7px 12px',
                              borderRadius: 8,
                              border: '1px solid rgba(74,222,128,0.18)',
                              background: newPackageTask.trim() ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.03)',
                              color: newPackageTask.trim() ? catalogAccent : 'var(--text-muted)',
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: newPackageTask.trim() ? 'pointer' : 'not-allowed',
                            }}
                          >
                            <Plus size={13} />
                            Save task
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setNewPackageTask('');
                              setShowTaskComposer(false);
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '7px 12px',
                              borderRadius: 8,
                              border: '1px solid rgba(255,255,255,0.08)',
                              background: 'rgba(255,255,255,0.03)',
                              color: 'var(--text-secondary)',
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            <XCircle size={13} />
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : null}
                    <div style={{ borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden', background: 'rgba(15,23,42,.32)' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                            <th style={{ width: 56, padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid var(--border)' }}>
                              #
                            </th>
                            <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid var(--border)' }}>
                              Task
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredSelectedTasks.length ? (
                            filteredSelectedTasks.map((task, index) => (
                              <tr key={task} style={{ borderBottom: index === filteredSelectedTasks.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.06)' }}>
                                <td style={{ padding: '8px 12px', verticalAlign: 'top', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: '#8bb6ff', lineHeight: 1.4 }}>
                                  <span>
                                    {index + 1}
                                  </span>
                                </td>
                                <td style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text)', lineHeight: 1.4 }}>
                                  {task}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={2} style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                                {taskSearch.trim() ? 'No tasks match the current search.' : 'No tasks have been added for this package yet.'}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div style={{ marginTop: 16, fontSize: 12, color: catalogAccent, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <CheckCircle2 size={12} />
                      Use this package only after deciding whether it belongs in base dependencies, a uv group, or a recipe.
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, padding: 24 }}>
                  <div
                    style={{
                      width: '100%',
                      maxWidth: 420,
                      borderRadius: 12,
                      border: '1px solid rgba(74,222,128,0.14)',
                      background: 'linear-gradient(180deg, rgba(74,222,128,0.06), rgba(255,255,255,0.02))',
                      padding: '22px 24px',
                      display: 'grid',
                      gap: 14,
                    }}
                  >
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 10,
                        background: 'rgba(74,222,128,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Boxes size={18} color={catalogAccent} />
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 800, color: catalogAccent, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Detail Panel
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>
                      {filteredPackageCatalog.length === 0 ? 'No packages in view' : 'Select a package'}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      {filteredPackageCatalog.length === 0
                        ? 'The current search and filter combination hides every catalog entry. Adjust the filters or add a new package to restore the reference inventory.'
                        : 'Choose a package from the list to inspect its status, description, official links, and reference tasks.'}
                    </div>
                    <div style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(10,15,26,0.42)', display: 'grid', gap: 4 }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Package details
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        {filteredPackageCatalog.length === 0
                          ? 'Try broadening the search, switching category and task filters back to All, or importing a new package from PyPI.'
                          : 'Package description, formal name, source links, and task examples will appear here.'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Section>
    );
  }

  function renderEnvironmentSection({
    showInstallCards = true,
    showMainCards = true,
    sectionTitle = <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><FileCode2 size={16} /> uv Environment</span>,
    noWrapper = false,
  } = {}) {
    const SectionWrapper = noWrapper
      ? ({ children }) => <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{children}</div>
      : ({ children }) => <Section title={sectionTitle}>{children}</Section>;

    const _runtimeBase = runtime.data || {};
    const runtimeData = {
      manager: { installed: false, version: null, path: null, error: null },
      python: { installed: false, version: null, error: 'Not checked yet.' },
      ..._runtimeBase,
      python: _runtimeBase.python || { installed: false, version: null, error: 'Not checked yet.' },
      manager: _runtimeBase.manager || { installed: false, version: null, path: null, error: null },
    };
    const uvInstalled = !!runtimeData.manager?.installed;
    const uvInstallGuideUrl = 'https://docs.astral.sh/uv/getting-started/installation/';
    const uvDocsUrl = 'https://docs.astral.sh/uv/';
    const pythonWebsiteUrl = 'https://www.python.org/';
    const uvVersionText = runtimeData.manager?.version || '';
    const uvVersionMatch = uvVersionText.match(/^uv\s+([^\s]+)(?:\s+\((.+)\))?$/i);
    const uvVersionLabel = uvInstalled ? (uvVersionMatch?.[1] || uvVersionText || 'Unknown') : 'Not available';
    const uvBuildLabel = uvInstalled ? (uvVersionMatch?.[2] || 'Unavailable') : 'Not available';
    const pythonVersionText = runtimeData.python?.version || '';
    const pythonVersionLines = pythonVersionText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const pythonPrimaryLine = pythonVersionLines[0] || '';
    const pythonVersionMatch = pythonPrimaryLine.match(/^Python\s+([^\s]+)\s*(.*)$/i);
    const pythonVersionLabel = runtimeData.python.installed
      ? (pythonVersionMatch?.[1] || pythonPrimaryLine || 'Unknown')
      : 'Not available';
    const pythonBuildParts = [
      (pythonVersionMatch?.[2] || '').trim(),
      ...pythonVersionLines.slice(1),
    ].filter(Boolean);
    const pythonBuildLabel = runtimeData.python.installed
      ? (pythonBuildParts.join(' | ') || 'Unavailable')
      : 'Not available';
    const venvDetected = !!runtimeData.venv?.detected;
    const venvDocsUrl = 'https://docs.python.org/3/library/venv.html';
    const venvVersionText = runtimeData.venv?.interpreterVersion || '';
    const venvVersionMatch = venvVersionText.match(/^Python\s+(.+)$/i);
    const venvVersionLabel = venvDetected
      ? (venvVersionMatch?.[1] || venvVersionText || 'Unknown')
      : 'Not available';
    const venvPackages = Array.isArray(runtimeData.venv?.packages) ? runtimeData.venv.packages : [];
    const venvPackageCountLabel = venvPackages.length > 0
      ? `${venvPackages.length} package${venvPackages.length === 1 ? '' : 's'}`
      : Number.isFinite(runtimeData.venv?.packageCount)
        ? `${runtimeData.venv.packageCount} package${runtimeData.venv.packageCount === 1 ? '' : 's'}`
        : 'Not available';
    const venvLastUpdatedLabel = formatDateTime(runtimeData.venv?.lastUpdated);
    const venvLastCheckedLabel = formatDateTime(runtimeData.venv?.lastChecked);
    const venvSizeLabel = formatBytes(runtimeData.venv?.sizeBytes);
    const venvSyncStatusLabel = runtimeData.venv?.syncStatus || 'Not available';
    const venvHealthWarnings = Array.isArray(runtimeData.venv?.healthWarnings) ? runtimeData.venv.healthWarnings : [];
    const venvHealthWarningsLabel = venvHealthWarnings.length ? venvHealthWarnings.join(' | ') : 'No active warnings';
    const venvCreationMethodLabel = runtimeData.venv?.creationMethod || 'Unknown';
    const venvLockfile = runtimeData.venv?.lockfile || null;
    const availableRuntimes = Array.isArray(runtimeData.python?.availableRuntimes?.runtimes)
      ? runtimeData.python.availableRuntimes.runtimes
      : [];
    const verifiedAvailableRuntimes = verifiedAvailableRuntimeOptions;
    const availableRuntimeCountLabel = runtimeData.python?.availableRuntimes?.count > 0
      ? `${runtimeData.python.availableRuntimes.count} runtime${runtimeData.python.availableRuntimes.count === 1 ? '' : 's'} found`
      : 'Not available';
    const defaultAvailableRuntime = defaultRuntimeOption || availableRuntimes[0] || null;
    const launcherDefaultRuntime = runtimeData.python?.availableRuntimes?.defaultRuntime || null;
    const pythonActive = Boolean(launcherDefaultRuntime && launcherDefaultRuntime.ok);
    const defaultAvailableRuntimeLabel = defaultAvailableRuntime
      ? [
          defaultAvailableRuntime.version ? `Python ${defaultAvailableRuntime.version}` : (defaultAvailableRuntime.label || 'Python runtime'),
          defaultAvailableRuntime.path || null,
        ].filter(Boolean).join(' @ ')
      : 'Not available';
    const defaultAvailableRuntimePath = defaultAvailableRuntime?.path || null;
    const availableRuntimesCheckedLabel = formatDateTime(runtimeData.python?.availableRuntimes?.checkedAt);
    const selectedAvailableRuntime = selectedAvailableRuntimeOption;
    const selectedRuntimeLabel = selectedAvailableRuntime
      ? `${selectedAvailableRuntime.version ? `Python ${selectedAvailableRuntime.version}` : selectedAvailableRuntime.label}${selectedAvailableRuntime.isDefault ? ' (Default)' : ''}`
      : 'Default runtime';
    const venvLocationLabel = venvDetected
      ? (runtimeData.venv?.location || runtimeData.paths?.venvDir || 'Not available')
      : 'Not available';
    const venvInterpreterLabel = venvDetected
      ? (runtimeData.venv?.interpreterPath || runtimeData.paths?.interpreterPath || 'Not available')
      : 'Not available';
    const venvActivationPowerShell = venvDetected && runtimeData.venv?.location
      ? `& "${runtimeData.venv.location}\\Scripts\\Activate.ps1"`
      : 'Not available';
    const venvActivationCmd = venvDetected && runtimeData.venv?.location
      ? `"${runtimeData.venv.location}\\Scripts\\activate.bat"`
      : 'Not available';
    const pyprojectDocsUrl = 'https://packaging.python.org/en/latest/specifications/pyproject-toml/';
      const projectDetected = !!projectConfig.data?.exists || !!runtimeData.files?.hasPyproject;
      const pythonSignalsDetected = !!runtimeData.files?.hasPyproject || !!runtimeData.files?.hasRequirements || !!runtimeData.files?.hasVenv;
    const projectLocationLabel = runtimeData.paths?.pyprojectPath || 'Not available';
    const projectData = projectConfig.data;
    const projectNameLabel = projectData?.metadata?.name || 'Not available';
    const projectVersionLabel = projectData?.metadata?.version || 'Not available';
    const projectDescriptionLabel = projectData?.metadata?.description || 'Not available';
    const projectRequiresPythonLabel = projectData?.metadata?.requiresPython || 'Not available';
    const projectMtime = projectData?.mtime || null;
    const projectBuildBackend = projectData?.buildBackend || null;
    const projectDirectDepCount = projectData?.dependencyCount ?? null;
    const projectGroupCounts = projectData?.groupCounts || {};
    const projectGroupCountParts = Object.entries(projectGroupCounts).map(([k, v]) => `${v} ${k}`);
    const projectNameIsPlaceholder = projectData?.metadata?.name === 'launchline-python-tools';
    const projectVersionIsPlaceholder = projectData?.metadata?.version === '0.1.0';
    const depSummary = runtimeData.dependencySummary || {};
    const dependencyPackages = depSummary.packages || [];
    const dependencyCount = dependencyPackages.length;
    const dependencyStatus = dependencyPackages.length > 0 ? 'Detected' : 'Not checked';
    const depReqPackages = depSummary.requirementsPackages || [];
    const depProjPackages = depSummary.pyprojectPackages || [];
    const depGroups = depSummary.pyprojectGroups || {};
    const depConstraints = depSummary.constraintSummary || { pinned: 0, ranged: 0, unconstrained: 0 };
    const depOnlyInReq = depSummary.onlyInRequirements || [];
    const depOnlyInProj = depSummary.onlyInPyproject || [];
    const depBothSources = depReqPackages.length > 0 && depProjPackages.length > 0;
    const depInSync = depBothSources && depOnlyInReq.length === 0 && depOnlyInProj.length === 0;
    const workspacePythonDescription = projectDetected
      ? 'Launchline found a Python project manifest in the active workspace and can audit its declared environment directly.'
      : pythonSignalsDetected
        ? 'The active workspace has Python signals, but no pyproject.toml manifest yet. Python Tools can still help you inspect and prepare the environment.'
        : 'The active workspace does not currently look like a Python project. Python Tools stays available so you can prepare a Python environment if this workspace grows into one.';
    const selectedEnvironmentAssignedPackages = Array.isArray(selectedEnvironmentManifest?.assignedPackages)
      ? selectedEnvironmentManifest.assignedPackages
      : [];
    const selectedManifestDeclaredPackages = selectedEnvironmentManifest?.id === 'primary' && projectConfig.data
      ? [
          ...(Array.isArray(projectConfig.data.dependencies)
            ? projectConfig.data.dependencies.map((dependencySpec) => ({
                name: dependencySpec,
                dependencySpec,
                scope: 'base',
                state: 'declared',
                source: 'pyproject',
              }))
            : []),
          ...Object.entries(projectConfig.data.groups || {}).flatMap(([groupName, packages]) => (
            Array.isArray(packages)
              ? packages.map((dependencySpec) => ({
                  name: dependencySpec,
                  dependencySpec,
                  scope: 'group',
                  group: groupName,
                  state: 'declared',
                  source: 'pyproject',
                }))
              : []
          )),
        ]
      : [];
    const selectedManifestPackageRows = [
      ...selectedManifestDeclaredPackages,
      ...selectedEnvironmentAssignedPackages.filter((pkg) => !selectedManifestDeclaredPackages.some((declaredPkg) => (
        (declaredPkg.dependencySpec || declaredPkg.name) === (pkg.dependencySpec || pkg.name)
        && declaredPkg.scope === pkg.scope
        && (declaredPkg.group || '') === (pkg.group || '')
      ))),
    ];

    return (
      <>
      <SectionWrapper>
        {runtime.error ? (
          <div style={{ marginBottom: 16, padding: '12px 14px', borderRadius: 12, border: '1px solid rgba(248,113,113,0.24)', background: 'rgba(248,113,113,0.08)', color: '#fca5a5', fontSize: 13 }}>
            {runtime.error}
          </div>
        ) : null}
        {!runtime.error ? (
          <>
            {showMainCards ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>

              {/* ── Environment Health Score ── */}
              {(() => {
                const scrollTo = (ref) => ref?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                const healthChecks = [
                  { id: 'python',    label: 'Python installed',       pass: !!runtimeData.python?.installed, action: () => setActiveTab('installs'), hint: 'Go to Installs tab' },
                  { id: 'uv',        label: 'uv installed',            pass: uvInstalled,                     action: () => setActiveTab('installs'), hint: 'Go to Installs tab' },
                  { id: 'venv',      label: 'Virtual environment',     pass: venvDetected,                    action: () => scrollTo(venvCardRef),    hint: 'Go to Virtual Environment' },
                  { id: 'pyproject', label: 'pyproject.toml present',  pass: projectDetected,                 action: () => scrollTo(pyprojectCardRef), hint: 'Go to pyproject.toml' },
                  { id: 'lockfile',  label: 'Lockfile present',        pass: !!venvLockfile,                  action: () => scrollTo(venvCardRef),    hint: 'Run Sync to generate' },
                  { id: 'warnings',  label: 'No environment warnings', pass: !venvDetected || venvHealthWarnings.length === 0, action: () => scrollTo(venvCardRef), hint: 'Go to Virtual Environment' },
                ];
                const passed     = healthChecks.filter(c => c.pass).length;
                const total      = healthChecks.length;
                const scoreColor = passed === total ? '#4ade80' : passed >= total * 0.6 ? '#fbbf24' : '#f87171';
                const barWidth   = total > 0 ? Math.round((passed / total) * 100) : 0;
                const borderCol  = passed === total ? 'rgba(74,222,128,0.25)' : 'rgba(96,165,250,0.2)';
                const bgCol      = passed === total ? 'rgba(74,222,128,0.03)' : 'rgba(96,165,250,0.03)';
                return (
                  <div style={{ border: `1px solid ${borderCol}`, borderRadius: 10, padding: '12px 14px', background: bgCol }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(96,165,250,0.55)', flex: 1 }}>Environment Health</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: scoreColor }}>{passed}/{total}</span>
                    </div>
                    <div style={{ height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.07)', marginBottom: 10, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${barWidth}%`, borderRadius: 999, background: scoreColor, transition: 'width 0.4s' }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' }}>
                      {healthChecks.map(c => (
                        c.pass ? (
                          <div key={c.id} style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
                            <span style={{ fontSize: 13, lineHeight: 1, flexShrink: 0, color: '#4ade80' }}>✓</span>
                            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{c.label}</span>
                          </div>
                        ) : (
                          <button
                            key={c.id}
                            type="button"
                            onClick={c.action}
                            title={c.hint}
                            style={{ display: 'flex', alignItems: 'baseline', gap: 7, background: 'none', border: 'none', padding: '2px 0', cursor: 'pointer', textAlign: 'left' }}
                          >
                            <span style={{ fontSize: 13, lineHeight: 1, flexShrink: 0, color: '#f87171' }}>✗</span>
                            <span style={{ fontSize: 11, color: '#f87171', fontWeight: 600, textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: 3 }}>{c.label}</span>
                          </button>
                        )
                      ))}
                    </div>
                  </div>
                );
              })()}

              <button
                type="button"
                onClick={() => refreshAllRuntimeStatus()}
                disabled={runtimeLoading.uv || runtimeLoading.python || runtimeLoading.venv || runtimeLoading.createVenv || runtimeLoading.rebuildVenv || runtimeLoading.deleteVenv || runtimeLoading.syncVenv || runtimeLoading.dependencies || runState.running}
                style={{ ...actionButtonStyle, opacity: runtimeLoading.uv || runtimeLoading.python || runtimeLoading.venv || runtimeLoading.createVenv || runtimeLoading.rebuildVenv || runtimeLoading.deleteVenv || runtimeLoading.syncVenv || runtimeLoading.dependencies || runState.running ? 0.65 : 1 }}
              >
                <RefreshCw size={14} />
                Refresh runtime
              </button>
            </div>
            ) : null}
            <ControlCard>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr)',
                  gap: 16,
                  maxWidth: 980,
                }}
              >
              {showInstallCards ? (
              <div
                style={{
                  background: runtimeData.python.installed ? 'rgba(91,154,255,0.08)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${runtimeData.python.installed ? 'rgba(91,154,255,0.32)' : 'var(--border)'}`,
                  borderRadius: 12,
                  padding: '16px 16px 16px 20px',
                  position: 'relative',
                  overflow: 'visible',
                  boxShadow: runtimeData.python.installed ? '0 0 20px rgba(91,154,255,0.14)' : 'none',
                  width: '100%',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 4,
                    background: runtimeData.python.installed ? 'var(--primary)' : 'rgba(148,163,184,0.75)',
                  }}
                />
                <button
                  type="button"
                  onMouseEnter={() => setPythonHelpOpen(true)}
                  onMouseLeave={() => setPythonHelpOpen(false)}
                  onFocus={() => setPythonHelpOpen(true)}
                  onBlur={() => setPythonHelpOpen(false)}
                  style={{
                    position: 'absolute',
                    top: 14,
                    right: 14,
                    width: 30,
                    height: 30,
                    borderRadius: 999,
                    border: `1px solid ${runtimeData.python.installed ? 'rgba(91,154,255,0.28)' : 'rgba(148,163,184,0.24)'}`,
                    background: runtimeData.python.installed ? 'rgba(91,154,255,0.08)' : 'rgba(148,163,184,0.08)',
                    color: runtimeData.python.installed ? '#6ea8ff' : 'var(--text-muted)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'help',
                    flexShrink: 0,
                  }}
                >
                  <HelpCircle size={15} />
                </button>
                {pythonHelpOpen ? (
                  <div
                    style={{
                      position: 'absolute',
                      top: 52,
                      right: 14,
                      width: 250,
                      zIndex: 12,
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: '1px solid var(--border)',
                      background: '#0f1726',
                      boxShadow: '0 10px 24px rgba(0,0,0,0.35)',
                    }}
                  >
                    <div style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                      Check the default machine Python runtime and discover the Python runtimes available on this machine.
                    </div>
                  </div>
                ) : null}

                <div
                  style={{
                    margin: '-16px -16px 0 -20px',
                    padding: '14px 56px 12px 20px',
                    background: 'rgba(9,16,29,0.42)',
                    borderBottom: '1px solid rgba(91,154,255,0.18)',
                    borderTopLeftRadius: 12,
                    borderTopRightRadius: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ color: runtimeData.python.installed ? 'var(--primary)' : 'var(--text-muted)', opacity: 0.95 }}>
                      <TerminalSquare size={18} />
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', letterSpacing: '0.03em' }}>
                      Python Status
                    </div>
                    {launcherDefaultRuntime?.version ? (
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#6ea8ff', background: 'rgba(91,154,255,0.12)', border: '1px solid rgba(91,154,255,0.22)', borderRadius: 999, padding: '2px 9px', letterSpacing: '0.04em' }}>
                        Default: Python {launcherDefaultRuntime.version}
                      </span>
                    ) : !runtimeData.python?.installed ? (
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#f87171', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.22)', borderRadius: 999, padding: '2px 9px' }}>
                        Not detected
                      </span>
                    ) : null}
                  </div>
                </div>
                <div style={{ display: 'grid', gap: 16, marginTop: 16, width: '100%' }}>
                  <div
                    style={{
                      display: 'grid',
                      gap: 12,
                      padding: '14px 16px',
                      borderRadius: 12,
                      border: '1px solid rgba(91,154,255,0.18)',
                      background: 'rgba(91,154,255,0.06)',
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8bb6ff' }}>
                      Runtime Inventory
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'max-content max-content 18px max-content max-content 28px max-content max-content',
                        columnGap: 14,
                        rowGap: 8,
                        alignItems: 'center',
                      }}
                    >
                      <HoverInfoLabel
                        label="Python Active"
                        description="Whether Launchline found a usable default Python runtime on this machine that it can rely on."
                        noWrap
                      />
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 800,
                          color: pythonActive ? '#4ade80' : '#f87171',
                          lineHeight: 1.6,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {pythonActive ? 'Yes' : 'No'}
                      </div>
                      <div />
                      <HoverInfoLabel
                        label="Detected runtimes"
                        description="How many Python runtimes Launchline successfully discovered on this machine."
                        noWrap
                      />
                      <div style={{ fontSize: 12, color: 'var(--text)', fontFamily: 'var(--font-mono)', lineHeight: 1.6, whiteSpace: 'nowrap' }}>
                        {availableRuntimeCountLabel}
                      </div>
                      <div />
                      <HoverInfoLabel
                        label="Last checked"
                        description="The last time Launchline ran a check on the available Python runtimes on this machine."
                        noWrap
                      />
                      <div style={{ fontSize: 12, color: 'var(--text)', fontFamily: 'var(--font-mono)', lineHeight: 1.6, whiteSpace: 'nowrap' }}>
                        {availableRuntimesCheckedLabel}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gap: 12 }}>
                      <div style={{ display: 'grid', gap: 12 }}>
                        <div
                          style={{
                            borderRadius: 12,
                            border: '1px solid rgba(91,154,255,0.18)',
                            background: 'rgba(18,31,52,0.92)',
                            overflow: 'visible',
                          }}
                        >
                          <div
                            style={{
                              display: 'grid',
                            gridTemplateColumns: '82px 72px 76px 70px 76px 190px minmax(0, 1fr)',
                            gap: 4,
                              padding: '10px 12px',
                              borderBottom: '1px solid rgba(91,154,255,0.18)',
                              background: 'rgba(32,52,84,0.92)',
                              fontSize: 10,
                              fontWeight: 800,
                              letterSpacing: '0.08em',
                              color: '#8bb6ff',
                            }}
                          >
                            <HoverInfoLabel label="Version" description="The version number of the discovered Python runtime." />
                            <HoverInfoLabel label="Source" description="How Launchline discovered this runtime on the machine." />
                            <HoverInfoLabel label="Validated" description="Whether Launchline successfully ran this runtime and confirmed it works." />
                            <HoverInfoLabel label="Default" description="Whether this runtime is the machine default selected by the Python launcher." />
                            <HoverInfoLabel label="Target" description="Click this column to set which runtime Launchline should use next for environment create or rebuild actions." />
                            <HoverInfoLabel label="Build" description="Detailed build metadata reported by this Python runtime." />
                            <HoverInfoLabel label="Location" description="The filesystem path of the discovered Python runtime, with quick actions for opening the folder or copying the path." />
                          </div>
                          <div style={{ display: 'grid' }}>
                            {availableRuntimes.length ? availableRuntimes.map((runtime, index) => {
                              const runtimeTitle = runtime.version || runtime.label || 'Unknown';
                              const isSelectedRuntime = selectedAvailableRuntime
                                ? selectedAvailableRuntime.path === runtime.path
                                : Boolean(runtime.isDefault);
                              return (
                                <div
                                  key={`runtime-table-${runtime.path || runtime.label}-${runtime.source || 'runtime'}`}
                                  style={{
                                    display: 'grid',
                                      gridTemplateColumns: '82px 72px 76px 70px 76px 190px minmax(0, 1fr)',
                                      gap: 4,
                                    padding: '10px 12px',
                                    borderTop: index === 0 ? 'none' : '1px solid rgba(255,255,255,0.05)',
                                    alignItems: 'center',
                                  }}
                                >
                                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                                    {runtime.isDefault ? `${runtimeTitle} *` : runtimeTitle}
                                  </div>
                                  <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                    {runtime.source || 'system'}
                                  </div>
                                  <div>
                                    {runtime.ok ? (
                                      <RuntimeInventoryBadge label="Yes" color="#23d18b" />
                                    ) : (
                                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>No</span>
                                    )}
                                  </div>
                                  <div>
                                    {runtime.isDefault ? (
                                      <RuntimeInventoryBadge label="Yes" color="#5b9aff" />
                                    ) : (
                                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>No</span>
                                    )}
                                  </div>
                                  <div>
                                    <button
                                      type="button"
                                      onClick={() => requestTargetRuntimeSelection(runtime)}
                                      disabled={runtimeLoading.availableRuntimes || runtimeLoading.createVenv || runtimeLoading.rebuildVenv || runState.running}
                                      style={{
                                        minHeight: 28,
                                        minWidth: 56,
                                        padding: '0 10px',
                                        borderRadius: 8,
                                        border: isSelectedRuntime ? '1px solid rgba(245,158,11,0.28)' : '1px solid rgba(255,255,255,0.08)',
                                        background: isSelectedRuntime ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.02)',
                                        color: isSelectedRuntime ? '#fbbf24' : 'var(--text-muted)',
                                        fontSize: 11,
                                        fontWeight: 800,
                                        letterSpacing: '0.04em',
                                        textTransform: 'uppercase',
                                        cursor: runtimeLoading.availableRuntimes || runtimeLoading.createVenv || runtimeLoading.rebuildVenv || runState.running ? 'default' : 'pointer',
                                        opacity: runtimeLoading.availableRuntimes || runtimeLoading.createVenv || runtimeLoading.rebuildVenv || runState.running ? 0.6 : 1,
                                      }}
                                    >
                                      {isSelectedRuntime ? 'Yes' : 'Set'}
                                    </button>
                                  </div>
                                  <div
                                    style={{
                                      minWidth: 0,
                                      display: 'grid',
                                      gridTemplateColumns: 'minmax(0, 1fr) auto',
                                      gap: 8,
                                      alignItems: 'center',
                                    }}
                                  >
                                    <SingleLineHoverValue value={runtime.build || 'Not available'} />
                                    <InlineValueActionButtons
                                      value={runtime.build || 'Not available'}
                                      onCopy={copyTerminalText}
                                    />
                                  </div>
                                  <div
                                    style={{
                                      minWidth: 0,
                                      display: 'grid',
                                      gridTemplateColumns: 'minmax(0, 1fr) auto',
                                      gap: 8,
                                      alignItems: 'center',
                                    }}
                                  >
                                    <SingleLineHoverValue value={runtime.path || 'Not available'} />
                                    <InlineValueActionButtons
                                      value={runtime.path || 'Not available'}
                                      onCopy={copyTerminalText}
                                      onOpenFolder={runtime.path ? openFolderForPath : null}
                                    />
                                  </div>
                                </div>
                              );
                            }) : (
                              <div style={{ padding: '14px 12px', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                                Validate runtimes to populate the summary table.
                              </div>
                            )}
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '120px minmax(0, 1fr)', gap: 10, alignItems: 'center' }}>
                    <HoverInfoLabel label="Documentation" description="The official Python website for downloads, docs, and release information." />
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        flexWrap: 'wrap',
                      }}
                    >
                      <a
                        href={pythonWebsiteUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                          fontSize: 12,
                          color: 'var(--primary)',
                          textDecoration: 'none',
                          lineHeight: 1.6,
                          wordBreak: 'break-word',
                          width: 'fit-content',
                        }}
                      >
                        {pythonWebsiteUrl}
                        <ExternalLink size={13} />
                      </a>
                      {!runtimeData.python?.installed && (
                        <a
                          href="https://www.python.org/downloads/"
                          target="_blank"
                          rel="noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.1)', color: '#fca5a5', fontSize: 12, fontWeight: 800, textDecoration: 'none', letterSpacing: '0.03em' }}
                        >
                          <ExternalLink size={13} /> Download Python
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={() => checkPythonRuntimes()}
                        onMouseEnter={() => setPythonCheckHover(true)}
                        onMouseLeave={() => setPythonCheckHover(false)}
                        onFocus={() => setPythonCheckHover(true)}
                        onBlur={() => setPythonCheckHover(false)}
                        disabled={runtimeLoading.python || runtimeLoading.availableRuntimes || runState.running}
                        style={{
                          opacity: runtimeLoading.python || runtimeLoading.availableRuntimes || runState.running ? 0.65 : 1,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                          minHeight: 32,
                          width: 144,
                          padding: '4px 12px',
                          borderRadius: 10,
                          border: '1px solid rgba(91,154,255,0.38)',
                          background: '#5b9aff',
                          color: '#f8fbff',
                          fontSize: 11,
                          fontWeight: 800,
                          letterSpacing: '0.05em',
                          textTransform: 'uppercase',
                          cursor: runtimeLoading.python || runtimeLoading.availableRuntimes || runState.running ? 'default' : 'pointer',
                          justifyContent: 'center',
                          boxShadow:
                            !runtimeLoading.python &&
                            !runtimeLoading.availableRuntimes &&
                            !runState.running &&
                            pythonCheckHover
                              ? '0 0 18px rgba(91,154,255,0.22)'
                              : 'none',
                          transition: 'box-shadow 140ms ease, border-color 140ms ease, background 140ms ease',
                        }}
                      >
                        {runtimeLoading.python || runtimeLoading.availableRuntimes ? <RefreshCw size={14} className="spin" /> : null}
                        {runtimeLoading.python || runtimeLoading.availableRuntimes ? 'Checking...' : 'Check'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              ) : null}

              {showMainCards ? (
              <>
              <div
                ref={venvCardRef}
                style={{
                  background: venvDetected ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${venvDetected ? 'rgba(34,197,94,0.28)' : 'var(--border)'}`,
                  borderRadius: 12,
                  padding: '16px 16px 16px 20px',
                  position: 'relative',
                  overflow: 'visible',
                  boxShadow: venvDetected ? '0 0 18px rgba(34,197,94,0.12)' : 'none',
                  width: '100%',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 4,
                    background: venvDetected ? '#22c55e' : 'rgba(148,163,184,0.75)',
                  }}
                />
                <button
                  type="button"
                  onMouseEnter={() => setVenvHelpOpen(true)}
                  onMouseLeave={() => setVenvHelpOpen(false)}
                  onFocus={() => setVenvHelpOpen(true)}
                  onBlur={() => setVenvHelpOpen(false)}
                  style={{
                    position: 'absolute',
                    top: 14,
                    right: 14,
                    width: 30,
                    height: 30,
                    borderRadius: 999,
                    border: `1px solid ${venvDetected ? 'rgba(34,197,94,0.28)' : 'rgba(148,163,184,0.24)'}`,
                    background: venvDetected ? 'rgba(34,197,94,0.08)' : 'rgba(148,163,184,0.08)',
                    color: venvDetected ? '#86efac' : 'var(--text-muted)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'help',
                    flexShrink: 0,
                  }}
                >
                  <HelpCircle size={15} />
                </button>
                {venvHelpOpen ? (
                  <div
                    style={{
                      position: 'absolute',
                      top: 52,
                      right: 14,
                      width: 250,
                      zIndex: 12,
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: '1px solid var(--border)',
                      background: '#0f1726',
                      boxShadow: '0 10px 24px rgba(0,0,0,0.35)',
                    }}
                  >
                    <div style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                      Check whether the project virtual environment exists. If it does, the environment folder and interpreter location will be indicated here.
                    </div>
                  </div>
                ) : null}

                <div
                  style={{
                    margin: '-16px -16px 0 -20px',
                    padding: '14px 56px 12px 20px',
                    background: 'rgba(28,19,12,0.42)',
                    borderBottom: '1px solid rgba(34,197,94,0.22)',
                    borderTopLeftRadius: 12,
                    borderTopRightRadius: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ color: venvDetected ? '#22c55e' : 'var(--text-muted)', opacity: 0.95 }}>
                      <Boxes size={18} />
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', letterSpacing: '0.03em' }}>
                      Virtual Environment
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                        <div
                          style={{ position: 'relative', display: 'inline-flex' }}
                          onMouseEnter={() => setCheckVenvHelpOpen(true)}
                          onMouseLeave={() => setCheckVenvHelpOpen(false)}
                          onFocus={() => setCheckVenvHelpOpen(true)}
                          onBlur={() => setCheckVenvHelpOpen(false)}
                        >
                          <button
                            type="button"
                            onClick={() => loadVenvStatus()}
                            disabled={runtimeLoading.venv || runtimeLoading.createVenv || runtimeLoading.rebuildVenv || runtimeLoading.deleteVenv || runtimeLoading.syncVenv || runState.running}
                            style={{
                              opacity: runtimeLoading.venv || runtimeLoading.createVenv || runtimeLoading.rebuildVenv || runtimeLoading.deleteVenv || runtimeLoading.syncVenv || runState.running ? 0.65 : 1,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 8,
                              minHeight: 32,
                              width: 144,
                              padding: '4px 12px',
                              borderRadius: 8,
                              border: '1px solid rgba(91,154,255,0.28)',
                              background: 'rgba(91,154,255,0.10)',
                              color: '#6ea8ff',
                              fontSize: 11,
                              fontWeight: 800,
                              letterSpacing: '0.05em',
                              textTransform: 'uppercase',
                              cursor: runtimeLoading.venv || runtimeLoading.createVenv || runtimeLoading.rebuildVenv || runtimeLoading.deleteVenv || runtimeLoading.syncVenv || runState.running ? 'default' : 'pointer',
                              justifyContent: 'center',
                            }}
                          >
                            {runtimeLoading.venv ? <RefreshCw size={14} className="spin" /> : null}
                            {runtimeLoading.venv ? 'Checking...' : 'Check'}
                          </button>
                          {checkVenvHelpOpen ? (
                            <div
                              style={{
                                position: 'absolute',
                                top: 40,
                                left: 0,
                                width: 250,
                                zIndex: 12,
                                padding: '10px 12px',
                                borderRadius: 10,
                                border: '1px solid var(--border)',
                                background: '#0f1726',
                                boxShadow: '0 10px 24px rgba(0,0,0,0.35)',
                              }}
                            >
                              <div style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                                Check whether the project virtual environment exists and whether its interpreter can be found.
                              </div>
                            </div>
                          ) : null}
                        </div>
                        <div
                          style={{ position: 'relative', display: 'inline-flex' }}
                          onMouseEnter={() => {
                            if (venvDetected) setCreateVenvHelpOpen(true);
                          }}
                          onMouseLeave={() => setCreateVenvHelpOpen(false)}
                          onFocus={() => {
                            if (venvDetected) setCreateVenvHelpOpen(true);
                          }}
                          onBlur={() => setCreateVenvHelpOpen(false)}
                        >
                          <button
                            type="button"
                            onClick={() => requestCreateVirtualEnvironment()}
                            disabled={venvDetected || runtimeLoading.venv || runtimeLoading.createVenv || runtimeLoading.rebuildVenv || runtimeLoading.deleteVenv || runtimeLoading.syncVenv || runState.running}
                            style={{
                              opacity: venvDetected || runtimeLoading.venv || runtimeLoading.createVenv || runtimeLoading.rebuildVenv || runtimeLoading.deleteVenv || runtimeLoading.syncVenv || runState.running ? 0.5 : 1,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 8,
                              minHeight: 32,
                              padding: '4px 12px',
                              borderRadius: 8,
                              border: '1px solid rgba(34,197,94,0.28)',
                              background: 'rgba(34,197,94,0.10)',
                              color: '#86efac',
                              fontSize: 11,
                              fontWeight: 800,
                              letterSpacing: '0.05em',
                              textTransform: 'uppercase',
                              cursor: venvDetected || runtimeLoading.venv || runtimeLoading.createVenv || runtimeLoading.rebuildVenv || runtimeLoading.deleteVenv || runtimeLoading.syncVenv || runState.running ? 'default' : 'pointer',
                              justifyContent: 'center',
                            }}
                          >
                            {runtimeLoading.createVenv ? <RefreshCw size={14} className="spin" /> : null}
                            {runtimeLoading.createVenv ? 'Creating...' : 'Create'}
                          </button>
                          {createVenvHelpOpen ? (
                            <div
                              style={{
                                position: 'absolute',
                                top: 40,
                                left: 0,
                                width: 250,
                                zIndex: 12,
                                padding: '10px 12px',
                                borderRadius: 10,
                                border: '1px solid var(--border)',
                                background: '#0f1726',
                                boxShadow: '0 10px 24px rgba(0,0,0,0.35)',
                              }}
                            >
                              <div style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                                A virtual environment already exists for this project!
                              </div>
                            </div>
                          ) : null}
                        </div>
                        <div
                          style={{ position: 'relative', display: 'inline-flex' }}
                          onMouseEnter={() => {
                            if (venvDetected) setRebuildVenvHelpOpen(true);
                          }}
                          onMouseLeave={() => setRebuildVenvHelpOpen(false)}
                          onFocus={() => {
                            if (venvDetected) setRebuildVenvHelpOpen(true);
                          }}
                          onBlur={() => setRebuildVenvHelpOpen(false)}
                        >
                          <button
                            type="button"
                            onClick={() => requestRebuildVirtualEnvironment()}
                            disabled={!venvDetected || runtimeLoading.venv || runtimeLoading.createVenv || runtimeLoading.rebuildVenv || runtimeLoading.deleteVenv || runtimeLoading.syncVenv || runState.running}
                            style={{
                              opacity: !venvDetected || runtimeLoading.venv || runtimeLoading.createVenv || runtimeLoading.rebuildVenv || runtimeLoading.deleteVenv || runtimeLoading.syncVenv || runState.running ? 0.5 : 1,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 8,
                              minHeight: 32,
                              padding: '4px 12px',
                              borderRadius: 8,
                              border: '1px solid rgba(34,197,94,0.28)',
                              background: 'rgba(34,197,94,0.10)',
                              color: '#86efac',
                              fontSize: 11,
                              fontWeight: 800,
                              letterSpacing: '0.05em',
                              textTransform: 'uppercase',
                              cursor: !venvDetected || runtimeLoading.venv || runtimeLoading.createVenv || runtimeLoading.rebuildVenv || runtimeLoading.deleteVenv || runtimeLoading.syncVenv || runState.running ? 'default' : 'pointer',
                              justifyContent: 'center',
                            }}
                          >
                            {runtimeLoading.rebuildVenv ? <RefreshCw size={14} className="spin" /> : null}
                            {runtimeLoading.rebuildVenv ? 'Rebuilding...' : 'Rebuild'}
                          </button>
                          {rebuildVenvHelpOpen ? (
                            <div
                              style={{
                                position: 'absolute',
                                top: 40,
                                left: 0,
                                width: 250,
                                zIndex: 12,
                                padding: '10px 12px',
                                borderRadius: 10,
                                border: '1px solid var(--border)',
                                background: '#0f1726',
                                boxShadow: '0 10px 24px rgba(0,0,0,0.35)',
                              }}
                            >
                              <div style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                                Remove the current virtual environment and recreate it from scratch.
                              </div>
                            </div>
                          ) : null}
                        </div>
                        <div
                          style={{ position: 'relative', display: 'inline-flex' }}
                          onMouseEnter={() => {
                            if (venvDetected) setOpenTerminalVenvHelpOpen(true);
                          }}
                          onMouseLeave={() => setOpenTerminalVenvHelpOpen(false)}
                          onFocus={() => {
                            if (venvDetected) setOpenTerminalVenvHelpOpen(true);
                          }}
                          onBlur={() => setOpenTerminalVenvHelpOpen(false)}
                        >
                          <button
                            type="button"
                            onClick={() => openTerminalForPath(venvLocationLabel)}
                            disabled={!venvDetected || runtimeLoading.venv || runtimeLoading.createVenv || runtimeLoading.rebuildVenv || runtimeLoading.deleteVenv || runtimeLoading.syncVenv || runState.running}
                            style={{
                              opacity: !venvDetected || runtimeLoading.venv || runtimeLoading.createVenv || runtimeLoading.rebuildVenv || runtimeLoading.deleteVenv || runtimeLoading.syncVenv || runState.running ? 0.5 : 1,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 8,
                              minHeight: 32,
                              padding: '4px 12px',
                              borderRadius: 8,
                              border: '1px solid rgba(34,197,94,0.28)',
                              background: 'rgba(34,197,94,0.10)',
                              color: '#86efac',
                              fontSize: 11,
                              fontWeight: 800,
                              letterSpacing: '0.05em',
                              textTransform: 'uppercase',
                              cursor: !venvDetected || runtimeLoading.venv || runtimeLoading.createVenv || runtimeLoading.rebuildVenv || runtimeLoading.deleteVenv || runtimeLoading.syncVenv || runState.running ? 'default' : 'pointer',
                              justifyContent: 'center',
                            }}
                          >
                            <TerminalSquare size={15} />
                          </button>
                          {openTerminalVenvHelpOpen ? (
                            <div
                              style={{
                                position: 'absolute',
                                top: 40,
                                left: 0,
                                width: 250,
                                zIndex: 12,
                                padding: '10px 12px',
                                borderRadius: 10,
                                border: '1px solid var(--border)',
                                background: '#0f1726',
                                boxShadow: '0 10px 24px rgba(0,0,0,0.35)',
                              }}
                            >
                              <div style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                                Open a terminal window at the virtual environment folder.
                              </div>
                            </div>
                          ) : null}
                        </div>
                        <div
                          style={{ position: 'relative', display: 'inline-flex' }}
                          onMouseEnter={() => {
                            if (venvDetected) setSyncVenvHelpOpen(true);
                          }}
                          onMouseLeave={() => setSyncVenvHelpOpen(false)}
                          onFocus={() => {
                            if (venvDetected) setSyncVenvHelpOpen(true);
                          }}
                          onBlur={() => setSyncVenvHelpOpen(false)}
                        >
                          <button
                            type="button"
                            onClick={() => requestSyncVirtualEnvironment()}
                            disabled={!venvDetected || runtimeLoading.venv || runtimeLoading.createVenv || runtimeLoading.rebuildVenv || runtimeLoading.deleteVenv || runtimeLoading.syncVenv || runState.running}
                            style={{
                              opacity: !venvDetected || runtimeLoading.venv || runtimeLoading.createVenv || runtimeLoading.rebuildVenv || runtimeLoading.deleteVenv || runtimeLoading.syncVenv || runState.running ? 0.5 : 1,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 8,
                              minHeight: 32,
                              padding: '4px 12px',
                              borderRadius: 8,
                              border: '1px solid rgba(251,146,60,0.28)',
                              background: 'rgba(251,146,60,0.10)',
                              color: '#fdba74',
                              fontSize: 11,
                              fontWeight: 800,
                              letterSpacing: '0.05em',
                              textTransform: 'uppercase',
                              cursor: !venvDetected || runtimeLoading.venv || runtimeLoading.createVenv || runtimeLoading.rebuildVenv || runtimeLoading.deleteVenv || runtimeLoading.syncVenv || runState.running ? 'default' : 'pointer',
                              justifyContent: 'center',
                            }}
                          >
                            {runtimeLoading.syncVenv ? <RefreshCw size={14} className="spin" /> : null}
                            {runtimeLoading.syncVenv ? 'Syncing...' : 'Sync'}
                          </button>
                          {syncVenvHelpOpen ? (
                            <div
                              style={{
                                position: 'absolute',
                                top: 40,
                                left: 0,
                                width: 250,
                                zIndex: 12,
                                padding: '10px 12px',
                                borderRadius: 10,
                                border: '1px solid var(--border)',
                                background: '#0f1726',
                                boxShadow: '0 10px 24px rgba(0,0,0,0.35)',
                              }}
                            >
                              <div style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                                Install or refresh packages so the environment matches the current project dependency source.
                              </div>
                            </div>
                          ) : null}
                        </div>
                        <div
                          style={{ position: 'relative', display: 'inline-flex' }}
                          onMouseEnter={() => {
                            if (venvDetected) setDeleteVenvHelpOpen(true);
                          }}
                          onMouseLeave={() => setDeleteVenvHelpOpen(false)}
                          onFocus={() => {
                            if (venvDetected) setDeleteVenvHelpOpen(true);
                          }}
                          onBlur={() => setDeleteVenvHelpOpen(false)}
                        >
                          <button
                            type="button"
                            onClick={() => deleteVirtualEnvironment()}
                            disabled={!venvDetected || runtimeLoading.venv || runtimeLoading.createVenv || runtimeLoading.rebuildVenv || runtimeLoading.deleteVenv || runtimeLoading.syncVenv || runState.running}
                            style={{
                              opacity: !venvDetected || runtimeLoading.venv || runtimeLoading.createVenv || runtimeLoading.rebuildVenv || runtimeLoading.deleteVenv || runtimeLoading.syncVenv || runState.running ? 0.5 : 1,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 8,
                              minHeight: 32,
                              padding: '4px 12px',
                              borderRadius: 8,
                              border: '1px solid rgba(248,113,113,0.28)',
                              background: 'rgba(248,113,113,0.10)',
                              color: '#fca5a5',
                              fontSize: 11,
                              fontWeight: 800,
                              letterSpacing: '0.05em',
                              textTransform: 'uppercase',
                              cursor: !venvDetected || runtimeLoading.venv || runtimeLoading.createVenv || runtimeLoading.rebuildVenv || runtimeLoading.deleteVenv || runtimeLoading.syncVenv || runState.running ? 'default' : 'pointer',
                              justifyContent: 'center',
                            }}
                          >
                            {runtimeLoading.deleteVenv ? <RefreshCw size={14} className="spin" /> : null}
                            {runtimeLoading.deleteVenv ? 'Deleting...' : 'Delete'}
                          </button>
                          {deleteVenvHelpOpen ? (
                            <div
                              style={{
                                position: 'absolute',
                                top: 40,
                                left: 0,
                                width: 250,
                                zIndex: 12,
                                padding: '10px 12px',
                                borderRadius: 10,
                                border: '1px solid var(--border)',
                                background: '#0f1726',
                                boxShadow: '0 10px 24px rgba(0,0,0,0.35)',
                              }}
                            >
                              <div style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                                Permanently delete the current virtual environment after confirmation.
                              </div>
                            </div>
                          ) : null}
                        </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '84px minmax(0, 1fr)', gap: 10, alignItems: 'start' }}>
                    <HoverInfoLabel label="Status" description="Whether the project virtual environment is currently present and detectable." />
                    <div style={{ fontSize: 14, fontWeight: 800, color: venvDetected ? '#4ade80' : '#f87171' }}>
                      {venvDetected ? 'Detected' : 'Environment not found'}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '84px minmax(0, 1fr)', gap: 10, alignItems: 'center', marginBottom: 4 }}>
                    <HoverInfoLabel label="Path" description="Relative path where the virtual environment is created and expected by uv." />
                    <input
                      value={pythonTools.projectEnvironment}
                      onChange={(event) => updatePythonTools('projectEnvironment', event.target.value)}
                      style={{ ...inputStyle, fontSize: 12, height: 28, padding: '0 10px', fontFamily: 'var(--font-mono)' }}
                      placeholder="scripts/.venv"
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '84px minmax(0, 1fr)', gap: 10, alignItems: 'start' }}>
                    <HoverInfoLabel label="Sync" description="Whether the environment appears aligned with the current dependency source for the project." />
                    <div style={{ fontSize: 12, color: 'var(--text)', fontFamily: 'var(--font-mono)', lineHeight: 1.6, wordBreak: 'break-word' }}>
                      {venvSyncStatusLabel}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '84px minmax(0, 1fr)', gap: 10, alignItems: 'start' }}>
                    <HoverInfoLabel label="Warnings" description="Health warnings or mismatches Launchline detected while inspecting the environment." />
                    <div style={{ fontSize: 12, color: venvHealthWarnings.length ? '#fbbf24' : 'var(--text)', fontFamily: 'var(--font-mono)', lineHeight: 1.6, wordBreak: 'break-word' }}>
                      {venvHealthWarningsLabel}
                    </div>
                  </div>

                  <div style={{ borderRadius: 12, border: '1px solid rgba(34,197,94,0.18)', background: 'rgba(34,197,94,0.04)', overflow: 'hidden' }}>
                    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#86efac', padding: '8px 16px', borderBottom: '1px solid rgba(34,197,94,0.18)', background: 'rgba(10,20,14,0.35)' }}>
                      Environment Properties
                    </div>
                    <div style={{ display: 'grid', gap: 10, padding: '12px 16px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, alignItems: 'start' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '84px minmax(0, 1fr)', gap: 10, alignItems: 'start' }}>
                          <HoverInfoLabel label="Version" description="The Python version currently being used inside this virtual environment." />
                          <div style={{ fontSize: 12, color: 'var(--text)', fontFamily: 'var(--font-mono)', lineHeight: 1.6, wordBreak: 'break-word' }}>
                            {venvVersionLabel}
                          </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '84px minmax(0, 1fr)', gap: 10, alignItems: 'start' }}>
                          <HoverInfoLabel label="Size" description="The approximate total disk space currently used by the environment folder." />
                          <div style={{ fontSize: 12, color: 'var(--text)', fontFamily: 'var(--font-mono)', lineHeight: 1.6, wordBreak: 'break-word' }}>
                            {venvSizeLabel}
                          </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '84px minmax(0, 1fr)', gap: 10, alignItems: 'start' }}>
                          <HoverInfoLabel label="Updated" description="When the environment folder was last modified on disk." />
                          <div style={{ fontSize: 12, color: 'var(--text)', fontFamily: 'var(--font-mono)', lineHeight: 1.6, wordBreak: 'break-word' }}>
                            {venvLastUpdatedLabel}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, alignItems: 'start' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '84px minmax(0, 1fr)', gap: 10, alignItems: 'start' }}>
                          <HoverInfoLabel label="Method" description="How this environment was last created or rebuilt, when Launchline knows that origin." />
                          <div style={{ fontSize: 12, color: 'var(--text)', fontFamily: 'var(--font-mono)', lineHeight: 1.6, wordBreak: 'break-word' }}>
                            {venvCreationMethodLabel}
                          </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '84px minmax(0, 1fr)', gap: 10, alignItems: 'start' }}>
                          <HoverInfoLabel label="Packages" description="How many Python packages are currently installed inside the environment." />
                          <div style={{ fontSize: 12, color: 'var(--text)', fontFamily: 'var(--font-mono)', lineHeight: 1.6, wordBreak: 'break-word' }}>
                            {venvPackageCountLabel}
                          </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '84px minmax(0, 1fr)', gap: 10, alignItems: 'start' }}>
                          <HoverInfoLabel label="Checked" description="When Launchline last inspected this virtual environment and refreshed the card data." />
                          <div style={{ fontSize: 12, color: 'var(--text)', fontFamily: 'var(--font-mono)', lineHeight: 1.6, wordBreak: 'break-word' }}>
                            {venvLastCheckedLabel}
                          </div>
                        </div>
                      </div>
                      <div style={{ borderTop: '1px solid rgba(34,197,94,0.15)', margin: '2px 0' }} />
                      <div style={{ display: 'grid', gridTemplateColumns: '84px minmax(0, 1fr)', gap: 10, alignItems: 'start' }}>
                        <HoverInfoLabel label="Location" description="The folder that contains the project's virtual environment files." />
                        <SingleLineCopyValue value={venvLocationLabel} onCopy={copyTerminalText} onOpenFolder={openFolderForPath} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '84px minmax(0, 1fr)', gap: 10, alignItems: 'start' }}>
                        <HoverInfoLabel label="Interpreter" description="The Python executable inside this virtual environment." />
                        <SingleLineCopyValue value={venvInterpreterLabel} onCopy={copyTerminalText} onOpenFolder={openFolderForPath} />
                      </div>
                    </div>
                  </div>

                  <div style={{ borderRadius: 12, border: '1px solid rgba(34,197,94,0.18)', background: 'rgba(34,197,94,0.04)', overflow: 'hidden' }}>
                    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#86efac', padding: '8px 16px', borderBottom: '1px solid rgba(34,197,94,0.18)', background: 'rgba(10,20,14,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <span>Packages</span>
                      {venvPackages.length > 0 && (
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                          <Search size={11} style={{ position: 'absolute', left: 8, color: 'rgba(134,239,172,0.45)', pointerEvents: 'none' }} />
                          <input
                            type="text"
                            placeholder="Search packages…"
                            value={pkgSearch}
                            onChange={(e) => setPkgSearch(e.target.value)}
                            style={{ fontSize: 11, fontFamily: 'var(--font-mono)', background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 6, color: 'var(--text)', padding: '3px 8px 3px 26px', outline: 'none', width: 180 }}
                          />
                          {pkgSearch && (
                            <button onClick={() => setPkgSearch('')} style={{ position: 'absolute', right: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(134,239,172,0.5)', fontSize: 13, lineHeight: 1, padding: 0 }}>×</button>
                          )}
                        </div>
                      )}
                    </div>
                    {venvPackages.length > 0 ? (() => {
                      const searchTerm = pkgSearch.toLowerCase();
                      const filteredPkgs = searchTerm ? venvPackages.filter((p) => p.name.toLowerCase().includes(searchTerm)) : venvPackages;
                      const sortCols = { name: (p) => p.name.toLowerCase(), direct: (p) => (p.direct ? 0 : 1), version: (p) => p.version, reqPy: (p) => p.requiresPython || '', size: (p) => p.sizeBytes ?? -1 };
                      const sortedPkgs = [...filteredPkgs].sort((a, b) => {
                        const fn = sortCols[pkgSortColumn] || sortCols.name;
                        const va = fn(a); const vb = fn(b);
                        return pkgSortDir === 'asc' ? (va < vb ? -1 : va > vb ? 1 : 0) : (va > vb ? -1 : va < vb ? 1 : 0);
                      });
                      const hdrBg = 'rgba(8,16,10,0.97)';
                      const hdrBorder = '1px solid rgba(34,197,94,0.1)';
                      const hdrStyle = (col, align) => ({
                        fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
                        color: pkgSortColumn === col ? '#86efac' : 'rgba(134,239,172,0.55)',
                        padding: '6px 8px', borderBottom: hdrBorder, background: hdrBg,
                        textAlign: align || 'left', position: 'sticky', top: 0, zIndex: 1,
                        cursor: col ? 'pointer' : 'default', userSelect: 'none', whiteSpace: 'nowrap',
                      });
                      const SortIcon = ({ col }) => pkgSortColumn === col
                        ? (pkgSortDir === 'asc' ? <ChevronUp size={10} style={{ marginLeft: 2, verticalAlign: 'middle' }} /> : <ChevronDown size={10} style={{ marginLeft: 2, verticalAlign: 'middle' }} />)
                        : <span style={{ display: 'inline-block', width: 12 }} />;
                      const onSort = (col) => { if (!col) return; setPkgSortColumn(col); setPkgSortDir((d) => pkgSortColumn === col ? (d === 'asc' ? 'desc' : 'asc') : 'asc'); };
                      if (sortedPkgs.length === 0) {
                        return <div style={{ padding: '12px 16px', fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>No packages match &ldquo;{pkgSearch}&rdquo;.</div>;
                      }
                      return (
                        <>
                          <style>{`.pkg-scroll::-webkit-scrollbar{width:5px;height:5px}.pkg-scroll::-webkit-scrollbar-track{background:transparent}.pkg-scroll::-webkit-scrollbar-thumb{background:rgba(34,197,94,0.22);border-radius:3px}.pkg-scroll::-webkit-scrollbar-thumb:hover{background:rgba(34,197,94,0.45)}.pkg-scroll::-webkit-scrollbar-corner{background:transparent}`}</style>
                          <div className="pkg-scroll" style={{ overflow: 'auto', maxHeight: 320 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '36px minmax(120px,1.2fr) minmax(180px,2.5fr) 64px minmax(80px,0.8fr) minmax(60px,0.7fr) minmax(60px,0.7fr) 36px 36px', gap: 0, minWidth: 780 }}>
                              {/* header */}
                              <div style={{ display: 'contents' }}>
                                <div style={{ ...hdrStyle(null, 'right'), padding: '6px 0 6px 16px' }}>#</div>
                                <div style={{ ...hdrStyle('name'), paddingLeft: 12 }} onClick={() => onSort('name')}>Name<SortIcon col="name" /></div>
                                <div style={{ ...hdrStyle(null) }}>Description</div>
                                <div style={{ ...hdrStyle('direct') }} onClick={() => onSort('direct')}>Direct<SortIcon col="direct" /></div>
                                <div style={{ ...hdrStyle('version') }} onClick={() => onSort('version')}>Version<SortIcon col="version" /></div>
                                <div style={{ ...hdrStyle('reqPy') }} onClick={() => onSort('reqPy')}>Req. Py<SortIcon col="reqPy" /></div>
                                <div style={{ ...hdrStyle('size', 'right') }} onClick={() => onSort('size')}>Size<SortIcon col="size" /></div>
                                <div style={{ ...hdrStyle(null), padding: '6px 4px' }} />
                                <div style={{ ...hdrStyle(null), padding: '6px 4px' }} />
                              </div>
                              {/* rows */}
                              {sortedPkgs.map((pkg, idx) => {
                                const rowBg = idx % 2 === 1 ? 'rgba(34,197,94,0.03)' : 'transparent';
                                const rowBorder = '1px solid rgba(34,197,94,0.05)';
                                const pypiUrl = `https://pypi.org/project/${encodeURIComponent(pkg.name)}/`;
                                const cellBase = { background: rowBg, borderBottom: rowBorder };
                                return (
                                  <div key={pkg.name} style={{ display: 'contents' }}>
                                    <div style={{ ...cellBase, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', padding: '5px 0 5px 16px', textAlign: 'right', userSelect: 'none' }}>{idx + 1}</div>
                                    <div style={{ ...cellBase, fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text)', padding: '5px 8px 5px 12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pkg.name}</div>
                                    <div style={{ ...cellBase, fontSize: 11, color: 'var(--text-muted)', padding: '5px 8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={pkg.summary || ''}>{pkg.summary || '—'}</div>
                                    <div style={{ ...cellBase, padding: '5px 8px', display: 'flex', alignItems: 'center' }}>
                                      {pkg.direct ? <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', color: '#86efac', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 4, padding: '1px 5px' }}>Direct</span> : <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>}
                                    </div>
                                    <div style={{ ...cellBase, fontSize: 12, fontFamily: 'var(--font-mono)', padding: '5px 8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', ...(pkg.latestVersion ? { color: '#f87171', fontWeight: 700 } : { color: 'var(--text-muted)' }) }} title={pkg.latestVersion ? `Outdated — latest: ${pkg.latestVersion}` : ''}>{pkg.version || '—'}</div>
                                    <div style={{ ...cellBase, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', padding: '5px 8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={pkg.requiresPython || ''}>{pkg.requiresPython || '—'}</div>
                                    <div style={{ ...cellBase, fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', padding: '5px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>{pkg.sizeBytes != null ? formatBytes(pkg.sizeBytes) : '—'}</div>
                                    <div style={{ ...cellBase, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                                      <a href={pypiUrl} target="_blank" rel="noreferrer" title={`${pkg.name} on PyPI`} style={{ color: 'rgba(134,239,172,0.45)', display: 'flex', alignItems: 'center', textDecoration: 'none' }} onMouseEnter={(e) => { e.currentTarget.style.color = '#86efac'; }} onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(134,239,172,0.45)'; }}>
                                        <ExternalLink size={11} />
                                      </a>
                                    </div>
                                    <div style={{ ...cellBase, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 10px 0 4px' }}>
                                      {pkg.homepage
                                        ? <a href={pkg.homepage} target="_blank" rel="noreferrer" title={pkg.homepage} style={{ color: 'rgba(96,165,250,0.55)', display: 'flex', alignItems: 'center', textDecoration: 'none' }} onMouseEnter={(e) => { e.currentTarget.style.color = '#93c5fd'; }} onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(96,165,250,0.55)'; }}>
                                            <ExternalLink size={11} />
                                          </a>
                                        : <span style={{ fontSize: 11, color: 'rgba(134,239,172,0.18)' }}>—</span>}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </>
                      );
                    })() : (
                      <div style={{ padding: '12px 16px', fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        No package data available. Run Check to inspect the environment.
                      </div>
                    )}
                  </div>

                  <div style={{ borderRadius: 12, border: '1px solid rgba(34,197,94,0.18)', background: 'rgba(34,197,94,0.04)', overflow: 'hidden' }}>
                    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#86efac', padding: '8px 16px', borderBottom: '1px solid rgba(34,197,94,0.18)', background: 'rgba(10,20,14,0.35)' }}>
                      Lockfile
                    </div>
                    <div style={{ display: 'grid', gap: 10, padding: '12px 16px' }}>
                      {/* Row 1: Status | Age | Stale + Re-lock button */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 10, alignItems: 'start' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '84px minmax(0,1fr)', gap: 10, alignItems: 'start' }}>
                          <HoverInfoLabel label="Status" description="Whether a uv.lock file is present in the project root." />
                          <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', lineHeight: 1.6 }}>
                            {venvLockfile == null ? <span style={{ color: 'var(--text-muted)' }}>Not checked</span>
                              : venvLockfile.present
                                ? <span style={{ color: '#86efac', fontWeight: 700 }}>Present</span>
                                : <span style={{ color: '#f87171', fontWeight: 700 }}>Missing</span>}
                          </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '84px minmax(0,1fr)', gap: 10, alignItems: 'start' }}>
                          <HoverInfoLabel label="Age" description="When uv.lock was last written to disk." />
                          <div style={{ fontSize: 12, color: 'var(--text)', fontFamily: 'var(--font-mono)', lineHeight: 1.6 }}>
                            {venvLockfile?.mtime ? formatDateTime(venvLockfile.mtime) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                          </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '84px minmax(0,1fr)', gap: 10, alignItems: 'start' }}>
                          <HoverInfoLabel label="Stale" description="Whether pyproject.toml has changed since uv.lock was last generated. Detected via uv lock --check." />
                          <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', lineHeight: 1.6, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            {venvLockfile?.stale == null
                              ? <span style={{ color: 'var(--text-muted)' }}>—</span>
                              : venvLockfile.stale
                                ? <span style={{ color: '#fbbf24', fontWeight: 700 }}>Stale</span>
                                : <span style={{ color: '#86efac' }}>Up to date</span>}
                            {venvLockfile?.present && (
                              <button
                                type="button"
                                onClick={() => runCommand('uv lock')}
                                disabled={runState.running}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)', borderRadius: 5, border: '1px solid rgba(134,239,172,0.3)', background: 'rgba(34,197,94,0.1)', color: '#86efac', cursor: runState.running ? 'not-allowed' : 'pointer', opacity: runState.running ? 0.5 : 1, letterSpacing: '0.04em' }}
                              >
                                <RefreshCw size={9} />
                                Re-lock
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      {/* Row 2: Locked packages | Not installed | Extra in env */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 10, alignItems: 'start' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '84px minmax(0,1fr)', gap: 10, alignItems: 'start' }}>
                          <HoverInfoLabel label="Locked" description="Total number of packages pinned in uv.lock, including all transitive dependencies." />
                          <div style={{ fontSize: 12, color: 'var(--text)', fontFamily: 'var(--font-mono)', lineHeight: 1.6 }}>
                            {venvLockfile?.packageCount != null ? `${venvLockfile.packageCount} packages` : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                          </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '84px minmax(0,1fr)', gap: 10, alignItems: 'start' }}>
                          <HoverInfoLabel label="Not installed" description="Packages pinned in uv.lock that are not currently installed in the environment. May include platform-specific packages." />
                          <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', lineHeight: 1.6 }}>
                            {venvLockfile?.notInstalledCount != null
                              ? venvLockfile.notInstalledCount === 0
                                ? <span style={{ color: '#86efac' }}>None</span>
                                : (
                                  <button
                                    type="button"
                                    onClick={() => setLockfilePackageListModal({ title: 'Not installed packages', subtitle: 'Pinned in uv.lock but missing from the environment.', packages: venvLockfile.notInstalledPackages || [] })}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#fbbf24', fontWeight: 700, fontSize: 12, fontFamily: 'var(--font-mono)' }}
                                  >
                                    {venvLockfile.notInstalledCount} packages
                                    <ExternalLink size={11} />
                                  </button>
                                )
                              : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                          </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '84px minmax(0,1fr)', gap: 10, alignItems: 'start' }}>
                          <HoverInfoLabel label="Extra" description="Packages installed in the environment that are not tracked in uv.lock. May indicate manually installed packages." />
                          <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', lineHeight: 1.6 }}>
                            {venvLockfile?.extraInEnvCount != null
                              ? venvLockfile.extraInEnvCount === 0
                                ? <span style={{ color: '#86efac' }}>None</span>
                                : (
                                  <button
                                    type="button"
                                    onClick={() => setLockfilePackageListModal({ title: 'Extra packages', subtitle: 'Installed in the environment but not tracked in uv.lock.', packages: venvLockfile.extraPackages || [] })}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#fbbf24', fontWeight: 700, fontSize: 12, fontFamily: 'var(--font-mono)' }}
                                  >
                                    {venvLockfile.extraInEnvCount} packages
                                    <ExternalLink size={11} />
                                  </button>
                                )
                              : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              </>
              ) : null}

              {showInstallCards ? (
              <div
                style={{
                  background: uvInstalled ? 'rgba(167,72,178,0.08)' : 'rgba(248,113,113,0.03)',
                  border: `1px solid ${uvInstalled ? 'rgba(167,72,178,0.32)' : 'rgba(248,113,113,0.28)'}`,
                  borderRadius: 12,
                  padding: '16px 16px 16px 20px',
                  position: 'relative',
                  overflow: 'visible',
                  boxShadow: uvInstalled ? '0 0 20px rgba(167,72,178,0.14)' : '0 0 16px rgba(248,113,113,0.08)',
                  width: '100%',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 4,
                    background: uvInstalled ? '#a748b2' : '#f87171',
                  }}
                />
                <button
                  type="button"
                  onMouseEnter={() => setUvHelpOpen(true)}
                  onMouseLeave={() => setUvHelpOpen(false)}
                  onFocus={() => setUvHelpOpen(true)}
                  onBlur={() => setUvHelpOpen(false)}
                  style={{
                    position: 'absolute',
                    top: 14,
                    right: 14,
                    width: 30,
                    height: 30,
                    borderRadius: 999,
                    border: '1px solid rgba(167,72,178,0.28)',
                    background: 'rgba(167,72,178,0.08)',
                    color: '#d88be0',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'help',
                    flexShrink: 0,
                  }}
                >
                  <HelpCircle size={15} />
                </button>
                {uvHelpOpen ? (
                  <div
                    style={{
                      position: 'absolute',
                      top: 52,
                      right: 14,
                      width: 250,
                      zIndex: 12,
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: '1px solid var(--border)',
                      background: '#0f1726',
                      boxShadow: '0 10px 24px rgba(0,0,0,0.35)',
                    }}
                  >
                    <div style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                      Check whether uv is installed. If it is, the install location, version in use, and whether a newer release is available will be indicated.
                    </div>
                  </div>
                ) : null}

                <div
                  style={{
                    margin: '-16px -16px 0 -20px',
                    padding: '14px 56px 12px 20px',
                    background: uvInstalled ? 'rgba(24,12,28,0.42)' : 'rgba(35,13,18,0.42)',
                    borderBottom: `1px solid ${uvInstalled ? 'rgba(167,72,178,0.24)' : 'rgba(248,113,113,0.24)'}`,
                    borderTopLeftRadius: 12,
                    borderTopRightRadius: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ color: uvInstalled ? '#a748b2' : '#f87171', opacity: 0.95 }}>
                      <Box size={18} />
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', letterSpacing: '0.03em' }}>
                      uv
                    </div>
                    {uvInstalled && uvVersionLabel && uvVersionLabel !== 'Not available' ? (
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#d88be0', background: 'rgba(167,72,178,0.12)', border: '1px solid rgba(167,72,178,0.22)', borderRadius: 999, padding: '2px 9px', letterSpacing: '0.04em', fontFamily: 'var(--font-mono)' }}>
                        {uvVersionLabel}
                      </span>
                    ) : !uvInstalled ? (
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#f87171', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.22)', borderRadius: 999, padding: '2px 9px' }}>
                        Not installed
                      </span>
                    ) : null}
                  </div>
                </div>
                <div style={{ marginTop: 12 }}>
                  <button
                        type="button"
                        onClick={() => loadUvStatus()}
                        disabled={runtimeLoading.uv || runState.running}
                        style={{
                          opacity: runtimeLoading.uv || runState.running ? 0.65 : 1,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                          minHeight: 32,
                          width: 144,
                          padding: '4px 12px',
                          borderRadius: 8,
                          border: '1px solid rgba(91,154,255,0.28)',
                          background: 'rgba(91,154,255,0.10)',
                          color: '#6ea8ff',
                          fontSize: 11,
                          fontWeight: 800,
                          letterSpacing: '0.05em',
                          textTransform: 'uppercase',
                          cursor: runtimeLoading.uv || runState.running ? 'default' : 'pointer',
                          justifyContent: 'center',
                        }}
                      >
                        {runtimeLoading.uv ? <RefreshCw size={14} className="spin" /> : null}
                        {runtimeLoading.uv ? 'Checking...' : 'Check'}
                      </button>
                </div>

                {!uvInstalled && (
                  <div style={{ marginTop: 14, padding: '14px 16px', borderRadius: 10, border: '1px solid rgba(248,113,113,0.22)', background: 'rgba(248,113,113,0.05)', display: 'grid', gap: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#fca5a5', lineHeight: 1.5 }}>
                      uv is not installed. Install it to enable virtual environment management, dependency syncing, and lockfile generation.
                    </div>
                    <div style={{ display: 'grid', gap: 6 }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Quick install (PowerShell)</div>
                      <code style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: '#e2e8f0', background: 'rgba(0,0,0,0.3)', borderRadius: 6, padding: '6px 10px', display: 'block', lineHeight: 1.5 }}>
                        powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
                      </code>
                    </div>
                    <a
                      href={uvInstallGuideUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#fca5a5', textDecoration: 'none', fontWeight: 700 }}
                    >
                      <ExternalLink size={12} /> Full installation guide
                    </a>
                  </div>
                )}

                <div style={{ display: 'grid', gap: 12, marginTop: 16, maxWidth: 860 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, alignItems: 'start' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '84px minmax(0, 1fr)', gap: 10, alignItems: 'start' }}>
                      <HoverInfoLabel label="Status" description="Whether uv is installed locally and detectable by the app." />
                      <div style={{ fontSize: 14, fontWeight: 800, color: uvInstalled ? '#4ade80' : '#f87171' }}>
                        {uvInstalled ? 'Installed' : 'Missing - Installation required'}
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '84px minmax(0, 1fr)', gap: 10, alignItems: 'start' }}>
                      <HoverInfoLabel label="Version" description="The uv version currently installed on this machine." />
                      <span style={{ fontSize: 12, color: 'var(--text)', fontFamily: 'var(--font-mono)', lineHeight: 1.6, wordBreak: 'break-word' }}>
                        {uvVersionLabel}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '84px minmax(0, 1fr)', gap: 10, alignItems: 'start' }}>
                      <HoverInfoLabel label="Build" description="Detailed uv build metadata, such as commit or build date, when available." />
                      <SingleLineCopyValue value={uvBuildLabel} onCopy={copyTerminalText} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '84px minmax(0, 1fr)', gap: 10, alignItems: 'start' }}>
                    <HoverInfoLabel label="Location" description="The filesystem location of the uv executable installed on this machine." />
                    {uvInstalled ? (
                      <SingleLineCopyValue value={runtimeData.manager.path || 'Not available'} onCopy={copyTerminalText} onOpenFolder={openFolderForPath} />
                    ) : (
                      <div style={{ fontSize: 12, color: 'var(--text)', fontFamily: 'var(--font-mono)', lineHeight: 1.6, wordBreak: 'break-word' }}>
                        Not available
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '84px minmax(0, 1fr)', gap: 10, alignItems: 'start' }}>
                    <HoverInfoLabel label="Website" description="The official uv website and documentation home." />
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        flexWrap: 'wrap',
                      }}
                    >
                      <a
                        href={uvDocsUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                          fontSize: 12,
                          color: 'var(--primary)',
                          textDecoration: 'none',
                          lineHeight: 1.6,
                          wordBreak: 'break-word',
                          width: 'fit-content',
                        }}
                      >
                        {uvDocsUrl}
                        <ExternalLink size={13} />
                      </a>
                      {!uvInstalled ? (
                        <a
                          href={uvInstallGuideUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.1)', color: '#fca5a5', fontSize: 12, fontWeight: 800, textDecoration: 'none', letterSpacing: '0.03em' }}
                        >
                          <ExternalLink size={13} /> Install uv
                        </a>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
              ) : null}

              {showMainCards ? (
              <>
              <div
                style={{
                  background: dependencyCount > 0 ? 'rgba(251,191,36,0.07)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${dependencyCount > 0 ? 'rgba(251,191,36,0.28)' : 'var(--border)'}`,
                  borderRadius: 12,
                  padding: '16px 16px 16px 20px',
                  position: 'relative',
                  overflow: 'visible',
                  boxShadow: dependencyCount > 0 ? '0 0 18px rgba(251,191,36,0.10)' : 'none',
                  width: '100%',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 4,
                    background: dependencyCount > 0 ? '#fbbf24' : 'rgba(148,163,184,0.75)',
                  }}
                />
                <button
                  type="button"
                  onMouseEnter={() => setDependencyHelpOpen(true)}
                  onMouseLeave={() => setDependencyHelpOpen(false)}
                  onFocus={() => setDependencyHelpOpen(true)}
                  onBlur={() => setDependencyHelpOpen(false)}
                  style={{
                    position: 'absolute',
                    top: 14,
                    right: 14,
                    width: 30,
                    height: 30,
                    borderRadius: 999,
                    border: `1px solid ${dependencyCount > 0 ? 'rgba(251,191,36,0.28)' : 'rgba(148,163,184,0.24)'}`,
                    background: dependencyCount > 0 ? 'rgba(251,191,36,0.08)' : 'rgba(148,163,184,0.08)',
                    color: dependencyCount > 0 ? '#fcd34d' : 'var(--text-muted)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'help',
                    flexShrink: 0,
                  }}
                >
                  <HelpCircle size={15} />
                </button>
                {dependencyHelpOpen ? (
                  <div
                    style={{
                      position: 'absolute',
                      top: 52,
                      right: 14,
                      width: 250,
                      zIndex: 12,
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: '1px solid var(--border)',
                      background: '#0f1726',
                      boxShadow: '0 10px 24px rgba(0,0,0,0.35)',
                    }}
                  >
                    <div style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                      Check which packages are currently listed in the fallback requirements file. This gives a quick overview of the dependency set Launchline still carries outside `pyproject.toml`.
                    </div>
                  </div>
                ) : null}

                <div
                  style={{
                    margin: '-16px -16px 0 -20px',
                    padding: '14px 56px 12px 20px',
                    background: dependencyCount > 0 ? 'rgba(32,24,10,0.42)' : 'rgba(9,16,29,0.36)',
                    borderBottom: `1px solid ${dependencyCount > 0 ? 'rgba(251,191,36,0.22)' : 'rgba(148,163,184,0.18)'}`,
                    borderTopLeftRadius: 12,
                    borderTopRightRadius: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ color: dependencyCount > 0 ? '#fbbf24' : 'var(--text-muted)', opacity: 0.95 }}>
                      <BarChart2 size={18} />
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', letterSpacing: '0.03em' }}>
                      Dependency Summary
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 12 }}>
                  <button
                        type="button"
                        onClick={() => loadDependencySummary()}
                        disabled={runtimeLoading.dependencies}
                        style={{
                          opacity: runtimeLoading.dependencies ? 0.65 : 1,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                          minHeight: 32,
                          width: 144,
                          padding: '4px 12px',
                          borderRadius: 8,
                          border: '1px solid rgba(91,154,255,0.28)',
                          background: 'rgba(91,154,255,0.10)',
                          color: '#6ea8ff',
                          fontSize: 11,
                          fontWeight: 800,
                          letterSpacing: '0.05em',
                          textTransform: 'uppercase',
                          cursor: runtimeLoading.dependencies ? 'default' : 'pointer',
                          justifyContent: 'center',
                        }}
                      >
                        {runtimeLoading.dependencies ? <RefreshCw size={14} className="spin" /> : null}
                        {runtimeLoading.dependencies ? 'Checking...' : 'Check'}
                      </button>
                </div>

                {depSummaryError && (
                  <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 8, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.28)', fontSize: 12, color: '#fca5a5', fontFamily: 'var(--font-mono)' }}>
                    <AlertTriangle size={13} style={{ flexShrink: 0 }} />
                    {depSummaryError}
                  </div>
                )}

                <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>

                  {/* STATUS */}
                  <div style={{ display: 'grid', gridTemplateColumns: '100px minmax(0, 1fr)', gap: 10, alignItems: 'start' }}>
                    <HoverInfoLabel label="Status" description="Whether a dependency source was found and summarized for this project." />
                    <div style={{ fontSize: 14, fontWeight: 800, color: dependencyPackages.length > 0 ? '#4ade80' : '#f59e0b' }}>
                      {dependencyStatus}
                    </div>
                  </div>

                  {/* SOURCES — split req.txt vs pyproject.toml */}
                  <div style={{ display: 'grid', gridTemplateColumns: '100px minmax(0, 1fr)', gap: 10, alignItems: 'start' }}>
                    <HoverInfoLabel label="Sources" description="Dependency counts per source file. requirements.txt lists packages for pip-style installs; pyproject.toml [project].dependencies is the uv-native source." />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {depReqPackages.length > 0 && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 9px', borderRadius: 6, background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.28)', fontSize: 11, fontFamily: 'var(--font-mono)', color: '#fbbf24' }}>
                          requirements.txt <span style={{ fontWeight: 800 }}>{depReqPackages.length}</span>
                        </span>
                      )}
                      {depProjPackages.length > 0 && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 9px', borderRadius: 6, background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.28)', fontSize: 11, fontFamily: 'var(--font-mono)', color: '#fbbf24' }}>
                          pyproject.toml <span style={{ fontWeight: 800 }}>{depProjPackages.length}</span>
                        </span>
                      )}
                      {depReqPackages.length === 0 && depProjPackages.length === 0 && (
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>—</span>
                      )}
                    </div>
                  </div>

                  {/* GROUPS — from [dependency-groups] */}
                  {Object.keys(depGroups).length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: '100px minmax(0, 1fr)', gap: 10, alignItems: 'start' }}>
                      <HoverInfoLabel label="Groups" description="Optional dependency groups declared in [dependency-groups] of pyproject.toml. Typically used for dev tools, test suites, and linters." />
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {Object.entries(depGroups).map(([name, pkgs]) => (
                          <span key={name} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 9px', borderRadius: 6, background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.22)', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'rgba(251,191,36,0.8)' }}>
                            {name} <span style={{ fontWeight: 800, color: '#fbbf24' }}>{pkgs.length}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* CONSTRAINTS */}
                  {dependencyPackages.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: '100px minmax(0, 1fr)', gap: 10, alignItems: 'start' }}>
                      <HoverInfoLabel label="Constraints" description="How packages are version-pinned. Pinned (==) locks to an exact version; Ranged (>=, ~=, !=) allows updates within bounds; Unconstrained has no version specifier." />
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {depConstraints.pinned > 0 && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 9px', borderRadius: 6, background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.28)', fontSize: 11, fontFamily: 'var(--font-mono)', color: '#fbbf24' }}>
                            pinned <span style={{ fontWeight: 800 }}>{depConstraints.pinned}</span>
                          </span>
                        )}
                        {depConstraints.ranged > 0 && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 9px', borderRadius: 6, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.22)', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'rgba(251,191,36,0.85)' }}>
                            ranged <span style={{ fontWeight: 800 }}>{depConstraints.ranged}</span>
                          </span>
                        )}
                        {depConstraints.unconstrained > 0 && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 9px', borderRadius: 6, background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.18)', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'rgba(251,191,36,0.65)' }}>
                            unconstrained <span style={{ fontWeight: 800 }}>{depConstraints.unconstrained}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* SYNC — only shown when both sources present */}
                  {depBothSources && (
                    <div style={{ display: 'grid', gridTemplateColumns: '100px minmax(0, 1fr)', gap: 10, alignItems: 'start' }}>
                      <HoverInfoLabel label="Sync" description="Whether requirements.txt and pyproject.toml [project].dependencies declare the same set of packages. Divergence may indicate the files are out of step with each other." />
                      <div>
                        {depInSync ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 6, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.28)', fontSize: 12, fontWeight: 700, color: '#4ade80', fontFamily: 'var(--font-mono)' }}>
                            ✓ In sync
                          </span>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            {depOnlyInReq.length > 0 && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 6, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.28)', fontSize: 11, fontFamily: 'var(--font-mono)', color: '#fbbf24' }}>
                                <AlertTriangle size={11} style={{ flexShrink: 0 }} />
                                {depOnlyInReq.length} only in requirements.txt: {depOnlyInReq.map((p) => p.replace(/[>=<!~\s].*/,'')).join(', ')}
                              </span>
                            )}
                            {depOnlyInProj.length > 0 && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 6, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.28)', fontSize: 11, fontFamily: 'var(--font-mono)', color: '#fbbf24' }}>
                                <AlertTriangle size={11} style={{ flexShrink: 0 }} />
                                {depOnlyInProj.length} only in pyproject.toml: {depOnlyInProj.map((p) => p.replace(/[>=<!~\s].*/,'')).join(', ')}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* MISSING FROM PYPROJECT */}
                  {depOnlyInReq.length > 0 && (
                    <div style={{ borderRadius: 10, border: '1px solid rgba(251,191,36,0.22)', background: 'rgba(251,191,36,0.05)', padding: '12px 14px' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24', marginBottom: 4 }}>
                        Packages still missing from pyproject
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>
                        Move these packages into base dependencies or a dedicated uv group before deleting the fallback file.
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {depOnlyInReq.map((spec, i) => (
                          <span key={i} style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', fontSize: 12, fontFamily: 'var(--font-mono)', color: '#fbbf24', whiteSpace: 'nowrap' }}>
                            {spec}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* PACKAGES — expandable chip list */}
                  {dependencyPackages.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: '100px minmax(0, 1fr)', gap: 10, alignItems: 'start' }}>
                      <HoverInfoLabel label="Packages" description="All direct dependency entries across all sources. Click to expand the full list." />
                      <div>
                        <button
                          type="button"
                          onClick={() => setDepPackagesExpanded((v) => !v)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 6, border: '1px solid rgba(251,191,36,0.28)', background: 'rgba(251,191,36,0.08)', fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#fbbf24', cursor: 'pointer' }}
                        >
                          {dependencyPackages.length} {dependencyPackages.length === 1 ? 'package' : 'packages'}
                          {depPackagesExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                        </button>
                        {depPackagesExpanded && (
                          <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 5, maxHeight: 180, overflowY: 'auto', padding: '8px 10px', borderRadius: 8, background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.15)' }}>
                            {dependencyPackages.map((spec, i) => (
                              <span key={i} style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 5, background: 'rgba(251,191,36,0.09)', border: '1px solid rgba(251,191,36,0.2)', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'rgba(251,191,36,0.9)', whiteSpace: 'nowrap' }}>
                                {spec}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* SOURCE FILES */}
                  {runtimeData.paths?.requirementsPath && (
                    <div style={{ display: 'grid', gridTemplateColumns: '100px minmax(0, 1fr)', gap: 10, alignItems: 'start' }}>
                      <HoverInfoLabel label="req.txt" description="Path to the requirements.txt file used as a pip-style dependency source." />
                      <SingleLineCopyValue value={runtimeData.paths.requirementsPath} onCopy={copyTerminalText} onOpenFolder={openFolderForPath} />
                    </div>
                  )}
                  {runtimeData.paths?.pyprojectPath && (
                    <div style={{ display: 'grid', gridTemplateColumns: '100px minmax(0, 1fr)', gap: 10, alignItems: 'start' }}>
                      <HoverInfoLabel label="pyproject" description="Path to the pyproject.toml file. Contains [project].dependencies, [dependency-groups], and build system config." />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <SingleLineCopyValue value={runtimeData.paths.pyprojectPath} onCopy={copyTerminalText} onOpenFolder={openFolderForPath} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              </>
              ) : null}
              </div>
            </ControlCard>
          </>
        ) : null}
        {showMainCards ? (
        <>
        <div ref={pyprojectCardRef}>
        <ControlCard
          title="pyproject.toml"
          subtitle="Manage project dependencies and Python version constraints. Run Sync to apply changes to the environment."
        >
          <div style={{ display: 'grid', gap: 16 }}>
            {/* Metadata strip */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 13px', borderRadius: 9, background: projectDetected ? 'rgba(74,222,128,0.05)' : 'rgba(255,255,255,0.025)', border: `1px solid ${projectDetected ? 'rgba(74,222,128,0.16)' : 'rgba(255,255,255,0.07)'}`, flexWrap: 'wrap', minHeight: 36 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 800, color: projectDetected ? '#4ade80' : '#f59e0b', flexShrink: 0 }}>
                <span style={{ width: 6, height: 6, borderRadius: 999, background: projectDetected ? '#4ade80' : '#f59e0b', display: 'inline-block', flexShrink: 0 }} />
                {projectDetected ? 'Detected' : pythonSignalsDetected ? 'No pyproject.toml' : 'No Python signals'}
              </span>
              {projectDetected && (
                <>
                  <span style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text)', fontWeight: 600 }}>{projectNameLabel}</span>
                  {projectVersionLabel && projectVersionLabel !== '—' && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 5, padding: '1px 7px', fontFamily: 'var(--font-mono)' }}>
                      {projectVersionLabel}
                    </span>
                  )}
                </>
              )}
              <div style={{ flex: 1 }} />
              {projectDetected && projectLocationLabel && projectLocationLabel !== 'Not available' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <button
                    type="button"
                    onClick={() => openFolderForPath(projectLocationLabel)}
                    title="Open containing folder"
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '3px 5px', display: 'flex', alignItems: 'center', opacity: 0.55, borderRadius: 5 }}
                  >
                    <FolderOpen size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => copyTerminalText(projectLocationLabel)}
                    title="Copy path"
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '3px 5px', display: 'flex', alignItems: 'center', opacity: 0.55, borderRadius: 5 }}
                  >
                    <Copy size={13} />
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={() => loadProjectConfig()}
                disabled={projectConfig.loading}
                title="Refresh pyproject.toml"
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: projectConfig.loading ? 'default' : 'pointer', padding: '3px 5px', display: 'flex', alignItems: 'center', opacity: projectConfig.loading ? 0.35 : 0.55, borderRadius: 5 }}
              >
                <RefreshCw size={13} className={projectConfig.loading ? 'spin' : ''} />
              </button>
            </div>

            {/* Validation warning */}
            {(projectNameIsPlaceholder || projectVersionIsPlaceholder) && projectDetected && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 8, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)', fontSize: 12, color: '#fbbf24', fontFamily: 'var(--font-mono)' }}>
                <AlertTriangle size={13} style={{ flexShrink: 0 }} />
                {[
                  projectNameIsPlaceholder && 'name is still the Launchline placeholder',
                  projectVersionIsPlaceholder && 'version is still the default 0.1.0',
                ].filter(Boolean).join(' · ')}
                {' — update these before publishing.'}
              </div>
            )}

            {/* Planned packages suggestion row */}
            {(() => {
              const planned = selectedManifestPackageRows.filter(p => p.state === 'planned');
              if (planned.length === 0) return null;
              return (
                <div style={{ display: 'grid', gap: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    Planned packages — click to fill
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {planned.map(p => {
                      const dependencySpec = p.dependencySpec || p.name;
                      const alreadyDeclared =
                        (projectConfig.data?.dependencies || []).some(d => d.toLowerCase() === dependencySpec.toLowerCase()) ||
                        Object.values(projectConfig.data?.groups || {}).flat().some(d => d.toLowerCase() === dependencySpec.toLowerCase());
                      return (
                        <button
                          key={`${dependencySpec}-${p.group || 'base'}`}
                          type="button"
                          disabled={alreadyDeclared}
                          onClick={() => {
                            setAddDepInput(dependencySpec);
                            setAddDepGroup(p.scope === 'group' && p.group ? p.group : 'base');
                          }}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '4px 10px', borderRadius: 20,
                            border: alreadyDeclared ? '1px solid var(--border)' : '1px solid rgba(251,146,60,0.3)',
                            background: alreadyDeclared ? 'transparent' : 'rgba(251,146,60,0.08)',
                            color: alreadyDeclared ? 'var(--text-muted)' : '#fb923c',
                            fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-mono)',
                            cursor: alreadyDeclared ? 'default' : 'pointer',
                            opacity: alreadyDeclared ? 0.45 : 1,
                          }}
                          title={alreadyDeclared ? 'Already declared in pyproject.toml' : `Click to use ${dependencySpec}${p.scope === 'group' && p.group ? ` (group: ${p.group})` : ''}`}
                        >
                          {dependencySpec}
                          {alreadyDeclared && <span style={{ fontSize: 10, opacity: 0.7 }}>✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Unified form panel */}
            <div style={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, overflow: 'visible', background: 'rgba(255,255,255,0.015)' }}>
              {/* requires-python row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 5, width: 140, flexShrink: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.01em' }}>
                    requires-python
                  </span>
                  <button
                    type="button"
                    onMouseEnter={() => setOpenTip('requires-python')}
                    onMouseLeave={() => setOpenTip(null)}
                    style={{ background: 'none', border: 'none', padding: 0, display: 'inline-flex', cursor: 'help', color: 'var(--text-muted)', opacity: 0.5, flexShrink: 0 }}
                  >
                    <HelpCircle size={12} />
                  </button>
                  {openTip === 'requires-python' && (
                    <div style={{ position: 'absolute', top: 22, left: 0, width: 272, zIndex: 20, padding: '13px 15px', borderRadius: 12, border: '1px solid rgba(192,132,252,0.35)', background: '#0d1829', boxShadow: '0 8px 32px rgba(0,0,0,0.6)', pointerEvents: 'none' }}>
                      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#e879f9', marginBottom: 6 }}>requires-python</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        Specifies which Python versions are compatible with this project. Uses PEP 440 specifiers — e.g. <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>{'>=3.11,<3.14'}</span>. uv reads this when creating or syncing the environment.
                      </div>
                    </div>
                  )}
                </div>
                <input
                  value={requiresPythonDraft}
                  onChange={e => setRequiresPythonDraft(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveRequiresPython()}
                  placeholder="e.g. >=3.12"
                  style={{ ...inputStyle, padding: '6px 10px', fontSize: 12, background: 'rgba(255,255,255,0.04)', fontFamily: 'var(--font-mono)', width: 148, flexShrink: 0 }}
                />
                <button
                  type="button"
                  onClick={saveRequiresPython}
                  disabled={requiresPythonSaving || !requiresPythonDraft.trim() || requiresPythonDraft.trim() === projectConfig.data?.metadata?.requiresPython}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 7, border: '1px solid rgba(139,182,255,0.2)', background: 'rgba(139,182,255,0.08)', color: '#8bb6ff', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0, opacity: requiresPythonSaving || !requiresPythonDraft.trim() || requiresPythonDraft.trim() === projectConfig.data?.metadata?.requiresPython ? 0.4 : 1 }}
                >
                  {requiresPythonSaving ? 'Saving…' : 'Save'}
                </button>
              </div>

              {/* Add dependency row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 5, width: 140, flexShrink: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>
                    Add package
                  </span>
                  <button
                    type="button"
                    onMouseEnter={() => setOpenTip('add-package')}
                    onMouseLeave={() => setOpenTip(null)}
                    style={{ background: 'none', border: 'none', padding: 0, display: 'inline-flex', cursor: 'help', color: 'var(--text-muted)', opacity: 0.5, flexShrink: 0 }}
                  >
                    <HelpCircle size={12} />
                  </button>
                  {openTip === 'add-package' && (
                    <div style={{ position: 'absolute', top: 22, left: 0, width: 272, zIndex: 20, padding: '13px 15px', borderRadius: 12, border: '1px solid rgba(192,132,252,0.35)', background: '#0d1829', boxShadow: '0 8px 32px rgba(0,0,0,0.6)', pointerEvents: 'none' }}>
                      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#e879f9', marginBottom: 6 }}>Add package</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        Enter a package name or PEP 508 dependency spec. Examples: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>requests</span>, <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>pymupdf{'>='}1.24</span>. Written directly to <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>pyproject.toml</span> — run Sync to install.
                      </div>
                    </div>
                  )}
                </div>
                <input
                  value={addDepInput}
                  onChange={e => setAddDepInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addDependency()}
                  placeholder="e.g. pymupdf>=1.24"
                  style={{ ...inputStyle, padding: '6px 10px', fontSize: 12, background: 'rgba(255,255,255,0.04)', flex: '1 1 160px', minWidth: 0, maxWidth: 300 }}
                />
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  <select
                    value={addDepGroup}
                    onChange={e => setAddDepGroup(e.target.value)}
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text)', fontSize: 12, padding: '6px 10px', outline: 'none', cursor: 'pointer', width: 110 }}
                  >
                    <option value="base">base</option>
                    {Object.keys(projectConfig.data?.groups || {}).map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onMouseEnter={() => setOpenTip('section')}
                    onMouseLeave={() => setOpenTip(null)}
                    style={{ background: 'none', border: 'none', padding: 0, display: 'inline-flex', cursor: 'help', color: 'var(--text-muted)', opacity: 0.5 }}
                  >
                    <HelpCircle size={12} />
                  </button>
                  {openTip === 'section' && (
                    <div style={{ position: 'absolute', top: 22, right: 0, width: 280, zIndex: 20, padding: '13px 15px', borderRadius: 12, border: '1px solid rgba(192,132,252,0.35)', background: '#0d1829', boxShadow: '0 8px 32px rgba(0,0,0,0.6)', pointerEvents: 'none' }}>
                      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#e879f9', marginBottom: 6 }}>Section</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>base</span> adds to <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>[project.dependencies]</span>, installed in every environment. Named groups go into <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>[dependency-groups]</span> and can be synced selectively with <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>uv sync --group {'<'}name{'>'}</span>.
                      </div>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={addDependency}
                  disabled={addDepSaving || !addDepInput.trim()}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 7, border: '1px solid rgba(74,222,128,0.18)', background: 'rgba(74,222,128,0.12)', color: '#86efac', fontSize: 12, fontWeight: 700, cursor: addDepSaving || !addDepInput.trim() ? 'not-allowed' : 'pointer', opacity: addDepSaving || !addDepInput.trim() ? 0.5 : 1, flexShrink: 0 }}
                >
                  <Plus size={13} /> {addDepSaving ? 'Adding…' : 'Add'}
                </button>
              </div>
            </div>

            {/* Status message */}
            {depActionMsg && (
              <div style={{ fontSize: 12, color: depActionMsg.ok ? '#4ade80' : '#f87171', padding: '8px 12px', borderRadius: 8, border: `1px solid ${depActionMsg.ok ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)'}`, background: depActionMsg.ok ? 'rgba(74,222,128,0.06)' : 'rgba(248,113,113,0.06)', lineHeight: 1.5 }}>
                {depActionMsg.text}
              </div>
            )}

            {/* Dependency list — three distinct states */}
            {!projectConfig.data ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px', borderRadius: 10, border: '1px solid rgba(251,191,36,0.15)', background: 'rgba(251,191,36,0.04)' }}>
                <AlertTriangle size={14} style={{ color: '#fbbf24', flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  No <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>pyproject.toml</span> found in this workspace. Create one from the header card above to start declaring dependencies.
                </span>
              </div>
            ) : (projectConfig.data.dependencies || []).length === 0 && Object.keys(projectConfig.data.groups || {}).length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                <FileCode2 size={14} style={{ color: 'var(--text-muted)', flexShrink: 0, opacity: 0.5 }} />
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  No packages declared yet — add your first dependency using the form above.
                </span>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {/* Base dependencies */}
                {(projectConfig.data.dependencies || []).length > 0 && (
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                      Base dependencies
                    </div>
                    <div style={{ borderRadius: 10, border: '1px solid rgba(74,222,128,0.14)', background: 'rgba(10,15,26,0.42)', overflow: 'hidden' }}>
                      {(projectConfig.data.dependencies || []).map((spec, i) => (
                        <div key={spec} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 12px', borderBottom: i < projectConfig.data.dependencies.length - 1 ? '1px solid rgba(74,222,128,0.08)' : 'none', background: i % 2 === 1 ? 'rgba(74,222,128,0.02)' : 'transparent' }}>
                          <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>{spec}</span>
                          <button
                            type="button"
                            onClick={() => removeDependency(spec, 'base')}
                            style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '2px 4px', opacity: 0.7, display: 'flex', alignItems: 'center' }}
                            title="Remove from pyproject.toml"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dependency groups */}
                {Object.entries(projectConfig.data.groups || {}).map(([grpName, specs]) => (
                  <div key={grpName}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                        Group: {grpName}
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteGroup(grpName)}
                        style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '2px 4px', opacity: 0.6, display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700 }}
                        title={`Delete group "${grpName}"`}
                      >
                        <Trash2 size={12} /> Delete group
                      </button>
                    </div>
                    <div style={{ borderRadius: 10, border: '1px solid rgba(74,222,128,0.14)', background: 'rgba(10,15,26,0.42)', overflow: 'hidden' }}>
                      {(specs || []).map((spec, i) => (
                        <div key={spec} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 12px', borderBottom: i < specs.length - 1 ? '1px solid rgba(74,222,128,0.08)' : 'none', background: i % 2 === 1 ? 'rgba(74,222,128,0.02)' : 'transparent' }}>
                          <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>{spec}</span>
                          <button
                            type="button"
                            onClick={() => removeDependency(spec, grpName)}
                            style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '2px 4px', opacity: 0.7, display: 'flex', alignItems: 'center' }}
                            title="Remove from pyproject.toml"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Create group — only shown when pyproject.toml exists */}
            {projectConfig.data && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 4, borderTop: '1px solid rgba(255,255,255,0.05)', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 5, width: 140, flexShrink: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>
                    New group
                  </span>
                  <button
                    type="button"
                    onMouseEnter={() => setOpenTip('new-group')}
                    onMouseLeave={() => setOpenTip(null)}
                    style={{ background: 'none', border: 'none', padding: 0, display: 'inline-flex', cursor: 'help', color: 'var(--text-muted)', opacity: 0.5, flexShrink: 0 }}
                  >
                    <HelpCircle size={12} />
                  </button>
                  {openTip === 'new-group' && (
                    <div style={{ position: 'absolute', bottom: 22, left: 0, width: 272, zIndex: 20, padding: '13px 15px', borderRadius: 12, border: '1px solid rgba(192,132,252,0.35)', background: '#0d1829', boxShadow: '0 8px 32px rgba(0,0,0,0.6)', pointerEvents: 'none' }}>
                      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#e879f9', marginBottom: 6 }}>Dependency groups</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        Groups let you separate optional or dev-only packages from the core project. Install selectively with <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>uv sync --group {'<'}name{'>'}</span>. Common names: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>dev</span>, <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>test</span>, <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>lint</span>.
                      </div>
                    </div>
                  )}
                </div>
                <input
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && createGroup()}
                  placeholder="e.g. dev, test, lint"
                  style={{ ...inputStyle, padding: '6px 10px', fontSize: 12, background: 'rgba(255,255,255,0.04)', fontFamily: 'var(--font-mono)', width: 160, flexShrink: 0 }}
                />
                <button
                  type="button"
                  onClick={createGroup}
                  disabled={newGroupSaving || !newGroupName.trim()}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 7, border: '1px solid rgba(251,191,36,0.2)', background: 'rgba(251,191,36,0.06)', color: '#fbbf24', fontSize: 12, fontWeight: 700, cursor: newGroupSaving || !newGroupName.trim() ? 'not-allowed' : 'pointer', opacity: newGroupSaving || !newGroupName.trim() ? 0.4 : 1, flexShrink: 0 }}
                >
                  <Plus size={13} /> {newGroupSaving ? 'Creating…' : 'Create group'}
                </button>
              </div>
            )}
          </div>
        </ControlCard>
        </div>
        </>
        ) : null}
      </SectionWrapper>
      </>
    );
  }

  function renderInstallSection() {
    return renderEnvironmentSection({
      showInstallCards: true,
      showMainCards: false,
      noWrapper: true,
    });
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
      ? '// No user-triggered commands yet. Run a command to see output here.'
      : '// No commands logged yet. Run a command or refresh the environment.';

    return (
      <div style={{ ...pageFooterStyle, height: terminalCollapsed ? 54 : terminalHeight }}>
        {/* Resize handle */}
        <div
          onMouseDown={beginTerminalResize}
          style={{ ...terminalHandleStyle, cursor: terminalCollapsed ? 'default' : 'row-resize' }}
          title="Drag to resize"
        >
          <div style={{ width: 48, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.18)' }} />
        </div>

        {/* Toolbar */}
        <div style={{ padding: '8px 14px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>

            {/* Tab buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {TABS.map(({ id, label }) => {
                const isActive = terminalTab === id;
                const badge = id === 'problems' && problemCount > 0 ? problemCount : null;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => { setTerminalTab(id); if (terminalCollapsed) setTerminalCollapsed(false); }}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 5,
                      color: isActive ? 'var(--text)' : 'var(--text-muted)',
                      fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em',
                      padding: '4px 10px 6px',
                      borderBottom: isActive ? '1px solid var(--text)' : '1px solid transparent',
                    }}
                  >
                    {label}
                    {badge !== null && (
                      <span style={{ background: '#f87171', color: '#fff', borderRadius: 4, fontSize: 10, padding: '1px 5px', fontWeight: 700, lineHeight: 1.4 }}>
                        {badge}
                      </span>
                    )}
                  </button>
                );
              })}
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 10 }}>{terminalStatusText}</span>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {/* Search input */}
              {!terminalCollapsed && (
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Search size={11} style={{ position: 'absolute', left: 7, color: 'var(--text-muted)', pointerEvents: 'none' }} />
                  <input
                    type="text"
                    placeholder="Filter…"
                    value={terminalSearch}
                    onChange={(e) => setTerminalSearch(e.target.value)}
                    style={{
                      ...inputStyle,
                      width: 120, height: 26, fontSize: 11,
                      padding: '0 8px 0 22px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 3,
                    }}
                  />
                </div>
              )}
              <button
                type="button"
                onClick={() => setShowProbes((v) => !v)}
                style={{ ...termBtnStyle, padding: '5px 10px', gap: 5, opacity: showProbes ? 1 : 0.5 }}
                title={showProbes ? 'Currently showing all commands including background probes' : 'Background probe commands are hidden'}
              >
                {showProbes ? 'All commands' : 'User runs only'}
              </button>
              <button
                type="button"
                onClick={() => setTerminalCollapsed((v) => !v)}
                style={{ ...termBtnStyle, padding: '5px 10px', gap: 5 }}
              >
                {terminalCollapsed ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {terminalCollapsed ? 'Show' : 'Hide'}
              </button>
              <button
                type="button"
                onClick={() => copyTerminalText(terminalTranscript)}
                disabled={!terminalTranscript}
                style={{ ...termBtnStyle, padding: '5px 10px', gap: 5, opacity: terminalTranscript ? 1 : 0.35 }}
                title="Copy all output"
              >
                <Copy size={11} />
                Copy all
              </button>
              <button
                type="button"
                onClick={() => loadCommandLog()}
                disabled={commandLog.loading || runState.running}
                style={{ ...termBtnStyle, padding: '5px 10px', gap: 5, opacity: commandLog.loading || runState.running ? 0.45 : 1 }}
              >
                <RefreshCw size={11} />
                Refresh
              </button>
              <button
                type="button"
                onClick={() => clearCommandLog()}
                disabled={commandLog.entries.length === 0}
                style={{ ...termBtnStyle, padding: '5px 10px', gap: 5, opacity: commandLog.entries.length === 0 ? 0.35 : 1 }}
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        {!terminalCollapsed && (
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Scrollable log */}
            <div
              ref={terminalBodyRef}
              className="custom-scrollbar"
              style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 18px 8px', fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.65, userSelect: 'text', WebkitUserSelect: 'text' }}
            >
              {commandLog.error && (
                <div style={{ color: '#f87171' }}>{commandLog.error}</div>
              )}
              {!commandLog.error && terminalFilteredEntries.length === 0 && (
                <div style={{ color: '#8bbcff' }}>{emptyMessage}</div>
              )}
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

                const entryText = [
                  `$ ${entry.command}`,
                  entry.stdout || '',
                  entry.stderr ? `[stderr] ${entry.stderr}` : '',
                  `exit ${entry.code} · ${dur}`,
                ].filter(Boolean).join('\n');

                return (
                  <div key={entryId} style={{ marginBottom: 10, borderLeft: `2px solid ${accentColor}`, paddingLeft: 10 }}>
                    {/* Header row — always visible */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                      {/* Expand chevron (only if there's output to show) */}
                      <button
                        type="button"
                        onClick={() => hasOutput && toggleEntry(entryId)}
                        style={{
                          background: 'none', border: 'none', cursor: hasOutput ? 'pointer' : 'default',
                          padding: '1px 2px', color: hasOutput ? 'var(--text-muted)' : 'transparent',
                          flexShrink: 0, marginTop: 1,
                        }}
                        title={hasOutput ? (isExpanded ? 'Collapse' : 'Expand output') : undefined}
                      >
                        {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      </button>

                      {/* Command + meta */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 2 }}>
                          {ts} · <span style={{ color: 'rgba(255,255,255,0.65)' }}>{entry.source || 'run'}</span>
                          {entry.label && entry.label !== entry.command ? ` · ${entry.label}` : ''}
                        </div>
                        <div style={{ color: '#c4d4ff', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span>
                            <span style={{ color: 'rgba(255,255,255,0.5)' }}>$ </span>{entry.command}
                          </span>
                          <span style={{ color: exitColor, fontSize: 11, flexShrink: 0 }}>
                            {isError ? '✗' : '✓'} exit {entry.code} · {dur}
                          </span>
                        </div>
                      </div>

                      {/* Copy per entry */}
                      <button
                        type="button"
                        onClick={() => copyTerminalText(entryText)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          padding: '2px 4px', color: 'var(--text-muted)', flexShrink: 0,
                          opacity: 0.6,
                        }}
                        title="Copy this entry"
                      >
                        <Copy size={11} />
                      </button>
                    </div>

                    {/* Expanded output */}
                    {isExpanded && hasOutput && (
                      <div style={{ marginTop: 5, paddingLeft: 18 }}>
                        {entry.stdout && (
                          <pre style={{ margin: '0 0 3px', color: '#8bbcff', whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: 12, background: 'transparent' }}>{entry.stdout}</pre>
                        )}
                        {entry.stderr && (
                          <pre style={{ margin: '0 0 3px', color: '#fca5a5', whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: 12, background: 'transparent' }}>{entry.stderr}</pre>
                        )}
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && terminalInput.trim() && !runState.running) {
                    runCommand(terminalInput.trim());
                    setTerminalInput('');
                  }
                }}
                disabled={runState.running}
                style={{
                  ...inputStyle,
                  flex: 1, height: 26, fontSize: 12,
                  fontFamily: 'var(--font-mono)',
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 3,
                  color: '#c4d4ff',
                }}
              />
              <button
                type="button"
                onClick={() => { if (terminalInput.trim()) { runCommand(terminalInput.trim()); setTerminalInput(''); } }}
                disabled={!terminalInput.trim() || runState.running}
                style={{ ...termBtnStyle, padding: '4px 12px', opacity: terminalInput.trim() && !runState.running ? 1 : 0.35 }}
              >
                Run
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={pageWrapStyle}>
      <div style={{ padding: '0 28px 0', flexShrink: 0 }}>
        <TabBar
          tabs={PYTHON_TOOL_TABS}
          active={activeTab}
          onChange={setActiveTab}
          edgeBleedX={28}
          edgeBleedTop={0}
          stickyTop={0}
        />
      </div>

      <div className="custom-scrollbar" style={pageContentStyle}>

        {activeTab === 'environment' ? (
          <>{renderEnvironmentSection({ showInstallCards: false, showMainCards: true, noWrapper: true })}</>
        ) : activeTab === 'installs' ? (
          <>{renderInstallSection()}</>
        ) : (
          renderPackageCatalogWorkbench()
        )}
      </div>
      {renderTerminalLogViewer()}
      {lockfilePackageListModal ? (
        <Modal
          onClose={() => setLockfilePackageListModal(null)}
          title={lockfilePackageListModal.title}
          subtitle={lockfilePackageListModal.subtitle}
          icon={<Box size={18} style={{ color: '#fbbf24' }} />}
          accentColor="#f59e0b"
          maxWidth={480}
          backgroundColor="#0f1726"
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setLockfilePackageListModal(null)}
                style={{ ...actionButtonStyle, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: 'var(--text)' }}
              >
                Close
              </button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {lockfilePackageListModal.packages.map((name, i) => (
              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 10px', borderRadius: 6, background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 28, textAlign: 'right', flexShrink: 0 }}>{i + 1}</span>
                <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>{name}</span>
              </div>
            ))}
          </div>
        </Modal>
      ) : null}
      {syncVenvConfirmOpen ? (
        <Modal
          onClose={() => setSyncVenvConfirmOpen(false)}
          title="Sync virtual environment"
          subtitle="This action installs or refreshes packages in the local .venv."
          icon={<RefreshCw size={18} style={{ color: '#86efac' }} />}
          accentColor="#22c55e"
          maxWidth={600}
          backgroundColor="#0f1726"
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setSyncVenvConfirmOpen(false)}
                style={{
                  ...actionButtonStyle,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => confirmSyncVirtualEnvironment()}
                style={{
                  ...actionButtonStyle,
                  background: 'rgba(34,197,94,0.12)',
                  border: '1px solid rgba(34,197,94,0.28)',
                  color: '#86efac',
                }}
              >
                Sync
              </button>
            </div>
          }
        >
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              Sync the virtual environment against the current project dependency source. Packages will be installed, updated, or removed to match the lockfile exactly.
            </div>
            <div
              style={{
                borderRadius: 12,
                border: '1px solid rgba(34,197,94,0.18)',
                background: 'rgba(34,197,94,0.05)',
                overflow: 'hidden',
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '10px 14px 8px' }}>
                Dependency source
              </div>
              <div style={{ display: 'grid', gap: 0 }}>
                {[
                  {
                    label: 'pyproject.toml',
                    value: runtime.data?.paths?.pyprojectPath || null,
                    present: !!runtime.data?.files?.hasPyproject,
                    role: 'active',
                  },
                  {
                    label: 'uv.lock',
                    value: runtime.data?.paths?.uvLockPath || null,
                    present: !!runtime.data?.paths?.uvLockPath,
                    role: 'active',
                  },
                  {
                    label: 'requirements.txt',
                    value: runtime.data?.paths?.requirementsPath || null,
                    present: !!runtime.data?.paths?.requirementsPath,
                    role: 'fallback',
                  },
                ].map((row, index) => (
                  <div
                    key={row.label}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '120px 1fr auto auto auto',
                      alignItems: 'center',
                      gap: 10,
                      padding: '9px 14px',
                      borderTop: index === 0 ? 'none' : '1px solid rgba(255,255,255,0.05)',
                      opacity: row.role === 'fallback' ? 0.5 : 1,
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {row.label}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row.value || 'Not detected'}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: row.present ? '#4ade80' : 'var(--text-muted)' }}>
                      {row.present ? 'Present' : 'Absent'}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        padding: '3px 7px',
                        borderRadius: 6,
                        whiteSpace: 'nowrap',
                        border: row.role === 'active' ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(251,146,60,0.3)',
                        background: row.role === 'active' ? 'rgba(34,197,94,0.1)' : 'rgba(251,146,60,0.1)',
                        color: row.role === 'active' ? '#86efac' : '#fdba74',
                      }}
                    >
                      {row.role === 'active' ? 'Active' : 'Fallback'}
                    </div>
                    <InlineValueActionButtons
                      value={row.value || ''}
                      onOpenFolder={row.value ? openFolderForPath : null}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 12,
                border: '1px solid rgba(34,197,94,0.18)',
                background: 'rgba(34,197,94,0.08)',
                fontSize: 12,
                color: '#bbf7d0',
                lineHeight: 1.6,
              }}
            >
              This does not change the Python interpreter or recreate the environment folder. Only package contents are affected.
            </div>
          </div>
        </Modal>
      ) : null}
      {createVenvConfirmOpen ? (
        <Modal
          onClose={() => setCreateVenvConfirmOpen(false)}
          title="Create virtual environment"
          subtitle="This action creates a new local .venv folder for this project."
          icon={<AlertTriangle size={18} style={{ color: '#86efac' }} />}
          accentColor="#22c55e"
          maxWidth={600}
          backgroundColor="#0f1726"
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setCreateVenvConfirmOpen(false)}
                style={{
                  ...actionButtonStyle,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => confirmCreateVirtualEnvironment()}
                style={{
                  ...actionButtonStyle,
                  background: 'rgba(34,197,94,0.12)',
                  border: '1px solid rgba(34,197,94,0.28)',
                  color: '#86efac',
                }}
              >
                Create
              </button>
            </div>
          }
        >
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              Create a new virtual environment for this project using the selected Python runtime below.
            </div>
            <div
              style={{
                borderRadius: 12,
                border: '1px solid rgba(34,197,94,0.18)',
                background: 'rgba(34,197,94,0.05)',
                overflow: 'hidden',
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '10px 14px 8px' }}>
                Target runtime
              </div>
              {verifiedAvailableRuntimeOptions.length > 0 ? verifiedAvailableRuntimeOptions.map((rt, index) => {
                const rtLabel = rt.version ? `Python ${rt.version}` : (rt.label || 'Unknown');
                const effectiveSelected = createModalRuntimePath
                  ? createModalRuntimePath === rt.path
                  : Boolean(rt.isDefault);
                return (
                  <button
                    key={rt.path || rt.label}
                    type="button"
                    onClick={() => setCreateModalRuntimePath(rt.path)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'auto 1fr auto',
                      alignItems: 'center',
                      gap: 10,
                      width: '100%',
                      padding: '10px 14px',
                      borderTop: index === 0 ? 'none' : '1px solid rgba(255,255,255,0.05)',
                      borderLeft: 'none',
                      borderRight: 'none',
                      borderBottom: 'none',
                      background: effectiveSelected ? 'rgba(34,197,94,0.10)' : 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        border: effectiveSelected ? '4px solid #22c55e' : '2px solid rgba(255,255,255,0.2)',
                        background: effectiveSelected ? '#22c55e' : 'transparent',
                        flexShrink: 0,
                        transition: 'border 0.15s, background 0.15s',
                      }}
                    />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: effectiveSelected ? '#86efac' : 'var(--text)', fontFamily: 'var(--font-mono)' }}>
                        {rtLabel}{rt.isDefault ? ' (Default)' : ''}
                      </div>
                      {rt.path ? (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {rt.path}
                        </div>
                      ) : null}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {rt.source || ''}
                    </div>
                  </button>
                );
              }) : (
                <div style={{ padding: '10px 14px 12px', fontSize: 13, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
                  {rebuildTargetRuntimeLabel}
                </div>
              )}
            </div>
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 12,
                border: '1px solid rgba(34,197,94,0.18)',
                background: 'rgba(34,197,94,0.08)',
                fontSize: 12,
                color: '#bbf7d0',
                lineHeight: 1.6,
              }}
            >
              The new environment will use the selected runtime above. Run <span style={{ fontWeight: 700 }}>Sync</span> afterward to install packages from the project dependency source.
            </div>
          </div>
        </Modal>
      ) : null}
      {rebuildVenvConfirmOpen ? (
        <Modal
          onClose={() => setRebuildVenvConfirmOpen(false)}
          title="Rebuild virtual environment"
          subtitle="This action recreates the local .venv folder for this project."
          icon={<AlertTriangle size={18} style={{ color: '#86efac' }} />}
          accentColor="#22c55e"
          maxWidth={600}
          backgroundColor="#0f1726"
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setRebuildVenvConfirmOpen(false)}
                style={{
                  ...actionButtonStyle,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => confirmRebuildVirtualEnvironment()}
                style={{
                  ...actionButtonStyle,
                  background: 'rgba(34,197,94,0.12)',
                  border: '1px solid rgba(34,197,94,0.28)',
                  color: '#86efac',
                }}
              >
                Rebuild
              </button>
            </div>
          }
        >
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              Rebuild the current virtual environment? Launchline will remove the existing <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>.venv</span> folder and recreate it from scratch.
            </div>
            <div
              style={{
                borderRadius: 12,
                border: '1px solid rgba(34,197,94,0.18)',
                background: 'rgba(34,197,94,0.05)',
                overflow: 'hidden',
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '10px 14px 8px' }}>
                Target runtime
              </div>
              {verifiedAvailableRuntimeOptions.length > 0 ? verifiedAvailableRuntimeOptions.map((rt, index) => {
                const rtLabel = rt.version ? `Python ${rt.version}` : (rt.label || 'Unknown');
                const effectiveSelected = rebuildModalRuntimePath
                  ? rebuildModalRuntimePath === rt.path
                  : Boolean(rt.isDefault);
                return (
                  <button
                    key={rt.path || rt.label}
                    type="button"
                    onClick={() => setRebuildModalRuntimePath(rt.path)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'auto 1fr auto',
                      alignItems: 'center',
                      gap: 10,
                      width: '100%',
                      padding: '10px 14px',
                      borderTop: index === 0 ? 'none' : '1px solid rgba(255,255,255,0.05)',
                      borderLeft: 'none',
                      borderRight: 'none',
                      borderBottom: 'none',
                      background: effectiveSelected ? 'rgba(34,197,94,0.10)' : 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        border: effectiveSelected ? '4px solid #22c55e' : '2px solid rgba(255,255,255,0.2)',
                        background: effectiveSelected ? '#22c55e' : 'transparent',
                        flexShrink: 0,
                        transition: 'border 0.15s, background 0.15s',
                      }}
                    />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: effectiveSelected ? '#86efac' : 'var(--text)', fontFamily: 'var(--font-mono)' }}>
                        {rtLabel}{rt.isDefault ? ' (Default)' : ''}
                      </div>
                      {rt.path ? (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {rt.path}
                        </div>
                      ) : null}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {rt.source || ''}
                    </div>
                  </button>
                );
              }) : (
                <div style={{ padding: '10px 14px 12px', fontSize: 13, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
                  {rebuildTargetRuntimeLabel}
                </div>
              )}
            </div>
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 12,
                border: '1px solid rgba(34,197,94,0.18)',
                background: 'rgba(34,197,94,0.08)',
                fontSize: 12,
                color: '#bbf7d0',
                lineHeight: 1.6,
              }}
            >
              The recreated environment will use the selected runtime above, then you can run <span style={{ fontWeight: 700 }}>Sync</span> if you want to repopulate packages from the project dependency source.
            </div>
          </div>
        </Modal>
      ) : null}
      {targetRuntimeConfirmOpen ? (
        <Modal
          onClose={() => {
            setTargetRuntimeConfirmOpen(false);
            setPendingTargetRuntimePath('');
          }}
          title="Set target runtime"
          subtitle="This action changes which Python runtime Launchline will use for the next environment create or rebuild."
          icon={<TerminalSquare size={18} style={{ color: '#8bb6ff' }} />}
          accentColor="#5b9aff"
          maxWidth={560}
          backgroundColor="#0f1726"
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => {
                  setTargetRuntimeConfirmOpen(false);
                  setPendingTargetRuntimePath('');
                }}
                style={{
                  ...actionButtonStyle,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => confirmTargetRuntimeSelection()}
                style={{
                  ...actionButtonStyle,
                  background: 'rgba(91,154,255,0.12)',
                  border: '1px solid rgba(91,154,255,0.28)',
                  color: '#8bb6ff',
                }}
              >
                Set target
              </button>
            </div>
          }
        >
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              Set this Python runtime as the new target for future <span style={{ fontWeight: 700 }}>Create</span> and <span style={{ fontWeight: 700 }}>Rebuild</span> actions.
            </div>
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 12,
                border: '1px solid rgba(91,154,255,0.18)',
                background: 'rgba(91,154,255,0.08)',
                display: 'grid',
                gap: 6,
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Selected runtime
              </div>
              <div style={{ fontSize: 13, color: 'var(--text)', fontFamily: 'var(--font-mono)', lineHeight: 1.6 }}>
                {pendingTargetRuntimeLabel}
              </div>
            </div>
          </div>
        </Modal>
      ) : null}
      {deleteVenvConfirmOpen ? (
        <Modal
          onClose={() => setDeleteVenvConfirmOpen(false)}
          title="Delete virtual environment"
          subtitle="This action removes the local .venv folder for this project."
          icon={<AlertTriangle size={18} style={{ color: '#fca5a5' }} />}
          accentColor="#f87171"
          maxWidth={560}
          backgroundColor="#0f1726"
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setDeleteVenvConfirmOpen(false)}
                style={{
                  ...actionButtonStyle,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => confirmDeleteVirtualEnvironment()}
                style={{
                  ...actionButtonStyle,
                  background: 'rgba(248,113,113,0.12)',
                  border: '1px solid rgba(248,113,113,0.28)',
                  color: '#fca5a5',
                }}
              >
                Delete
              </button>
            </div>
          }
        >
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              Delete the current virtual environment? This will remove the <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>.venv</span> folder for this project.
            </div>
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 12,
                border: '1px solid rgba(248,113,113,0.18)',
                background: 'rgba(248,113,113,0.08)',
                fontSize: 12,
                color: '#fecaca',
                lineHeight: 1.6,
              }}
            >
              You can recreate it later from the same card using <span style={{ fontWeight: 700 }}>Create</span> or <span style={{ fontWeight: 700 }}>Rebuild</span>.
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
