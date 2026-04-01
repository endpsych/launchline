import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle, BookOpen, Box, CheckCircle2,
  ChevronDown, ChevronRight, Cpu, HardDrive,
  RefreshCw, Repeat, Server, Zap,
} from 'lucide-react';
import { Section } from '../../ui-kit/forms/SettingsLayout';

// ─── Theme ────────────────────────────────────────────────────────────────────
const T = {
  color:   '#a78bfa',              // violet-400
  r:       'rgba(167,139,250,',    // base rgba prefix
  card:    { borderRadius: 10, padding: '12px 14px', border: '1px solid rgba(167,139,250,0.18)', background: 'rgba(167,139,250,0.03)' },
  label:   { fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(167,139,250,0.55)', marginBottom: 9 },
  subhead: { fontSize: 9, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(167,139,250,0.4)', marginBottom: 6 },
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

// ─── Score card ───────────────────────────────────────────────────────────────

function ScoreCard({ passed, total, checks }) {
  const scoreColor = passed === total ? '#4ade80' : passed >= total * 0.6 ? '#fbbf24' : '#f87171';
  const barWidth   = total > 0 ? Math.round((passed / total) * 100) : 0;
  const borderCol  = passed === total ? 'rgba(74,222,128,0.25)' : `${T.r}0.15)`;
  const bgCol      = passed === total ? 'rgba(74,222,128,0.03)' : `${T.r}0.02)`;
  return (
    <div style={{ border: `1px solid ${borderCol}`, borderRadius: 10, padding: '12px 14px', background: bgCol }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <Cpu size={14} style={{ color: T.color, flexShrink: 0 }} />
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.55)`, flex: 1 }}>Model Registry Readiness</span>
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

// ─── Experiment tracking section ──────────────────────────────────────────────

function TrackersSection({ trackers, mlflow }) {
  const badge = <StatusPill pass={trackers.length > 0} trueLabel={`${trackers.length} found`} falseLabel="none found" />;
  return (
    <Collapsible title="Experiment Tracking" icon={Zap} badge={badge}>
      {trackers.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '4px 0' }}>
          <AlertTriangle size={12} color="#fbbf24" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <span style={{ fontSize: 12, color: '#fbbf24' }}>No experiment tracker detected.</span>
            <p style={{ fontSize: 11, color: 'rgba(148,163,184,0.5)', margin: '3px 0 0' }}>
              MLflow, Weights & Biases, or Neptune log parameters, metrics, and artifacts
              so experiments are reproducible and comparable.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: mlflow.found ? 10 : 0 }}>
            {trackers.map(t => (
              <div key={t.label} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11,
                padding: '4px 9px', borderRadius: 8,
                background: `${T.r}0.06)`, border: `1px solid ${T.r}0.2)`,
              }}>
                <CheckCircle2 size={11} color="#4ade80" style={{ flexShrink: 0 }} />
                <span style={{ color: 'var(--text)', fontWeight: 600 }}>{t.label}</span>
                {t.url && <span style={{ fontSize: 9, color: 'rgba(148,163,184,0.35)' }}>{t.url}</span>}
              </div>
            ))}
          </div>

          {/* MLflow detail */}
          {mlflow.found && (
            <div style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: `1px solid ${T.r}0.12)` }}>
              <div style={T.subhead}>MLflow details</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <CheckItem pass={mlflow.mlrunsFound}    label="mlruns/ directory present"        detail={!mlflow.mlrunsFound ? 'No local run history found' : undefined} />
                <CheckItem pass={mlflow.registryFound}  label="Model registry in use"            detail={!mlflow.registryFound ? 'Register models with mlflow.register_model()' : undefined} />
                <CheckItem pass={!!mlflow.trackingUri}  label="Custom tracking URI configured"   detail={mlflow.trackingUri ? mlflow.trackingUri : 'Defaults to local ./mlruns'} />
              </div>
            </div>
          )}
        </>
      )}
    </Collapsible>
  );
}

// ─── Model serving section ────────────────────────────────────────────────────

function ServingSection({ serving, tritonConfigs }) {
  const total = serving.length + (tritonConfigs.length > 0 && !serving.find(s => s.label.includes('Triton')) ? 1 : 0);
  const badge = <StatusPill pass={total > 0} trueLabel={`${total} found`} falseLabel="none found" />;
  return (
    <Collapsible title="Model Serving & Registry" icon={Server} badge={badge} defaultOpen={total > 0}>
      {total === 0 ? (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '4px 0' }}>
          <AlertTriangle size={12} color="#fbbf24" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <span style={{ fontSize: 12, color: '#fbbf24' }}>No model serving layer found.</span>
            <p style={{ fontSize: 11, color: 'rgba(148,163,184,0.5)', margin: '3px 0 0' }}>
              BentoML, Seldon Core, KServe, or TorchServe package and expose models
              as production-grade REST/gRPC endpoints.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: tritonConfigs.length > 0 ? 10 : 0 }}>
            {serving.map(s => (
              <div key={s.label} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11,
                padding: '4px 9px', borderRadius: 8,
                background: 'rgba(255,255,255,0.02)', border: `1px solid ${T.r}0.2)`,
              }}>
                <CheckCircle2 size={11} color="#4ade80" style={{ flexShrink: 0 }} />
                <span style={{ color: 'var(--text)', fontWeight: 600 }}>{s.label}</span>
                {s.configFile && s.pkg !== 'fs' && (
                  <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: `${T.r}0.08)`, border: `1px solid ${T.r}0.2)`, color: `${T.r}0.65)`, fontWeight: 700 }}>
                    config
                  </span>
                )}
              </div>
            ))}
          </div>
          {tritonConfigs.length > 0 && (
            <div>
              <div style={T.subhead}>Triton model config files ({tritonConfigs.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {tritonConfigs.slice(0, 5).map(c => (
                  <span key={c} style={{ fontSize: 10, color: 'rgba(148,163,184,0.5)', fontFamily: 'var(--font-mono)' }}>{c}</span>
                ))}
                {tritonConfigs.length > 5 && (
                  <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.3)' }}>…and {tritonConfigs.length - 5} more</span>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </Collapsible>
  );
}

// ─── Model artifacts section ──────────────────────────────────────────────────

function ArtifactsSection({ artifacts, artifactTotal }) {
  const badge = artifactTotal > 0
    ? <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: `${T.r}0.1)`, border: `1px solid ${T.r}0.28)`, color: T.color }}>{artifactTotal} file{artifactTotal !== 1 ? 's' : ''}</span>
    : <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.35)', fontWeight: 600 }}>none found</span>;

  return (
    <Collapsible title="Model Artifacts" icon={HardDrive} badge={badge} defaultOpen={artifactTotal > 0}>
      {artifactTotal === 0 ? (
        <p style={{ fontSize: 12, color: 'rgba(148,163,184,0.5)', margin: 0 }}>
          No model artifact files (.pkl, .pt, .onnx, .h5, .safetensors…) found in this project.
        </p>
      ) : (
        <>
          {artifactTotal > artifacts.length && (
            <p style={{ fontSize: 11, color: 'rgba(148,163,184,0.4)', margin: '0 0 8px' }}>
              Showing top {artifacts.length} by size of {artifactTotal} total.
            </p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {artifacts.map(f => (
              <div key={f.file} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Box size={10} color={T.color} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.55)', fontFamily: 'var(--font-mono)', flex: 1 }}>{f.file}</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: `${T.r}0.65)`, flexShrink: 0 }}>{f.sizeLabel}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </Collapsible>
  );
}

// ─── Model card section ───────────────────────────────────────────────────────

function ModelCardSection({ modelCard }) {
  const hasAny = modelCard.files.length > 0 || modelCard.hasReadmeSection || modelCard.isHFCard;
  const badge  = <StatusPill pass={hasAny} trueLabel="found" falseLabel="missing" />;
  return (
    <Collapsible title="Model Card" icon={BookOpen} badge={badge} defaultOpen={!hasAny}>
      {!hasAny ? (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '4px 0' }}>
          <AlertTriangle size={12} color="#fbbf24" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <span style={{ fontSize: 12, color: '#fbbf24' }}>No model card found.</span>
            <p style={{ fontSize: 11, color: 'rgba(148,163,184,0.5)', margin: '3px 0 0' }}>
              A model card documents intended use, training data, evaluation results, and
              ethical considerations. Create a <code style={{ fontFamily: 'var(--font-mono)', color: T.color }}>MODEL_CARD.md</code> or
              add a Hugging Face YAML front-matter block to your README.
            </p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {modelCard.files.map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={12} color="#4ade80" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>{f}</span>
            </div>
          ))}
          {modelCard.isHFCard && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={12} color="#4ade80" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>Hugging Face model card</span>
              <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.45)' }}>YAML front-matter in README.md</span>
            </div>
          )}
          {modelCard.hasReadmeSection && !modelCard.isHFCard && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={12} color="#4ade80" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>Model card section in README.md</span>
            </div>
          )}
        </div>
      )}
    </Collapsible>
  );
}

// ─── Reproducibility section ──────────────────────────────────────────────────

function ReproducibilitySection({ repro }) {
  const { lockFiles, hasSeedUsage, trainingScripts, hasTrainingDir } = repro;
  const hasTraining = trainingScripts.length > 0 || hasTrainingDir;
  const score = [lockFiles.length > 0, hasSeedUsage, hasTraining].filter(Boolean).length;
  const badge = <StatusPill pass={score === 3} trueLabel={`${score}/3`} falseLabel={`${score}/3`} />;

  return (
    <Collapsible title="Reproducibility" icon={Repeat} badge={badge}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: lockFiles.length > 0 ? 10 : 0 }}>
        <CheckItem
          pass={lockFiles.length > 0}
          label="Environment pinned (lock file)"
          detail={lockFiles.length === 0 ? 'No poetry.lock, Pipfile.lock or conda-lock.yml found' : undefined}
        />
        <CheckItem
          pass={hasSeedUsage}
          label="Random seed set in training code"
          detail={!hasSeedUsage ? 'Set torch.manual_seed / np.random.seed for deterministic runs' : undefined}
        />
        <CheckItem
          pass={hasTraining}
          label="Training script present"
          detail={!hasTraining ? 'Add train.py or a training/ directory' : undefined}
        />
      </div>

      {lockFiles.length > 0 && (
        <div>
          <div style={T.subhead}>Lock files found</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {lockFiles.map(l => (
              <span key={l.file} style={{
                fontSize: 10, padding: '2px 8px', borderRadius: 7, fontFamily: 'var(--font-mono)',
                background: `${T.r}0.06)`, border: `1px solid ${T.r}0.2)`, color: `${T.r}0.7)`,
              }}>{l.label}</span>
            ))}
          </div>
        </div>
      )}

      {trainingScripts.length > 0 && (
        <div style={{ marginTop: lockFiles.length > 0 ? 10 : 0 }}>
          <div style={T.subhead}>Training scripts</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {trainingScripts.map(s => (
              <span key={s} style={{
                fontSize: 10, padding: '2px 8px', borderRadius: 7, fontFamily: 'var(--font-mono)',
                background: 'rgba(255,255,255,0.02)', border: `1px solid ${T.r}0.18)`, color: `${T.r}0.6)`,
              }}>{s}</span>
            ))}
          </div>
        </div>
      )}
    </Collapsible>
  );
}

// ─── Main tab ─────────────────────────────────────────────────────────────────

export default function ModelRegistryTab() {
  const [status, setStatus]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const loadedRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI.modelRegistryStatus();
      if (result.ok) setStatus(result);
      else setError(result.error || 'Scan failed');
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (!loadedRef.current) { loadedRef.current = true; load(); } }, [load]);

  if (loading && !status) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: 28, color: 'rgba(148,163,184,0.5)', fontSize: 12 }}>
      <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Scanning model registry configuration…
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
      <Cpu size={15} color={T.color} />
      Model Registry
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
      <TrackersSection trackers={status.trackers} mlflow={status.mlflow} />
      <ServingSection serving={status.serving} tritonConfigs={status.tritonConfigs} />
      <ArtifactsSection artifacts={status.artifacts} artifactTotal={status.artifactTotal} />
      <ModelCardSection modelCard={status.modelCard} />
      <ReproducibilitySection repro={status.reproducibility} />
    </Section>
  );
}
