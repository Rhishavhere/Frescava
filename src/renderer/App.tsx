import { useEffect, useCallback } from 'react'
import { useUIStore } from './store/uiStore'
import { useEditStore } from './store/editStore'
import { usePresetStore } from './store/presetStore'
import TitleBar from './components/ui/TitleBar'
import Editor from './pages/Editor'
import Home from './pages/Home'

function getWindowModeFromHash(): 'home' | 'editor' {
  const h = (window.location.hash || '').replace(/^#/, '')
  return h === 'editor' ? 'editor' : 'home'
}

function TemplatesStub() {
  return (
    <div className="flex-1 flex items-center justify-center" style={{ background: '#F6F2EC' }}>
      <div className="text-center">
        <div className="text-5xl mb-4" style={{ fontFamily: 'Georgia, serif' }}>◫</div>
        <p className="text-sm font-semibold" style={{ fontFamily: 'Georgia, serif' }}>Templates — coming in v0.3</p>
        <p className="text-xs font-mono text-black/40 mt-2">Editorial layouts, film strips, poster compositions</p>
      </div>
    </div>
  )
}

function CanvasStub() {
  return (
    <div className="flex-1 flex items-center justify-center" style={{ background: '#F6F2EC' }}>
      <div className="text-center">
        <div className="text-5xl mb-4" style={{ fontFamily: 'Georgia, serif' }}>∞</div>
        <p className="text-sm font-semibold" style={{ fontFamily: 'Georgia, serif' }}>Canvas — coming in v0.5</p>
        <p className="text-xs font-mono text-black/40 mt-2">Infinite moodboard workspace</p>
      </div>
    </div>
  )
}

function ExploreStub() {
  return (
    <div className="flex-1 flex items-center justify-center bg-[#F6F2EC] text-black">
      <div className="text-center">
        <div className="text-5xl mb-4 opacity-50">✧</div>
        <p className="text-sm font-mono tracking-widest uppercase">Explore (Coming Soon)</p>
        <p className="text-xs font-mono text-black/40 mt-2">Discover curated film stocks and templates</p>
      </div>
    </div>
  )
}

/** Home / startup hub: separate window from the photo editor. */
function FrescavaHomeShell() {
  const { activeTab, setActiveTab } = useUIStore()

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      <TitleBar variant="home" activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'home' && <Home />}
        {activeTab === 'templates' && <TemplatesStub />}
        {activeTab === 'canvas' && <CanvasStub />}
        {activeTab === 'explore' && <ExploreStub />}
      </div>
    </div>
  )
}

/** Maximized editor window: grading workspace only. */
function FrescavaEditorShell() {
  const { setShowOriginal } = useEditStore()
  const { loadPresets } = usePresetStore()

  useEffect(() => {
    loadPresets()
  }, [loadPresets])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.code === 'Space' &&
        !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
      if (useEditStore.getState().compareMode) return
      e.preventDefault()
      setShowOriginal(true)
    }
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
      <TitleBar variant="editor" />
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <Editor />
      </div>
    </div>
  )
}

export default function App() {
  const mode = getWindowModeFromHash()
  if (mode === 'editor') {
    return <FrescavaEditorShell />
  }
  return <FrescavaHomeShell />
}
