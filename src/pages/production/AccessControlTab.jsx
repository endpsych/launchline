import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, ChevronDown, ChevronRight,
  Key, Lock, Network, RefreshCw, Shield, UserCheck, Users,
} from 'lucide-react';
import { Section } from '../../ui-kit/forms/SettingsLayout';

// ─── Theme ────────────────────────────────────────────────────────────────────
const T = {
  color:   '#818cf8',              // indigo-400
  r:       'rgba(129,140,248,',    // base rgba prefix
  card:    { borderRadius: 10, padding: '12px 14px', border: '1px solid rgba(129,140,248,0.18)', background: 'rgba(129,140,248,0.03)' },
  label:   { fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(129,140,248,0.55)', marginBottom: 9 },
  subhead: { fontSize: 9, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(129,140,248,0.4)', marginBottom: 6 },
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

function CategoryPill({ label }) {
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 5,
      background: `${T.r}0.1)`, border: `1px solid ${T.r}0.25)`, color: `${T.r}0.8)`,
      letterSpacing: '0.04em', textTransform: 'uppercase',
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
        <Lock size={14} style={{ color: T.color, flexShrink: 0 }} />
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.55)`, flex: 1 }}>Access Control Readiness</span>
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

// ─── RBAC section ─────────────────────────────────────────────────────────────

function RBACSection({ rbac }) {
  const { manifests, wildcards, dangerous, hasCasbin, casbinFiles, hasOPA, opaFiles, hasDjangoPerm, hasCASL, hasACL } = rbac;
  const hasAny = manifests.length > 0 || hasCasbin || hasOPA || hasDjangoPerm || hasCASL || hasACL;
  const hasIssues = wildcards.length > 0 || dangerous.length > 0;
  const badge = !hasAny
    ? <StatusPill pass={false} trueLabel="" falseLabel="none found" />
    : hasIssues
      ? <WarnPill label={`${wildcards.length + dangerous.length} issue${wildcards.length + dangerous.length !== 1 ? 's' : ''}`} />
      : <StatusPill pass trueLabel="configured" />;

  return (
    <Collapsible title="RBAC & Authorization" icon={Users} badge={badge}>
      {!hasAny ? (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '4px 0' }}>
          <AlertTriangle size={12} color="#fbbf24" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <span style={{ fontSize: 12, color: '#fbbf24' }}>No RBAC or authorization configuration found.</span>
            <p style={{ fontSize: 11, color: 'rgba(148,163,184,0.5)', margin: '3px 0 0' }}>
              Define access rules using Kubernetes RBAC, Casbin, OPA/Rego policies, or
              framework-level permission decorators (DRF, CASL, ACL).
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Warnings first */}
          {wildcards.length > 0 && (
            <div style={{ padding: '8px 10px', borderRadius: 7, marginBottom: 10, background: 'rgba(251,113,133,0.05)', border: '1px solid rgba(251,113,133,0.18)' }}>
              <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(251,113,133,0.6)', marginBottom: 5 }}>
                Wildcard permissions detected
              </div>
              {wildcards.map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <AlertTriangle size={10} color="#fb7185" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.65)', fontFamily: 'var(--font-mono)' }}>{f}</span>
                </div>
              ))}
            </div>
          )}
          {dangerous.length > 0 && (
            <div style={{ padding: '8px 10px', borderRadius: 7, marginBottom: 10, background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.18)' }}>
              <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(251,191,36,0.6)', marginBottom: 5 }}>
                Sensitive permissions (review carefully)
              </div>
              {dangerous.map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
                  <AlertTriangle size={10} color="#fbbf24" style={{ flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'rgba(148,163,184,0.55)' }}>{d.file}</span>
                  <span style={{ fontSize: 9, color: 'rgba(251,191,36,0.5)' }}>{d.issue}</span>
                </div>
              ))}
            </div>
          )}

          {/* K8s RBAC manifests */}
          {manifests.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={T.subhead}>Kubernetes RBAC manifests ({manifests.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {manifests.slice(0, 7).map(m => (
                  <div key={m.file} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircle2 size={11} color={wildcards.includes(m.file) ? '#fbbf24' : '#4ade80'} style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'rgba(148,163,184,0.6)', flex: 1 }}>{m.file}</span>
                    <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: `${T.r}0.08)`, border: `1px solid ${T.r}0.18)`, color: `${T.r}0.6)`, fontWeight: 700 }}>{m.kind}</span>
                  </div>
                ))}
                {manifests.length > 7 && (
                  <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.3)' }}>…and {manifests.length - 7} more</span>
                )}
              </div>
            </div>
          )}

          {/* Framework-level authorization */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {hasCasbin && <CheckItem pass label={`Casbin policy${casbinFiles.length > 0 ? ` (${casbinFiles.length} file${casbinFiles.length !== 1 ? 's' : ''})` : ' (dep)'}`} />}
            {hasOPA    && <CheckItem pass label={`OPA / Rego${opaFiles.length > 0 ? ` (${opaFiles.length} .rego file${opaFiles.length !== 1 ? 's' : ''})` : ' (dep)'}`} />}
            {hasDjangoPerm && <CheckItem pass label="Django permission_classes / decorators" />}
            {hasCASL   && <CheckItem pass label="CASL (attribute-based access control)" />}
            {hasACL    && <CheckItem pass label="Node ACL library" />}
          </div>
        </>
      )}
    </Collapsible>
  );
}

// ─── Auth middleware section ──────────────────────────────────────────────────

function AuthSection({ auth }) {
  const { libs, byCategory } = auth;
  const badge = <StatusPill pass={libs.length > 0} trueLabel={`${libs.length} found`} falseLabel="none found" />;
  const categories = Object.entries(byCategory);

  return (
    <Collapsible title="Auth Middleware" icon={UserCheck} badge={badge}>
      {libs.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '4px 0' }}>
          <AlertTriangle size={12} color="#fbbf24" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <span style={{ fontSize: 12, color: '#fbbf24' }}>No auth middleware detected.</span>
            <p style={{ fontSize: 11, color: 'rgba(148,163,184,0.5)', margin: '3px 0 0' }}>
              Add JWT validation (<code style={{ fontFamily: 'var(--font-mono)', color: T.color }}>express-jwt</code>,{' '}
              <code style={{ fontFamily: 'var(--font-mono)', color: T.color }}>PyJWT</code>), OAuth2 (Passport,
              NextAuth, Authlib) or session management to protect routes.
            </p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {categories.map(([cat, items]) => (
            <div key={cat}>
              <div style={T.subhead}>{cat}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {items.map(l => (
                  <div key={l.label} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11,
                    padding: '4px 9px', borderRadius: 8,
                    background: `${T.r}0.06)`, border: `1px solid ${T.r}0.2)`,
                  }}>
                    <CheckCircle2 size={11} color="#4ade80" style={{ flexShrink: 0 }} />
                    <span style={{ color: 'var(--text)', fontWeight: 600 }}>{l.label}</span>
                    <CategoryPill label={l.pkg.toUpperCase()} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Collapsible>
  );
}

// ─── OAuth / OIDC section ─────────────────────────────────────────────────────

function OAuthSection({ oauth }) {
  const { configFiles, risks } = oauth;
  const hasAny = configFiles.length > 0;
  const badge  = risks.length > 0
    ? <WarnPill label={`${risks.length} risk${risks.length !== 1 ? 's' : ''}`} />
    : hasAny
      ? <StatusPill pass trueLabel="configured" />
      : <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.35)', fontWeight: 600 }}>no config files</span>;

  return (
    <Collapsible title="OAuth / OIDC Config" icon={Key} badge={badge} defaultOpen={risks.length > 0}>
      {risks.length > 0 && (
        <div style={{ padding: '8px 10px', borderRadius: 7, marginBottom: 10, background: 'rgba(251,113,133,0.05)', border: '1px solid rgba(251,113,133,0.18)' }}>
          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(251,113,133,0.6)', marginBottom: 5 }}>
            Configuration risks
          </div>
          {risks.map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
              <AlertTriangle size={10} color="#fb7185" style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'rgba(148,163,184,0.55)', marginRight: 6 }}>{r.file}</span>
              <span style={{ fontSize: 11, color: '#fb7185' }}>{r.issue}</span>
            </div>
          ))}
        </div>
      )}
      {hasAny ? (
        <div>
          <div style={T.subhead}>Config files</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {configFiles.map(c => (
              <div key={c.file} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={12} color="#4ade80" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>{c.label}</span>
                <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.45)', fontFamily: 'var(--font-mono)' }}>{c.file}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p style={{ fontSize: 12, color: 'rgba(148,163,184,0.5)', margin: 0 }}>
          No dedicated OAuth config files found. Configuration may be handled via environment variables or library defaults.
        </p>
      )}
    </Collapsible>
  );
}

// ─── Service accounts section ─────────────────────────────────────────────────

function ServiceAccountsSection({ serviceAccounts }) {
  const { accounts, defaultUsages } = serviceAccounts;
  const hasIssues = defaultUsages.length > 0;
  const badge = accounts.length === 0
    ? <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.35)', fontWeight: 600 }}>none found</span>
    : hasIssues
      ? <WarnPill label={`${defaultUsages.length} default SA`} />
      : <StatusPill pass trueLabel={`${accounts.length} scoped`} />;

  return (
    <Collapsible title="Service Accounts" icon={Shield} badge={badge} defaultOpen={hasIssues}>
      {accounts.length === 0 && defaultUsages.length === 0 ? (
        <p style={{ fontSize: 12, color: 'rgba(148,163,184,0.5)', margin: 0 }}>
          No Kubernetes ServiceAccount manifests found.
        </p>
      ) : (
        <>
          {defaultUsages.length > 0 && (
            <div style={{ padding: '8px 10px', borderRadius: 7, marginBottom: 10, background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.18)' }}>
              <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(251,191,36,0.6)', marginBottom: 5 }}>
                Workloads using the default service account
              </div>
              {defaultUsages.map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <AlertTriangle size={10} color="#fbbf24" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.6)', fontFamily: 'var(--font-mono)' }}>{f}</span>
                </div>
              ))}
            </div>
          )}
          {accounts.length > 0 && (
            <div>
              <div style={T.subhead}>Defined service accounts ({accounts.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {accounts.slice(0, 8).map(a => (
                  <div key={a.file} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircle2 size={11} color="#4ade80" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>{a.name}</span>
                    <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.4)', fontFamily: 'var(--font-mono)' }}>{a.file}</span>
                  </div>
                ))}
                {accounts.length > 8 && (
                  <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.3)' }}>…and {accounts.length - 8} more</span>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </Collapsible>
  );
}

// ─── Zero-trust section ───────────────────────────────────────────────────────

function ZeroTrustSection({ zeroTrust }) {
  const { mesh, networkPolicies, mtlsConfigs, hasCertManager } = zeroTrust;
  const total = mesh.length + networkPolicies.length + mtlsConfigs.length + (hasCertManager ? 1 : 0);
  const badge = <StatusPill pass={total > 0} trueLabel={`${total} found`} falseLabel="none found" />;

  return (
    <Collapsible title="Zero-Trust & Network Policy" icon={Network} badge={badge} defaultOpen={total > 0}>
      {total === 0 ? (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '4px 0' }}>
          <AlertTriangle size={12} color="#fbbf24" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <span style={{ fontSize: 12, color: '#fbbf24' }}>No zero-trust or network isolation found.</span>
            <p style={{ fontSize: 11, color: 'rgba(148,163,184,0.5)', margin: '3px 0 0' }}>
              Add Kubernetes NetworkPolicies to restrict pod-to-pod traffic, deploy a service
              mesh (Istio, Linkerd) for mTLS, and use cert-manager for certificate automation.
            </p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Service mesh */}
          {mesh.length > 0 && (
            <div>
              <div style={T.subhead}>Service mesh</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {mesh.map(m => (
                  <div key={m.label} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11,
                    padding: '4px 9px', borderRadius: 8,
                    background: `${T.r}0.06)`, border: `1px solid ${T.r}0.2)`,
                  }}>
                    <CheckCircle2 size={11} color="#4ade80" style={{ flexShrink: 0 }} />
                    <span style={{ color: 'var(--text)', fontWeight: 600 }}>{m.label}</span>
                    <span style={{ fontSize: 9, color: 'rgba(148,163,184,0.4)' }}>{m.source}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* cert-manager */}
          {hasCertManager && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={12} color="#4ade80" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>cert-manager</span>
              <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.45)' }}>Certificate/Issuer manifests found</span>
            </div>
          )}

          {/* mTLS */}
          {mtlsConfigs.length > 0 && (
            <div>
              <div style={T.subhead}>mTLS / PeerAuthentication ({mtlsConfigs.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {mtlsConfigs.slice(0, 5).map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <CheckCircle2 size={10} color="#4ade80" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.55)', fontFamily: 'var(--font-mono)' }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* NetworkPolicies */}
          {networkPolicies.length > 0 && (
            <div>
              <div style={T.subhead}>NetworkPolicies ({networkPolicies.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {networkPolicies.slice(0, 6).map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <CheckCircle2 size={10} color="#4ade80" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.55)', fontFamily: 'var(--font-mono)' }}>{f}</span>
                  </div>
                ))}
                {networkPolicies.length > 6 && (
                  <span style={{ fontSize: 10, color: 'rgba(148,163,184,0.3)' }}>…and {networkPolicies.length - 6} more</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </Collapsible>
  );
}

// ─── Main tab ─────────────────────────────────────────────────────────────────

export default function AccessControlTab() {
  const [status, setStatus]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const loadedRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI.accessControlStatus();
      if (result.ok) setStatus(result);
      else setError(result.error || 'Scan failed');
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (!loadedRef.current) { loadedRef.current = true; load(); } }, [load]);

  if (loading && !status) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: 28, color: 'rgba(148,163,184,0.5)', fontSize: 12 }}>
      <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Scanning access control configuration…
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
      <Lock size={15} color={T.color} />
      Access Control
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
      <RBACSection rbac={status.rbac} />
      <AuthSection auth={status.auth} />
      <OAuthSection oauth={status.oauth} />
      <ServiceAccountsSection serviceAccounts={status.serviceAccounts} />
      <ZeroTrustSection zeroTrust={status.zeroTrust} />
    </Section>
  );
}
