import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRightCircle, ChevronLeft, ChevronRight, Copy, Database, Download, FolderOpen, Minus, RotateCcw, Square, Upload, X } from 'lucide-react';
import '../styles/theme.css';
import { useSettings } from '../hooks/useSettings';
import Modal from '../components/Modal';

function BrandText({ primary, accent }) {
  return (
    <>
      <span>{primary}</span>
      {accent ? <span style={{ color: 'var(--primary, #6366f1)' }}>{accent}</span> : null}
    </>
  );
}

function TitleBar({ primary, accent }) {
  const [isMax, setIsMax] = useState(false);
  const checkMax = useCallback(async () => {
    try { setIsMax(await window.electronAPI.windowIsMaximized()); } catch {}
  }, []);

  useEffect(() => { checkMax(); }, [checkMax]);

  const handleMin = () => window.electronAPI.windowMinimize();
  const handleMax = async () => { await window.electronAPI.windowMaximize(); setTimeout(checkMax, 100); };
  const handleClose = () => window.electronAPI.windowClose();

  const btnBase = {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    width: 46,
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'background 0.15s',
  };

  return (
    <div style={{
      height: 32,
      display: 'flex',
      alignItems: 'center',
      background: 'var(--bg-sidebar, #0d1117)',
      borderBottom: '1px solid var(--border)',
      WebkitAppRegion: 'drag',
      position: 'relative',
      zIndex: 100,
      flexShrink: 0,
    }}>
      <div style={{ padding: '0 16px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: 0.5 }}>
        <BrandText primary={primary} accent={accent} />
      </div>
      <div style={{ flex: 1 }}/>
      <div style={{ display: 'flex', WebkitAppRegion: 'no-drag' }}>
        <button style={btnBase} onClick={handleMin}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,.08)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
          <Minus size={14}/>
        </button>
        <button style={btnBase} onClick={handleMax}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,.08)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
          {isMax ? <Copy size={12}/> : <Square size={12}/>}
        </button>
        <button style={btnBase} onClick={handleClose}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#e81123'; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
          <X size={14}/>
        </button>
      </div>
    </div>
  );
}

function FooterBar({ workspaceLabel, workspacePath, onOpenWorkspace }) {
  return (
    <footer className="footer-bar" style={{ flexShrink: 0 }}>
      <button
        type="button"
        onClick={onOpenWorkspace}
        title="Open workspace loading"
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          gap: 10,
          minWidth: 0,
          color: '#86efac',
          background: 'transparent',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          textAlign: 'left',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(52,211,153,0.06)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        <FolderOpen size={14} />
        <span style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
          Loaded Workspace
        </span>
        <span style={{ color: 'rgba(134,239,172,0.65)' }}>·</span>
        <span style={{ fontWeight: 700, whiteSpace: 'nowrap' }} title={workspaceLabel || 'Loading workspace context...'}>
          {workspaceLabel || 'Loading workspace context...'}
        </span>
        {workspacePath ? (
          <>
            <span style={{ color: 'rgba(134,239,172,0.65)' }}>·</span>
            <span
              style={{
                minWidth: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontFamily: 'var(--font-mono)',
                color: '#86efac',
              }}
              title={workspacePath}
            >
              {workspacePath}
            </span>
          </>
        ) : null}
      </button>
    </footer>
  );
}

function StoragePathCard({ label, pathValue, onReveal, helper }) {
  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: 14,
      background: 'rgba(255,255,255,0.02)',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: 0.3 }}>
          {label}
        </div>
        <button
          type="button"
          onClick={() => onReveal?.(pathValue)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'transparent',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
            borderRadius: 8,
            padding: '6px 10px',
            cursor: 'pointer',
            fontSize: 12,
          }}
        >
          <FolderOpen size={12} />
          <span>Reveal</span>
        </button>
      </div>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
        color: 'var(--text)',
        lineHeight: 1.6,
        wordBreak: 'break-word',
      }}>
        {pathValue}
      </div>
      {helper ? (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          {helper}
        </div>
      ) : null}
    </div>
  );
}

