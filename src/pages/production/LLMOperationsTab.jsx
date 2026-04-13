import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  FileText,
  FolderOpen,
  HelpCircle,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  TestTube2,
} from 'lucide-react';
import Modal from '../../components/Modal';
import LLMProviderControls from './LLMProviderControls';
import { SETTINGS_DEFAULT, useSettings } from '../../hooks/useSettings';

const T = {
  color: '#22d3ee',
  r: 'rgba(34,211,238,',
};

const cardStyle = {
  borderRadius: 12,
  padding: '14px 16px',
  border: '1px solid rgba(34,211,238,0.18)',
  background: 'rgba(34,211,238,0.04)',
};

const sectionCardStyle = {
  border: '1px solid rgba(34,211,238,0.15)',
  borderRadius: 12,
  background: 'rgba(10,15,26,0.5)',
  overflow: 'visible',
};

const buttonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 14px',
  borderRadius: 10,
  border: `1px solid ${T.r}0.28)`,
  background: 'rgba(34,211,238,0.08)',
  color: T.color,
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
};

const customProviderButtonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 12px',
  borderRadius: 10,
  border: `1px solid ${T.r}0.28)`,
  background: 'rgba(34,211,238,0.08)',
  color: T.color,
  fontSize: 11,
  fontWeight: 800,
  cursor: 'pointer',
};

const EMPTY_CUSTOM_PROVIDER_FORM = {
  id: '',
  label: '',
  docsUrl: '',
  dependencyKeywords: '',
  envKeywords: '',
  sourceKeywords: '',
};

const PROVIDER_HEURISTIC_EDITOR_FIELDS = [
  {
    key: 'dependencyKeywords',
    label: 'Dependency Keywords',
    placeholder: 'deepseek\n@deepseek/sdk',
    hint: 'SDK package names or dependency identifiers.',
  },
  {
    key: 'envKeywords',
    label: 'Env / Config Keywords',
    placeholder: 'DEEPSEEK_API_KEY\napi.deepseek.com',
    hint: 'API keys, endpoints, or config variable names.',
  },
  {
    key: 'sourceKeywords',
    label: 'Source Keywords',
    placeholder: 'deepseek-chat\ndeepseek-reasoner',
    hint: 'Client constructors, model IDs, or source call patterns.',
  },
];

const PROMPT_ASSET_RULE_DEFINITIONS = [
  {
    id: 'dedicatedPromptDir',
    label: 'Dedicated prompts directory',
    description: 'A clear repo folder like prompts/, system-prompts/, or prompt-templates/ that separates prompts from app code.',
    detectionSummary: 'Launchline scans workspace directories for prompt-specific folder names and also treats prompt files nested under those directories as evidence of a dedicated prompt home.',
    ruleGroups: [
      {
        title: 'Directory names',
        items: ['prompts/', 'prompt/', 'system-prompts/', 'prompt-templates/', 'templates/'],
      },
      {
        title: 'What counts as evidence',
        items: [
          'A matching directory anywhere in the workspace',
          'Prompt files stored inside a matching directory path',
        ],
      },
    ],
    recommendations: [
      'Create a top-level prompts/ folder so prompt assets have a stable home outside normal app code.',
      'Keep long-lived system prompts, templates, and reusable instructions inside that directory tree.',
      'Use a folder name Launchline can detect consistently, such as prompts/ or system-prompts/.',
    ],
  },
  {
    id: 'systemPromptFiles',
    label: 'System prompt files',
    description: 'Files whose names suggest system prompts, instructions, or long-lived control prompts.',
    detectionSummary: 'Launchline checks prompt-like file paths for naming patterns that look like system prompts or durable instruction files.',
    ruleGroups: [
      {
        title: 'Filename patterns',
        items: ['system', 'instruction', 'instructions'],
      },
      {
        title: 'File types checked',
        items: ['.md', '.txt', '.json', '.yaml', '.yml', '.prompt', '.jinja', '.j2'],
      },
    ],
    recommendations: [
      'Store the core system prompt in a clearly named file such as prompts/system-prompt.md.',
      'Keep durable orchestration instructions separate from user-facing prompt fragments.',
      'Use names that make the prompt role obvious in code review.',
    ],
  },
  {
    id: 'versionedFiles',
    label: 'Versioned prompt files',
    description: 'Prompt files that explicitly carry version numbers or versioned naming patterns.',
    detectionSummary: 'Launchline looks for prompt file names that carry version markers so prompt revisions can be tracked intentionally.',
    ruleGroups: [
      {
        title: 'Version markers',
        items: ['v1', 'v2', 'v3', 'version', 'versioned filenames'],
      },
      {
        title: 'Typical examples',
        items: ['prompts/system-v1.md', 'prompts/retrieval-prompt-v2.md', 'prompts/version-3.yaml'],
      },
    ],
    recommendations: [
      'Add explicit version markers to prompt filenames when you want prompt revisions to be easy to compare.',
      'Keep older prompt versions in source control instead of overwriting them silently.',
      'Use the same naming pattern across the prompt directory so versions stay understandable.',
    ],
  },
  {
    id: 'templatedFiles',
    label: 'Templated prompts',
    description: 'Prompt files containing variables or template placeholders such as {{var}}, {var}, or <var>.',
    detectionSummary: 'Launchline reads prompt-like text files and looks for recognizable variable placeholders that suggest the prompt is meant to be parameterized.',
    ruleGroups: [
      {
        title: 'Placeholder patterns',
        items: ['{{variable}}', '{variable}', '<variable>'],
      },
      {
        title: 'What this implies',
        items: [
          'Prompt text is designed to be reused with runtime values',
          'Template structure is visible instead of being hidden in string concatenation',
        ],
      },
    ],
    recommendations: [
      'Use explicit placeholders in prompt files instead of assembling long prompts inline in code.',
      'Keep variable names stable and descriptive so prompt templates are easy to audit.',
      'Pair templated prompts with prompt assets stored in a dedicated directory.',
    ],
  },
];

function getPromptAssetEvidenceLabel(items = []) {
  if (!items.length) return '—';
  const allDirs = items.every((item) => item.type === 'directory');
  const singular = allDirs ? 'dir' : 'file';
  const plural = allDirs ? 'dirs' : 'files';
  return `${items.length} ${items.length === 1 ? singular : plural}`;
}

function createPromptAssetRows(promptAssets, onCreatePromptDirectory) {
  const definitions = PROMPT_ASSET_RULE_DEFINITIONS;
  return definitions.map((definition) => {
    if (definition.id === 'dedicatedPromptDir') {
      const evidenceItems = promptAssets.dedicatedDirDetails || [];
      return {
        ...definition,
        status: promptAssets.hasDedicatedPromptDir ? 'detected' : 'not detected',
        evidenceItems,
        actionLabel: promptAssets.hasDedicatedPromptDir ? '' : 'Create prompts/',
        onAction: promptAssets.hasDedicatedPromptDir ? null : onCreatePromptDirectory,
      };
    }
    if (definition.id === 'systemPromptFiles') {
      const evidenceItems = promptAssets.systemPromptFileDetails || [];
      return {
        ...definition,
        status: evidenceItems.length > 0 ? 'detected' : 'not detected',
        evidenceItems,
      };
    }
    if (definition.id === 'versionedFiles') {
      const evidenceItems = promptAssets.versionedFileDetails || [];
      return {
        ...definition,
        status: evidenceItems.length > 0 ? 'detected' : 'not detected',
        evidenceItems,
      };
    }
    const evidenceItems = promptAssets.templatedFileDetails || [];
    return {
      ...definition,
      status: evidenceItems.length > 0 ? 'detected' : 'not detected',
      evidenceItems,
    };
  });
}

function splitKeywords(value) {
  return String(value || '')
    .split(/\r?\n|[,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function slugifyProviderId(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

function createProviderFormFromRow(provider) {
  return {
    id: provider?.id || '',
    label: provider?.label || '',
    docsUrl: provider?.docsUrl || '',
    dependencyKeywords: (provider?.dependencyKeywords || []).join('\n'),
    envKeywords: (provider?.envKeywords || []).join('\n'),
    sourceKeywords: (provider?.sourceKeywords || []).join('\n'),
  };
}

const llmOpsBacklogGroups = [
  {
    title: 'Done',
    tone: 'good',
    items: [
      'Provider configuration with session-only API keys',
      'Live connection testing for supported providers',
      'Curated provider model catalogs and picker modal',
      'Provider-specific capability probing in validation state',
      'Prompt tester with reusable prompts and prompt history',
      'Prompt/model comparison runs',
      'Version-aware saved prompt sets with provider/model bindings',
      'Manual eval runner with saved eval history',
      'Eval gate controls and gate-aware eval summaries',
      'Richer observability, budget warnings, and failure categorization',
      'Human review notes and escalation handling in eval runs',
      'Feature bindings editor',
    ],
  },
  {
    title: 'In Progress',
    tone: 'warn',
    items: [],
  },
  {
    title: 'Next Targets',
    tone: 'default',
    items: [
      'Side-by-side provider benchmarking',
      'Prompt asset previews and richer file inspection',
      'Provider-aware saved presets and task bindings',
      'Auto-generated feature binding graph and inline usage tracing',
      'Exportable eval summaries and richer result review',
      'Framework integrations detector',
      'Tool calling and agent integrations detector',
      'Retrieval and vector database integrations detector',
      'Embedding provider integrations detector',
      'Guardrail and safety integrations detector',
      'Evaluation and observability platform integrations detector',
      'Prompt management integrations detector',
      'Hosting and serving integrations detector',
      'Auth and secret integrations for LLM systems',
      'Workflow and automation integrations detector',
    ],
  },
];

function SmallPill({ children, tone = 'default', style = {} }) {
  const palette = tone === 'good'
    ? { bg: 'rgba(74,222,128,0.1)', border: 'rgba(74,222,128,0.28)', color: '#4ade80' }
    : tone === 'warn'
      ? { bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.28)', color: '#fbbf24' }
      : { bg: `${T.r}0.08)`, border: `${T.r}0.22)`, color: T.color };
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '3px 8px',
      borderRadius: 999,
      fontSize: 10,
      fontWeight: 700,
      border: `1px solid ${palette.border}`,
      background: palette.bg,
      color: palette.color,
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      ...style,
    }}>
      {children}
    </span>
  );
}

function CheckItem({ pass, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
      <span style={{ fontSize: 13, lineHeight: 1, color: pass ? '#4ade80' : '#f87171', flexShrink: 0 }}>
        {pass ? '✓' : '✗'}
      </span>
      <span style={{ fontSize: 11, color: pass ? 'var(--text-secondary)' : 'var(--text)' }}>{label}</span>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, paddingTop: 4 }}>
      <AlertTriangle size={12} color="#fbbf24" style={{ flexShrink: 0, marginTop: 1 }} />
      <span style={{ fontSize: 12, color: '#fbbf24', lineHeight: 1.6 }}>{text}</span>
    </div>
  );
}

