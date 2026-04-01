/* """
src/pages/Settings/components/SettingsLayout.jsx
------------------------------------------------
Shared structural components and styles for the Settings tabs.
""" */

import React from 'react';

export const inputStyle = {
  width: '100%', 
  boxSizing: 'border-box',
  background: 'var(--bg-secondary)', 
  border: '1px solid var(--border)',
  borderRadius: 8, 
  color: 'var(--text)', 
  fontSize: 13,
  padding: '8px 12px', 
  outline: 'none', 
  fontFamily: 'var(--font-sans)',
};

export const selectStyle = { ...inputStyle, cursor: 'pointer' };

export function Field({ label, hint, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{label}</label>
        {hint && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export function Section({ title, children }) {
  return (
    <div className="card mb-4">
      <div className="card-title" style={{ marginBottom: 16 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{children}</div>
    </div>
  );
}