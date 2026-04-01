/**
 * StatCard — KPI metric card.
 *
 * Props:
 *   label     — string
 *   value     — string | number
 *   color     — CSS color for value text
 *   icon      — optional LucideComponent
 *   sub       — optional subtitle string
 *   loading   — show skeleton if true
 */
import Skeleton from './Skeleton';

export default function StatCard({ label, value, color = 'var(--text)', icon: Icon, sub, loading }) {
  return (
    <div style={{
      flex: 1,
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '10px 14px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        {Icon && <Icon size={12} style={{ color, flexShrink: 0 }}/>}
        <span style={{
          fontSize: 10, color: 'var(--text-muted)',
          textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1.2,
        }}>
          {label}
        </span>
      </div>
      {loading
        ? <Skeleton height={22} width="60%"/>
        : <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-mono)', color, lineHeight: 1.2 }}>{value}</div>
      }
      {sub && !loading && (
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>{sub}</div>
      )}
    </div>
  );
}
