import { useEffect, useCallback } from 'react'
import { useUIStore } from './store/uiStore'
import { useEditStore } from './store/editStore'
import { usePresetStore } from './store/presetStore'
import TitleBar from './components/ui/TitleBar'
import Editor from './pages/Editor'

// Stub pages for future tabs
function TemplatesStub() {
  return (
    <div className="flex-1 flex items-center justify-center text-text-muted">
      <div className="text-center">
        <div className="text-4xl mb-3">🎨</div>
        <p className="text-sm font-medium">Templates — coming in v0.3</p>
      </div>
    </div>
  )
}

function CanvasStub() {
  return (
    <div className="flex-1 flex items-center justify-center text-text-muted">
      <div className="text-center">
        <div className="text-4xl mb-3">∞</div>
        <p className="text-sm font-medium">Canvas — coming in v0.5</p>
      </div>
    </div>
  )
}

export default function App() {
  const { activeTab, setActiveTab } = useUIStore()
  const { setShowOriginal } = useEditStore()
  const { loadPresets } = usePresetStore()

  // Load presets on startup
  useEffect(() => {
    loadPresets()
  }, [loadPresets])

  // Global keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Spacebar = before/after toggle (only when not typing in an input)
    if (e.code === 'Space' &&
        !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
      e.preventDefault()
      setShowOriginal(true)
    }
    // Cmd/Ctrl+Z = undo (handled in editStore, but we can dispatch here if needed)
  }, [setShowOriginal])

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.code === 'Space') {
      setShowOriginal(false)
    }
  }, [setShowOriginal])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [handleKeyDown, handleKeyUp])

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      {/* Custom title bar */}
      <TitleBar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Page content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'editor' && <Editor />}
        {activeTab === 'templates' && <TemplatesStub />}
        {activeTab === 'canvas' && <CanvasStub />}
      </div>
    </div>
  )
}
