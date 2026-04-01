import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Copy, Database, Download, FolderOpen, Minus, RotateCcw, Square, Upload, X } from 'lucide-react';
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

const APP_VERSION = '0.1.0';
const POLL_INTERVAL_MS = 30000;

function timeAgoShort(ts) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(ts).toLocaleDateString();
}

function FooterBar({ activeLabel, fullName, savedAt, onNavigate, onOpenStorage }) {
  const [status, setStatus] = useState(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const savedAtRef = useRef(null);

  useEffect(() => {
    async function load() {
      try {
        if (!window.electronAPI?.getFooterStatus) return;
        const result = await window.electronAPI.getFooterStatus();
        if (result?.ok) setStatus(result);
      } catch {}
    }
    load();
    const id = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!savedAt || savedAt === savedAtRef.current) return;
    savedAtRef.current = savedAt;
    setSavedFlash(true);
    const t = setTimeout(() => setSavedFlash(false), 2500);
    return () => clearTimeout(t);
  }, [savedAt]);

  const venv = status?.venv;
  const lastRun = status?.lastRun;

  let dotColor = 'rgba(255,255,255,0.18)';
  let dotPulse = false;
  let venvLabel = '…';
  let venvTooltip = 'Checking Python environment…';
  if (venv) {
    if (!venv.exists) {
      dotColor = '#f87171';
      venvLabel = 'No venv';
      venvTooltip = 'No virtual environment found. Go to Python Tools to create one.';
    } else if (!venv.interpreterOk) {
      dotColor = '#f59e0b';
      venvLabel = 'Venv broken';
      venvTooltip = 'Virtual environment exists but the Python interpreter is missing or broken. Go to Python Tools to rebuild.';
    } else {
      dotColor = '#34d399';
      dotPulse = true;
      venvLabel = venv.pythonVersion ? `python ${venv.pythonVersion}` : 'Venv ok';
      venvTooltip = `Python environment is healthy${venv.pythonVersion ? ` · python ${venv.pythonVersion}` : ''}${venv.lockfileExists ? ' · lockfile present' : ''}. Click to open Python Tools.`;
    }
  }

  const dotStyle = {
    width: 6, height: 6, borderRadius: '50%',
    background: dotColor, display: 'inline-block', flexShrink: 0,
    animation: dotPulse ? 'pulse 2s infinite' : 'none',
  };

  const pill = { display: 'inline-flex', alignItems: 'center', gap: 5 };

  const clickableStyle = {
    cursor: 'pointer',
    borderRadius: 4,
    padding: '1px 4px',
    margin: '0 -4px',
    transition: 'background 0.15s',
  };

  return (
    <footer className="footer-bar" style={{ flexShrink: 0 }}>

      {/* LEFT — venv health + saved flash */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <button
          style={{ ...pill, ...clickableStyle, background: 'transparent', border: 'none', color: 'inherit', font: 'inherit' }}
          title={venvTooltip}
          onClick={() => onNavigate?.('python-tools')}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <span style={dotStyle} />
          <span>{venvLabel}</span>
        </button>
        {savedFlash && (
          <span
            style={{ color: '#34d399', letterSpacing: 0 }}
            title="Settings were just saved to disk"
          >
            · ✓ Saved
          </span>
        )}
      </div>

      {/* CENTER — active page */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <span
          style={{ color: 'var(--text-secondary)' }}
          title={`Currently viewing: ${activeLabel}`}
        >
          {activeLabel}
        </span>
      </div>

      {/* RIGHT — last run + version */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 14, minWidth: 0 }}>
        {lastRun && (
          <button
            style={{ ...pill, ...clickableStyle, background: 'transparent', border: 'none', font: 'inherit', color: lastRun.ok ? '#34d399' : '#f87171', minWidth: 0 }}
            title={`Last run: ${lastRun.command}\nResult: ${lastRun.ok ? 'Success' : 'Failed'} · ${lastRun.durationMs != null ? `${(lastRun.durationMs / 1000).toFixed(1)}s` : '?'}\nClick to open Python Tools.`}
            onClick={() => onNavigate?.('python-tools')}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <span>{lastRun.ok ? '✓' : '✗'}</span>
            <span style={{ fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
              {lastRun.command}
            </span>
            <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>· {timeAgoShort(lastRun.startedAt)}</span>
          </button>
        )}
        <button
          type="button"
          style={{ ...pill, ...clickableStyle, background: 'transparent', border: 'none', font: 'inherit', color: 'var(--text-secondary)' }}
          title="Open storage controls"
          onClick={onOpenStorage}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <Database size={13} />
          <span>Storage</span>
        </button>
        <span
          style={{ flexShrink: 0 }}
          title={`${fullName} version ${APP_VERSION}`}
        >
          {fullName} v{APP_VERSION}
        </span>
      </div>

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

export default function AppShell({ groups, standaloneItems = [], defaultActiveId }) {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState(() =>
    Object.fromEntries(groups.map((group) => [group.id, true]))
  );
  const {
    settings,
    savedAt,
    storageInfo,
    refreshStorageInfo,
    exportSettings,
    importSettings,
    resetSettings,
  } = useSettings();
  const company = settings?.company || {};
  const primary = company.namePrimary || company.name || 'App';
  const accent = company.nameAccent || '';
  const fullName = `${primary}${accent}`.trim() || 'Launchline';
  const initials = company.initials || primary.slice(0, 1).toUpperCase() || 'A';
  const showIcon = company.showIcon !== false;
  const showName = company.showName !== false;

  const flatNavItems = useMemo(
    () => [...groups.flatMap((group) => group.items), ...standaloneItems.filter((item) => !item.divider)],
    [groups, standaloneItems]
  );

  const [activeId, setActiveId] = useState(defaultActiveId || flatNavItems[0]?.id);
  const [isStorageOpen, setIsStorageOpen] = useState(false);
  const [storageMessage, setStorageMessage] = useState(null);
  const [storageBusy, setStorageBusy] = useState(false);
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

  if (!ActivePage) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <TitleBar primary={primary} accent={accent}/>
      <div className="app-layout" style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
        <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`} style={{ flexShrink: 0 }}>
          <div className="sidebar-header">
            {showIcon ? <div className="sidebar-logo">{initials}</div> : null}
            {showName ? (
              <span className="sidebar-brand">
                <BrandText primary={primary} accent={accent} />
              </span>
            ) : null}
          </div>
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
                <div key={id} style={{ display: activeId === id ? 'contents' : 'none', flex: 1, overflow: 'hidden' }}>
                  <Page />
                </div>
              );
            })}
          </main>
          <FooterBar
            activeLabel={activeItem?.label || ''}
            fullName={fullName}
            savedAt={savedAt}
            onNavigate={navigateTo}
            onOpenStorage={openStorageModal}
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
                {storageInfo ? `Schema v${storageInfo.schemaVersion} · workspace ${storageInfo.workspace.id}` : 'Loading storage details...'}
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
              Launchline now keeps app-wide preferences in global app data, while command history, nav state, hygiene history, and other mutable workspace records stay scoped to this repo.
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
                  label="Global Settings"
                  pathValue={storageInfo.global.settingsPath}
                  helper="Persistent app preferences shared across Launchline workspaces."
                  onReveal={revealPath}
                />
                <StoragePathCard
                  label="Workspace Storage"
                  pathValue={storageInfo.workspace.storagePath}
                  helper="Repo-specific state and history for this working directory."
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
    </div>
  );
}
