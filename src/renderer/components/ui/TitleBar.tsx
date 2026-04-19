import { useState, useEffect } from 'react'

type AppTab = 'home' | 'editor' | 'templates' | 'canvas'

interface TitleBarProps {
  activeTab: AppTab
  onTabChange: (tab: AppTab) => void
}

const TABS: { id: AppTab; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'editor', label: 'Editor' },
  { id: 'canvas', label: 'Canvas' },
]

export default function TitleBar({ activeTab, onTabChange }: TitleBarProps) {
  const [isMaximized, setIsMaximized] = useState(false)
  const isMac = navigator.userAgent.includes('Mac')

  useEffect(() => {
    // Check initial maximized state
    window.frame?.app.isMaximized().then(setIsMaximized).catch(() => {})
  }, [])

  const handleMinimize = () => window.frame?.app.minimize()
  const handleMaximize = () => {
    window.frame?.app.maximize()
    setIsMaximized(v => !v)
  }
  const handleClose = () => window.frame?.app.close()

  return (
    <header
      className="drag-region flex items-center h-10 border-b border-border bg-white shrink-0"
      style={{ minHeight: 40 }}
    >
      {/* macOS traffic lights space */}
      {isMac && <div className="no-drag w-[72px] shrink-0" />}

      {/* Logo */}
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

      {/* Tab navigation */}
      <nav className="no-drag flex items-end h-full">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`tab-item ${activeTab === tab.id ? 'active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Windows controls */}
      {!isMac && (
        <div className="no-drag flex items-center">
          <button
            onClick={handleMinimize}
            className="flex items-center justify-center w-11 h-10 text-text-muted hover:bg-surface-100 hover:text-text-primary transition-colors"
            title="Minimize"
          >
            <svg width="10" height="1" viewBox="0 0 10 1" fill="none">
              <path d="M0 0.5H10" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
          <button
            onClick={handleMaximize}
            className="flex items-center justify-center w-11 h-10 text-text-muted hover:bg-surface-100 hover:text-text-primary transition-colors"
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
            className="flex items-center justify-center w-11 h-10 text-text-muted hover:bg-red-500 hover:text-white transition-colors"
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
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Abstract aperture/lens icon */}
      <rect width="24" height="24" rx="6" fill="#111111" />
      <circle cx="12" cy="12" r="5" stroke="white" strokeWidth="1.5" />
      <path d="M12 7V5M12 19V17M7 12H5M19 12H17M8.5 8.5L7 7M16.5 16.5L17 17M8.5 15.5L7 17M16.5 8.5L17 7"
        stroke="white" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="12" cy="12" r="2" fill="white" />
    </svg>
  )
}
