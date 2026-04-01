import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, ChevronDown, ChevronRight,
  FileText, Globe, RefreshCw, Search, Shield, UserCheck,
} from 'lucide-react';
import { Section } from '../../ui-kit/forms/SettingsLayout';

// ─── Theme ────────────────────────────────────────────────────────────────────
const T = {
  color:   '#fbbf24',              // amber-400
  r:       'rgba(251,191,36,',     // base rgba prefix
  card:    { borderRadius: 10, padding: '12px 14px', border: '1px solid rgba(251,191,36,0.18)', background: 'rgba(251,191,36,0.03)' },
  label:   { fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(251,191,36,0.55)', marginBottom: 9 },
  subhead: { fontSize: 9, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(251,191,36,0.4)', marginBottom: 6 },
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

function WarnPill({ label }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99,
      background: 'rgba(251,113,133,0.1)', border: '1px solid rgba(251,113,133,0.28)', color: '#fb7185',
    }}>{label}</span>
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
        <FileText size={14} style={{ color: T.color, flexShrink: 0 }} />
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.55)`, flex: 1 }}>Audit Logging Readiness</span>
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

// ─── Audit libraries section ──────────────────────────────────────────────────

function LibsSection({ libs, hasStructuredAudit, auditCallFiles }) {
  const badge = libs.length > 0
    ? <StatusPill pass trueLabel={`${libs.length} found`} />
    : auditCallFiles.length > 0
      ? <StatusPill pass trueLabel="calls found" />
      : <StatusPill pass={false} trueLabel="" falseLabel="none found" />;

  return (
    <Collapsible title="Audit Logger Libraries" icon={UserCheck} badge={badge}>
      {libs.length === 0 && auditCallFiles.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '4px 0' }}>
          <AlertTriangle size={12} color="#fbbf24" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <span style={{ fontSize: 12, color: '#fbbf24' }}>No audit logging library found.</span>
            <p style={{ fontSize: 11, color: 'rgba(148,163,184,0.5)', margin: '3px 0 0' }}>
              Consider <code style={{ fontFamily: 'var(--font-mono)', color: T.color }}>django-auditlog</code> (Python/Django),{' '}
              <code style={{ fontFamily: 'var(--font-mono)', color: T.color }}>express-audit-log</code> (Node), or
              a custom structured logger writing to an append-only audit table or stream.
            </p>
          </div>
        </div>
      ) : (
        <>
          {libs.length > 0 && (
            <div style={{ marginBottom: auditCallFiles.length > 0 ? 10 : 0 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {libs.map(l => (
                  <div key={l.id} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11,
                    padding: '4px 9px', borderRadius: 8,
                    background: `${T.r}0.06)`, border: `1px solid ${T.r}0.2)`,
                  }}>
                    <CheckCircle2 size={11} color="#4ade80" style={{ flexShrink: 0 }} />
                    <span style={{ color: 'var(--text)', fontWeight: 600 }}>{l.label}</span>
                    {l.structured && (
                      <span style={{ fontSize: 8, fontWeight: 700, padding: '1px 4px', borderRadius: 4, background: `${T.r}0.12)`, color: T.color, letterSpacing: '0.05em', textTransform: 'uppercase' }}>JSON</span>
                    )}
                    <span style={{ fontSize: 9, color: 'rgba(148,163,184,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{l.pkg.toUpperCase()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {auditCallFiles.length > 0 && (
            <div>
              <div style={T.subhead}>Files with audit log calls ({auditCallFiles.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {auditCallFiles.slice(0, 6).map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <CheckCircle2 size={10} color="#4ade80" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.6)', fontFamily: 'var(--font-mono)' }}>{f}</span>
                  </div>
                ))}
                {auditCallFiles.length > 6 && (
                  <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.3)' }}>…and {auditCallFiles.length - 6} more</span>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </Collapsible>
  );
}

// ─── Mutation coverage section ────────────────────────────────────────────────

function MutationCoverageSection({ mutations }) {
  const { total, withAudit, coverage, files, covered } = mutations;
  const coverageColor = coverage === 100 ? '#4ade80' : coverage >= 50 ? '#fbbf24' : '#f87171';
  const badge = total === 0
    ? <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.35)', fontWeight: 600 }}>no mutations found</span>
    : <StatusPill pass={coverage >= 50} trueLabel={`${coverage}% covered`} falseLabel={`${coverage}% covered`} />;

  return (
    <Collapsible title="DB Mutation Coverage" icon={Search} badge={badge} defaultOpen={total > 0 && coverage < 100}>
      {total === 0 ? (
        <p style={{ fontSize: 12, color: 'rgba(148,163,184,0.5)', margin: 0 }}>
          No database mutation patterns found in source files.
        </p>
      ) : (
        <>
          {/* Coverage meter */}
          <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: `1px solid ${T.r}0.12)`, marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: 'rgba(148,163,184,0.6)', flex: 1 }}>
                {withAudit} of {total} mutation file{total !== 1 ? 's' : ''} have audit log calls nearby
              </span>
              <span style={{ fontSize: 18, fontWeight: 800, color: coverageColor, letterSpacing: '-0.02em' }}>{coverage}%</span>
            </div>
            <div style={{ height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${coverage}%`, borderRadius: 999, background: coverageColor, transition: 'width 0.4s' }} />
            </div>
          </div>

          {/* Uncovered files */}
          {files.filter(f => !covered.includes(f)).length > 0 && (
            <div style={{ marginBottom: covered.length > 0 ? 10 : 0 }}>
              <div style={{ ...T.subhead, color: 'rgba(248,113,113,0.5)' }}>Missing audit coverage</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {files.filter(f => !covered.includes(f)).map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <AlertTriangle size={10} color="#f87171" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.55)', fontFamily: 'var(--font-mono)' }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Covered files */}
          {covered.length > 0 && (
            <div>
              <div style={T.subhead}>Audit coverage confirmed</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {covered.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <CheckCircle2 size={10} color="#4ade80" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.55)', fontFamily: 'var(--font-mono)' }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </Collapsible>
  );
}

// ─── Retention section ────────────────────────────────────────────────────────

function RetentionSection({ retention }) {
  const total = retention.configs.length + retention.logDriverFiles.length;
  const badge = <StatusPill pass={total > 0} trueLabel={`${total} found`} falseLabel="none found" />;

  return (
    <Collapsible title="Log Retention Policy" icon={Globe} badge={badge} defaultOpen={total === 0}>
      {total === 0 ? (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '4px 0' }}>
          <AlertTriangle size={12} color="#fbbf24" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <span style={{ fontSize: 12, color: '#fbbf24' }}>No log retention configuration found.</span>
            <p style={{ fontSize: 11, color: 'rgba(148,163,184,0.5)', margin: '3px 0 0' }}>
              Define a retention policy in Loki, CloudWatch, Fluentd, or Logstash to ensure
              audit logs are kept for the required period (SOC 2: 1 year, GDPR: purpose-limited).
            </p>
          </div>
        </div>
      ) : (
        <>
          {retention.configs.length > 0 && (
            <div style={{ marginBottom: retention.logDriverFiles.length > 0 ? 10 : 0 }}>
              <div style={T.subhead}>Retention configs</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {retention.configs.map(c => (
                  <div key={c.file} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircle2 size={12} color="#4ade80" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>{c.label}</span>
                    <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.45)', fontFamily: 'var(--font-mono)' }}>{c.file}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {retention.logDriverFiles.length > 0 && (
            <div>
              <div style={T.subhead}>Log driver config in manifests</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {retention.logDriverFiles.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircle2 size={11} color="#4ade80" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.55)', fontFamily: 'var(--font-mono)' }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </Collapsible>
  );
}

// ─── PII risk section ─────────────────────────────────────────────────────────

function PIISection({ piiRisks }) {
  const badge = piiRisks.length === 0
    ? <StatusPill pass trueLabel="clean" />
    : <WarnPill label={`${piiRisks.length} risk${piiRisks.length !== 1 ? 's' : ''}`} />;

  return (
    <Collapsible title="PII in Log Calls" icon={Shield} badge={badge} defaultOpen={piiRisks.length > 0}>
      {piiRisks.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
          <CheckCircle2 size={12} color="#4ade80" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            No obvious PII patterns detected in log calls.
          </span>
        </div>
      ) : (
        <>
          <div style={{ padding: '8px 10px', borderRadius: 7, marginBottom: 10, background: 'rgba(251,113,133,0.05)', border: '1px solid rgba(251,113,133,0.18)' }}>
            <span style={{ fontSize: 11, color: '#fb7185' }}>
              {piiRisks.length} location{piiRisks.length !== 1 ? 's' : ''} may log sensitive data — review and redact before production.
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {piiRisks.map((r, i) => (
              <div key={i} style={{ borderRadius: 7, padding: '7px 10px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(251,113,133,0.12)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                  <AlertTriangle size={10} color="#fb7185" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'rgba(148,163,184,0.65)' }}>{r.file}</span>
                  <span style={{ fontSize: 9, color: 'rgba(148,163,184,0.3)' }}>:{r.line}</span>
                </div>
                <code style={{ fontSize: 10, color: 'rgba(251,113,133,0.65)', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>{r.snippet}…</code>
              </div>
            ))}
          </div>
        </>
      )}
    </Collapsible>
  );
}

// ─── Compliance section ───────────────────────────────────────────────────────

function ComplianceSection({ compliance }) {
  const { files, frameworks } = compliance;
  const hasAny = files.length > 0 || frameworks.length > 0;
  const badge  = <StatusPill pass={hasAny} trueLabel={frameworks.length > 0 ? frameworks.join(', ') : 'docs found'} falseLabel="not documented" />;

  return (
    <Collapsible title="Compliance Frameworks" icon={CheckCircle2} badge={badge} defaultOpen={!hasAny}>
      {!hasAny ? (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '4px 0' }}>
          <AlertTriangle size={12} color="#fbbf24" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <span style={{ fontSize: 12, color: '#fbbf24' }}>No compliance framework documented.</span>
            <p style={{ fontSize: 11, color: 'rgba(148,163,184,0.5)', margin: '3px 0 0' }}>
              Add a <code style={{ fontFamily: 'var(--font-mono)', color: T.color }}>COMPLIANCE.md</code> or{' '}
              <code style={{ fontFamily: 'var(--font-mono)', color: T.color }}>SECURITY.md</code> referencing
              the applicable frameworks (SOC 2, GDPR, HIPAA, PCI DSS) to guide audit log requirements.
            </p>
          </div>
        </div>
      ) : (
        <>
          {frameworks.length > 0 && (
            <div style={{ marginBottom: files.length > 0 ? 10 : 0 }}>
              <div style={T.subhead}>Referenced frameworks</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {frameworks.map(f => (
                  <span key={f} style={{
                    fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99,
                    background: `${T.r}0.1)`, border: `1px solid ${T.r}0.28)`, color: T.color,
                    letterSpacing: '0.03em',
                  }}>{f}</span>
                ))}
              </div>
            </div>
          )}
          {files.length > 0 && (
            <div>
              <div style={T.subhead}>Compliance documents</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {files.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircle2 size={12} color="#4ade80" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.6)', fontFamily: 'var(--font-mono)' }}>{f}</span>
                  </div>
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

export default function AuditLoggingTab() {
  const [status, setStatus]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const loadedRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI.auditLoggingStatus();
      if (result.ok) setStatus(result);
      else setError(result.error || 'Scan failed');
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (!loadedRef.current) { loadedRef.current = true; load(); } }, [load]);

  if (loading && !status) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: 28, color: 'rgba(148,163,184,0.5)', fontSize: 12 }}>
      <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Scanning audit logging configuration…
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
      <FileText size={15} color={T.color} />
      Audit Logging
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
      <LibsSection
        libs={status.libs}
        hasStructuredAudit={status.hasStructuredAudit}
        auditCallFiles={status.auditCallFiles}
      />
      <MutationCoverageSection mutations={status.mutations} />
      <RetentionSection retention={status.retention} />
      <PIISection piiRisks={status.piiRisks} />
      <ComplianceSection compliance={status.compliance} />
    </Section>
  );
}