function MissingSignalsTable({ rows, label = 'Expected signals not detected' }) {
  const [openRecommendationKey, setOpenRecommendationKey] = useState(null);

  useEffect(() => {
    if (!openRecommendationKey) return undefined;
    const onDocumentPointerDown = () => setOpenRecommendationKey(null);
    document.addEventListener('mousedown', onDocumentPointerDown);
    return () => document.removeEventListener('mousedown', onDocumentPointerDown);
  }, [openRecommendationKey]);

  return (
    <div style={{ ...cardStyle, background: 'rgba(255,255,255,0.02)', display: 'grid', gap: 10 }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.55)` }}>
        {label}
      </div>
      <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, overflow: 'visible' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 220px) minmax(0, 1fr) 120px 180px', gap: 12, padding: '10px 12px', background: 'rgba(255,255,255,0.03)', fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          <div>Signal</div>
          <div>What Launchline Looked For</div>
          <div>Status</div>
          <div>Solutions</div>
        </div>
        {rows.map((row, index) => (
          <div
            key={row.label}
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(180px, 220px) minmax(0, 1fr) 120px 180px',
              gap: 12,
              padding: '10px 12px',
              borderTop: index === 0 ? 'none' : '1px solid rgba(255,255,255,0.06)',
              alignItems: 'start',
              position: 'relative',
              zIndex: openRecommendationKey === row.label ? 5 : 1,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: '#fbbf24' }}>{row.label}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{row.description}</div>
            <div>
              <SmallPill tone={row.status === 'detected' ? 'good' : row.status === 'not detected' ? 'warn' : 'default'}>
                {row.status || 'not detected'}
              </SmallPill>
            </div>
            <div style={{ position: 'relative' }}>
              {row.actionLabel && row.onAction ? (
                <button
                  type="button"
                  onClick={row.onAction}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 10px',
                    borderRadius: 9,
                    border: `1px solid ${T.r}0.28)`,
                    background: 'rgba(34,211,238,0.08)',
                    color: T.color,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <Sparkles size={12} />
                  {row.actionLabel}
                </button>
              ) : row.recommendations?.length ? (
                <>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setOpenRecommendationKey((current) => (current === row.label ? null : row.label));
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 10px',
                      borderRadius: 999,
                      border: '1px solid rgba(168,85,247,0.35)',
                      background: 'rgba(168,85,247,0.12)',
                      color: '#c084fc',
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                    }}
                  >
                    Recommendations
                  </button>
                  {openRecommendationKey === row.label && (
                    <div
                      onMouseDown={(event) => event.stopPropagation()}
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 8px)',
                        right: 0,
                        width: 300,
                        zIndex: 20,
                        borderRadius: 12,
                        border: '1px solid rgba(168,85,247,0.32)',
                        background: 'linear-gradient(180deg, rgba(27,19,43,0.98) 0%, rgba(15,12,27,0.98) 100%)',
                        boxShadow: '0 18px 40px rgba(0,0,0,0.45)',
                        padding: '12px 14px',
                        display: 'grid',
                        gap: 10,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 24,
                          height: 24,
                          display: 'grid',
                          placeItems: 'center',
                          borderRadius: 8,
                          background: 'rgba(168,85,247,0.14)',
                          border: '1px solid rgba(168,85,247,0.25)',
                        }}>
                          <Sparkles size={12} color="#c084fc" />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#c084fc' }}>
                            Recommended next steps
                          </div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{row.label}</div>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gap: 8 }}>
                        {row.recommendations.map((item) => (
                          <div key={item} style={{ display: 'grid', gridTemplateColumns: '12px minmax(0, 1fr)', gap: 8 }}>
                            <span style={{ fontSize: 12, color: '#c084fc', lineHeight: 1.5 }}>•</span>
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{item}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{
                        fontSize: 11,
                        color: 'rgba(192,132,252,0.88)',
                        lineHeight: 1.55,
                        paddingTop: 2,
                        borderTop: '1px solid rgba(168,85,247,0.16)',
                      }}>
                        Add the asset to the loaded workspace, then rerun the section check so Launchline can detect it.
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FileChip({ children }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      maxWidth: '100%',
      padding: '4px 8px',
      borderRadius: 8,
      border: '1px solid rgba(255,255,255,0.08)',
      background: 'rgba(255,255,255,0.03)',
      color: 'var(--text-secondary)',
      fontSize: 11,
      fontFamily: 'var(--font-mono)',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  );
}

function ScoreCard({ score }) {
  const { passed, total, checks } = score;
  const scoreColor = passed === total ? '#4ade80' : passed >= Math.max(1, total * 0.6) ? '#fbbf24' : '#f87171';
  const barWidth = total > 0 ? Math.round((passed / total) * 100) : 0;
  return (
    <div style={{ ...cardStyle, borderColor: passed === total ? 'rgba(74,222,128,0.25)' : 'rgba(34,211,238,0.18)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <Sparkles size={14} style={{ color: T.color, flexShrink: 0 }} />
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.58)`, flex: 1 }}>
          LLMOps Readiness
        </span>
        <span style={{ fontSize: 13, fontWeight: 800, color: scoreColor }}>{passed}/{total}</span>
      </div>
      <div style={{ height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.07)', marginBottom: 10, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${barWidth}%`, borderRadius: 999, background: scoreColor, transition: 'width 0.35s ease' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' }}>
        {checks.map((check) => (
          <CheckItem key={check.id} pass={check.pass} label={check.label} />
        ))}
      </div>
    </div>
  );
}