function WorkspaceNamePill({ name, tone = 'green' }) {
  const palette = tone === 'purple'
    ? {
        color: '#c4b5fd',
        background: 'rgba(139,92,246,0.12)',
        border: '1px solid rgba(139,92,246,0.24)',
      }
    : tone === 'blue'
      ? {
          color: '#93c5fd',
          background: 'rgba(59,130,246,0.12)',
          border: '1px solid rgba(59,130,246,0.24)',
        }
      : {
          color: '#86efac',
          background: 'rgba(34,197,94,0.12)',
          border: '1px solid rgba(34,197,94,0.24)',
        };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 10px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: '0.04em',
        color: palette.color,
        background: palette.background,
        border: palette.border,
        whiteSpace: 'nowrap',
      }}
      title={name}
    >
      {name}
    </span>
  );
}

const revealWorkspaceButtonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 34,
  height: 32,
  background: 'transparent',
  border: '1px solid var(--border)',
  color: 'var(--text-secondary)',
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: 12,
  flexShrink: 0,
};

const workspaceActionGapPx = 10;
const workspaceRevealButtonWidthPx = 34;
const workspaceUseButtonWidthPx = 34;
const workspaceActionsColumnWidthPx = workspaceRevealButtonWidthPx + workspaceActionGapPx + workspaceUseButtonWidthPx;

const useWorkspaceButtonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: workspaceUseButtonWidthPx,
  height: 32,
  boxSizing: 'border-box',
  gap: 6,
  background: 'rgba(52,211,153,0.12)',
  border: '1px solid rgba(52,211,153,0.24)',
  color: '#86efac',
  borderRadius: 8,
  padding: 0,
  cursor: 'pointer',
  fontSize: 12,
  lineHeight: 0,
  flexShrink: 0,
};

const workspaceModalColumns = `220px 150px minmax(0, 1fr) ${workspaceActionsColumnWidthPx}px`;

