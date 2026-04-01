import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle, Archive, CheckCircle2, ChevronDown, ChevronRight,
  Database, FileCode, GitBranch, HardDrive, Layers, RefreshCw, Server,
} from 'lucide-react';
import { Section } from '../../ui-kit/forms/SettingsLayout';

// ─── Theme ────────────────────────────────────────────────────────────────────
const T = {
  color:   '#22d3ee',              // cyan-400
  r:       'rgba(34,211,238,',     // base rgba prefix
  card:    { borderRadius: 10, padding: '12px 14px', border: '1px solid rgba(34,211,238,0.18)', background: 'rgba(34,211,238,0.03)' },
  label:   { fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(34,211,238,0.55)', marginBottom: 9 },
  subhead: { fontSize: 9, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(34,211,238,0.4)', marginBottom: 6 },
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
      background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.28)', color: '#fbbf24',
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
        <Database size={14} style={{ color: T.color, flexShrink: 0 }} />
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.55)`, flex: 1 }}>Data Versioning Readiness</span>
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

// ─── DVC section ──────────────────────────────────────────────────────────────

function DVCSection({ dvc }) {
  const badge = <StatusPill pass={dvc.found} trueLabel="configured" falseLabel="not found" />;
  return (
    <Collapsible title="DVC — Data Version Control" icon={GitBranch} badge={badge}>
      {!dvc.found ? (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '4px 0' }}>
          <AlertTriangle size={12} color="#fbbf24" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <span style={{ fontSize: 12, color: '#fbbf24' }}>DVC not configured.</span>
            <p style={{ fontSize: 11, color: 'rgba(148,163,184,0.5)', margin: '3px 0 0' }}>
              Run <code style={{ fontFamily: 'var(--font-mono)', color: T.color }}>dvc init</code> then{' '}
              <code style={{ fontFamily: 'var(--font-mono)', color: T.color }}>dvc remote add</code> to version
              datasets and model artifacts outside of git.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
            <CheckItem pass={dvc.hasDvcDir}    label=".dvc/ directory"             detail={dvc.hasDvcDir    ? undefined : 'Run dvc init'} />
            <CheckItem pass={dvc.hasDvcYaml}   label="dvc.yaml pipeline file"      detail={dvc.hasDvcYaml   ? undefined : 'No pipeline stages defined'} />
            <CheckItem pass={dvc.hasDvcLock}   label="dvc.lock (reproducibility)"  detail={dvc.hasDvcLock   ? undefined : 'Run dvc repro to generate'} />
            <CheckItem pass={dvc.remotes.length > 0} label="Remote storage configured" detail={dvc.remotes.length === 0 ? 'dvc remote add -d myremote s3://...' : undefined} />
          </div>

          {dvc.remotes.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={T.subhead}>Remotes</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {dvc.remotes.map((r, i) => (
                  <span key={i} style={{
                    fontSize: 10, padding: '2px 8px', borderRadius: 7, fontFamily: 'var(--font-mono)',
                    background: `${T.r}0.07)`, border: `1px solid ${T.r}0.2)`, color: `${T.r}0.75)`,
                  }}>{r}</span>
                ))}
              </div>
            </div>
          )}

          {dvc.stages.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={T.subhead}>Pipeline stages ({dvc.stages.length})</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {dvc.stages.map(s => (
                  <span key={s} style={{
                    fontSize: 10, padding: '2px 8px', borderRadius: 7, fontFamily: 'var(--font-mono)',
                    background: 'rgba(255,255,255,0.02)', border: `1px solid ${T.r}0.18)`, color: `${T.r}0.65)`,
                  }}>{s}</span>
                ))}
              </div>
            </div>
          )}

          {dvc.pointerFiles.length > 0 && (
            <div>
              <div style={T.subhead}>DVC pointer files ({dvc.pointerFiles.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {dvc.pointerFiles.slice(0, 6).map(f => (
                  <span key={f} style={{ fontSize: 10, color: 'rgba(148,163,184,0.5)', fontFamily: 'var(--font-mono)' }}>{f}</span>
                ))}
                {dvc.pointerFiles.length > 6 && (
                  <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.3)' }}>…and {dvc.pointerFiles.length - 6} more</span>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </Collapsible>
  );
}

// ─── Table formats section ────────────────────────────────────────────────────

function TableFormatsSection({ formats }) {
  const badge = formats.length > 0
    ? <StatusPill pass trueLabel={`${formats.length} found`} />
    : <StatusPill pass={false} trueLabel="" falseLabel="none found" />;
  return (
    <Collapsible title="Table Formats" icon={Layers} badge={badge} defaultOpen={formats.length > 0}>
      {formats.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '4px 0' }}>
          <AlertTriangle size={12} color="#fbbf24" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <span style={{ fontSize: 12, color: '#fbbf24' }}>No modern table format detected.</span>
            <p style={{ fontSize: 11, color: 'rgba(148,163,184,0.5)', margin: '3px 0 0' }}>
              Delta Lake, Apache Iceberg, or Apache Hudi provide ACID transactions, schema evolution,
              and time travel for large datasets.
            </p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {formats.map(f => (
            <div key={f.id} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11,
              padding: '4px 9px', borderRadius: 8,
              background: `${T.r}0.06)`, border: `1px solid ${T.r}0.2)`,
            }}>
              <CheckCircle2 size={11} color="#4ade80" style={{ flexShrink: 0 }} />
              <span style={{ color: 'var(--text)', fontWeight: 600 }}>{f.label}</span>
              {f.pkg && f.pkg !== 'fs' && (
                <span style={{ fontSize: 9, color: 'rgba(148,163,184,0.4)', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{f.pkg.toUpperCase()}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </Collapsible>
  );
}

// ─── Feature stores section ───────────────────────────────────────────────────

function FeatureStoresSection({ stores }) {
  const badge = stores.length > 0
    ? <StatusPill pass trueLabel={`${stores.length} found`} />
    : <StatusPill pass={false} trueLabel="" falseLabel="none found" />;
  return (
    <Collapsible title="Feature Stores" icon={Server} badge={badge} defaultOpen={stores.length > 0}>
      {stores.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '4px 0' }}>
          <AlertTriangle size={12} color="#fbbf24" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <span style={{ fontSize: 12, color: '#fbbf24' }}>No feature store detected.</span>
            <p style={{ fontSize: 11, color: 'rgba(148,163,184,0.5)', margin: '3px 0 0' }}>
              Feast, Hopsworks, or Vertex AI Feature Store centralise feature definitions
              and ensure training–serving consistency.
            </p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {stores.map(s => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={12} color="#4ade80" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{s.label}</span>
              {s.configFound && (
                <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 5, background: `${T.r}0.08)`, border: `1px solid ${T.r}0.2)`, color: `${T.r}0.65)`, fontWeight: 700 }}>
                  config found
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </Collapsible>
  );
}

// ─── Large files audit section ────────────────────────────────────────────────

function LargeFilesSection({ modelFiles, dataFiles, untrackedCount, hasDvc }) {
  const totalFound   = modelFiles.length + dataFiles.length;
  const badge = untrackedCount > 0
    ? <WarnPill label={`${untrackedCount} untracked`} />
    : totalFound > 0
      ? <StatusPill pass trueLabel="tracked" />
      : <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.35)', fontWeight: 600 }}>none found</span>;

  return (
    <Collapsible title="Binary & Dataset Files" icon={HardDrive} badge={badge} defaultOpen={untrackedCount > 0}>
      {totalFound === 0 ? (
        <p style={{ fontSize: 12, color: 'rgba(148,163,184,0.5)', margin: 0 }}>
          No large model or dataset files found in the project root.
        </p>
      ) : (
        <>
          {untrackedCount > 0 && !hasDvc && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 10px', borderRadius: 7, marginBottom: 10, background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.18)' }}>
              <AlertTriangle size={12} color="#fbbf24" style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 11, color: '#fbbf24' }}>
                {untrackedCount} large file{untrackedCount !== 1 ? 's' : ''} found without DVC tracking. Consider using DVC to version these outside of git.
              </span>
            </div>
          )}

          {modelFiles.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={T.subhead}>Model artifacts ({modelFiles.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {modelFiles.map(f => (
                  <div key={f.file} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.55)', fontFamily: 'var(--font-mono)', flex: 1 }}>{f.file}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: `${T.r}0.6)`, flexShrink: 0 }}>{f.sizeLabel}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {dataFiles.length > 0 && (
            <div>
              <div style={T.subhead}>Dataset files ({dataFiles.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {dataFiles.map(f => (
                  <div key={f.file} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.55)', fontFamily: 'var(--font-mono)', flex: 1 }}>{f.file}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: `${T.r}0.6)`, flexShrink: 0 }}>{f.sizeLabel}</span>
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

// ─── Data contracts & schemas section ─────────────────────────────────────────

function ContractsSection({ contracts, schemaFiles }) {
  const total = contracts.length + schemaFiles.length;
  const badge = <StatusPill pass={total > 0} trueLabel={`${total} found`} falseLabel="none found" />;

  return (
    <Collapsible title="Data Contracts & Schemas" icon={FileCode} badge={badge} defaultOpen={total > 0}>
      {total === 0 ? (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '4px 0' }}>
          <AlertTriangle size={12} color="#fbbf24" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <span style={{ fontSize: 12, color: '#fbbf24' }}>No data contracts or schema files found.</span>
            <p style={{ fontSize: 11, color: 'rgba(148,163,184,0.5)', margin: '3px 0 0' }}>
              Add a <code style={{ fontFamily: 'var(--font-mono)', color: T.color }}>data-contract.yaml</code>,
              Avro schemas (<code style={{ fontFamily: 'var(--font-mono)', color: T.color }}>.avsc</code>), Protobuf
              definitions, or Great Expectations suites to validate and document data interfaces.
            </p>
          </div>
        </div>
      ) : (
        <>
          {contracts.length > 0 && (
            <div style={{ marginBottom: schemaFiles.length > 0 ? 10 : 0 }}>
              <div style={T.subhead}>Contract files</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {contracts.map(c => (
                  <div key={c.file} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircle2 size={12} color="#4ade80" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>{c.label}</span>
                    <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.45)', fontFamily: 'var(--font-mono)' }}>{c.file}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {schemaFiles.length > 0 && (
            <div>
              <div style={T.subhead}>Schema files ({schemaFiles.length})</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {schemaFiles.map(s => (
                  <div key={s.file} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{
                      fontSize: 9, padding: '1px 5px', borderRadius: 4, fontFamily: 'var(--font-mono)',
                      background: `${T.r}0.08)`, border: `1px solid ${T.r}0.2)`, color: `${T.r}0.65)`,
                      fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
                    }}>{s.type}</span>
                    <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.5)', fontFamily: 'var(--font-mono)' }}>{s.file}</span>
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

export default function DataVersioningTab() {
  const [status, setStatus]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const loadedRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI.dataVersioningStatus();
      if (result.ok) setStatus(result);
      else setError(result.error || 'Scan failed');
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (!loadedRef.current) { loadedRef.current = true; load(); } }, [load]);

  if (loading && !status) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: 28, color: 'rgba(148,163,184,0.5)', fontSize: 12 }}>
      <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Scanning data versioning configuration…
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
      <Archive size={15} color={T.color} />
      Data Versioning
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
      <DVCSection dvc={status.dvc} />
      <TableFormatsSection formats={status.tableFormats} />
      <FeatureStoresSection stores={status.featureStores} />
      <LargeFilesSection
        modelFiles={status.modelFiles}
        dataFiles={status.dataFiles}
        untrackedCount={status.untrackedCount}
        hasDvc={status.dvc.found}
      />
      <ContractsSection contracts={status.contracts} schemaFiles={status.schemaFiles} />
    </Section>
  );
}
