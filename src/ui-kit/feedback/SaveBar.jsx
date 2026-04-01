/* """
src/pages/Settings/components/SaveBar.jsx
-----------------------------------------
Sticky footer for the Settings module to handle Save/Reset actions.
""" */

import React from 'react';
import { Save, RotateCcw } from 'lucide-react';

export default function SaveBar({ dirty, saving, onSave, onReset }) {
  return (
    <div style={{ 
      position: 'sticky', 
      bottom: 0, 
      zIndex: 10, 
      background: 'var(--bg-card)', 
      borderTop: '1px solid var(--border)', 
      padding: '12px 0', 
      marginTop: 24, 
      display: 'flex', 
      alignItems: 'center', 
      gap: 10 
    }}>
      {dirty
        ? <span style={{ fontSize: 12, color: 'var(--warning)' }}>● Unsaved changes</span>
        : <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>✓ All changes saved</span>
      }
      <div style={{ flex: 1 }}/>
      <button 
        onClick={onReset} 
        disabled={!dirty}
        style={{ 
          display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', 
          borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)', 
          color: 'var(--text-muted)', fontSize: 12, cursor: dirty ? 'pointer' : 'default', 
          opacity: dirty ? 1 : 0.4 
        }}
      >
        <RotateCcw size={12}/> Reset
      </button>
      <button 
        onClick={onSave} 
        disabled={!dirty || saving}
        style={{ 
          display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', 
          borderRadius: 8, border: 'none', 
          background: dirty ? 'var(--primary)' : 'var(--bg-secondary)', 
          color: dirty ? '#fff' : 'var(--text-muted)', 
          fontSize: 12, fontWeight: 600, 
          cursor: dirty ? 'pointer' : 'default', opacity: dirty ? 1 : 0.5 
        }}
      >
        {saving ? (
          <><RotateCcw size={12} style={{ animation: 'spin 1s linear infinite' }}/> Saving…</>
        ) : (
          <><Save size={12}/> Save Changes</>
        )}
      </button>
    </div>
  );
}