function formatWorkspaceLoadedAt(value) {
  if (!value) return '--';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '--';
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  const hours = String(parsed.getHours()).padStart(2, '0');
  const minutes = String(parsed.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function WorkspaceTableRow({ workspace, onReveal, isActive, onActivate, showPlaceholderAction = false, highlightLoaded = false, nameTone = 'green' }) {
  const isMissing = workspace?.exists === false;
  const loadedToneColor = '#86efac';

  if (!workspace) return null;

  const displayName = workspace.isInternal ? 'Launchline' : workspace.name;
  const displayTone = workspace.isInternal ? 'purple' : nameTone;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: workspaceModalColumns,
        gap: 12,
        padding: '12px 14px',
        alignItems: 'center',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          minWidth: 0,
          display: 'flex',
          alignItems: 'center',
          justifySelf: 'start',
        }}
      >
          <WorkspaceNamePill name={displayName} tone={displayTone} />
        </div>
      <span
        style={{
          fontSize: 12,
          color: highlightLoaded ? loadedToneColor : 'var(--text-secondary)',
          fontFamily: 'var(--font-mono)',
          whiteSpace: 'nowrap',
        }}
        title={workspace.loadedAt ? new Date(workspace.loadedAt).toLocaleString() : 'No load time recorded yet'}
      >
        {formatWorkspaceLoadedAt(workspace.loadedAt)}
      </span>
      <span
        style={{
          minWidth: 0,
          display: 'block',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          color: highlightLoaded ? loadedToneColor : 'var(--text-secondary)',
        }}
        title={workspace.path}
      >
        {workspace.path}
      </span>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `${workspaceRevealButtonWidthPx}px ${workspaceUseButtonWidthPx}px`,
          alignItems: 'center',
          justifyItems: 'start',
          gap: workspaceActionGapPx,
          flexShrink: 0,
          width: workspaceActionsColumnWidthPx,
          justifySelf: 'end',
        }}
      >
        <button
          type="button"
          onClick={() => onReveal?.(workspace.path)}
          title="Open workspace in File Explorer"
          aria-label="Open workspace in File Explorer"
          style={{
            ...revealWorkspaceButtonStyle,
            border: highlightLoaded ? '1px solid rgba(52,211,153,0.35)' : revealWorkspaceButtonStyle.border,
            color: highlightLoaded ? loadedToneColor : revealWorkspaceButtonStyle.color,
            background: highlightLoaded ? 'rgba(6,95,70,0.18)' : revealWorkspaceButtonStyle.background,
          }}
        >
          <FolderOpen size={14} />
        </button>
        {!isActive ? (
          <button
            type="button"
            onClick={() => onActivate?.(workspace)}
            disabled={isMissing}
            title="Use this workspace as the active target"
            aria-label="Use this workspace as the active target"
            style={{
              ...useWorkspaceButtonStyle,
              background: isMissing ? 'rgba(255,255,255,0.03)' : useWorkspaceButtonStyle.background,
              border: `1px solid ${isMissing ? 'var(--border)' : 'rgba(52,211,153,0.24)'}`,
              color: isMissing ? 'var(--text-muted)' : '#86efac',
              cursor: isMissing ? 'not-allowed' : 'pointer',
            }}
          >
            <ArrowRightCircle size={15} />
          </button>
        ) : showPlaceholderAction ? (
          <span
            style={{
              width: workspaceUseButtonWidthPx,
              height: 32,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#86efac',
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              fontFamily: 'var(--font-mono)',
              boxSizing: 'border-box',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              background: 'transparent',
            }}
          >
            Loaded
          </span>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}

function WorkspaceTable({ workspaces, activePath, onReveal, onActivate, showHeader = true, scrollable = true, placeholderForActive = false, highlightLoaded = false, nameTone = 'green' }) {
  if (!workspaces?.length) return null;

  return (
    <div
      style={{
        border: highlightLoaded ? '1px solid rgba(52,211,153,0.35)' : '1px solid var(--border)',
        borderRadius: 12,
        overflow: 'hidden',
        background: highlightLoaded ? 'rgba(6,95,70,0.18)' : 'rgba(255,255,255,0.02)',
      }}
    >
      {showHeader ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: workspaceModalColumns,
            gap: 12,
            padding: '10px 14px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(255,255,255,0.02)',
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '0.07em',
            textTransform: 'uppercase',
            color: 'var(--text-secondary)',
          }}
        >
          <span style={{ justifySelf: 'start' }}>Workspace</span>
          <span style={{ justifySelf: 'start' }}>Loaded</span>
          <span style={{ justifySelf: 'start' }}>Path</span>
          <span style={{ justifySelf: 'end' }}>Actions</span>
        </div>
      ) : null}
      <div style={scrollable ? { maxHeight: 220, overflowY: 'auto' } : undefined}>
        {workspaces.map((workspace, index) => {
          return (
            <div
              key={workspace.id}
              style={{
                borderTop: !showHeader && index === 0 ? 'none' : index === 0 && showHeader ? 'none' : '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <WorkspaceTableRow
                workspace={workspace}
                isActive={workspace.path === activePath}
                onReveal={onReveal}
                onActivate={onActivate}
                showPlaceholderAction={placeholderForActive}
                highlightLoaded={highlightLoaded}
                nameTone={nameTone}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RibbonTab({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        position: 'relative',
        border: 'none',
        background: 'transparent',
        color: active ? 'var(--text)' : 'var(--text-secondary)',
        fontSize: 13,
        fontWeight: active ? 700 : 600,
        padding: '8px 0',
        cursor: 'pointer',
      }}
    >
      <span>{label}</span>
      {active ? (
        <span
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: -1,
            height: 3,
            borderRadius: 999,
            background: 'var(--primary)',
            boxShadow: '0 0 18px rgba(91,154,255,0.35)',
          }}
        />
      ) : null}
    </button>
  );
}

function AppRibbon({ onOpenWorkspace }) {
  const [activeTab, setActiveTab] = useState('workspace');

  return (
    <div
      style={{
        background: 'linear-gradient(180deg, rgba(13,17,27,0.98), rgba(16,22,35,0.98))',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 22,
          padding: '0 20px',
          minHeight: 38,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <RibbonTab
          label="Workspace"
          active={activeTab === 'workspace'}
          onClick={() => {
            setActiveTab('workspace');
            onOpenWorkspace?.();
          }}
        />
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'stretch',
          gap: 0,
          padding: '0 20px',
          minHeight: 0,
          overflowX: 'auto',
        }}
      >
        
      </div>
    </div>
  );
}

export default function AppShell({ groups, standaloneItems = [], defaultActiveId }) {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState(() =>
    Object.fromEntries(groups.map((group) => [group.id, true]))
  );
  const {
    settings,
    storageInfo,
    refreshStorageInfo,
    exportSettings,
    importSettings,
    resetSettings,
  } = useSettings();
  const company = settings?.company || {};
  const primary = company.namePrimary || company.name || 'App';
  const accent = company.nameAccent || '';

  const flatNavItems = useMemo(
    () => [...groups.flatMap((group) => group.items), ...standaloneItems.filter((item) => !item.divider)],
    [groups, standaloneItems]
  );

  const [activeId, setActiveId] = useState(defaultActiveId || flatNavItems[0]?.id);
  const [isStorageOpen, setIsStorageOpen] = useState(false);
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const [storageMessage, setStorageMessage] = useState(null);
  const [storageBusy, setStorageBusy] = useState(false);
  const [workspaceInfo, setWorkspaceInfo] = useState(null);
  const [workspaceBusy, setWorkspaceBusy] = useState(false);
  const [workspaceMessage, setWorkspaceMessage] = useState(null);
  // Track visited pages so we keep them mounted (hidden) once first visited
  const [visitedPages, setVisitedPages] = useState(
    () => new Set([defaultActiveId || flatNavItems[0]?.id].filter(Boolean))
  );

  const navigateTo = (id) => {
    setActiveId(id);
    setVisitedPages(prev => { const s = new Set(prev); s.add(id); return s; });
    window.electronAPI?.setLastPage?.(id);
  };

  // Restore last page on first mount
  useEffect(() => {
    window.electronAPI?.getLastPage?.().then(lastId => {
      if (lastId && flatNavItems.some(item => item.id === lastId)) {
        setActiveId(lastId);
        setVisitedPages(prev => { const s = new Set(prev); s.add(lastId); return s; });
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!flatNavItems.some((item) => item.id === activeId)) {
      setActiveId(defaultActiveId || flatNavItems[0]?.id);
    }
  }, [activeId, defaultActiveId, flatNavItems]);

  useEffect(() => {
    let isMounted = true;
    window.electronAPI?.getWorkspaceState?.()
      .then((info) => { if (isMounted && info) setWorkspaceInfo(info); })
      .catch(() => {});

    const unsubscribe = window.electronAPI?.onWorkspaceChanged?.((info) => {
      if (!isMounted || !info) return;
      setWorkspaceInfo(info);
      refreshStorageInfo?.().catch(() => {});
    });

    return () => {
      isMounted = false;
      unsubscribe?.();
    };
  }, [refreshStorageInfo]);

  const activeWorkspaceId = workspaceInfo?.activeWorkspace?.id || 'launchline-internal';

  useEffect(() => {
    setVisitedPages(new Set([activeId].filter(Boolean)));
  }, [activeWorkspaceId]);

  const activeItem = flatNavItems.find((item) => item.id === activeId) || flatNavItems[0];
  const ActivePage = activeItem?.page;

  const toggleGroup = (groupId) => {
    setExpandedGroups((current) => ({ ...current, [groupId]: !current[groupId] }));
  };

  const revealPath = useCallback(async (targetPath) => {
    if (!targetPath) return;
    await window.electronAPI?.revealPathInFolder?.(targetPath);
  }, []);

  const openStorageModal = useCallback(async () => {
    setStorageMessage(null);
    setIsStorageOpen(true);
    await refreshStorageInfo?.();
  }, [refreshStorageInfo]);

  const openWorkspaceModal = useCallback(async () => {
    setWorkspaceMessage(null);
    setIsWorkspaceOpen(true);
    try {
      const info = await window.electronAPI?.getWorkspaceState?.();
      if (info) setWorkspaceInfo(info);
      await refreshStorageInfo?.();
    } catch {}
  }, [refreshStorageInfo]);

  useEffect(() => {
    const handleOpenWorkspaceSelector = () => {
      openWorkspaceModal().catch(() => {});
    };
    window.addEventListener('launchline:open-workspace-selector', handleOpenWorkspaceSelector);
    return () => window.removeEventListener('launchline:open-workspace-selector', handleOpenWorkspaceSelector);
  }, [openWorkspaceModal]);

  const handleExportSettings = useCallback(async () => {
    setStorageBusy(true);
    try {
      const result = await exportSettings();
      if (result?.ok) {
        setStorageMessage({ tone: 'success', text: `Settings exported to ${result.path}` });
      } else if (!result?.canceled) {
        setStorageMessage({ tone: 'error', text: result?.error || 'Unable to export settings.' });
      }
    } finally {
      setStorageBusy(false);
    }
  }, [exportSettings]);

  const handleImportSettings = useCallback(async () => {
    setStorageBusy(true);
    try {
      const result = await importSettings();
      if (result?.ok) {
        setStorageMessage({ tone: 'success', text: `Settings imported from ${result.path}` });
        await refreshStorageInfo?.();
      } else if (!result?.canceled) {
        setStorageMessage({ tone: 'error', text: result?.error || 'Unable to import settings.' });
      }
    } finally {
      setStorageBusy(false);
    }
  }, [importSettings, refreshStorageInfo]);

  const handleResetSettings = useCallback(async () => {
    if (!window.confirm('Reset Launchline settings back to the default profile for this app?')) return;
    setStorageBusy(true);
    try {
      const result = await resetSettings();
      if (result?.ok) {
        setStorageMessage({ tone: 'success', text: 'Settings reset to the Launchline default profile.' });
        await refreshStorageInfo?.();
      } else {
        setStorageMessage({ tone: 'error', text: result?.error || 'Unable to reset settings.' });
      }
    } finally {
      setStorageBusy(false);
    }
  }, [refreshStorageInfo, resetSettings]);

  const handlePickWorkspace = useCallback(async () => {
    setWorkspaceBusy(true);
    try {
      const result = await window.electronAPI?.pickWorkspaceFolder?.();
      if (result?.ok && result.state) {
        setWorkspaceInfo(result.state);
        setWorkspaceMessage(null);
        await refreshStorageInfo?.();
      } else if (!result?.canceled) {
        setWorkspaceMessage({ tone: 'error', text: result?.error || 'Unable to switch workspace.' });
      }
    } finally {
      setWorkspaceBusy(false);
    }
  }, [refreshStorageInfo]);

  const handleActivateWorkspace = useCallback(async (workspace) => {
    if (!workspace?.path) return;
    setWorkspaceBusy(true);
    try {
      const result = workspace.isInternal
        ? await window.electronAPI?.useInternalWorkspace?.()
        : await window.electronAPI?.setActiveWorkspace?.(workspace.path);
      if (result?.ok && result.state) {
        setWorkspaceInfo(result.state);
        setWorkspaceMessage(null);
        await refreshStorageInfo?.();
      } else if (!result?.canceled) {
        setWorkspaceMessage({ tone: 'error', text: result?.error || 'Unable to switch workspace.' });
      }
    } finally {
      setWorkspaceBusy(false);
    }
  }, [refreshStorageInfo]);

  if (!ActivePage) return null;

  const analysisWorkspace = storageInfo?.analysisWorkspace || workspaceInfo?.activeWorkspace || null;
  const recentWorkspaceCards = workspaceInfo?.recentWorkspaces || [];
  const recentWorkspaceList = recentWorkspaceCards.filter((workspace) => (
    workspace.path !== workspaceInfo?.activeWorkspace?.path
  ));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <TitleBar primary={primary} accent={accent}/>
      <AppRibbon onOpenWorkspace={openWorkspaceModal} />
      <div className="app-layout" style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
        <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`} style={{ flexShrink: 0 }}>
          <nav className="sidebar-nav">
            {groups.map((group) => {
              const isExpanded = expandedGroups[group.id];
              return (
                <div key={group.id} className="nav-group">
                  <button
                    className={`nav-group-header ${isExpanded ? 'expanded' : ''}`}
                    onClick={() => toggleGroup(group.id)}
                    title={collapsed ? group.label : undefined}
                  >
                    <ChevronRight className="nav-group-chevron" size={14} />
                    <span className="nav-group-label">{group.label}</span>
                  </button>
                  {isExpanded ? (
                    <div className="nav-group-items">
                      {group.items.map(({ id, label, icon: Icon }) => (
                        <div
                          key={id}
                          className={`nav-item ${activeId === id ? 'active' : ''}`}
                          onClick={() => navigateTo(id)}
                          title={collapsed ? label : undefined}
                        >
                          <Icon className="nav-icon" />
                          <span className="nav-label">{label}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
            {standaloneItems.length ? (
              <div className="nav-standalone">
                {standaloneItems.map((item) => {
                  if (item.divider) {
                    return (
                      <div
                        key={item.id}
                        style={{
                          height: 1,
                          background: 'rgba(255,255,255,0.06)',
                          margin: '4px 0',
                          flexShrink: 0,
                        }}
                      />
                    );
                  }
                  const { id, label, icon: Icon } = item;
                  return (
                    <div
                      key={id}
                      className={`nav-item ${activeId === id ? 'active' : ''}`}
                      onClick={() => navigateTo(id)}
                      title={collapsed ? label : undefined}
                    >
                      <Icon className="nav-icon" />
                      <span className="nav-label">{label}</span>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </nav>
          <div className="sidebar-footer">
            <button
              className="collapse-btn"
              onClick={() => setCollapsed((current) => !current)}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRight size={16}/> : <><ChevronLeft size={16}/><span className="nav-label">Collapse</span></>}
            </button>
          </div>
        </aside>
        <div className="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          <main className="page-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
            {/* All visited pages stay mounted; only the active one is visible */}
            {flatNavItems.map(({ id, page: Page }) => {
              if (!Page || !visitedPages.has(id)) return null;
              return (
                <div key={`${activeWorkspaceId}:${id}`} style={{ display: activeId === id ? 'contents' : 'none', flex: 1, overflow: 'hidden' }}>
                  <Page />
                </div>
              );
            })}
          </main>
          <FooterBar
            workspaceLabel={analysisWorkspace?.name || ''}
            workspacePath={analysisWorkspace?.path || ''}
            onOpenWorkspace={openWorkspaceModal}
          />
        </div>
      </div>
      {isStorageOpen ? (
        <Modal
          onClose={() => setIsStorageOpen(false)}
          title="Storage & Settings"
          subtitle="Global preferences live separately from workspace-specific state and history."
          icon={<Database size={18} />}
          accentColor="#34d399"
          maxWidth={760}
          footer={(
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {storageInfo ? `Schema v${storageInfo.schemaVersion} · active workspace ${storageInfo.analysisWorkspace?.name || storageInfo.workspace.id}` : 'Loading storage details...'}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                <button
                  type="button"
                  onClick={handleExportSettings}
                  disabled={storageBusy}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', cursor: storageBusy ? 'wait' : 'pointer' }}
                >
                  <Download size={14} />
                  <span>Export</span>
                </button>
                <button
                  type="button"
                  onClick={handleImportSettings}
                  disabled={storageBusy}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', cursor: storageBusy ? 'wait' : 'pointer' }}
                >
                  <Upload size={14} />
                  <span>Import</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetSettings}
                  disabled={storageBusy}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 10, border: '1px solid rgba(248,113,113,0.35)', background: 'transparent', color: '#fca5a5', cursor: storageBusy ? 'wait' : 'pointer' }}
                >
                  <RotateCcw size={14} />
                  <span>Reset</span>
                </button>
              </div>
            </div>
          )}
        >
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              Launchline keeps app-wide preferences in global app data. Analysis history and other mutable records are separated from the repo currently under review.
            </div>
            {storageMessage ? (
              <div style={{
                borderRadius: 12,
                border: `1px solid ${storageMessage.tone === 'error' ? 'rgba(248,113,113,0.35)' : 'rgba(52,211,153,0.35)'}`,
                background: storageMessage.tone === 'error' ? 'rgba(127,29,29,0.18)' : 'rgba(6,95,70,0.18)',
                color: storageMessage.tone === 'error' ? '#fca5a5' : '#86efac',
                padding: '12px 14px',
                fontSize: 13,
                lineHeight: 1.6,
              }}>
                {storageMessage.text}
              </div>
            ) : null}
            {storageInfo ? (
              <>
                <StoragePathCard
                  label="Active Analysis Workspace"
                  pathValue={storageInfo.analysisWorkspace.path}
                  helper="Repo currently being analyzed by Launchline."
                  onReveal={revealPath}
                />
                <StoragePathCard
                  label="Global Settings"
                  pathValue={storageInfo.global.settingsPath}
                  helper="Persistent app preferences shared across Launchline workspaces."
                  onReveal={revealPath}
                />
                <StoragePathCard
                  label="Workspace Storage"
                  pathValue={storageInfo.workspace.storagePath}
                  helper="App-data storage bucket currently assigned to the active analysis workspace."
                  onReveal={revealPath}
                />
                <StoragePathCard
                  label="Electron Runtime"
                  pathValue={storageInfo.runtime.runtimePath}
                  helper="OS-managed Electron runtime area for user data, session data, logs, and crash dumps."
                  onReveal={revealPath}
                />
              </>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Loading storage paths...
              </div>
            )}
          </div>
        </Modal>
      ) : null}
      {isWorkspaceOpen ? (
        <Modal
          onClose={() => setIsWorkspaceOpen(false)}
          title="Workspace Loading"
          subtitle="Launchline loads the selected workspace as the current target so every feature points at that repo when you decide to run checks."
          icon={<FolderOpen size={18} />}
          accentColor="#86efac"
          maxWidth={820}
          footer={(
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 12, color: '#86efac' }}>
                {analysisWorkspace ? `Loaded workspace: ${analysisWorkspace.name}` : 'Loading workspace context...'}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                <button
                  type="button"
                  onClick={handlePickWorkspace}
                  disabled={workspaceBusy}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: '1px solid rgba(52,211,153,0.24)',
                    background: 'rgba(52,211,153,0.12)',
                    color: workspaceBusy ? 'rgba(134,239,172,0.5)' : '#86efac',
                    cursor: workspaceBusy ? 'wait' : 'pointer',
                  }}
                >
                  <FolderOpen size={14} />
                  <span>Choose Folder</span>
                </button>
              </div>
            </div>
          )}
        >
          <div style={{ display: 'grid', gap: 14 }}>
            {workspaceMessage?.tone === 'error' ? (
              <div style={{
                borderRadius: 12,
                border: '1px solid rgba(248,113,113,0.35)',
                background: 'rgba(127,29,29,0.18)',
                color: '#fca5a5',
                padding: '12px 14px',
                fontSize: 13,
                lineHeight: 1.6,
              }}>
                {workspaceMessage.text}
              </div>
            ) : null}
            <WorkspaceTable
              workspaces={workspaceInfo?.activeWorkspace ? [workspaceInfo.activeWorkspace] : []}
              activePath={workspaceInfo?.activeWorkspace?.path}
              onReveal={revealPath}
              showHeader={false}
              scrollable={false}
              placeholderForActive
              highlightLoaded
            />
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                Recent Workspaces
              </div>
              {recentWorkspaceList.length ? (
                <WorkspaceTable
                  workspaces={recentWorkspaceList}
                  activePath={workspaceInfo?.activeWorkspace?.path}
                  onReveal={revealPath}
                  onActivate={handleActivateWorkspace}
                  nameTone="blue"
                />
              ) : (
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  No other recent workspaces yet. Choose a folder to load another repo into Launchline.
                </div>
              )}
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
