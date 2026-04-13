import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Box, CheckCircle2, ChevronDown, ChevronRight, FileCode2, RefreshCw, Server, Shield } from 'lucide-react';
import { Section } from '../../ui-kit/forms/SettingsLayout';

// ─── Theme ────────────────────────────────────────────────────────────────────
const T = {
  color:   '#60a5fa',              // blue-400
  r:       'rgba(96,165,250,',     // base rgba prefix
  card:    { borderRadius: 10, padding: '12px 14px', border: '1px solid rgba(96,165,250,0.18)', background: 'rgba(96,165,250,0.03)' },
  label:   { fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(96,165,250,0.55)', marginBottom: 9 },
  subhead: { fontSize: 9, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(96,165,250,0.4)', marginBottom: 6 },
};

// ─── Shared micro-components ──────────────────────────────────────────────────

function Card({ children, style }) {
  return <div style={{ ...T.card, ...style }}>{children}</div>;
}

function CardLabel({ children }) {
  return <div style={T.label}>{children}</div>;
}

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

// ─── Score card ───────────────────────────────────────────────────────────────

function ScoreCard({ passed, total, checks }) {
  const scoreColor = passed === total ? '#4ade80' : passed >= total * 0.6 ? '#fbbf24' : '#f87171';
  const barWidth   = total > 0 ? Math.round((passed / total) * 100) : 0;
  const borderCol  = passed === total ? 'rgba(74,222,128,0.25)' : 'rgba(96,165,250,0.2)';
  const bgCol      = passed === total ? 'rgba(74,222,128,0.03)' : 'rgba(96,165,250,0.03)';
  return (
    <div style={{ border: `1px solid ${borderCol}`, borderRadius: 10, padding: '12px 14px', background: bgCol }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <Box size={14} style={{ color: T.color, flexShrink: 0 }} />
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.55)`, flex: 1 }}>Container Readiness</span>
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

// ─── Dockerfile section ───────────────────────────────────────────────────────

function DockerfileSection({ dockerfiles, dockerIgnore }) {
  return (
    <Collapsible title="Dockerfile Health" icon={FileCode2}>
      {dockerfiles.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#fbbf24' }}>
          <AlertTriangle size={12} style={{ flexShrink: 0 }} />
          No Dockerfile found in project root or common subdirectories.
        </div>
      ) : (
        dockerfiles.map((df, idx) => (
          <div key={df.relPath} style={idx > 0 ? { marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.r}0.12)` } : {}}>
            {dockerfiles.length > 1 && (
              <div style={{ fontSize: 10, fontWeight: 700, color: T.color, fontFamily: 'var(--font-mono)', marginBottom: 8 }}>
                📄 {df.relPath}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <CheckItem pass={df.checks.imagePinned}    label="Base image pinned (no :latest)"   detail={df.checks.imagePinned ? df.fromImages.join(', ') : `Unpinned: ${df.checks.unpinnedImages.join(', ')}`} />
              <CheckItem pass={df.checks.hasNonRootUser} label="Non-root USER instruction"         detail={df.checks.hasNonRootUser ? 'USER set' : 'Containers run as root by default'} />
              <CheckItem pass={df.checks.hasExpose}      label="EXPOSE instruction declared"       detail={!df.checks.hasExpose ? 'No port declared' : undefined} />
              <CheckItem pass={df.checks.isMultiStage}   label="Multi-stage build"                 detail={df.checks.isMultiStage ? `${df.stageCount} stages` : 'Single stage — consider separating build and runtime'} />
              <CheckItem pass={!df.checks.highLayerCount} label="Layer count manageable"           detail={`${df.runCount} RUN instruction${df.runCount !== 1 ? 's' : ''}${df.checks.highLayerCount ? ' — consolidate to improve caching' : ''}`} />
            </div>
          </div>
        ))
      )}

      {/* .dockerignore */}
      <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.r}0.12)` }}>
        <div style={T.subhead}>.dockerignore</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <CheckItem pass={dockerIgnore.exists}
            label=".dockerignore present"
            detail={!dockerIgnore.exists ? 'Missing — .env, node_modules, .git may be copied into image' : undefined}
          />
          {dockerIgnore.exists && (
            <CheckItem pass={dockerIgnore.missingExclusions.length === 0}
              label="Critical paths excluded"
              detail={dockerIgnore.missingExclusions.length === 0 ? '.env, .git, node_modules, *.log all excluded' : `Missing: ${dockerIgnore.missingExclusions.join(', ')}`}
            />
          )}
        </div>
      </div>
    </Collapsible>
  );
}

// ─── Compose section ──────────────────────────────────────────────────────────

function ComposeSection({ compose, envCoverage = null }) {
  if (!compose) {
    return (
      <Collapsible title="Docker Compose" icon={Server} defaultOpen={false}>
        <p style={{ fontSize: 12, color: 'rgba(148,163,184,0.5)', margin: 0 }}>No docker-compose.yml found in project root.</p>
      </Collapsible>
    );
  }

  const issueCount = compose.portConflicts.length + compose.rootVolumeMounts.length + compose.missingHealthchecks.length + compose.badRestartPolicies.length;
  const badge = (
    <StatusPill
      pass={issueCount === 0}
      trueLabel="clean"
      falseLabel={`${issueCount} issue${issueCount !== 1 ? 's' : ''}`}
    />
  );

  return (
    <Collapsible title={`Docker Compose — ${compose.file}`} icon={Server} badge={badge}>
      {/* Services table */}
      <div style={T.subhead}>Services ({compose.serviceCount})</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
        {compose.services.map(svc => (
          <div key={svc.name} style={{
            display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
            padding: '5px 9px', borderRadius: 7,
            background: 'rgba(255,255,255,0.02)', border: `1px solid ${T.r}0.1)`,
          }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', minWidth: 72 }}>{svc.name}</span>
            {svc.image && <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.5)', fontFamily: 'var(--font-mono)', flex: 1 }}>{svc.image}</span>}
            {svc.ports.length > 0 && (
              <span style={{ fontSize: 10, color: `${T.r}0.7)`, fontFamily: 'var(--font-mono)' }}>{svc.ports.join(', ')}</span>
            )}
            <StatusPill pass={svc.hasHealthcheck}  trueLabel="healthcheck ✓" falseLabel="no healthcheck" />
            <StatusPill pass={!!svc.restartPolicy && svc.restartPolicy !== 'no'} trueLabel={`restart: ${svc.restartPolicy}`} falseLabel="no restart" />
          </div>
        ))}
      </div>

      {/* Issues */}
      {compose.portConflicts.map(pc => (
        <div key={pc.port} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#f87171', padding: '2px 0' }}>
          <span style={{ fontSize: 13 }}>✗</span> Port {pc.port} used by: {pc.services.join(', ')}
        </div>
      ))}
      {compose.rootVolumeMounts.map((v, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#fbbf24', padding: '2px 0' }}>
          <AlertTriangle size={11} /> {v.service}: mounts <code style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>{v.mount}</code> — dev-only pattern
        </div>
      ))}
      {issueCount === 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#4ade80' }}>
          <CheckCircle2 size={12} /> No Compose issues detected
        </div>
      )}

      {/* Env var coverage */}
      {envCoverage !== null && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${T.r}0.12)` }}>
          <div style={T.subhead}>Env var coverage</div>
          {envCoverage.missingKeys.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#4ade80' }}>
                <CheckCircle2 size={12} style={{ flexShrink: 0 }} />
                All {envCoverage.referencedKeys.length} referenced key{envCoverage.referencedKeys.length !== 1 ? 's' : ''} present in .env
              </div>
              {envCoverage.referencedKeys.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                  {envCoverage.referencedKeys.map(k => (
                    <span key={k} style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'rgba(74,222,128,0.6)', background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.15)', borderRadius: 4, padding: '1px 6px' }}>{k}</span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#fdba74' }}>
                <AlertTriangle size={12} style={{ flexShrink: 0 }} />
                {envCoverage.missingKeys.length} key{envCoverage.missingKeys.length !== 1 ? 's' : ''} referenced in {envCoverage.file} missing from .env
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                {envCoverage.missingKeys.map(k => (
                  <span key={k} style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: '#fdba74', background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.25)', borderRadius: 4, padding: '1px 6px' }}>{k}</span>
                ))}
              </div>
            </div>
          )}
          {envCoverage.envFileRefs.length > 0 && (
            <div style={{ fontSize: 10, color: 'rgba(148,163,184,0.4)', marginTop: 4 }}>
              env_file: {envCoverage.envFileRefs.join(', ')}
            </div>
          )}
        </div>
      )}
    </Collapsible>
  );
}