function SummaryTile({ label, value, hint, tone = 'default' }) {
  const color = tone === 'good' ? '#4ade80' : tone === 'warn' ? '#fbbf24' : 'var(--text)';
  return (
    <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.55)` }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{hint}</div>
    </div>
  );
}

function ProviderSection({
  providers = [],
  customProviderHeuristics = [],
  providerHeuristicOverrides = {},
  onSaveCustomProviders,
  onSaveProviderOverrides,
  onRunChecks,
  checking = false,
}) {
    const [openEvidenceState, setOpenEvidenceState] = useState(null);
    const [providerEditorState, setProviderEditorState] = useState(null);
    const [customProviderForm, setCustomProviderForm] = useState(EMPTY_CUSTOM_PROVIDER_FORM);
    const [customProviderError, setCustomProviderError] = useState('');
    const [savingCustomProvider, setSavingCustomProvider] = useState(false);

    useEffect(() => {
      if (!openEvidenceState) return undefined;
      const onDocumentPointerDown = (event) => {
        const target = event.target;
        if (target instanceof HTMLElement && target.closest('[data-provider-evidence-anchor="true"]')) return;
        setOpenEvidenceState(null);
      };
      document.addEventListener('mousedown', onDocumentPointerDown);
      return () => document.removeEventListener('mousedown', onDocumentPointerDown);
    }, [openEvidenceState]);

    const providerRows = [...providers].sort((a, b) => a.label.localeCompare(b.label));
    const detectedCount = providerRows.filter((row) => row.detected).length;

    const resetCustomProviderForm = () => {
      setCustomProviderForm(EMPTY_CUSTOM_PROVIDER_FORM);
      setCustomProviderError('');
    };

    const openCustomProviderModal = () => {
      setCustomProviderForm(EMPTY_CUSTOM_PROVIDER_FORM);
      setCustomProviderError('');
      setProviderEditorState({ mode: 'create', provider: null });
    };

    const openProviderRulesEditor = (provider) => {
      setCustomProviderForm(createProviderFormFromRow(provider));
      setCustomProviderError('');
      setProviderEditorState({ mode: 'edit', provider });
    };

    const closeProviderEditor = () => {
      setProviderEditorState(null);
      resetCustomProviderForm();
    };

    const saveCustomProvider = async () => {
      const editingProvider = providerEditorState?.provider || null;
      const isEditing = providerEditorState?.mode === 'edit';
      const label = customProviderForm.label.trim();
      const dependencyKeywords = splitKeywords(customProviderForm.dependencyKeywords);
      const envKeywords = splitKeywords(customProviderForm.envKeywords);
      const sourceKeywords = splitKeywords(customProviderForm.sourceKeywords);
      const docsUrl = customProviderForm.docsUrl.trim();

      if (!label) {
        setCustomProviderError('Provider name is required.');
        return;
      }

      if (!dependencyKeywords.length && !envKeywords.length && !sourceKeywords.length) {
        setCustomProviderError('Add at least one dependency, env/config, or source keyword.');
        return;
      }

      const slug = slugifyProviderId(label);
      if (!slug) {
        setCustomProviderError('Provider name must contain letters or numbers.');
        return;
      }

      const customId = isEditing
        ? String(editingProvider?.id || customProviderForm.id || `custom-${slug}`)
        : `custom-${slug}`;

      const existingIds = new Set(providerRows.map((provider) => provider.id));
      const existingLabels = new Set(providerRows.map((provider) => provider.label.toLowerCase()));
      if (
        (!isEditing && (existingIds.has(customId) || existingLabels.has(label.toLowerCase())))
        || (
          isEditing
          && providerRows.some((provider) => provider.id !== editingProvider?.id && (provider.id === customId || provider.label.toLowerCase() === label.toLowerCase()))
        )
      ) {
        setCustomProviderError('A provider with this name already exists.');
        return;
      }

      setSavingCustomProvider(true);
      setCustomProviderError('');
      try {
        const normalizedProvider = {
          id: customId,
          label,
          docsUrl,
          dependencyKeywords,
          envKeywords,
          sourceKeywords,
        };

        if (isEditing && editingProvider && !editingProvider.isCustom) {
          await onSaveProviderOverrides?.({
            ...providerHeuristicOverrides,
            [editingProvider.id]: normalizedProvider,
          });
        } else {
          const nextCustomProviders = isEditing && editingProvider
            ? customProviderHeuristics.map((provider) => (provider.id === editingProvider.id ? normalizedProvider : provider))
            : [...customProviderHeuristics, normalizedProvider];
          await onSaveCustomProviders?.(nextCustomProviders);
        }
        closeProviderEditor();
      } catch (error) {
        setCustomProviderError(error?.message || 'Unable to save custom provider heuristics.');
      } finally {
        setSavingCustomProvider(false);
      }
    };

    return (
      <div style={{ ...sectionCardStyle, padding: '14px 16px' }}>
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ ...cardStyle, background: 'rgba(255,255,255,0.02)', display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.55)` }}>
                Provider Heuristics
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <SmallPill
                  tone={detectedCount > 0 ? 'good' : 'warn'}
                  style={{
                    height: 36,
                    padding: '0 14px',
                    borderRadius: 10,
                    fontSize: 12,
                    fontWeight: 800,
                    letterSpacing: '0.06em',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxSizing: 'border-box',
                    lineHeight: 1,
                  }}
                >
                  {detectedCount} detected
                </SmallPill>
                <button
                  type="button"
                  onClick={onRunChecks}
                  style={{ ...buttonStyle, padding: '8px 12px' }}
                  disabled={checking}
                >
                  <RefreshCw size={13} style={checking ? { animation: 'spin 1s linear infinite' } : undefined} />
                  {checking ? 'Checking…' : 'Run Check'}
                </button>
                <button type="button" onClick={openCustomProviderModal} style={customProviderButtonStyle}>
                  <Sparkles size={12} />
                  Add Provider
                </button>
              </div>
            </div>
            <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, overflow: 'visible' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(190px, 2fr) minmax(130px, 0.9fr) minmax(120px, 0.8fr) minmax(130px, 0.9fr) minmax(110px, 0.8fr) minmax(120px, 0.9fr)', gap: 12, padding: '10px 12px', background: 'rgba(255,255,255,0.03)', fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                <div>Provider</div>
                <div>Status</div>
                <div>Dependency</div>
                <div>Env / Config</div>
                <div>Source</div>
                <div>Rules</div>
              </div>
              {providerRows.map((row, index) => (
                <div
                  key={row.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(190px, 2fr) minmax(130px, 0.9fr) minmax(120px, 0.8fr) minmax(130px, 0.9fr) minmax(110px, 0.8fr) minmax(120px, 0.9fr)',
                    gap: 12,
                    padding: '10px 12px',
                    borderTop: index === 0 ? 'none' : '1px solid rgba(255,255,255,0.06)',
                    alignItems: 'start',
                    position: 'relative',
                    zIndex: (row.sources || []).some((source) => openEvidenceState?.key === `${row.id}:${source}`) ? 2000 : 1,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#fbbf24' }}>{row.label}</div>
                    {row.isCustom ? <SmallPill style={{ paddingInline: 6 }}>Custom</SmallPill> : null}
                  </div>
                  <div>
                    <SmallPill tone={row.detected ? 'good' : 'warn'}>
                      {row.detected ? 'detected' : 'not detected'}
                    </SmallPill>
                  </div>
                  {['dependency', 'env', 'source'].map((source) => {
                    const evidence = row.signals?.[source] || [];
                    const evidenceKey = `${row.id}:${source}`;
                    return (
                      <div key={evidenceKey} style={{ display: 'flex', flexWrap: 'wrap', gap: 6, position: 'relative' }}>
                        {evidence.length > 0 ? (
                          <div style={{ position: 'relative' }} data-provider-evidence-anchor="true">
                            <button
                              type="button"
                              data-provider-evidence-anchor="true"
                              onMouseDown={(event) => event.stopPropagation()}
                              onClick={(event) => {
                                event.stopPropagation();
                                if (openEvidenceState?.key === evidenceKey) {
                                  setOpenEvidenceState(null);
                                  return;
                                }
                                const rect = event.currentTarget.getBoundingClientRect();
                                const scrollPane = event.currentTarget.closest('[data-llmops-signal-content="true"]');
                                const paneRect = scrollPane?.getBoundingClientRect?.() || {
                                  top: 8,
                                  bottom: window.innerHeight - 8,
                                };
                                const popoverWidth = Math.min(460, Math.max(320, window.innerWidth - 32));
                                const estimatedContentHeight = Math.min(
                                  360,
                                  120 + (evidence.length * 92),
                                );
                                const topLimit = Math.max((paneRect.top || 0) + 8, 8);
                                const bottomLimit = Math.min((paneRect.bottom || window.innerHeight) - 8, window.innerHeight - 8);
                                const spaceAbove = Math.max(rect.top - topLimit - 8, 120);
                                const spaceBelow = Math.max(bottomLimit - rect.bottom - 8, 120);
                                const placement = spaceBelow >= estimatedContentHeight
                                  ? 'down'
                                  : spaceAbove >= estimatedContentHeight
                                    ? 'up'
                                    : spaceBelow >= spaceAbove
                                      ? 'down'
                                      : 'up';
                                const maxHeight = Math.max(
                                  220,
                                  Math.min(estimatedContentHeight, placement === 'down' ? spaceBelow : spaceAbove),
                                );
                                const left = Math.min(
                                  Math.max(rect.right - popoverWidth, 8),
                                  window.innerWidth - popoverWidth - 8,
                                );
                                const top = placement === 'down'
                                  ? rect.bottom + 8
                                  : Math.max(topLimit, rect.top - 8 - maxHeight);
                                setOpenEvidenceState({
                                  key: evidenceKey,
                                  placement,
                                  top,
                                  left,
                                  width: popoverWidth,
                                  maxHeight,
                                });
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: 0,
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                              }}
                            >
                              <SmallPill>{source}</SmallPill>
                            </button>
                            {openEvidenceState?.key === evidenceKey ? (
                              <div
                                data-provider-evidence-anchor="true"
                                onMouseDown={(event) => event.stopPropagation()}
                                style={{
                                  position: 'fixed',
                                  top: openEvidenceState.top,
                                  left: openEvidenceState.left,
                                  width: openEvidenceState.width,
                                  maxWidth: 'min(460px, calc(100vw - 16px))',
                                  maxHeight: openEvidenceState.maxHeight,
                                  zIndex: 20000,
                                  borderRadius: 12,
                                  border: '1px solid rgba(34,211,238,0.28)',
                                  background: 'linear-gradient(180deg, rgba(12,20,34,0.98) 0%, rgba(10,15,26,0.98) 100%)',
                                  boxShadow: '0 18px 40px rgba(0,0,0,0.45)',
                                  padding: '12px 14px',
                                  display: 'grid',
                                  gap: 10,
                                  overflow: 'hidden',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div style={{
                                    width: 24,
                                    height: 24,
                                    display: 'grid',
                                    placeItems: 'center',
                                    borderRadius: 8,
                                    background: 'rgba(34,211,238,0.14)',
                                    border: '1px solid rgba(34,211,238,0.22)',
                                  }}>
                                    <Cpu size={12} color={T.color} />
                                  </div>
                                  <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: T.color }}>
                                      Detected from {source}
                                    </div>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{row.label}</div>
                                  </div>
                                </div>
                                <div style={{ display: 'grid', gap: 10, maxHeight: Math.max(120, (openEvidenceState.maxHeight || 360) - 112), overflowY: 'auto', paddingRight: 4 }}>
                                  {evidence.map((item) => (
                                    <div
                                      key={`${evidenceKey}:${item.file}`}
                                      style={{
                                        display: 'grid',
                                        gap: 8,
                                        padding: '10px 12px',
                                        borderRadius: 10,
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        background: 'rgba(255,255,255,0.03)',
                                      }}
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                        <FileChip>{item.file}</FileChip>
                                        <button
                                          type="button"
                                          onClick={() => window.electronAPI?.revealPathInFolder?.(item.absolutePath)}
                                          title="Open containing folder"
                                          style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: 28,
                                            height: 28,
                                            borderRadius: 8,
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            background: 'rgba(255,255,255,0.03)',
                                            color: 'var(--text-secondary)',
                                            cursor: 'pointer',
                                            flexShrink: 0,
                                          }}
                                        >
                                          <FolderOpen size={13} />
                                        </button>
                                      </div>
                                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                        {item.matches.map((match) => (
                                          <span
                                            key={`${item.file}:${match}`}
                                            style={{
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              padding: '4px 8px',
                                              borderRadius: 999,
                                              border: '1px solid rgba(34,211,238,0.18)',
                                              background: 'rgba(34,211,238,0.08)',
                                              color: T.color,
                                              fontSize: 11,
                                              fontFamily: 'var(--font-mono)',
                                              maxWidth: '100%',
                                            }}
                                          >
                                            {match}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <div style={{
                                  fontSize: 11,
                                  color: 'var(--text-muted)',
                                  lineHeight: 1.55,
                                  paddingTop: 2,
                                  borderTop: '1px solid rgba(34,211,238,0.14)',
                                }}>
                                  Launchline marked {row.label} as detected because these workspace elements matched its {source} heuristics.
                                </div>
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>
                        )}
                      </div>
                    );
                  })}
                  <div>
                    <button
                      type="button"
                      onClick={() => openProviderRulesEditor(row)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 10px',
                        borderRadius: 9,
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: 'rgba(255,255,255,0.03)',
                        color: 'var(--text-secondary)',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                      title={`View ${row.label} detection rules`}
                    >
                      <FileText size={12} />
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        {providerEditorState ? (
          <Modal
            onClose={closeProviderEditor}
            title={providerEditorState.mode === 'create' ? 'Add Provider Heuristics' : `${providerEditorState.provider?.label || customProviderForm.label} Detection Rules`}
            subtitle={providerEditorState.mode === 'create'
              ? 'Define a custom provider so Launchline can detect it alongside the built-in registry.'
              : 'These are the editable heuristic groups Launchline uses when scanning the workspace for this provider.'}
            maxWidth={760}
          >
            <div style={{ display: 'grid', gap: 14 }}>
              {providerEditorState.mode === 'edit' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <SmallPill tone={providerEditorState.provider?.detected ? 'good' : 'warn'}>
                    {providerEditorState.provider?.detected ? 'Detected' : 'Not detected'}
                  </SmallPill>
                  {providerEditorState.provider?.isCustom ? <SmallPill>Custom</SmallPill> : null}
                  {customProviderForm.docsUrl ? (
                    <a
                      href={customProviderForm.docsUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 10px',
                        borderRadius: 9,
                        border: `1px solid ${T.r}0.24)`,
                        background: 'rgba(34,211,238,0.08)',
                        color: T.color,
                        fontSize: 11,
                        fontWeight: 700,
                        textDecoration: 'none',
                      }}
                    >
                      <FileText size={12} />
                      Provider docs
                    </a>
                  ) : null}
                </div>
              ) : null}
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                Launchline marks a provider as present if the workspace matches at least one of the heuristic families below. Dependency, env/config, and source evidence are scanned independently.
              </div>
              <div style={{ ...cardStyle, background: 'rgba(255,255,255,0.02)', display: 'grid', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: 12 }}>
                  <label style={{ display: 'grid', gap: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                      Provider Name
                    </span>
                    <input
                      value={customProviderForm.label}
                      onChange={(event) => setCustomProviderForm((current) => ({ ...current, label: event.target.value }))}
                      placeholder="DeepSeek"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 10,
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: 'rgba(255,255,255,0.03)',
                        color: 'var(--text)',
                        fontSize: 12,
                      }}
                    />
                  </label>
                  <label style={{ display: 'grid', gap: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                      Docs URL
                    </span>
                    <input
                      value={customProviderForm.docsUrl}
                      onChange={(event) => setCustomProviderForm((current) => ({ ...current, docsUrl: event.target.value }))}
                      placeholder="https://platform.deepseek.com/"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 10,
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: 'rgba(255,255,255,0.03)',
                        color: 'var(--text)',
                        fontSize: 12,
                      }}
                    />
                  </label>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
                  {PROVIDER_HEURISTIC_EDITOR_FIELDS.map((field) => (
                    <label key={field.key} style={{ display: 'grid', gap: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                        {field.label}
                      </span>
                      <textarea
                        value={customProviderForm[field.key]}
                        onChange={(event) => setCustomProviderForm((current) => ({ ...current, [field.key]: event.target.value }))}
                        placeholder={field.placeholder}
                        rows={6}
                        style={{
                          width: '100%',
                          minHeight: 128,
                          resize: 'vertical',
                          padding: '10px 12px',
                          borderRadius: 10,
                          border: '1px solid rgba(255,255,255,0.1)',
                          background: 'rgba(255,255,255,0.03)',
                          color: 'var(--text)',
                          fontSize: 12,
                          lineHeight: 1.5,
                        }}
                      />
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                        {field.hint}
                      </span>
                    </label>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  Launchline will treat any matching dependency, env/config, or source keyword as enough evidence to mark this provider as detected.
                </div>
                {customProviderError ? (
                  <div style={{
                    fontSize: 12,
                    color: '#f87171',
                    border: '1px solid rgba(248,113,113,0.24)',
                    background: 'rgba(248,113,113,0.05)',
                    borderRadius: 10,
                    padding: '10px 12px',
                  }}>
                    {customProviderError}
                  </div>
                ) : null}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" onClick={closeProviderEditor} style={{ ...buttonStyle, background: 'rgba(255,255,255,0.03)', color: 'var(--text-secondary)', borderColor: 'rgba(255,255,255,0.1)' }}>
                  Cancel
                </button>
                <button type="button" onClick={saveCustomProvider} style={buttonStyle} disabled={savingCustomProvider}>
                  <Sparkles size={13} />
                  {savingCustomProvider
                    ? 'Saving…'
                    : providerEditorState.mode === 'create'
                      ? 'Save Provider'
                      : 'Save Changes'}
                </button>
              </div>
            </div>
          </Modal>
        ) : null}
      </div>
    );
  }

function PromptAssetsSection({ promptAssets, onTestPromptAsset, onCreatePromptDirectory, onRunChecks, promptDirectoryNotice, checking = false }) {
  const [openRecommendationKey, setOpenRecommendationKey] = useState(null);
  const [evidenceModalRow, setEvidenceModalRow] = useState(null);
  const [rulesModalRow, setRulesModalRow] = useState(null);
  const rows = createPromptAssetRows(promptAssets, onCreatePromptDirectory);
  const detectedCount = rows.filter((row) => row.status === 'detected').length;

  useEffect(() => {
    if (!openRecommendationKey) return undefined;
    const onDocumentPointerDown = () => setOpenRecommendationKey(null);
    document.addEventListener('mousedown', onDocumentPointerDown);
    return () => document.removeEventListener('mousedown', onDocumentPointerDown);
  }, [openRecommendationKey]);

  return (
    <div style={{ ...sectionCardStyle, padding: '14px 16px' }}>
      <div style={{ display: 'grid', gap: 12 }}>
        {promptDirectoryNotice && (
          <div style={{
            ...cardStyle,
            background: promptDirectoryNotice.tone === 'good' ? 'rgba(74,222,128,0.05)' : 'rgba(248,113,113,0.04)',
            borderColor: promptDirectoryNotice.tone === 'good' ? 'rgba(74,222,128,0.24)' : 'rgba(248,113,113,0.24)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
          }}>
            {promptDirectoryNotice.tone === 'good'
              ? <CheckCircle2 size={14} color="#4ade80" style={{ flexShrink: 0, marginTop: 1 }} />
              : <AlertTriangle size={14} color="#f87171" style={{ flexShrink: 0, marginTop: 1 }} />}
            <span style={{ fontSize: 12, color: promptDirectoryNotice.tone === 'good' ? '#4ade80' : '#f87171', lineHeight: 1.6 }}>
              {promptDirectoryNotice.message}
            </span>
          </div>
        )}
        <div style={{ ...cardStyle, background: 'rgba(255,255,255,0.02)', display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.55)` }}>
              Prompt Asset Heuristics
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <SmallPill
                tone={detectedCount > 0 ? 'good' : 'warn'}
                style={{
                  height: 36,
                  padding: '0 14px',
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxSizing: 'border-box',
                  lineHeight: 1,
                }}
              >
                {detectedCount} detected
              </SmallPill>
              <button type="button" onClick={onRunChecks} style={{ ...buttonStyle, padding: '8px 12px' }} disabled={checking}>
                <RefreshCw size={13} style={checking ? { animation: 'spin 1s linear infinite' } : undefined} />
                {checking ? 'Checking…' : 'Run Check'}
              </button>
            </div>
          </div>
          <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, overflow: 'visible' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1.7fr) minmax(120px, 0.8fr) minmax(140px, 1fr) minmax(110px, 0.8fr) minmax(180px, 1.2fr)', gap: 12, padding: '10px 12px', background: 'rgba(255,255,255,0.03)', fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              <div>Signal</div>
              <div>Status</div>
              <div>Evidence</div>
              <div>Rules</div>
              <div>Solutions</div>
            </div>
            {rows.map((row, index) => (
              <div
                key={row.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(220px, 1.7fr) minmax(120px, 0.8fr) minmax(140px, 1fr) minmax(110px, 0.8fr) minmax(180px, 1.2fr)',
                  gap: 12,
                  padding: '10px 12px',
                  borderTop: index === 0 ? 'none' : '1px solid rgba(255,255,255,0.06)',
                  alignItems: 'start',
                }}
              >
                <div style={{ display: 'grid', gap: 6 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#fbbf24' }}>{row.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{row.description}</div>
                </div>
                <div>
                  <SmallPill tone={row.status === 'detected' ? 'good' : 'warn'}>
                    {row.status}
                  </SmallPill>
                </div>
                <div>
                  {row.evidenceItems?.length ? (
                    <button
                      type="button"
                      onClick={() => setEvidenceModalRow(row)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 10px',
                        borderRadius: 9,
                        border: `1px solid ${T.r}0.24)`,
                        background: 'rgba(34,211,238,0.08)',
                        color: T.color,
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {getPromptAssetEvidenceLabel(row.evidenceItems)}
                    </button>
                  ) : (
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>
                  )}
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => setRulesModalRow(row)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 10px',
                      borderRadius: 9,
                      border: '1px solid rgba(255,255,255,0.1)',
                      background: 'rgba(255,255,255,0.03)',
                      color: 'var(--text-secondary)',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    <FileText size={12} />
                    View
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  {row.actionLabel && row.onAction ? (
                    <button
                      type="button"
                      onClick={row.onAction}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 10px',
                        borderRadius: 9,
                        border: `1px solid ${T.r}0.28)`,
                        background: 'rgba(34,211,238,0.08)',
                        color: T.color,
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      <Sparkles size={12} />
                      {row.actionLabel}
                    </button>
                  ) : row.status !== 'detected' && row.recommendations?.length ? (
                    <>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setOpenRecommendationKey((current) => (current === row.id ? null : row.id));
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '6px 10px',
                          borderRadius: 999,
                          border: '1px solid rgba(168,85,247,0.35)',
                          background: 'rgba(168,85,247,0.12)',
                          color: '#c084fc',
                          fontSize: 10,
                          fontWeight: 800,
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                          cursor: 'pointer',
                        }}
                      >
                        Recommendations
                      </button>
                      {openRecommendationKey === row.id ? (
                        <div
                          onMouseDown={(event) => event.stopPropagation()}
                          style={{
                            position: 'absolute',
                            top: 'calc(100% + 8px)',
                            right: 0,
                            width: 300,
                            zIndex: 20,
                            borderRadius: 12,
                            border: '1px solid rgba(168,85,247,0.32)',
                            background: 'linear-gradient(180deg, rgba(27,19,43,0.98) 0%, rgba(15,12,27,0.98) 100%)',
                            boxShadow: '0 18px 40px rgba(0,0,0,0.45)',
                            padding: '12px 14px',
                            display: 'grid',
                            gap: 10,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{
                              width: 24,
                              height: 24,
                              display: 'grid',
                              placeItems: 'center',
                              borderRadius: 8,
                              background: 'rgba(168,85,247,0.14)',
                              border: '1px solid rgba(168,85,247,0.25)',
                            }}>
                              <Sparkles size={12} color="#c084fc" />
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#c084fc' }}>
                                Recommended next steps
                              </div>
                              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{row.label}</div>
                            </div>
                          </div>
                          <div style={{ display: 'grid', gap: 8 }}>
                            {row.recommendations.map((item) => (
                              <div key={item} style={{ display: 'grid', gridTemplateColumns: '12px minmax(0, 1fr)', gap: 8 }}>
                                <span style={{ fontSize: 12, color: '#c084fc', lineHeight: 1.5 }}>•</span>
                                <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{item}</span>
                              </div>
                            ))}
                          </div>
                          <div style={{
                            fontSize: 11,
                            color: 'rgba(192,132,252,0.88)',
                            lineHeight: 1.55,
                            paddingTop: 2,
                            borderTop: '1px solid rgba(168,85,247,0.16)',
                          }}>
                            Add the asset to the loaded workspace, then rerun the prompt-assets check so Launchline can detect it.
                          </div>
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        {evidenceModalRow ? (
          <Modal
            onClose={() => setEvidenceModalRow(null)}
            title={`${evidenceModalRow.label} Evidence`}
            subtitle="These are the exact workspace paths Launchline used as evidence for this prompt-asset signal."
            maxWidth={760}
          >
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <SmallPill tone={evidenceModalRow.status === 'detected' ? 'good' : 'warn'}>
                  {evidenceModalRow.status === 'detected' ? 'Detected' : 'Not detected'}
                </SmallPill>
                <SmallPill>{getPromptAssetEvidenceLabel(evidenceModalRow.evidenceItems)}</SmallPill>
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                {evidenceModalRow.evidenceItems.map((item) => (
                  <div key={`${evidenceModalRow.id}:${item.file}`} style={{ ...cardStyle, background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <FileChip>{item.file}</FileChip>
                    </div>
                    <button
                      type="button"
                      onClick={() => window.electronAPI?.revealPathInFolder?.(item.absolutePath)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 32,
                        height: 32,
                        borderRadius: 9,
                        border: '1px solid rgba(255,255,255,0.08)',
                        background: 'rgba(255,255,255,0.03)',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                      }}
                    >
                      <FolderOpen size={14} />
                    </button>
                    {item.type === 'file' ? (
                      <button type="button" onClick={() => onTestPromptAsset?.(item.file)} style={buttonStyle}>
                        <TestTube2 size={13} />
                        Test in Prompt Tester
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </Modal>
        ) : null}
        {rulesModalRow ? (
          <Modal
            onClose={() => setRulesModalRow(null)}
            title={`${rulesModalRow.label} Detection Rules`}
            subtitle="These are the heuristics Launchline uses when evaluating this prompt-asset signal in the loaded workspace."
            maxWidth={760}
          >
            <div style={{ display: 'grid', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <SmallPill tone={rulesModalRow.status === 'detected' ? 'good' : 'warn'}>
                  {rulesModalRow.status === 'detected' ? 'Detected' : 'Not detected'}
                </SmallPill>
                <SmallPill>{getPromptAssetEvidenceLabel(rulesModalRow.evidenceItems)}</SmallPill>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                {rulesModalRow.detectionSummary}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                {rulesModalRow.ruleGroups.map((group) => (
                  <div key={group.title} style={{ ...cardStyle, background: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.6)`, marginBottom: 8 }}>
                      {group.title}
                    </div>
                    <div style={{ display: 'grid', gap: 8 }}>
                      {group.items.map((item) => (
                        <div key={item} style={{ display: 'grid', gridTemplateColumns: '12px minmax(0, 1fr)', gap: 8 }}>
                          <span style={{ fontSize: 12, color: T.color, lineHeight: 1.5 }}>•</span>
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {rulesModalRow.status !== 'detected' ? (
                <div style={{ ...cardStyle, background: 'rgba(168,85,247,0.05)', borderColor: 'rgba(168,85,247,0.22)', display: 'grid', gap: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#c084fc' }}>
                    Recommendations
                  </div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {rulesModalRow.recommendations.map((item) => (
                      <div key={item} style={{ display: 'grid', gridTemplateColumns: '12px minmax(0, 1fr)', gap: 8 }}>
                        <span style={{ fontSize: 12, color: '#c084fc', lineHeight: 1.5 }}>•</span>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </Modal>
        ) : null}
      </div>
    </div>
  );
}

function EvalsSection({ evals, onRunEvalAsset }) {
  const datasetCount = evals.datasets.length;
  const goldenCount = evals.goldenOutputs.length;
  const regressionCount = evals.regressionSignals.length;
  const rubricCount = evals.rubricAssets.length;
  const judgeCount = evals.judgeAssets.length;
  const thresholdCount = evals.scoreThresholdSignals.length;
  const totalSignals = datasetCount + goldenCount + regressionCount + rubricCount + judgeCount + thresholdCount + evals.promptTests.length;

  const sections = [
    {
      title: 'Eval Datasets',
      count: datasetCount,
      hint: 'Prompt cases, fixtures, benchmark inputs, or labeled samples that can be rerun as a repeatable test set.',
      items: evals.datasets,
    },
    {
      title: 'Golden Outputs',
      count: goldenCount,
      hint: 'Reference answers or approved snapshots that give Launchline something concrete to compare against.',
      items: evals.goldenOutputs,
    },
    {
      title: 'Regression Scripts',
      count: regressionCount,
      hint: 'Scripts or workflows that look like prompt-quality, benchmark, or quality-gate checks.',
      items: evals.regressionSignals,
    },
    {
      title: 'Rubrics and Scorecards',
      count: rubricCount,
      hint: 'Files that suggest the team scores outputs with explicit criteria instead of informal spot checks.',
      items: evals.rubricAssets,
    },
    {
      title: 'Judge-Based Assets',
      count: judgeCount,
      hint: 'Signals that an LLM, grader, or pairwise comparison flow is being used to score outputs.',
      items: evals.judgeAssets,
    },
    {
      title: 'Thresholds and Gates',
      count: thresholdCount,
      hint: 'Configured pass/fail or score thresholds that indicate the repo has some quality bar before rollout.',
      items: evals.scoreThresholdSignals,
    },
  ];
  const missingRows = [
    {
      label: 'Eval datasets',
      description: 'Rerunnable prompt cases, fixtures, or benchmark inputs that Launchline can treat as a repeatable test set.',
      recommendations: [
        'Create an evals/ or tests/evals/ folder with JSON or JSONL prompt cases.',
        'Store each case with a prompt-like input and a stable expected outcome field.',
        'Keep datasets small enough to rerun often so they become part of normal development.',
      ],
    },
    {
      label: 'Golden outputs',
      description: 'Expected / approved answers or snapshots that a run can compare against.',
      recommendations: [
        'Save approved reference outputs alongside eval cases as expected, golden, or reference fields.',
        'Version the expected outputs in source control so prompt or model changes are easy to review.',
        'Use concise, deterministic examples first before expanding into broader benchmark sets.',
      ],
    },
    {
      label: 'Regression scripts',
      description: 'Scripts or workflows that look like quality gates, benchmark runs, or eval automation.',
      recommendations: [
        'Add a runnable script like npm run evals, uv run ..., or a small Python/Node harness that executes your eval set.',
        'Wire that script into local QA or CI so regressions are checked before rollout.',
        'Keep the script focused on repeatable checks instead of one-off prompt experiments.',
      ],
    },
    {
      label: 'Rubric assets',
      description: 'Rubrics, criteria, or scorecards that define how open-ended outputs should be judged.',
      recommendations: [
        'Create a rubric file in Markdown, JSON, or YAML that defines the scoring criteria for open-ended outputs.',
        'Break the rubric into explicit dimensions like correctness, completeness, tone, and schema adherence.',
        'Reference the same rubric from human review and judge-model flows so grading stays consistent.',
      ],
    },
    {
      label: 'Judge-based assets',
      description: 'Judge-model prompts, grader flows, or pairwise comparison assets for automated grading.',
      recommendations: [
        'Add a dedicated judge prompt or grader template that compares model output to your expectations or rubric.',
        'Store the judge instructions separately from app prompts so grading logic stays reviewable.',
        'Start with pass, fail, and review outcomes before moving to more complex scoring.',
      ],
    },
    {
      label: 'Thresholds and gates',
      description: 'Configured pass-rate or score thresholds that act as rollout or release quality bars.',
      recommendations: [
        'Define a minimum pass rate or quality score that eval runs must meet before rollout.',
        'Store the threshold in config, eval metadata, or CI settings so it is easy to inspect.',
        'Use the same gate in local runs and automation to avoid drift between operator checks and releases.',
      ],
    },
  ];

  return (
    <div style={{ ...sectionCardStyle, padding: '14px 16px' }}>
      {totalSignals === 0 ? (
        <div style={{ display: 'grid', gap: 12 }}>
          <EmptyState text="No evaluation discipline signals were detected yet. Launchline looked for rerunnable datasets, golden outputs, regression scripts, rubric-driven scoring, judge-based grading, and rollout thresholds." />
          <MissingSignalsTable rows={missingRows} />
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
            <SummaryTile label="Datasets" value={datasetCount} hint="Rerunnable eval inputs and benchmark cases." tone={datasetCount > 0 ? 'good' : 'warn'} />
            <SummaryTile label="Golden Outputs" value={goldenCount} hint="Reference outputs or approved snapshots." tone={goldenCount > 0 ? 'good' : 'warn'} />
            <SummaryTile label="Regression Scripts" value={regressionCount} hint="Files that look like quality-gate or benchmark runs." tone={regressionCount > 0 ? 'good' : 'warn'} />
            <SummaryTile label="Judge or Rubric" value={rubricCount + judgeCount} hint="Structured grading assets for less deterministic tasks." tone={(rubricCount + judgeCount) > 0 ? 'good' : 'warn'} />
          </div>
          {evals.promptTests.length > 0 && (
            <div style={{ ...cardStyle, background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.55)`, marginBottom: 8 }}>
                Prompt Test Files
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 10 }}>
                These files look like prompt-specific tests or eval harnesses already living in the workspace.
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {evals.promptTests.map((item) => <FileChip key={item}>{item}</FileChip>)}
              </div>
            </div>
          )}
          <div style={{ display: 'grid', gap: 12 }}>
            {sections.map((section) => (
              <div key={section.title} style={{ ...cardStyle, padding: '12px 14px', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.55)` }}>
                    {section.title}
                  </span>
                  <SmallPill tone={section.count > 0 ? 'good' : 'warn'}>{section.count}</SmallPill>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: section.items.length > 0 ? 10 : 0 }}>
                  {section.hint}
                </div>
                {section.items.length > 0 ? (
                  <div style={{ display: 'grid', gap: 8 }}>
                    {section.items.map((item) => (
                      <div key={`${section.title}-${item}`} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <FileChip>{item}</FileChip>
                        {section.title === 'Eval Datasets' && (
                          <button type="button" onClick={() => onRunEvalAsset?.(item)} style={buttonStyle}>
                            <TestTube2 size={13} />
                            Run Eval Set
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No strong signals detected in this category yet.</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MultiSignalSection({ title, icon: Icon, groups, emptyText, badgeLabel }) {
  const totalSignals = groups.reduce((sum, group) => sum + group.items.length, 0);
  return (
    <div style={{ ...sectionCardStyle, padding: '14px 16px' }}>
      {totalSignals === 0 ? (
        <div style={{ display: 'grid', gap: 12 }}>
          <EmptyState text={emptyText} />
          <MissingSignalsTable
            rows={groups.map((group) => ({
              label: group.title,
              description: `Launchline did not detect signals for ${group.title.toLowerCase()} in the current workspace.`,
            }))}
          />
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {groups.map((group) => (
            <div key={group.title} style={{ ...cardStyle, padding: '12px 14px', background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.55)` }}>
                  {group.title}
                </span>
                <SmallPill tone={group.items.length > 0 ? 'good' : 'warn'}>{group.items.length}</SmallPill>
              </div>
              {group.items.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No signals detected.</div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {group.items.map((item) => <FileChip key={`${group.title}-${item}`}>{item}</FileChip>)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FeatureBindingsSection({ featureBindings }) {
  const missingRows = [
    { label: 'Chat / Assistant', description: 'A feature or workflow in source that looks like a model-backed chat or assistant surface.' },
    { label: 'Summarization', description: 'Signals that the app asks a model to summarize content or state.' },
    { label: 'Extraction', description: 'Signals for structured extraction, parsing, or form-filling from model outputs.' },
    { label: 'Classification', description: 'LLM-backed labeling, routing, or classification features in app workflows.' },
    { label: 'Search / RAG', description: 'Feature-level RAG or semantic search workflows wired into product behavior.' },
    { label: 'Recommendations', description: 'Suggestion, recommendation, or guidance features backed by model calls.' },
    { label: 'Agents / Tools', description: 'Tool-calling or agent-style product capabilities exposed in the workspace.' },
    { label: 'Evaluation Workflows', description: 'In-product or scripted eval workflows connected to the app’s LLM behavior.' },
  ];
  return (
    <div style={{ ...sectionCardStyle, padding: '14px 16px' }}>
      {featureBindings.length === 0 ? (
        <div style={{ display: 'grid', gap: 12 }}>
          <EmptyState text="Launchline did not find strong feature-to-LLM bindings yet. As this page evolves, it will map model usage to concrete product capabilities inside the workspace." />
          <MissingSignalsTable rows={missingRows} />
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {featureBindings.map((binding) => (
            <div key={binding.id} style={{ ...cardStyle, padding: '12px 14px', background: 'rgba(255,255,255,0.02)', display: 'grid', gap: 7 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{binding.label}</span>
                <SmallPill tone="good">detected</SmallPill>
              </div>
              <FileChip>{binding.file}</FileChip>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PlannedFeaturesSection() {
  return (
    <div style={sectionCardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px' }}>
        <Sparkles size={13} color={T.color} style={{ flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: `${T.r}0.68)`, flex: 1 }}>
          Build Backlog
        </span>
        <SmallPill>living</SmallPill>
      </div>
      <div style={{ padding: '4px 14px 16px', display: 'grid', gap: 12 }}>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          This section tracks what LLMOps already ships and what still makes the most sense as the next implementation targets. We update it as features move from backlog to working UI.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          {llmOpsBacklogGroups.map((group) => (
            <div key={group.title} style={{ ...cardStyle, background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.55)` }}>
                  {group.title}
                </div>
                <SmallPill tone={group.tone}>{group.title}</SmallPill>
              </div>
              {group.items.length > 0 ? (
                <div style={{ display: 'grid', gap: 8 }}>
                  {group.items.map((item) => (
                    <div key={item} style={{ display: 'grid', gridTemplateColumns: '14px minmax(0, 1fr)', gap: 8 }}>
                      <CheckCircle2
                        size={12}
                        color={group.tone === 'good' ? '#4ade80' : group.tone === 'warn' ? '#fbbf24' : T.color}
                        style={{ marginTop: 2 }}
                      />
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{item}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{
                  minHeight: 84,
                  display: 'grid',
                  placeItems: 'center',
                  border: '1px dashed rgba(255,255,255,0.08)',
                  borderRadius: 10,
                  background: 'rgba(255,255,255,0.02)',
                  padding: '12px 14px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                    No features are in progress right now.
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function LLMOperationsTab() {
  const { settings, save } = useSettings();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [promptAssetRequest, setPromptAssetRequest] = useState(null);
  const [evalRunRequest, setEvalRunRequest] = useState(null);
  const [promptDirectoryNotice, setPromptDirectoryNotice] = useState(null);
  const [activeTab, setActiveTab] = useState('operations');
  const [activeOperationsSection, setActiveOperationsSection] = useState('overview');
  const [activeSignalsSection, setActiveSignalsSection] = useState('overview');
  const [providerHelpOpen, setProviderHelpOpen] = useState(false);
  const [promptAssetsHelpOpen, setPromptAssetsHelpOpen] = useState(false);

  const loadStatus = useCallback(async ({ silent = false } = {}) => {
    if (!window.electronAPI?.llmOpsStatus) {
      setError('LLMOps is unavailable in this build.');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (silent) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const result = await window.electronAPI.llmOpsStatus();
      if (!result?.ok) throw new Error(result?.error || 'Failed to scan LLMOps status.');
      setStatus(result);
    } catch (err) {
      setError(err.message || 'Failed to scan LLMOps status.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (!window.electronAPI?.onWorkspaceChanged) return undefined;
    return window.electronAPI.onWorkspaceChanged(() => {
      setPromptDirectoryNotice(null);
      loadStatus({ silent: true });
    });
  }, [loadStatus]);

  useEffect(() => {
    if (!providerHelpOpen) return undefined;
    const onDocumentMouseDown = (event) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.closest('[data-provider-help-anchor="true"]')) return;
      setProviderHelpOpen(false);
    };
    document.addEventListener('mousedown', onDocumentMouseDown);
    return () => document.removeEventListener('mousedown', onDocumentMouseDown);
  }, [providerHelpOpen]);

  useEffect(() => {
    if (!promptAssetsHelpOpen) return undefined;
    const onDocumentMouseDown = (event) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.closest('[data-prompt-assets-help-anchor="true"]')) return;
      setPromptAssetsHelpOpen(false);
    };
    document.addEventListener('mousedown', onDocumentMouseDown);
    return () => document.removeEventListener('mousedown', onDocumentMouseDown);
  }, [promptAssetsHelpOpen]);

  const onCreatePromptDirectory = useCallback(async () => {
    if (!window.electronAPI?.llmOpsCreatePromptsDir) {
      setPromptDirectoryNotice({ tone: 'danger', message: 'Creating prompt directories is unavailable in this build.' });
      return;
    }

    try {
      const result = await window.electronAPI.llmOpsCreatePromptsDir();
      if (!result?.ok) {
        setPromptDirectoryNotice({ tone: 'danger', message: result?.error || 'Unable to create prompts/ directory.' });
        return;
      }
      setPromptDirectoryNotice({ tone: 'good', message: result.message || 'Created prompts/ in the loaded workspace.' });
      await loadStatus({ silent: true });
    } catch (err) {
      setPromptDirectoryNotice({ tone: 'danger', message: err.message || 'Unable to create prompts/ directory.' });
    }
  }, [loadStatus]);

  const onSaveCustomProviders = useCallback(async (nextProviders) => {
    await save({
      llmOperations: {
        customProviderHeuristics: nextProviders,
      },
    });
    await loadStatus({ silent: true });
  }, [loadStatus, save]);

  const onSaveProviderOverrides = useCallback(async (nextOverrides) => {
    await save({
      llmOperations: {
        providerHeuristicOverrides: nextOverrides,
      },
    });
    await loadStatus({ silent: true });
  }, [loadStatus, save]);

  if (loading && !status) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: 320, color: 'var(--text-secondary)', gap: 12 }}>
        <RefreshCw size={18} style={{ color: T.color, animation: 'spin 1s linear infinite' }} />
        <div style={{ fontSize: 13 }}>Scanning LLMOps posture…</div>
      </div>
    );
  }

  if (error && !status) {
    return (
      <div style={{ ...cardStyle, borderColor: 'rgba(248,113,113,0.25)', background: 'rgba(248,113,113,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <AlertTriangle size={15} color="#f87171" />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#f87171' }}>LLMOps scan failed</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>{error}</div>
        <button type="button" onClick={() => loadStatus()} style={buttonStyle}>
          <RefreshCw size={13} />
          Try again
        </button>
      </div>
    );
  }

  const providerCount = (status?.providers || []).filter((provider) => provider.detected).length;
  const promptCount = status?.promptAssets?.total || 0;
  const evalCount = [
    ...(status?.evals?.datasets || []),
    ...(status?.evals?.goldenOutputs || []),
    ...(status?.evals?.regressionSignals || []),
    ...(status?.evals?.rubricAssets || []),
    ...(status?.evals?.judgeAssets || []),
    ...(status?.evals?.scoreThresholdSignals || []),
    ...(status?.evals?.promptTests || []),
  ].filter((value, index, array) => array.indexOf(value) === index).length;
  const bindingCount = status?.featureBindings?.length || 0;
  const llmSettings = settings?.llmOperations || SETTINGS_DEFAULT.llmOperations;
  const selectedProviderId = llmSettings.selectedProviderId || SETTINGS_DEFAULT.llmOperations.selectedProviderId;
  const configuredProvider = llmSettings.providers?.[selectedProviderId] || SETTINGS_DEFAULT.llmOperations.providers[selectedProviderId];
  const lastValidation = configuredProvider?.lastValidation || null;
  const readinessPassed = status?.score?.passed || 0;
  const readinessTotal = status?.score?.total || 0;
  const operatorSummary = {
    providerLabel: configuredProvider?.label || selectedProviderId,
    modelId: configuredProvider?.modelId || 'No model selected',
    savedPrompts: llmSettings.savedPrompts?.length || 0,
    promptRuns: llmSettings.promptTestHistory?.length || 0,
    evalRuns: llmSettings.evalRunHistory?.length || 0,
    validationLabel: lastValidation
      ? (lastValidation.ok ? 'Connected' : 'Failed')
      : 'Not tested',
    validationTone: lastValidation
      ? (lastValidation.ok ? 'good' : 'warn')
      : 'warn',
  };
  const llmOpsTabs = [
    {
      id: 'operations',
      label: 'Operations',
      icon: Cpu,
      hint: 'Provider controls, prompt testing, eval runs, and operator workflow settings.',
    },
    {
      id: 'signals',
      label: 'Signals',
      icon: Search,
      hint: 'Workspace detection for providers, prompt assets, eval assets, and runtime discipline.',
    },
    {
      id: 'backlog',
      label: 'Backlog',
      icon: Sparkles,
      hint: 'Living implementation backlog for what LLMOps ships now, what is in progress, and what should come next.',
    },
  ];
  const signalPaneHeight = 'calc(100vh - 170px)';
  const operationSections = [
    {
      id: 'overview',
      label: 'Overview',
      icon: Cpu,
      badge: operatorSummary.validationLabel,
      badgeTone: operatorSummary.validationTone,
      summary: 'Current provider, quick actions, and recent operator activity.',
    },
    {
      id: 'provider',
      label: 'Provider Settings',
      icon: Cpu,
      badge: operatorSummary.providerLabel,
      badgeTone: 'good',
      summary: 'Provider, model, endpoint, API key, and validation controls.',
    },
    {
      id: 'workflows',
      label: 'Prompt and Eval Workflows',
      icon: Sparkles,
      badge: `${operatorSummary.promptRuns + operatorSummary.evalRuns}`,
      badgeTone: (operatorSummary.promptRuns + operatorSummary.evalRuns) > 0 ? 'good' : 'warn',
      summary: 'Prompt tester, eval runner, and reusable workflow activity.',
    },
    {
      id: 'runtime',
      label: 'Runtime and Policy',
      icon: RefreshCw,
      badge: 'policy',
      badgeTone: 'default',
      summary: 'Temperature, retries, fallback, budget, and eval gate settings.',
    },
    {
      id: 'bindings',
      label: 'Feature Bindings',
      icon: Sparkles,
      badge: bindingCount > 0 ? `${bindingCount} mapped` : 'none mapped',
      badgeTone: bindingCount > 0 ? 'good' : 'warn',
      summary: 'Managed LLM-backed product capabilities and imported workspace bindings.',
    },
  ];
  const activeOperationsMeta = operationSections.find((section) => section.id === activeOperationsSection) || operationSections[0];
  const ActiveOperationsIcon = activeOperationsMeta.icon;
  const signalSections = [
    {
      id: 'overview',
      label: 'Readiness Overview',
      icon: Sparkles,
      badge: `${readinessPassed}/${readinessTotal}`,
      badgeTone: readinessPassed >= Math.max(1, Math.ceil(readinessTotal / 2)) ? 'good' : 'warn',
      summary: 'Workspace-wide LLMOps posture and signal summary.',
    },
    {
      id: 'providers',
      label: 'Provider Integrations',
      icon: Cpu,
      badge: `${providerCount}`,
      badgeTone: providerCount > 0 ? 'good' : 'warn',
      summary: 'Hosted, local, and custom model provider signals.',
    },
    {
      id: 'promptAssets',
      label: 'Prompt Assets',
      icon: FileText,
      badge: `${promptCount}`,
      badgeTone: promptCount > 0 ? 'good' : 'warn',
      summary: 'Prompt directories, templates, and structured prompt files.',
    },
    {
      id: 'evals',
      label: 'Evaluation / Evals',
      icon: Activity,
      badge: `${evalCount}`,
      badgeTone: evalCount > 0 ? 'good' : 'warn',
      summary: 'Eval datasets, golden outputs, and evaluation discipline.',
    },
    {
      id: 'guardrails',
      label: 'Guardrails and Structured Outputs',
      icon: Shield,
      badge: `${status.guardrails.total || 0}`,
      badgeTone: status.guardrails.total > 0 ? 'good' : 'warn',
      summary: 'Moderation, validation, schema, and fallback protections.',
    },
    {
      id: 'retrieval',
      label: 'Retrieval and Context Operations',
      icon: Search,
      badge: `${status.retrieval.total || 0}`,
      badgeTone: status.retrieval.total > 0 ? 'good' : 'warn',
      summary: 'RAG, embeddings, chunking, and citation discipline.',
    },
    {
      id: 'observability',
      label: 'Observability and Usage Controls',
      icon: Activity,
      badge: `${status.observability.total || 0}`,
      badgeTone: status.observability.total > 0 ? 'good' : 'warn',
      summary: 'Usage, tracing, cost, metadata, and feedback signals.',
    },
    {
      id: 'featureBindings',
      label: 'Feature Bindings',
      icon: Sparkles,
      badge: `${bindingCount}`,
      badgeTone: bindingCount > 0 ? 'good' : 'warn',
      summary: 'Product capabilities already wired to model-backed behavior.',
    },
  ];
  const activeSignalsMeta = signalSections.find((section) => section.id === activeSignalsSection) || signalSections[0];
  const ActiveSignalsIcon = activeSignalsMeta.icon;
  const detectedProviderCount = (status?.providers || []).filter((provider) => provider.detected).length;

  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        borderTop: '1px solid rgba(255,255,255,0.08)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: '#141a26',
        margin: '0 -28px 2px',
        padding: 0,
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '0 12px' }}>
          {llmOpsTabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 14px 9px',
                  borderRadius: '6px 6px 0 0',
                  border: active ? '1px solid rgba(255,255,255,0.12)' : '1px solid transparent',
                  borderBottom: active ? `2px solid ${T.color}` : '2px solid transparent',
                  background: active ? 'rgba(79,128,255,0.12)' : 'transparent',
                  color: active ? 'var(--text)' : 'var(--text-secondary)',
                  fontSize: 11,
                  fontWeight: 800,
                  cursor: 'pointer',
                  marginBottom: -1,
                }}
              >
                <Icon size={12} color={active ? T.color : 'currentColor'} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div style={{ ...cardStyle, borderColor: 'rgba(248,113,113,0.24)', background: 'rgba(248,113,113,0.04)', color: '#f87171', fontSize: 12 }}>
          {error}
        </div>
      )}

      {activeTab === 'operations' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '280px minmax(0, 1fr)', gap: 14, minHeight: signalPaneHeight, maxHeight: signalPaneHeight }}>
          <div style={{ ...sectionCardStyle, overflow: 'hidden', display: 'grid', gridTemplateRows: 'auto minmax(0, 1fr)' }}>
            <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'grid', gap: 6 }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.6)` }}>
                Operator Surfaces
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Choose the LLMOps work area you want to configure or inspect.
              </div>
            </div>
            <div style={{ overflowY: 'auto', padding: 8, display: 'grid', alignContent: 'start', gap: 6 }}>
              {operationSections.map((section) => {
                const Icon = section.icon;
                const active = section.id === activeOperationsSection;
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setActiveOperationsSection(section.id)}
                    style={{
                      display: 'grid',
                      gap: 8,
                      textAlign: 'left',
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: active ? `1px solid ${T.r}0.3)` : '1px solid rgba(255,255,255,0.06)',
                      background: active ? 'rgba(34,211,238,0.08)' : 'rgba(255,255,255,0.02)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Icon size={14} color={active ? T.color : 'var(--text-secondary)'} />
                      <span style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 800, color: active ? 'var(--text)' : 'var(--text-secondary)' }}>
                        {section.label}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>{section.summary}</span>
                      <SmallPill tone={section.badgeTone}>{section.badge}</SmallPill>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ minWidth: 0, overflow: 'hidden', display: 'grid', gridTemplateRows: 'auto minmax(0, 1fr)' }}>
            <div style={{ ...sectionCardStyle, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ width: 30, height: 30, borderRadius: 10, display: 'grid', placeItems: 'center', background: `${T.r}0.12)`, border: `1px solid ${T.r}0.24)` }}>
                <ActiveOperationsIcon size={15} color={T.color} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>{activeOperationsMeta.label}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{activeOperationsMeta.summary}</div>
              </div>
              <SmallPill tone={activeOperationsMeta.badgeTone}>{activeOperationsMeta.badge}</SmallPill>
            </div>

            <div data-llmops-signal-content="true" style={{ overflowY: 'auto', minHeight: 0, paddingRight: 4, display: 'grid', gap: 14, alignContent: 'start' }}>
              <LLMProviderControls
                activeSection={activeOperationsSection}
                onConnectionError={setError}
                promptAssetFiles={status.promptAssets?.files || []}
                evalAssetFiles={status.evals?.datasets || []}
                detectedFeatureBindings={status.featureBindings || []}
                promptAssetRequest={promptAssetRequest}
                evalRunRequest={evalRunRequest}
                onPromptAssetRequestHandled={(requestKey) => {
                  setPromptAssetRequest((current) => (current?.key === requestKey ? null : current));
                }}
                onEvalRunRequestHandled={(requestKey) => {
                  setEvalRunRequest((current) => (current?.key === requestKey ? null : current));
                }}
              />
            </div>
          </div>
        </div>
      ) : activeTab === 'signals' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '280px minmax(0, 1fr)', gap: 14, minHeight: signalPaneHeight, maxHeight: signalPaneHeight }}>
          <div style={{ ...sectionCardStyle, overflow: 'hidden', display: 'grid', gridTemplateRows: 'auto minmax(0, 1fr)' }}>
            <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'grid', gap: 6 }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.6)` }}>
                Signal Sections
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Select a workspace signal area to inspect its current repo posture and recommendations.
              </div>
            </div>
            <div style={{ overflowY: 'auto', padding: 8, display: 'grid', alignContent: 'start', gap: 6 }}>
              {signalSections.map((section) => {
                const Icon = section.icon;
                const active = section.id === activeSignalsSection;
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setActiveSignalsSection(section.id)}
                    style={{
                      display: 'grid',
                      gap: 8,
                      textAlign: 'left',
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: active ? `1px solid ${T.r}0.3)` : '1px solid rgba(255,255,255,0.06)',
                      background: active ? 'rgba(34,211,238,0.08)' : 'rgba(255,255,255,0.02)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Icon size={14} color={active ? T.color : 'var(--text-secondary)'} />
                      <span style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 800, color: active ? 'var(--text)' : 'var(--text-secondary)' }}>
                        {section.label}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>{section.summary}</span>
                      <SmallPill tone={section.badgeTone}>{section.badge}</SmallPill>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

            <div style={{ minWidth: 0, overflow: 'hidden', display: 'grid', gridTemplateRows: 'auto minmax(0, 1fr)' }}>
              <div style={{ ...sectionCardStyle, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', position: 'relative', zIndex: 6 }}>
                <div style={{ width: 30, height: 30, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <ActiveSignalsIcon size={15} color={T.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>{activeSignalsMeta.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{activeSignalsMeta.summary}</div>
                </div>
                {activeSignalsSection !== 'providers' && activeSignalsSection !== 'promptAssets' ? (
                  <SmallPill
                    tone={activeSignalsMeta.badgeTone}
                    style={{
                      height: 36,
                      padding: '0 14px',
                      borderRadius: 10,
                      fontSize: 12,
                      fontWeight: 800,
                      letterSpacing: '0.06em',
                      justifyContent: 'center',
                      flexShrink: 0,
                      boxSizing: 'border-box',
                      lineHeight: 1,
                    }}
                  >
                    {activeSignalsMeta.badge}
                  </SmallPill>
                ) : null}
                {activeSignalsSection !== 'providers' && activeSignalsSection !== 'promptAssets' ? (
                  <button type="button" onClick={() => loadStatus({ silent: true })} style={buttonStyle} disabled={refreshing}>
                    <RefreshCw size={13} style={refreshing ? { animation: 'spin 1s linear infinite' } : undefined} />
                    {refreshing ? 'Refreshing…' : 'Run Scan'}
                  </button>
                ) : null}
                {activeSignalsSection === 'providers' ? (
                  <div data-provider-help-anchor="true" style={{ position: 'relative', overflow: 'visible' }}>
                    <button
                      type="button"
                      onClick={() => setProviderHelpOpen((current) => !current)}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        border: '1px solid rgba(168,85,247,0.28)',
                        background: providerHelpOpen ? 'rgba(168,85,247,0.14)' : 'rgba(168,85,247,0.08)',
                        color: '#c084fc',
                        display: 'grid',
                        placeItems: 'center',
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                      title="How provider detection works"
                      aria-label="How provider detection works"
                    >
                      <HelpCircle size={15} />
                    </button>
                    {providerHelpOpen ? (
                      <div
                        style={{
                          position: 'absolute',
                          top: 'calc(100% + 10px)',
                          right: 0,
                          width: 520,
                          maxWidth: 'min(520px, calc(100vw - 80px))',
                          zIndex: 40,
                          borderRadius: 14,
                          border: '1px solid rgba(168,85,247,0.28)',
                          background: 'linear-gradient(180deg, rgba(30,18,47,0.98) 0%, rgba(17,12,31,0.98) 100%)',
                          boxShadow: '0 20px 60px rgba(0,0,0,0.42)',
                          padding: '14px 16px',
                          display: 'grid',
                          gap: 12,
                          overflow: 'visible',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 28, height: 28, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'rgba(168,85,247,0.16)', border: '1px solid rgba(168,85,247,0.28)' }}>
                            <HelpCircle size={14} color="#c084fc" />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#c084fc' }}>
                              How Provider Detection Works
                            </div>
                            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>
                              Repo Heuristic Scan
                            </div>
                          </div>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                          Launchline marks a provider as present when the loaded workspace matches at least one heuristic signal family. This is a repo-level heuristic scan, not a live runtime validation of whether the provider is configured correctly or works in production.
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 10 }}>
                          <div style={{ ...cardStyle, padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(168,85,247,0.2)' }}>
                            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#22d3ee', marginBottom: 6 }}>
                              Dependency
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                              SDK or package-name references in dependency text.
                            </div>
                          </div>
                          <div style={{ ...cardStyle, padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(168,85,247,0.2)' }}>
                            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#22d3ee', marginBottom: 6 }}>
                              Env / Config
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                              API keys, endpoints, or provider-specific config names.
                            </div>
                          </div>
                          <div style={{ ...cardStyle, padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(168,85,247,0.2)' }}>
                            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#22d3ee', marginBottom: 6 }}>
                              Source
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                              Client constructors, model names, and provider API call patterns in source files.
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <SmallPill tone={detectedProviderCount > 0 ? 'good' : 'warn'}>{detectedProviderCount} detected</SmallPill>
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            Any one matching signal family is enough for a provider to appear as detected.
                          </span>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

            <div style={{ overflowY: 'auto', minHeight: 0, paddingRight: 4, display: 'grid', gap: 14, alignContent: 'start' }}>
              {activeSignalsSection === 'overview' ? (
                <>
                  <div style={{ ...sectionCardStyle, padding: '14px 16px', display: 'grid', gap: 14 }}>
                    <ScoreCard score={status.score} />

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                      <SummaryTile label="Providers" value={providerCount} hint="Hosted or local model providers detected in the workspace." tone={providerCount > 0 ? 'good' : 'warn'} />
                      <SummaryTile label="Prompt Assets" value={promptCount} hint="Prompt and template files identified from repo structure." tone={promptCount > 0 ? 'good' : 'warn'} />
                      <SummaryTile label="Eval Signals" value={evalCount} hint="Eval, benchmark, or regression signals found in the workspace." tone={evalCount > 0 ? 'good' : 'warn'} />
                      <SummaryTile label="Feature Bindings" value={bindingCount} hint="Likely app features already wired to model-backed behavior." tone={bindingCount > 0 ? 'good' : 'warn'} />
                    </div>
                  </div>
                </>
              ) : null}

              {activeSignalsSection === 'providers' ? (
                <ProviderSection
                  providers={status.providers || []}
                  customProviderHeuristics={llmSettings.customProviderHeuristics || []}
                  providerHeuristicOverrides={llmSettings.providerHeuristicOverrides || {}}
                  onSaveCustomProviders={onSaveCustomProviders}
                  onSaveProviderOverrides={onSaveProviderOverrides}
                  onRunChecks={() => loadStatus({ silent: true })}
                  checking={refreshing}
                />
              ) : null}

              {activeSignalsSection === 'promptAssets' ? (
                <PromptAssetsSection
                  promptAssets={status.promptAssets}
                  onTestPromptAsset={(relativePath) => {
                    setPromptAssetRequest({ key: `${relativePath}-${Date.now()}`, relativePath });
                  }}
                  onCreatePromptDirectory={onCreatePromptDirectory}
                  onRunChecks={() => loadStatus({ silent: true })}
                  checking={refreshing}
                  promptDirectoryNotice={promptDirectoryNotice}
                />
              ) : null}

              {activeSignalsSection === 'evals' ? (
                <EvalsSection
                  evals={status.evals}
                  onRunEvalAsset={(relativePath) => {
                    setEvalRunRequest({ key: `${relativePath}-${Date.now()}`, relativePath });
                  }}
                />
              ) : null}

              {activeSignalsSection === 'guardrails' ? (
                <MultiSignalSection
                  title="Guardrails and Structured Outputs"
                  icon={Shield}
                  groups={[
                    { title: 'Moderation', items: status.guardrails.moderation },
                    { title: 'Structured Outputs', items: status.guardrails.structuredOutputs },
                    { title: 'Output Validation', items: status.guardrails.outputValidation },
                    { title: 'Prompt Injection Handling', items: status.guardrails.promptInjectionHandling },
                    { title: 'Retry or Fallback', items: status.guardrails.retryOrFallback },
                  ]}
                  emptyText="No strong guardrail signals were detected. This page will eventually help track moderation, schema-constrained outputs, output validation, and fallback behavior."
                  badgeLabel={(count) => count > 0 ? `${count} signals` : 'no signals'}
                />
              ) : null}

              {activeSignalsSection === 'retrieval' ? (
                <MultiSignalSection
                  title="Retrieval and Context Operations"
                  icon={Search}
                  groups={[
                    { title: 'Vector Stores', items: status.retrieval.vectorStores },
                    { title: 'Embedding Signals', items: status.retrieval.embeddingSignals },
                    { title: 'Chunking Signals', items: status.retrieval.chunkingSignals },
                    { title: 'Citation Signals', items: status.retrieval.citationSignals },
                    { title: 'Retrieval Tests', items: status.retrieval.retrievalTests },
                  ]}
                  emptyText="No retrieval or RAG discipline signals were detected. Launchline will use this section to show whether context injection appears intentional and testable."
                  badgeLabel={(count) => count > 0 ? `${count} signals` : 'no signals'}
                />
              ) : null}

              {activeSignalsSection === 'observability' ? (
                <MultiSignalSection
                  title="Observability and Usage Controls"
                  icon={Activity}
                  groups={[
                    { title: 'Token Usage', items: status.observability.tokenUsage },
                    { title: 'Cost Tracking', items: status.observability.costTracking },
                    { title: 'Tracing', items: status.observability.tracing },
                    { title: 'Metadata Logging', items: status.observability.metadataLogging },
                    { title: 'Feedback Signals', items: status.observability.feedback },
                  ]}
                  emptyText="No strong usage or observability signals were detected. This section tracks whether the repo can explain LLM cost, latency, token consumption, and debugging context."
                  badgeLabel={(count) => count > 0 ? `${count} signals` : 'no signals'}
                />
              ) : null}

              {activeSignalsSection === 'featureBindings' ? <FeatureBindingsSection featureBindings={status.featureBindings} /> : null}
            </div>
          </div>
        </div>
      ) : (
        <PlannedFeaturesSection />
      )}
    </div>
  );
}
