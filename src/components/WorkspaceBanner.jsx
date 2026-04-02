import { useCallback, useEffect, useMemo, useState } from 'react';
import { FolderOpen, RefreshCw } from 'lucide-react';

function openWorkspaceSelector() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('launchline:open-workspace-selector'));
}

export default function WorkspaceBanner({
  label = 'Active Workspace',
  title = null,
  description = null,
  workspace = null,
  dense = false,
  showActions = true,
  hidePath = false,
  style = null,
}) {
  const [workspaceInfo, setWorkspaceInfo] = useState(null);
  const [loading, setLoading] = useState(!workspace);

  const loadWorkspaceInfo = useCallback(async () => {
    if (workspace || !window.electronAPI?.getWorkspaceState) return;
    setLoading(true);
    try {
      const info = await window.electronAPI.getWorkspaceState();
      if (info) setWorkspaceInfo(info);
    } finally {
      setLoading(false);
    }
  }, [workspace]);

  useEffect(() => {
    if (workspace) {
      setLoading(false);
      return undefined;
    }
    loadWorkspaceInfo();
    const unsubscribe = window.electronAPI?.onWorkspaceChanged?.((info) => {
      if (info) setWorkspaceInfo(info);
      setLoading(false);
    });
    return () => unsubscribe?.();
  }, [loadWorkspaceInfo, workspace]);

  const activeWorkspace = workspace || workspaceInfo?.activeWorkspace || null;
  const isMissing = activeWorkspace?.exists === false;
  const isInternal = activeWorkspace?.isInternal;

  const accent = useMemo(() => {
    if (isMissing) {
      return {
        color: '#fca5a5',
        border: 'rgba(248,113,113,0.24)',
        background: 'rgba(127,29,29,0.14)',
        badgeBg: 'rgba(248,113,113,0.12)',
      };
    }
    if (isInternal) {
      return {
        color: '#93c5fd',
        border: 'rgba(59,130,246,0.24)',
        background: 'rgba(30,41,59,0.45)',
        badgeBg: 'rgba(59,130,246,0.12)',
      };
    }
    return {
      color: '#86efac',
      border: 'rgba(52,211,153,0.24)',
      background: 'rgba(6,95,70,0.14)',
      badgeBg: 'rgba(52,211,153,0.12)',
    };
  }, [isInternal, isMissing]);

  const resolvedTitle = title || activeWorkspace?.name || (loading ? 'Loading workspace…' : 'Choose a workspace');
  const resolvedDescription = description || (
    activeWorkspace
      ? isInternal
        ? 'Launchline is analyzing its own repo in internal workspace mode.'
        : isMissing
          ? 'This workspace path is no longer available on disk.'
          : 'Launchline is running analysis against the selected workspace.'
      : 'Select the repo Launchline should analyze.'
  );

  const basePadding = dense ? '12px 14px' : '16px 18px';

  return (
    <div
      style={{
        border: `1px solid ${accent.border}`,
        borderRadius: dense ? 14 : 16,
        background: accent.background,
        boxShadow: dense ? 'none' : '0 10px 24px rgba(0,0,0,0.16)',
        padding: basePadding,
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0, flex: '1 1 420px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {label}
            </span>
            {activeWorkspace ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '3px 8px',
                  borderRadius: 999,
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  color: accent.color,
                  background: accent.badgeBg,
                  border: `1px solid ${accent.border}`,
                }}
              >
                {isInternal ? 'Internal' : isMissing ? 'Missing' : 'Workspace'}
              </span>
            ) : null}
          </div>
          <div style={{ marginTop: 8, fontSize: dense ? 16 : 18, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            {resolvedTitle}
          </div>
          <div style={{ marginTop: 6, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 880 }}>
            {resolvedDescription}
          </div>
          {!hidePath && activeWorkspace?.path ? (
            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', lineHeight: 1.6, wordBreak: 'break-word' }}>
              {activeWorkspace.path}
            </div>
          ) : null}
        </div>
        {showActions ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={openWorkspaceSelector}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: dense ? '8px 10px' : '9px 12px',
                borderRadius: 10,
                border: `1px solid ${accent.border}`,
                background: 'rgba(255,255,255,0.03)',
                color: 'var(--text)',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <FolderOpen size={13} />
              <span>Switch Workspace</span>
            </button>
            {activeWorkspace?.path ? (
              <button
                type="button"
                onClick={() => window.electronAPI?.revealPathInFolder?.(activeWorkspace.path)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  padding: dense ? '8px 10px' : '9px 12px',
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <FolderOpen size={13} />
                <span>Reveal</span>
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      {loading && !activeWorkspace ? (
        <div style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)' }}>
          <RefreshCw size={13} className="spin" />
          <span>Loading workspace context…</span>
        </div>
      ) : null}
    </div>
  );
}
