import { useCallback, useEffect, useRef, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, GitBranch, GitMerge, RefreshCw, Tag, Zap } from 'lucide-react';
import { Section } from '../../ui-kit/forms/SettingsLayout';

// ─── Theme ────────────────────────────────────────────────────────────────────
const T = {
  color:   '#fb923c',              // orange-400
  r:       'rgba(251,146,60,',     // base rgba prefix
  card:    { borderRadius: 10, padding: '12px 14px', border: '1px solid rgba(251,146,60,0.18)', background: 'rgba(251,146,60,0.03)' },
  label:   { fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(251,146,60,0.55)', marginBottom: 9 },
  subhead: { fontSize: 9, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(251,146,60,0.4)', marginBottom: 6 },
};

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

// ─── Providers section ────────────────────────────────────────────────────────

function ProvidersSection({ providers }) {
  const detected = providers.filter(p => p.exists);
  const notFound = providers.filter(p => !p.exists);
  return (
    <Collapsible title="CI Providers" icon={Zap}>
      {detected.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#fbbf24' }}>
          <AlertTriangle size={12} style={{ flexShrink: 0 }} />
          No CI configuration found in this project.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: notFound.length > 0 ? 10 : 0 }}>
          {detected.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={12} color="#4ade80" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{p.label}</span>
              <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.45)', fontFamily: 'var(--font-mono)' }}>{p.file}</span>
            </div>
          ))}
        </div>
      )}
      {notFound.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {notFound.map(p => (
            <span key={p.id} style={{
              fontSize: 9, padding: '2px 7px', borderRadius: 99,
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(148,163,184,0.35)',
            }}>{p.label}</span>
          ))}
        </div>
      )}
    </Collapsible>
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
      <ProvidersSection providers={status.providers} />
      <GitHubActionsSection github={status.github} />
      <GitLabCISection gitlab={status.gitlab} />
      <MetricsSection metrics={status.metrics} />
    </Section>
  );
}
