import { useState, useEffect } from 'react'
import logoPng from '../../../assets/Logo.png'

type HomeTab = 'home' | 'templates' | 'canvas' | 'explore' | 'settings'

const HOME_TABS: { id: HomeTab; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'explore', label: 'Explore' },
  { id: 'settings', label: 'Settings' },
]

type TitleBarHomeProps = {
  variant: 'home'
  activeTab: HomeTab
  onTabChange: (tab: HomeTab) => void
}

type TitleBarEditorProps = {
  variant: 'editor'
}

type TitleBarProps = TitleBarHomeProps | TitleBarEditorProps

export default function TitleBar(props: TitleBarProps) {
  const [isMaximized, setIsMaximized] = useState(false)
  const isMac = navigator.userAgent.includes('Mac')

  useEffect(() => {
    window.frame?.app.isMaximized().then(setIsMaximized).catch(() => {})
  }, [])

  const handleMinimize = () => window.frame?.app.minimize()
  const handleMaximize = () => {
    window.frame?.app.maximize()
    setIsMaximized(v => !v)
  }
  const handleClose = () => window.frame?.app.close()

  const handleOpenHome = () => {
    void window.frame?.window.openHome({ view: 'default' })
  }

  const handleOpenSettings = () => {
    void window.frame?.window.openHome({ view: 'settings' })
  }

  if (props.variant === 'editor') {
    return (
      <header
        className="drag-region flex items-center h-8 border-b border-border dark:border-zinc-800/70 bg-surface-50 dark:bg-zinc-950 shrink-0"
        style={{ minHeight: 32 }}
      >
        {isMac && <div className="no-drag w-[72px] shrink-0" />}

        {isMac ? (
          <div className="no-drag flex items-center gap-2 mr-4 pl-0.5">
            <FrescavaLogo className="w-4 h-4" />
            <span className="text-xs font-semibold tracking-tight text-text-primary dark:text-zinc-100">Frescava</span>
          </div>
        ) : (
          <div className="no-drag flex items-center gap-2 pl-3 mr-4">
            <FrescavaLogo className="w-5 h-5" />
            <span className="text-sm font-semibold tracking-tight text-text-primary dark:text-zinc-100">Frescava</span>
          </div>
        )}

        <span className="text-[10px] font-mono font-medium uppercase tracking-widest text-accent no-drag pr-1">
          Editor
        </span>
        <div className="no-drag flex items-center gap-1">
          <button
            type="button"
            onClick={handleOpenHome}
            className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md border border-border text-text-secondary hover:text-text-primary hover:bg-surface-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800/80 transition-colors"
          >
            Library
          </button>
          <button
            type="button"
            onClick={handleOpenSettings}
            className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md border border-border text-text-secondary hover:text-text-primary hover:bg-surface-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800/80 transition-colors"
            title="Settings"
          >
            Settings
          </button>
        </div>
        <div className="flex-1" />

        {!isMac && (
          <div className="no-drag flex items-center">
            <button
              onClick={handleMinimize}
              className="flex items-center justify-center w-11 h-8 text-text-muted dark:text-zinc-500 hover:bg-surface-100 dark:hover:bg-zinc-800/90 hover:text-text-primary dark:hover:text-zinc-100 transition-colors"
              title="Minimize"
            >
              <svg width="10" height="1" viewBox="0 0 10 1" fill="none">
                <path d="M0 0.5H10" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
            <button
              onClick={handleMaximize}
              className="flex items-center justify-center w-11 h-8 text-text-muted dark:text-zinc-500 hover:bg-surface-100 dark:hover:bg-zinc-800/90 hover:text-text-primary dark:hover:text-zinc-100 transition-colors"
              title={isMaximized ? 'Restore' : 'Maximize'}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                {isMaximized ? (
                  <>
                    <path d="M2 0H10V8" stroke="currentColor" strokeWidth="1.2" />
                    <rect x="0" y="2" width="8" height="8" stroke="currentColor" strokeWidth="1.2" />
                  </>
                ) : (
                  <rect x="0.5" y="0.5" width="9" height="9" stroke="currentColor" strokeWidth="1.2" />
                )}
              </svg>
            </button>
            <button
              onClick={handleClose}
              className="flex items-center justify-center w-11 h-8 text-text-muted hover:bg-red-500 hover:text-white transition-colors duration-150"
              title="Close"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        )}
      </header>
    )
  }

  const { activeTab, onTabChange } = props
  return (
    <header
      className="drag-region flex items-center h-8 border-b border-border bg-white dark:bg-zinc-950/90 dark:border-zinc-800/70 shrink-0"
      style={{ minHeight: 32 }}
    >
      {isMac && <div className="no-drag w-[72px] shrink-0" />}

      {!isMac && (
        <div className="no-drag flex items-center gap-2 pl-3 mr-4">
          <FrescavaLogo className="w-5 h-5" />
          <span className="text-sm font-semibold tracking-tight text-text-primary">Frescava</span>
        </div>
      )}

      {isMac && (
        <div className="no-drag flex items-center gap-2 mr-4">
          <FrescavaLogo className="w-4 h-4" />
          <span className="text-xs font-semibold tracking-tight text-text-primary">Frescava</span>
        </div>
      )}

      <nav className="no-drag flex items-end h-full">
        {HOME_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`tab-item ${activeTab === tab.id ? 'active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="flex-1" />

      {!isMac && (
        <div className="no-drag flex items-center">
          <button
            onClick={handleMinimize}
            className="flex items-center justify-center w-11 h-8 text-text-muted hover:bg-surface-100 hover:text-text-primary transition-colors"
            title="Minimize"
          >
            <svg width="10" height="1" viewBox="0 0 10 1" fill="none">
              <path d="M0 0.5H10" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
          <button
            onClick={handleMaximize}
            className="flex items-center justify-center w-11 h-8 text-text-muted hover:bg-surface-100 hover:text-text-primary transition-colors"
            title={isMaximized ? 'Restore' : 'Maximize'}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              {isMaximized ? (
                <>
                  <path d="M2 0H10V8" stroke="currentColor" strokeWidth="1.2" />
                  <rect x="0" y="2" width="8" height="8" stroke="currentColor" strokeWidth="1.2" />
                </>
              ) : (
                <rect x="0.5" y="0.5" width="9" height="9" stroke="currentColor" strokeWidth="1.2" />
              )}
            </svg>
          </button>
          <button
            onClick={handleClose}
            className="flex items-center justify-center w-11 h-8 text-text-muted hover:bg-red-500 hover:text-white transition-colors"
            title="Close"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}
    </header>
  )
}

function FrescavaLogo({ className }: { className?: string }) {
  return <img src={logoPng} alt="" className={`${className ?? ''} object-contain`} aria-hidden />
}
