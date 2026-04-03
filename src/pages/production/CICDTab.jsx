import { useCallback, useEffect, useRef, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, GitBranch, GitMerge, Loader2, Plus, RefreshCw, Tag, Zap } from 'lucide-react';
import { Section } from '../../ui-kit/forms/SettingsLayout';
import Modal from '../../components/Modal';

// ─── Theme ────────────────────────────────────────────────────────────────────
const T = {
  color:   '#fb923c',              // orange-400
  r:       'rgba(251,146,60,',     // base rgba prefix
  card:    { borderRadius: 10, padding: '12px 14px', border: '1px solid rgba(251,146,60,0.18)', background: 'rgba(251,146,60,0.03)' },
  label:   { fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(251,146,60,0.55)', marginBottom: 9 },
  subhead: { fontSize: 9, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(251,146,60,0.4)', marginBottom: 6 },
};

const PROVIDER_OPTIONS = [
  {
    id: 'github',
    label: 'GitHub Actions',
    functional: true,
    summary: 'Native GitHub-hosted workflows stored in .github/workflows.',
    detail: 'Best fit for repositories hosted on GitHub. Launchline can scaffold a starter workflow that runs on push, pull request, and manual dispatch so you have a clean CI foundation to build from.',
    output: '.github/workflows/ci.yml',
    statusLabel: 'Ready now',
  },
  {
    id: 'gitlab',
    label: 'GitLab CI',
    functional: false,
    summary: 'Pipeline definitions stored in .gitlab-ci.yml.',
    detail: 'Useful for teams running on GitLab. Launchline will later scaffold a baseline pipeline, but this option is still a placeholder in the current build.',
    output: '.gitlab-ci.yml',
    statusLabel: 'Placeholder',
  },
  {
    id: 'jenkins',
    label: 'Jenkins',
    functional: false,
    summary: 'Self-hosted automation driven by a Jenkinsfile.',
    detail: 'Common in enterprise environments and older delivery stacks. Launchline will eventually support Jenkins scaffolding and analysis, but it is still placeholder-only right now.',
    output: 'Jenkinsfile',
    statusLabel: 'Placeholder',
  },
  {
    id: 'circleci',
    label: 'CircleCI',
    functional: false,
    summary: 'Cloud CI configured through .circleci/config.yml.',
    detail: 'Often used for straightforward SaaS pipelines. The provider entry is here for future support, but Launchline does not scaffold CircleCI yet.',
    output: '.circleci/config.yml',
    statusLabel: 'Placeholder',
  },
  {
    id: 'travis',
    label: 'Travis CI',
    functional: false,
    summary: 'Legacy-friendly CI defined in .travis.yml.',
    detail: 'Still appears in some older repositories. Launchline can detect it, but the add-provider flow is still placeholder-only for Travis.',
    output: '.travis.yml',
    statusLabel: 'Placeholder',
  },
  {
    id: 'azure',
    label: 'Azure Pipelines',
    functional: false,
    summary: 'Azure DevOps pipeline configuration stored in azure-pipelines.yml.',
    detail: 'Strong choice for Microsoft-centered delivery stacks. Launchline will support creating baseline Azure Pipelines later, but not in this first pass.',
    output: 'azure-pipelines.yml',
    statusLabel: 'Placeholder',
  },
  {
    id: 'bitbucket',
    label: 'Bitbucket Pipelines',
    functional: false,
    summary: 'Bitbucket-native pipeline configuration in bitbucket-pipelines.yml.',
    detail: 'Useful for Bitbucket-hosted teams. Launchline currently exposes this as a future provider target only.',
    output: 'bitbucket-pipelines.yml',
    statusLabel: 'Placeholder',
  },
  {
    id: 'drone',
    label: 'Drone CI',
    functional: false,
    summary: 'Container-first pipeline config defined in .drone.yml.',
    detail: 'A good fit for some self-hosted CI setups. Launchline can detect Drone later, but scaffolding is not available yet.',
    output: '.drone.yml',
    statusLabel: 'Placeholder',
  },
];

// ─── Shared micro-components ──────────────────────────────────────────────────

function CheckItem({ pass, label, detail }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
      <span style={{ fontSize: 13, lineHeight: 1, flexShrink: 0, color: pass ? '#4ade80' : '#f87171' }}>{pass ? '✓' : '✗'}</span>
      <div>
        <span style={{ fontSize: 11, color: pass ? 'var(--text-secondary)' : 'var(--text)' }}>{label}</span>
        {detail && <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.45)', marginLeft: 5 }}>{detail}</span>}
      </div>
    </div>
  );
}

function Collapsible({ title, icon: Icon, defaultOpen = true, badge, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ border: `1px solid ${T.r}0.15)`, borderRadius: 10, background: 'rgba(10,15,26,0.45)', overflow: 'hidden' }}>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', cursor: 'pointer', userSelect: 'none' }}
        onClick={() => setOpen(o => !o)}
      >
        {open
          ? <ChevronDown  size={13} style={{ color: `${T.r}0.55)`, flexShrink: 0 }} />
          : <ChevronRight size={13} style={{ color: `${T.r}0.55)`, flexShrink: 0 }} />}
        {Icon && <Icon size={13} color={T.color} style={{ flexShrink: 0 }} />}
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: `${T.r}0.65)`, flex: 1 }}>
          {title}
        </span>
        {badge}
      </div>
      {open && <div style={{ padding: '2px 14px 14px' }}>{children}</div>}
    </div>
  );
}