// ─── Kubernetes section ───────────────────────────────────────────────────────

function K8sSection({ k8s }) {
  if (!k8s) {
    return (
      <Collapsible title="Kubernetes Manifests" icon={Shield} defaultOpen={false}>
        <p style={{ fontSize: 12, color: 'rgba(148,163,184,0.5)', margin: 0 }}>No Kubernetes manifests found (k8s/, kubernetes/, deploy/, helm/).</p>
      </Collapsible>
    );
  }

  const { checks } = k8s;
  const issueCount = checks.missingResourceLimits.length + checks.missingProbes.length + checks.latestImageTags.length + checks.singleReplicas.length;
  const badge = <StatusPill pass={issueCount === 0} trueLabel="clean" falseLabel={`${issueCount} issue${issueCount !== 1 ? 's' : ''}`} />;

  return (
    <Collapsible title={`Kubernetes — ${k8s.manifestCount} manifest${k8s.manifestCount !== 1 ? 's' : ''}`} icon={Shield} badge={badge}>
      {/* Manifest inventory */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
        {k8s.manifests.map(m => (
          <span key={m.relPath} style={{
            fontSize: 9, padding: '2px 7px', borderRadius: 99, fontFamily: 'var(--font-mono)',
            background: `${T.r}0.07)`, border: `1px solid ${T.r}0.2)`, color: `${T.r}0.7)`,
          }}>
            {m.kind}/{m.name}{m.namespace !== 'default' ? ` · ${m.namespace}` : ''}
          </span>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <CheckItem pass={checks.missingResourceLimits.length === 0}
          label="Resource limits defined"
          detail={checks.missingResourceLimits.length > 0 ? `Missing in ${checks.missingResourceLimits.length} manifest(s)` : undefined}
        />
        <CheckItem pass={checks.missingProbes.length === 0}
          label="Liveness & readiness probes"
          detail={checks.missingProbes.length > 0 ? `${checks.missingProbes.length} workload(s) missing probes` : undefined}
        />
        <CheckItem pass={checks.latestImageTags.length === 0}
          label="No :latest image tags"
          detail={checks.latestImageTags.length > 0 ? `Found in ${checks.latestImageTags.length} manifest(s)` : undefined}
        />
        <CheckItem pass={checks.defaultNamespace.length === 0}
          label="Non-default namespaces used"
          detail={checks.defaultNamespace.length > 0 ? `${checks.defaultNamespace.length} workload(s) in default namespace` : undefined}
        />
        <CheckItem pass={checks.singleReplicas.length === 0}
          label="Replica count > 1"
          detail={checks.singleReplicas.length > 0 ? `Single replica: ${checks.singleReplicas.length} workload(s)` : undefined}
        />
      </div>
    </Collapsible>
  );
}

// ─── Main tab ─────────────────────────────────────────────────────────────────

export default function ContainerizationTab() {
  const [status, setStatus]       = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [envCoverage, setEnvCoverage] = useState(null);
  const loadedRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI.containerStatus();
      if (result.ok) setStatus(result);
      else setError(result.error || 'Scan failed');
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (!loadedRef.current) { loadedRef.current = true; load(); } }, [load]);

  useEffect(() => {
    if (!window.electronAPI?.pythonSecretsStatus) return;
    window.electronAPI.pythonSecretsStatus({ expectedVars: [] })
      .then(res => { if (res?.ok && res.dockerCompose) setEnvCoverage(res.dockerCompose); })
      .catch(() => {});
  }, []);

  if (loading && !status) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: 28, color: 'rgba(148,163,184,0.5)', fontSize: 12 }}>
      <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Scanning container configuration…
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
      <Box size={15} color={T.color} />
      Containerization
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
      <DockerfileSection dockerfiles={status.dockerfiles} dockerIgnore={status.dockerIgnore} />
      <ComposeSection compose={status.compose} envCoverage={envCoverage} />
      <K8sSection k8s={status.k8s} />
    </Section>
  );
}
