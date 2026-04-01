import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Activity, AlertTriangle, Bell, CheckCircle2,
  ChevronDown, ChevronRight, FileText, Heart,
  Radio, RefreshCw, Zap,
} from 'lucide-react';
import { Section } from '../../ui-kit/forms/SettingsLayout';

// ─── Theme ────────────────────────────────────────────────────────────────────
const T = {
  color:   '#4ade80',              // green-400
  r:       'rgba(74,222,128,',     // base rgba prefix
  card:    { borderRadius: 10, padding: '12px 14px', border: '1px solid rgba(74,222,128,0.18)', background: 'rgba(74,222,128,0.03)' },
  label:   { fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(74,222,128,0.55)', marginBottom: 9 },
  subhead: { fontSize: 9, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(74,222,128,0.4)', marginBottom: 6 },
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

function LibPill({ label, lang, structured }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 10, padding: '3px 8px', borderRadius: 7,
      background: `${T.r}0.06)`, border: `1px solid ${T.r}0.2)`,
    }}>
      <span style={{ color: `${T.r}0.75)`, fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 9, color: 'rgba(148,163,184,0.4)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{lang}</span>
      {structured && (
        <span style={{ fontSize: 8, fontWeight: 700, padding: '1px 4px', borderRadius: 4, background: `${T.r}0.12)`, color: T.color, letterSpacing: '0.05em', textTransform: 'uppercase' }}>JSON</span>
      )}
    </div>
  );
}

// ─── Score card ───────────────────────────────────────────────────────────────

function ScoreCard({ passed, total, checks }) {
  const scoreColor = passed === total ? '#4ade80' : passed >= total * 0.6 ? '#fbbf24' : '#f87171';
  const barWidth   = total > 0 ? Math.round((passed / total) * 100) : 0;
  const borderCol  = passed === total ? 'rgba(74,222,128,0.25)' : 'rgba(74,222,128,0.15)';
  const bgCol      = passed === total ? 'rgba(74,222,128,0.03)' : 'rgba(74,222,128,0.02)';
  return (
    <div style={{ border: `1px solid ${borderCol}`, borderRadius: 10, padding: '12px 14px', background: bgCol }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <Activity size={14} style={{ color: T.color, flexShrink: 0 }} />
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.55)`, flex: 1 }}>Monitoring Readiness</span>
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

// ─── Logging section ──────────────────────────────────────────────────────────

function LoggingSection({ logging }) {
  const { libraries, hasStructured } = logging;
  const badge = <StatusPill pass={libraries.length > 0} trueLabel={`${libraries.length} found`} falseLabel="none found" />;

  return (
    <Collapsible title="Logging Libraries" icon={FileText} badge={badge}>
      {libraries.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '4px 0' }}>
          <AlertTriangle size={12} color="#fbbf24" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <span style={{ fontSize: 12, color: '#fbbf24' }}>No logging library detected.</span>
            <p style={{ fontSize: 11, color: 'rgba(148,163,184,0.5)', margin: '3px 0 0' }}>
              Consider adding Winston, Pino (Node) or Loguru, structlog (Python) for structured JSON logs.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
            {libraries.map(l => <LibPill key={l.id} label={l.label} lang={l.lang} structured={l.structured} />)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <CheckItem pass={hasStructured} label="Structured / JSON logging"    detail={!hasStructured ? 'Structured logs improve observability tooling compatibility' : undefined} />
          </div>
        </>
      )}
    </Collapsible>
  );
}

// ─── Error tracking section ───────────────────────────────────────────────────

function ErrorTrackingSection({ trackers }) {
  const badge = <StatusPill pass={trackers.length > 0} trueLabel={`${trackers.length} found`} falseLabel="none found" />;

  return (
    <Collapsible title="Error Tracking" icon={AlertTriangle} badge={badge}>
      {trackers.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '4px 0' }}>
          <AlertTriangle size={12} color="#fbbf24" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <span style={{ fontSize: 12, color: '#fbbf24' }}>No error tracking SDK found.</span>
            <p style={{ fontSize: 11, color: 'rgba(148,163,184,0.5)', margin: '3px 0 0' }}>
              Sentry, Rollbar, or Bugsnag provide automatic error capture with stack traces and release tracking.
            </p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {trackers.map(t => (
            <div key={t.id + t.label} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11,
              padding: '4px 9px', borderRadius: 8,
              background: `${T.r}0.06)`, border: `1px solid ${T.r}0.2)`,
            }}>
              <CheckCircle2 size={11} color="#4ade80" style={{ flexShrink: 0 }} />
              <span style={{ color: 'var(--text)', fontWeight: 600 }}>{t.label}</span>
            </div>
          ))}
        </div>
      )}
    </Collapsible>
  );
}

// ─── Tracing section ──────────────────────────────────────────────────────────

function TracingSection({ tracing }) {
  const badge = <StatusPill pass={tracing.length > 0} trueLabel={`${tracing.length} found`} falseLabel="none found" />;

  return (
    <Collapsible title="Distributed Tracing / APM" icon={Radio} badge={badge} defaultOpen={tracing.length > 0}>
      {tracing.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '4px 0' }}>
          <AlertTriangle size={12} color="#fbbf24" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <span style={{ fontSize: 12, color: '#fbbf24' }}>No tracing SDK found.</span>
            <p style={{ fontSize: 11, color: 'rgba(148,163,184,0.5)', margin: '3px 0 0' }}>
              OpenTelemetry or a vendor APM (Datadog, Elastic) provide request tracing across services.
            </p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {tracing.map(t => (
            <div key={t.id + t.label} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11,
              padding: '4px 9px', borderRadius: 8,
              background: 'rgba(255,255,255,0.02)', border: `1px solid ${T.r}0.2)`,
            }}>
              <CheckCircle2 size={11} color="#4ade80" style={{ flexShrink: 0 }} />
              <span style={{ color: 'var(--text)', fontWeight: 600 }}>{t.label}</span>
              <span style={{ fontSize: 9, color: 'rgba(148,163,184,0.4)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>{t.pkg.toUpperCase()}</span>
            </div>
          ))}
        </div>
      )}
    </Collapsible>
  );
}

// ─── Metrics section ──────────────────────────────────────────────────────────

function MetricsSection({ metrics }) {
  const badge = <StatusPill pass={metrics.length > 0} trueLabel={`${metrics.length} found`} falseLabel="none found" />;

  return (
    <Collapsible title="Metrics Exporters" icon={Zap} badge={badge} defaultOpen={metrics.length > 0}>
      {metrics.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '4px 0' }}>
          <AlertTriangle size={12} color="#fbbf24" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <span style={{ fontSize: 12, color: '#fbbf24' }}>No metrics exporter found.</span>
            <p style={{ fontSize: 11, color: 'rgba(148,163,184,0.5)', margin: '3px 0 0' }}>
              prom-client (Prometheus) or OTel exporters expose metrics for dashboards and alerting.
            </p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {metrics.map(m => (
            <div key={m.id + m.label} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11,
              padding: '4px 9px', borderRadius: 8,
              background: 'rgba(255,255,255,0.02)', border: `1px solid ${T.r}0.2)`,
            }}>
              <CheckCircle2 size={11} color="#4ade80" style={{ flexShrink: 0 }} />
              <span style={{ color: 'var(--text)', fontWeight: 600 }}>{m.label}</span>
            </div>
          ))}
        </div>
      )}
    </Collapsible>
  );
}

// ─── Health endpoints section ─────────────────────────────────────────────────

function HealthEndpointsSection({ endpoints }) {
  const badge = <StatusPill pass={endpoints.length > 0} trueLabel={`${endpoints.length} found`} falseLabel="none found" />;

  return (
    <Collapsible title="Health Endpoints" icon={Heart} badge={badge}>
      {endpoints.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '4px 0' }}>
          <AlertTriangle size={12} color="#fbbf24" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <span style={{ fontSize: 12, color: '#fbbf24' }}>No health endpoints found in source.</span>
            <p style={{ fontSize: 11, color: 'rgba(148,163,184,0.5)', margin: '3px 0 0' }}>
              Expose <code style={{ fontFamily: 'var(--font-mono)', color: T.color }}>/health</code> or{' '}
              <code style={{ fontFamily: 'var(--font-mono)', color: T.color }}>/readyz</code> so container
              orchestrators can detect service availability.
            </p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {endpoints.map((ep, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                fontSize: 10, padding: '1px 7px', borderRadius: 99, fontFamily: 'var(--font-mono)',
                background: `${T.r}0.1)`, border: `1px solid ${T.r}0.28)`, color: T.color, fontWeight: 600,
              }}>{ep.endpoint}</span>
              <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.5)', fontFamily: 'var(--font-mono)' }}>{ep.path}</span>
              <span style={{ fontSize: 9, color: 'rgba(148,163,184,0.3)' }}>:{ep.line}</span>
            </div>
          ))}
        </div>
      )}
    </Collapsible>
  );
}

// ─── Alert rules section ──────────────────────────────────────────────────────

function AlertRulesSection({ alertRules }) {
  const badge = <StatusPill pass={alertRules.length > 0} trueLabel={`${alertRules.length} found`} falseLabel="none found" />;

  return (
    <Collapsible title="Alert Rules & Dashboards" icon={Bell} badge={badge} defaultOpen={alertRules.length > 0}>
      {alertRules.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '4px 0' }}>
          <AlertTriangle size={12} color="#fbbf24" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <span style={{ fontSize: 12, color: '#fbbf24' }}>No alert configuration files found.</span>
            <p style={{ fontSize: 11, color: 'rgba(148,163,184,0.5)', margin: '3px 0 0' }}>
              Add Prometheus alert rules, Grafana provisioning, or Datadog monitors to your repository.
            </p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {alertRules.map(a => (
            <div key={a.file} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={12} color="#4ade80" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>{a.label}</span>
              <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.45)', fontFamily: 'var(--font-mono)' }}>{a.file}</span>
            </div>
          ))}
        </div>
      )}
    </Collapsible>
  );
}

// ─── Main tab ─────────────────────────────────────────────────────────────────

export default function MonitoringTab() {
  const [status, setStatus]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const loadedRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI.monitoringStatus();
      if (result.ok) setStatus(result);
      else setError(result.error || 'Scan failed');
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (!loadedRef.current) { loadedRef.current = true; load(); } }, [load]);

  if (loading && !status) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: 28, color: 'rgba(148,163,184,0.5)', fontSize: 12 }}>
      <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Scanning observability configuration…
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
      <Activity size={15} color={T.color} />
      Monitoring
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
      <LoggingSection logging={status.logging} />
      <ErrorTrackingSection trackers={status.errorTracking} />
      <TracingSection tracing={status.tracing} />
      <MetricsSection metrics={status.metrics} />
      <HealthEndpointsSection endpoints={status.healthEndpoints} />
      <AlertRulesSection alertRules={status.alertRules} />
    </Section>
  );
}