function StatusPill({ pass, trueLabel, falseLabel }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99,
      background: pass ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
      border: `1px solid ${pass ? 'rgba(74,222,128,0.28)' : 'rgba(248,113,113,0.28)'}`,
      color: pass ? '#4ade80' : '#f87171',
    }}>
      {pass ? trueLabel : falseLabel}
    </span>
  );
}

function TriggerPill({ label }) {
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 99,
      background: `${T.r}0.1)`, border: `1px solid ${T.r}0.28)`, color: `${T.r}0.85)`,
      textTransform: 'uppercase', letterSpacing: '0.05em',
    }}>{label}</span>
  );
}

// ─── Score card ───────────────────────────────────────────────────────────────

function ScoreCard({ passed, total, checks }) {
  const scoreColor = passed === total ? '#4ade80' : passed >= total * 0.6 ? '#fbbf24' : '#f87171';
  const barWidth   = total > 0 ? Math.round((passed / total) * 100) : 0;
  const borderCol  = passed === total ? 'rgba(74,222,128,0.25)' : 'rgba(251,146,60,0.2)';
  const bgCol      = passed === total ? 'rgba(74,222,128,0.03)' : 'rgba(251,146,60,0.03)';
  return (
    <div style={{ border: `1px solid ${borderCol}`, borderRadius: 10, padding: '12px 14px', background: bgCol }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <GitBranch size={14} style={{ color: T.color, flexShrink: 0 }} />
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.55)`, flex: 1 }}>CI/CD Readiness</span>
        <span style={{ fontSize: 13, fontWeight: 800, color: scoreColor }}>{passed}/{total}</span>
      </div>
      <div style={{ height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.07)', marginBottom: 10, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${barWidth}%`, borderRadius: 999, background: scoreColor, transition: 'width 0.4s' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' }}>
        {checks.map(c => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
            <span style={{ fontSize: 13, lineHeight: 1, flexShrink: 0, color: c.pass ? '#4ade80' : '#f87171' }}>{c.pass ? '✓' : '✗'}</span>
            <span style={{ fontSize: 11, color: c.pass ? 'var(--text-secondary)' : 'var(--text)' }}>{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WorkspaceProfileCard({ workspaceProfile }) {
  if (!workspaceProfile) return null;

  return (
    <div style={{
      border: `1px solid ${T.r}0.18)`,
      borderRadius: 10,
      padding: '12px 14px',
      background: 'rgba(251,146,60,0.03)',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Tag size={13} color={T.color} style={{ flexShrink: 0 }} />
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.55)` }}>
          Detected Workspace Profile
        </span>
        <span style={{
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          color: workspaceProfile.isPolyglot ? '#fbbf24' : T.color,
          background: workspaceProfile.isPolyglot ? 'rgba(251,191,36,0.1)' : `${T.r}0.08)`,
          border: workspaceProfile.isPolyglot ? '1px solid rgba(251,191,36,0.24)' : `1px solid ${T.r}0.2)`,
          borderRadius: 999,
          padding: '2px 8px',
        }}>
          {workspaceProfile.label}
        </span>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
        {workspaceProfile.isPolyglot
          ? 'Launchline detected multiple repo signals and will treat this workspace as polyglot when generating CI.'
          : `Launchline will treat this workspace as a ${workspaceProfile.label} project when generating CI.`}
      </div>
      {Array.isArray(workspaceProfile.profiles) && workspaceProfile.profiles.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {workspaceProfile.profiles.map((profile) => (
            <span
              key={profile}
              style={{
                fontSize: 10,
                padding: '2px 7px',
                borderRadius: 999,
                background: `${T.r}0.08)`,
                border: `1px solid ${T.r}0.2)`,
                color: `${T.r}0.75)`,
                fontWeight: 700,
              }}
            >
              {profile}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Providers section ────────────────────────────────────────────────────────

function ProvidersSection({ providers, onRefresh }) {
  const detected = providers.filter(p => p.exists);
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState('github');
  const [addingProvider, setAddingProvider] = useState(null);
  const [providerMessage, setProviderMessage] = useState(null);

  const selectedProvider = PROVIDER_OPTIONS.find(option => option.id === selectedProviderId) || PROVIDER_OPTIONS[0];

  const openProviderModal = useCallback(() => {
    const nextSelectable = PROVIDER_OPTIONS.find(option => !detected.some(provider => provider.id === option.id)) || PROVIDER_OPTIONS[0];
    setSelectedProviderId(nextSelectable.id);
    setShowProviderModal(true);
  }, [detected]);

  const handleAddProvider = useCallback(async (providerId, functional) => {
    if (!functional || addingProvider) return;
    setProviderMessage(null);
    setAddingProvider(providerId);
    try {
      const result = await window.electronAPI.cicdAddProvider(providerId);
      if (!result?.ok) {
        setProviderMessage({ tone: 'error', text: result?.error || 'Unable to add CI provider.' });
        return;
      }

      setProviderMessage({
        tone: 'success',
        text: result.created
          ? `${PROVIDER_OPTIONS.find(p => p.id === providerId)?.label || 'Provider'} starter added.`
          : result.message || 'Provider is already configured.',
      });

      setShowProviderModal(false);
      if (onRefresh) await onRefresh();
    } catch (error) {
      setProviderMessage({ tone: 'error', text: error.message || 'Unable to add CI provider.' });
    } finally {
      setAddingProvider(null);
    }
  }, [addingProvider, onRefresh]);

  return (
    <div style={{ border: `1px solid ${T.r}0.15)`, borderRadius: 10, background: 'rgba(10,15,26,0.45)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '9px 14px', borderBottom: '1px solid rgba(251,146,60,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <Zap size={13} color={T.color} style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: `${T.r}0.65)` }}>
            CI Providers
          </span>
        </div>
        <button
          type="button"
          onClick={openProviderModal}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            width: 'fit-content',
            fontSize: 11,
            fontWeight: 700,
            color: T.color,
            background: `${T.r}0.08)`,
            border: `1px solid ${T.r}0.22)`,
            borderRadius: 8,
            padding: '6px 10px',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <Plus size={12} />
          {detected.length === 0 ? 'Add provider' : 'Add another provider'}
        </button>
      </div>
      <div style={{ padding: '12px 14px 14px' }}>
      {detected.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#fbbf24' }}>
            <AlertTriangle size={12} style={{ flexShrink: 0 }} />
            No CI configuration found in this project.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {detected.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={12} color="#4ade80" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{p.label}</span>
                <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.45)', fontFamily: 'var(--font-mono)' }}>{p.file}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {providerMessage && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          fontSize: 11,
          color: providerMessage.tone === 'error' ? '#f87171' : '#4ade80',
          marginTop: 10,
        }}>
          {providerMessage.tone === 'error'
            ? <AlertTriangle size={11} style={{ flexShrink: 0 }} />
            : <CheckCircle2 size={11} style={{ flexShrink: 0 }} />}
          {providerMessage.text}
        </div>
      )}
      {showProviderModal && (
        <Modal
          onClose={() => setShowProviderModal(false)}
          title="Add CI Provider"
          subtitle="Choose a provider on the left to see what Launchline can scaffold into the loaded workspace."
          icon={<Zap size={18} color={T.color} />}
          accentColor={T.color}
          maxWidth={960}
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setShowProviderModal(false)}
                style={{
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-muted)',
                  padding: '8px 12px',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
              <button
                type="button"
                disabled={!selectedProvider.functional || !!addingProvider || detected.some(provider => provider.id === selectedProvider.id)}
                onClick={() => handleAddProvider(selectedProvider.id, selectedProvider.functional)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  borderRadius: 8,
                  border: `1px solid ${selectedProvider.functional ? `${T.r}0.22)` : 'rgba(255,255,255,0.08)'}`,
                  background: selectedProvider.functional ? `${T.r}0.08)` : 'rgba(255,255,255,0.04)',
                  color: selectedProvider.functional ? T.color : 'rgba(148,163,184,0.45)',
                  padding: '8px 12px',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: selectedProvider.functional && !addingProvider && !detected.some(provider => provider.id === selectedProvider.id)
                    ? 'pointer'
                    : 'not-allowed',
                }}
              >
                {addingProvider === selectedProvider.id
                  ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                  : <Plus size={12} />}
                {detected.some(provider => provider.id === selectedProvider.id)
                  ? 'Already added'
                  : selectedProvider.functional
                    ? `Add ${selectedProvider.label}`
                    : 'Coming later'}
              </button>
            </div>
          }
        >
          <div style={{ display: 'grid', gridTemplateColumns: '280px minmax(0, 1fr)', gap: 18, minHeight: 340 }}>
            <div style={{
              borderRight: '1px solid var(--border)',
              paddingRight: 18,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}>
              {PROVIDER_OPTIONS.map(option => {
                const isSelected = option.id === selectedProvider.id;
                const isDetected = detected.some(provider => provider.id === option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setSelectedProviderId(option.id)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: 6,
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: isSelected ? `1px solid ${T.r}0.26)` : '1px solid rgba(255,255,255,0.08)',
                      background: isSelected ? `${T.r}0.08)` : 'rgba(255,255,255,0.02)',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: isSelected ? T.color : 'var(--text)' }}>{option.label}</span>
                      <span style={{
                        fontSize: 9,
                        padding: '2px 6px',
                        borderRadius: 999,
                        color: isDetected ? '#4ade80' : option.functional ? T.color : 'rgba(148,163,184,0.55)',
                        background: isDetected ? 'rgba(74,222,128,0.1)' : option.functional ? `${T.r}0.1)` : 'rgba(255,255,255,0.02)',
                        border: isDetected ? '1px solid rgba(74,222,128,0.24)' : option.functional ? `1px solid ${T.r}0.24)` : '1px solid rgba(255,255,255,0.08)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        fontWeight: 800,
                      }}>
                        {isDetected ? 'Added' : option.statusLabel}
                      </span>
                    </div>
                    <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.55)' }}>{option.summary}</span>
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div style={{ ...T.label, marginBottom: 8 }}>Selected Provider</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{selectedProvider.label}</span>
                  <span style={{
                    fontSize: 9,
                    padding: '2px 6px',
                    borderRadius: 999,
                    color: detected.some(provider => provider.id === selectedProvider.id)
                      ? '#4ade80'
                      : selectedProvider.functional
                        ? T.color
                        : 'rgba(148,163,184,0.55)',
                    background: detected.some(provider => provider.id === selectedProvider.id)
                      ? 'rgba(74,222,128,0.1)'
                      : selectedProvider.functional
                        ? `${T.r}0.1)`
                        : 'rgba(255,255,255,0.02)',
                    border: detected.some(provider => provider.id === selectedProvider.id)
                      ? '1px solid rgba(74,222,128,0.24)'
                      : selectedProvider.functional
                        ? `1px solid ${T.r}0.24)`
                        : '1px solid rgba(255,255,255,0.08)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    fontWeight: 800,
                  }}>
                    {detected.some(provider => provider.id === selectedProvider.id)
                      ? 'Already added'
                      : selectedProvider.statusLabel}
                  </span>
                </div>
                <p style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--text-secondary)', margin: 0 }}>
                  {selectedProvider.detail}
                </p>
              </div>
              <div style={{
                borderRadius: 10,
                border: `1px solid ${T.r}0.14)`,
                background: 'rgba(255,255,255,0.02)',
                padding: '12px 14px',
              }}>
                <div style={T.label}>Scaffold Output</div>
                <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>
                  {selectedProvider.output}
                </div>
              </div>
              <div style={{
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.015)',
                padding: '12px 14px',
              }}>
                <div style={T.label}>What Launchline Will Do</div>
                <p style={{ fontSize: 11, lineHeight: 1.6, color: 'var(--text-muted)', margin: 0 }}>
                  {selectedProvider.functional
                    ? 'Launchline will scaffold a starter provider file into the loaded workspace. It gives you a safe baseline to edit, not a full production pipeline.'
                    : 'This provider is visible so you can plan around it, but Launchline will not scaffold it until a future pass.'}
                </p>
              </div>
            </div>
          </div>
        </Modal>
      )}
      </div>
    </div>
  );
}

// ─── GitHub Actions section ───────────────────────────────────────────────────

function GitHubActionsSection({ github }) {
  const [expandedWf, setExpandedWf] = useState(null);

  if (!github) return (
    <Collapsible title="GitHub Actions" icon={GitBranch} defaultOpen={false}>
      <p style={{ fontSize: 12, color: 'rgba(148,163,184,0.5)', margin: 0 }}>No .github/workflows/ directory found.</p>
    </Collapsible>
  );

  const totalIssues = github.workflows.reduce((s, w) => s + w.issues.length, 0);
  const badge = <StatusPill pass={totalIssues === 0} trueLabel="clean" falseLabel={`${totalIssues} issue${totalIssues !== 1 ? 's' : ''}`} />;

  return (
    <Collapsible title={`GitHub Actions — ${github.workflowCount} workflow${github.workflowCount !== 1 ? 's' : ''}`} icon={GitBranch} badge={badge}>

      {/* Undocumented secrets banner */}
      {github.undocumentedSecrets.length > 0 && (
        <div style={{ padding: '8px 10px', borderRadius: 7, marginBottom: 10, background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)' }}>
          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(248,113,113,0.65)', marginBottom: 5 }}>
            Secrets not in .env.example
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {github.undocumentedSecrets.map(s => (
              <span key={s} style={{
                fontSize: 10, padding: '1px 7px', borderRadius: 99, fontFamily: 'var(--font-mono)',
                background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.28)', color: '#f87171',
              }}>{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* Per-workflow rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {github.workflows.map(wf => (
          <div key={wf.file} style={{ borderRadius: 8, border: `1px solid ${T.r}0.12)`, background: 'rgba(255,255,255,0.01)', overflow: 'hidden' }}>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 10px', cursor: 'pointer', userSelect: 'none' }}
              onClick={() => setExpandedWf(expandedWf === wf.file ? null : wf.file)}
            >
              {expandedWf === wf.file
                ? <ChevronDown  size={11} style={{ color: `${T.r}0.45)`, flexShrink: 0 }} />
                : <ChevronRight size={11} style={{ color: `${T.r}0.45)`, flexShrink: 0 }} />}
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', flex: 1, fontFamily: 'var(--font-mono)' }}>{wf.file}</span>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                {wf.triggers.map(t => <TriggerPill key={t} label={t} />)}
                {wf.isDeployWorkflow && (
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 99, background: 'rgba(192,132,252,0.1)', border: '1px solid rgba(192,132,252,0.28)', color: '#c084fc' }}>deploy</span>
                )}
                <StatusPill pass={wf.issues.length === 0} trueLabel="✓" falseLabel={`${wf.issues.length}`} />
              </div>
            </div>

            {expandedWf === wf.file && (
              <div style={{ padding: '8px 10px 10px', borderTop: `1px solid ${T.r}0.1)` }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                  <CheckItem pass={wf.hasTimeout}                   label="Job timeout defined"           detail={!wf.hasTimeout ? 'Runaway jobs can block your runner queue' : undefined} />
                  <CheckItem pass={!wf.hasWidePerms}                label="No wide permissions"           detail={wf.hasWidePerms ? 'write-all grants broad repo access' : undefined} />
                  <CheckItem pass={wf.unpinnedActions.length === 0} label="Actions pinned to versions"    detail={wf.unpinnedActions.length > 0 ? `Unpinned: ${wf.unpinnedActions.slice(0, 3).join(', ')}` : undefined} />
                </div>
                {wf.secretsUsed.length > 0 && (
                  <div>
                    <div style={T.subhead}>Secrets referenced</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {wf.secretsUsed.map(s => (
                        <span key={s} style={{ fontSize: 10, padding: '1px 7px', borderRadius: 99, fontFamily: 'var(--font-mono)', background: `${T.r}0.07)`, border: `1px solid ${T.r}0.2)`, color: `${T.r}0.7)` }}>{s}</span>
                      ))}
                    </div>
                  </div>
                )}
                {wf.protectedBranches.length > 0 && (
                  <div style={{ marginTop: 6 }}>
                    <div style={T.subhead}>Branch coverage</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {wf.protectedBranches.map(b => (
                        <span key={b} style={{ fontSize: 10, padding: '1px 7px', borderRadius: 99, fontFamily: 'var(--font-mono)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(148,163,184,0.6)' }}>{b}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </Collapsible>
  );
}

// ─── GitLab CI section ────────────────────────────────────────────────────────

function GitLabCISection({ gitlab }) {
  if (!gitlab) return (
    <Collapsible title="GitLab CI" icon={GitMerge} defaultOpen={false}>
      <p style={{ fontSize: 12, color: 'rgba(148,163,184,0.5)', margin: 0 }}>No .gitlab-ci.yml found.</p>
    </Collapsible>
  );

  return (
    <Collapsible title={`GitLab CI — ${gitlab.jobCount} job${gitlab.jobCount !== 1 ? 's' : ''}`} icon={GitMerge}>
      {/* Stage pipeline */}
      {gitlab.stages.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.4)' }}>stages</span>
          {gitlab.stages.map((s, i) => (
            <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              {i > 0 && <span style={{ color: `${T.r}0.4)`, fontSize: 10 }}>→</span>}
              <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 99, background: `${T.r}0.08)`, border: `1px solid ${T.r}0.2)`, color: `${T.r}0.7)`, fontFamily: 'var(--font-mono)' }}>{s}</span>
            </span>
          ))}
        </div>
      )}

      {/* Job grid */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: gitlab.issues.length > 0 ? 10 : 0 }}>
        {gitlab.jobs.map(j => (
          <div key={j.name} style={{
            display: 'flex', alignItems: 'center', gap: 5, fontSize: 11,
            padding: '3px 8px', borderRadius: 7,
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
          }}>
            <span style={{ color: 'var(--text)', fontWeight: 500 }}>{j.name}</span>
            {j.stage && <span style={{ color: 'rgba(148,163,184,0.4)', fontSize: 10 }}>· {j.stage}</span>}
            {!j.hasTimeout && <AlertTriangle size={9} color="#fbbf24" />}
          </div>
        ))}
      </div>

      {gitlab.issues.map((issue, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#fbbf24', padding: '2px 0' }}>
          <AlertTriangle size={11} /> {issue}
        </div>
      ))}
    </Collapsible>
  );
}

// ─── Metrics section ──────────────────────────────────────────────────────────

function MetricsSection({ metrics }) {
  if (!metrics) return (
    <Collapsible title="Deployment Metrics" icon={Activity} defaultOpen={false}>
      <p style={{ fontSize: 12, color: 'rgba(148,163,184,0.5)', margin: 0 }}>No git repository found — metrics unavailable.</p>
    </Collapsible>
  );

  const freq      = metrics.commitsLast30Days;
  const freqLabel = freq === 0 ? 'No activity' : freq < 5 ? 'Low' : freq < 20 ? 'Moderate' : 'High';
  const freqColor = freq === 0 ? '#f87171' : freq < 5 ? '#fbbf24' : '#4ade80';

  return (
    <Collapsible title="Deployment Metrics" icon={Activity}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: metrics.recentTags.length > 0 ? 10 : 0 }}>
        <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: `1px solid ${T.r}0.12)` }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: 'rgba(148,163,184,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>
            Commits (last 30 days)
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
            <span style={{ fontSize: 26, fontWeight: 800, color: freqColor, letterSpacing: '-0.03em' }}>{freq}</span>
            <span style={{ fontSize: 11, color: freqColor, fontWeight: 600 }}>{freqLabel}</span>
          </div>
        </div>
        <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: `1px solid ${T.r}0.12)` }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: 'rgba(148,163,184,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>
            Recent releases
          </div>
          <span style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em' }}>{metrics.recentTags.length}</span>
        </div>
      </div>
      {metrics.recentTags.length > 0 && (
        <div>
          <div style={T.subhead}>Latest tags</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {metrics.recentTags.map(tag => (
              <div key={tag} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Tag size={9} color={T.color} />
                <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.55)', fontFamily: 'var(--font-mono)' }}>{tag}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Collapsible>
  );
}

// ─── Main tab ─────────────────────────────────────────────────────────────────

export default function CICDTab() {
  const [status, setStatus]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const loadedRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI.cicdStatus();
      if (result.ok) setStatus(result);
      else setError(result.error || 'Scan failed');
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (!loadedRef.current) { loadedRef.current = true; load(); } }, [load]);

  if (loading && !status) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: 28, color: 'rgba(148,163,184,0.5)', fontSize: 12 }}>
      <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Scanning CI/CD configuration…
    </div>
  );

  if (error) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: 28, color: '#f87171', fontSize: 12 }}>
      <AlertTriangle size={13} /> {error}
      <button onClick={load} style={{ marginLeft: 6, fontSize: 11, color: T.color, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Retry</button>
    </div>
  );

  if (!status) return null;

  const passed = status.score.passed;
  const total  = status.score.total;
  const scoreColor = passed === total ? '#4ade80' : passed >= total * 0.6 ? '#fbbf24' : '#f87171';
  const hasGitHubProvider = status.providers?.some((provider) => provider.id === 'github' && provider.exists);
  const hasGitLabProvider = status.providers?.some((provider) => provider.id === 'gitlab' && provider.exists);

  const sectionTitle = (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <GitBranch size={15} color={T.color} />
      CI/CD Pipeline
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase',
        color: scoreColor, background: passed === total ? 'rgba(74,222,128,0.1)' : `${T.r}0.1)`,
        border: `1px solid ${passed === total ? 'rgba(74,222,128,0.28)' : `${T.r}0.28)`}`,
        borderRadius: 999, padding: '2px 8px', lineHeight: 1.5,
      }}>
        {passed}/{total}
      </span>
      <button
        onClick={load} disabled={loading}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, padding: '2px 8px',
          borderRadius: 6, border: `1px solid ${T.r}0.22)`, background: `${T.r}0.06)`,
          color: `${T.r}0.65)`, cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 600,
        }}
      >
        <RefreshCw size={9} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
        {loading ? 'Scanning…' : 'Run Scan'}
      </button>
    </span>
  );

  return (
    <Section title={sectionTitle}>
      <ScoreCard passed={passed} total={total} checks={status.score.checks} />
      <WorkspaceProfileCard workspaceProfile={status.workspaceProfile} />
      <ProvidersSection providers={status.providers} onRefresh={load} />
      {hasGitHubProvider && <GitHubActionsSection github={status.github} />}
      {hasGitLabProvider && <GitLabCISection gitlab={status.gitlab} />}
      <MetricsSection metrics={status.metrics} />
    </Section>
  );
}
