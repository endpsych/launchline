import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle, BookOpen, CheckCircle2, ChevronDown, ChevronRight,
  Cloud, FileText, LifeBuoy, RefreshCw, Shield, Shuffle, Zap,
} from 'lucide-react';
import { Section } from '../../ui-kit/forms/SettingsLayout';

// ─── Theme ────────────────────────────────────────────────────────────────────
const T = {
  color:   '#fb7185',              // rose-400
  r:       'rgba(251,113,133,',    // base rgba prefix
  card:    { borderRadius: 10, padding: '12px 14px', border: '1px solid rgba(251,113,133,0.18)', background: 'rgba(251,113,133,0.03)' },
  label:   { fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(251,113,133,0.55)', marginBottom: 9 },
  subhead: { fontSize: 9, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(251,113,133,0.4)', marginBottom: 6 },
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

function FileRow({ icon: Icon, label, sub, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {Icon
        ? <Icon size={12} color={color || '#4ade80'} style={{ flexShrink: 0 }} />
        : <CheckCircle2 size={12} color="#4ade80" style={{ flexShrink: 0 }} />}
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>{label}</span>
      {sub && <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.45)', fontFamily: 'var(--font-mono)' }}>{sub}</span>}
    </div>
  );
}

// ─── Score card ───────────────────────────────────────────────────────────────

function ScoreCard({ passed, total, checks }) {
  const scoreColor = passed === total ? '#4ade80' : passed >= total * 0.6 ? '#fbbf24' : '#f87171';
  const barWidth   = total > 0 ? Math.round((passed / total) * 100) : 0;
  const borderCol  = passed === total ? 'rgba(74,222,128,0.25)' : `${T.r}0.15)`;
  const bgCol      = passed === total ? 'rgba(74,222,128,0.03)' : `${T.r}0.02)`;
  return (
    <div style={{ border: `1px solid ${borderCol}`, borderRadius: 10, padding: '12px 14px', background: bgCol }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <LifeBuoy size={14} style={{ color: T.color, flexShrink: 0 }} />
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.55)`, flex: 1 }}>Disaster Recovery Readiness</span>
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

// ─── Backup section ───────────────────────────────────────────────────────────

function BackupSection({ backup }) {
  const total = backup.configs.length + backup.scripts.length + (backup.velero ? 1 : 0);
  const badge = <StatusPill pass={total > 0} trueLabel={`${total} found`} falseLabel="none found" />;

  return (
    <Collapsible title="Backup Configuration" icon={Cloud} badge={badge}>
      {total === 0 ? (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '4px 0' }}>
          <AlertTriangle size={12} color="#fbbf24" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <span style={{ fontSize: 12, color: '#fbbf24' }}>No backup configuration found.</span>
            <p style={{ fontSize: 11, color: 'rgba(148,163,184,0.5)', margin: '3px 0 0' }}>
              Add a backup script using{' '}
              <code style={{ fontFamily: 'var(--font-mono)', color: T.color }}>pg_dump</code>,{' '}
              <code style={{ fontFamily: 'var(--font-mono)', color: T.color }}>restic</code>, or{' '}
              <code style={{ fontFamily: 'var(--font-mono)', color: T.color }}>aws s3 sync</code>,
              or configure Velero for Kubernetes workloads.
            </p>
          </div>
        </div>
      ) : (
        <>
          {backup.velero && (
            <div style={{ padding: '7px 10px', borderRadius: 8, marginBottom: 10, background: 'rgba(74,222,128,0.04)', border: '1px solid rgba(74,222,128,0.15)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={12} color="#4ade80" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>Velero — Kubernetes backup & restore</span>
              </div>
            </div>
          )}

          {backup.scripts.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={T.subhead}>Backup scripts</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {backup.scripts.map(s => (
                  <div key={s.file} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircle2 size={12} color="#4ade80" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'rgba(148,163,184,0.65)' }}>{s.file}</span>
                    <span style={{
                      fontSize: 9, padding: '1px 6px', borderRadius: 5, fontWeight: 700,
                      background: `${T.r}0.08)`, border: `1px solid ${T.r}0.2)`, color: `${T.r}0.7)`,
                      fontFamily: 'var(--font-mono)',
                    }}>{s.tool}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {backup.configs.length > 0 && (
            <div>
              <div style={T.subhead}>Config files & directories</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {backup.configs.map(c => (
                  <FileRow key={c.file} label={c.label} sub={c.file} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </Collapsible>
  );
}

// ─── Runbooks section ─────────────────────────────────────────────────────────

function RunbooksSection({ runbooks }) {
  const badge = <StatusPill pass={runbooks.length > 0} trueLabel={`${runbooks.length} found`} falseLabel="missing" />;
  return (
    <Collapsible title="Runbooks & Incident Response" icon={BookOpen} badge={badge}>
      {runbooks.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '4px 0' }}>
          <AlertTriangle size={12} color="#fbbf24" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <span style={{ fontSize: 12, color: '#fbbf24' }}>No runbooks or incident response docs found.</span>
            <p style={{ fontSize: 11, color: 'rgba(148,163,184,0.5)', margin: '3px 0 0' }}>
              Create a <code style={{ fontFamily: 'var(--font-mono)', color: T.color }}>RUNBOOK.md</code> or{' '}
              <code style={{ fontFamily: 'var(--font-mono)', color: T.color }}>INCIDENT_RESPONSE.md</code> describing
              how to diagnose and recover from common failure scenarios.
            </p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {runbooks.map(r => (
            <FileRow key={r.file} label={r.label} sub={r.file} />
          ))}
        </div>
      )}
    </Collapsible>
  );
}

// ─── RTO / RPO section ────────────────────────────────────────────────────────

function RtoRpoSection({ rtoRpo }) {
  const { hasDocs, slaFiles, foundInDocs } = rtoRpo;
  const badge = <StatusPill pass={hasDocs} trueLabel="found" falseLabel="missing" />;
  return (
    <Collapsible title="RTO / RPO Objectives" icon={FileText} badge={badge} defaultOpen={!hasDocs}>
      {!hasDocs ? (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '4px 0' }}>
          <AlertTriangle size={12} color="#fbbf24" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <span style={{ fontSize: 12, color: '#fbbf24' }}>No RTO / RPO documentation found.</span>
            <p style={{ fontSize: 11, color: 'rgba(148,163,184,0.5)', margin: '3px 0 0' }}>
              Define Recovery Time Objective (how fast to restore) and Recovery Point Objective
              (how much data loss is acceptable) in an <code style={{ fontFamily: 'var(--font-mono)', color: T.color }}>SLA.md</code> or
              your runbook.
            </p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {slaFiles.map(f => (
            <FileRow key={f} label={f.toUpperCase().replace('.MD', '')} sub={f} />
          ))}
          {foundInDocs && slaFiles.length === 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={12} color="#4ade80" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: 'var(--text)' }}>RTO / RPO objectives mentioned in documentation</span>
            </div>
          )}
          {foundInDocs && slaFiles.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={12} color="#4ade80" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: 'var(--text)' }}>RTO / RPO terminology found in docs</span>
            </div>
          )}
        </div>
      )}
    </Collapsible>
  );
}

// ─── HA / Failover section ────────────────────────────────────────────────────

function HASection({ ha }) {
  const total = ha.configs.length + ha.proxyFiles.length;
  const badge = <StatusPill pass={total > 0} trueLabel={`${total} found`} falseLabel="none found" />;
  return (
    <Collapsible title="HA & Failover Configuration" icon={Shield} badge={badge} defaultOpen={total > 0}>
      {total === 0 ? (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '4px 0' }}>
          <AlertTriangle size={12} color="#fbbf24" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <span style={{ fontSize: 12, color: '#fbbf24' }}>No HA or failover configuration found.</span>
            <p style={{ fontSize: 11, color: 'rgba(148,163,184,0.5)', margin: '3px 0 0' }}>
              Add Kubernetes PodDisruptionBudgets, HorizontalPodAutoscalers, or
              multi-replica Deployments to survive node failures.
            </p>
          </div>
        </div>
      ) : (
        <>
          {ha.proxyFiles.length > 0 && (
            <div style={{ marginBottom: ha.configs.length > 0 ? 10 : 0 }}>
              <div style={T.subhead}>Load balancer / proxy configs</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {ha.proxyFiles.map(f => (
                  <span key={f} style={{
                    fontSize: 10, padding: '2px 8px', borderRadius: 7, fontFamily: 'var(--font-mono)',
                    background: `${T.r}0.07)`, border: `1px solid ${T.r}0.2)`, color: `${T.r}0.75)`,
                  }}>{f}</span>
                ))}
              </div>
            </div>
          )}
          {ha.configs.length > 0 && (
            <div>
              <div style={T.subhead}>Kubernetes HA manifests ({ha.configs.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {ha.configs.slice(0, 8).map(c => (
                  <div key={c.file} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircle2 size={11} color="#4ade80" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'rgba(148,163,184,0.6)', flex: 1 }}>{c.file}</span>
                    <span style={{ fontSize: 9, color: 'rgba(148,163,184,0.35)' }}>{c.reason.slice(0, 32)}</span>
                  </div>
                ))}
                {ha.configs.length > 8 && (
                  <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.3)' }}>…and {ha.configs.length - 8} more</span>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </Collapsible>
  );
}

// ─── Chaos engineering section ────────────────────────────────────────────────

function ChaosSection({ chaos }) {
  const total = chaos.libs.length + (chaos.hasDir ? 1 : 0) + chaos.manifests.length;
  const badge = <StatusPill pass={total > 0} trueLabel={`${total} found`} falseLabel="none found" />;
  return (
    <Collapsible title="Chaos Engineering" icon={Shuffle} badge={badge} defaultOpen={total > 0}>
      {total === 0 ? (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '4px 0' }}>
          <AlertTriangle size={12} color="#fbbf24" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <span style={{ fontSize: 12, color: '#fbbf24' }}>No chaos engineering tooling found.</span>
            <p style={{ fontSize: 11, color: 'rgba(148,163,184,0.5)', margin: '3px 0 0' }}>
              Chaos Toolkit, Litmus ChaosEngine, or Gremlin proactively surface weaknesses
              before incidents occur in production.
            </p>
          </div>
        </div>
      ) : (
        <>
          {chaos.libs.length > 0 && (
            <div style={{ marginBottom: chaos.manifests.length > 0 || chaos.hasDir ? 10 : 0 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {chaos.libs.map(l => (
                  <div key={l.id} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11,
                    padding: '4px 9px', borderRadius: 8,
                    background: `${T.r}0.06)`, border: `1px solid ${T.r}0.2)`,
                  }}>
                    <Zap size={10} color={T.color} style={{ flexShrink: 0 }} />
                    <span style={{ color: 'var(--text)', fontWeight: 600 }}>{l.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {chaos.hasDir && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: chaos.manifests.length > 0 ? 8 : 0 }}>
              <CheckCircle2 size={12} color="#4ade80" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: 'var(--text)' }}>Chaos engineering directory found</span>
            </div>
          )}
          {chaos.manifests.length > 0 && (
            <div>
              <div style={T.subhead}>Litmus ChaosEngine manifests</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {chaos.manifests.map(m => (
                  <span key={m} style={{ fontSize: 10, color: 'rgba(148,163,184,0.55)', fontFamily: 'var(--font-mono)' }}>{m}</span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </Collapsible>
  );
}

// ─── Main tab ─────────────────────────────────────────────────────────────────

export default function DisasterRecoveryTab() {
  const [status, setStatus]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const loadedRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI.disasterRecoveryStatus();
      if (result.ok) setStatus(result);
      else setError(result.error || 'Scan failed');
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (!loadedRef.current) { loadedRef.current = true; load(); } }, [load]);

  if (loading && !status) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: 28, color: 'rgba(148,163,184,0.5)', fontSize: 12 }}>
      <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Scanning disaster recovery configuration…
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
      <LifeBuoy size={15} color={T.color} />
      Disaster Recovery
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase',
        color: scoreColor, background: passed === total ? 'rgba(74,222,128,0.1)' : `${T.r}0.08)`,
        border: `1px solid ${passed === total ? 'rgba(74,222,128,0.28)' : `${T.r}0.22)`}`,
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
      <BackupSection backup={status.backup} />
      <RunbooksSection runbooks={status.runbooks} />
      <RtoRpoSection rtoRpo={status.rtoRpo} />
      <HASection ha={status.ha} />
      <ChaosSection chaos={status.chaos} />
    </Section>
  );
}
