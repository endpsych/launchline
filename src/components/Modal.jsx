import { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Modal — generic overlay wrapper.
 *
 * Props:
 *   onClose     — called when backdrop or X is clicked / Escape pressed
 *   title       — string shown in header
 *   subtitle    — optional string below title
 *   icon        — optional React element (e.g. <Database size={20}/>)
 *   accentColor — optional CSS color for border/icon bg tint
 *   maxWidth    — default 640
 *   children    — modal body content
 *   footer      — optional React node rendered in sticky footer
 */
export default function Modal({
  onClose,
  title,
  subtitle,
  icon,
  accentColor = 'var(--primary)',
  maxWidth = 640,
  backgroundColor = 'var(--bg-card)',
  children,
  footer,
}) {
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: backgroundColor,
          border: `1px solid ${accentColor}40`,
          borderRadius: 16,
          boxShadow: `0 24px 64px rgba(0,0,0,0.6)`,
          width: '100%', maxWidth,
          maxHeight: '90vh',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          padding: '18px 24px 14px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {icon && (
              <div style={{
                width: 44, height: 44, borderRadius: 10,
                background: `${accentColor}18`, border: `1px solid ${accentColor}40`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                {icon}
              </div>
            )}
            <div>
              {title && <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{title}</h2>}
              {subtitle && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{subtitle}</div>}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'var(--bg-secondary)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '6px 8px', cursor: 'pointer',
              color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
              flexShrink: 0, marginLeft: 12,
            }}
          >
            <X size={14}/>
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '16px 24px' }}>
          {children}
        </div>

        {/* Optional footer */}
        {footer && (
          <div style={{
            padding: '12px 24px',
            borderTop: '1px solid var(--border)',
            flexShrink: 0,
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
