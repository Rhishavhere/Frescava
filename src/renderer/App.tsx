import { useEffect, useCallback } from 'react'
import { useUIStore } from './store/uiStore'
import { useEditStore } from './store/editStore'
import { usePresetStore } from './store/presetStore'
import TitleBar from './components/ui/TitleBar'
import Editor from './pages/Editor'
import Home from './pages/Home'
import SettingsPage from './pages/SettingsPage'
import type { EditorUiPreferences } from '@shared/types'

function getWindowModeFromHash(): 'home' | 'editor' {
  const h = (window.location.hash || '').replace(/^#/, '')
  return h === 'editor' ? 'editor' : 'home'
}

/** Keep editor UI prefs in sync (persisted in main; Home + Editor both use the store in their process). */
function EditorUiBootstrap() {
  const setEditorUi = useUIStore(s => s.setEditorUi)

  useEffect(() => {
    void window.frame.preferences.getEditorUi().then((prefs: EditorUiPreferences) => {
      setEditorUi(prefs)
    })
    return window.frame.preferences.onEditorUiChange((prefs) => {
      setEditorUi(prefs)
    })
  }, [setEditorUi])

  return null
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

/** Home / startup hub: fixed warm aesthetic — no app-wide dark/light theme. */
function FrescavaHomeShell() {
  const { activeTab, setActiveTab } = useUIStore()

  useEffect(() => {
    const applyView = (v: 'default' | 'settings') => {
      setActiveTab(v === 'settings' ? 'settings' : 'home')
    }
    const off = window.frame.window.onHomeOpenView(applyView)
    void window.frame.window.getHomeLaunchView().then((v) => {
      if (v === 'settings') {
        setActiveTab('settings')
      } else if (v === 'default') {
        setActiveTab('home')
      }
    })
    return off
  }, [setActiveTab])

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      <TitleBar variant="home" activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'home' && <Home />}
        {activeTab === 'settings' && <SettingsPage />}
        {activeTab === 'templates' && <TemplatesStub />}
        {activeTab === 'canvas' && <CanvasStub />}
        {activeTab === 'explore' && <ExploreStub />}
      </div>
    </div>
  )
}

/** Editor window: theme (light/dark) here only; accent is hardcoded monochrome in CSS. */
function FrescavaEditorShell() {
  const { setShowOriginal } = useEditStore()
  const { loadPresets } = usePresetStore()
  const editorAppearance = useUIStore(s => s.editorAppearance)
  const isDark = editorAppearance === 'dark'

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
    <div
      className={
        isDark
          ? 'frescava-editor dark flex flex-col h-screen overflow-hidden bg-[#19191b] text-zinc-100 antialiased'
          : 'frescava-editor flex flex-col h-screen overflow-hidden bg-[#f5f5f5] text-text-primary antialiased'
      }
    >
      <TitleBar variant="editor" />
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <Editor />
      </div>
    </div>
  )
}

export default function App() {
  const mode = getWindowModeFromHash()
  return (
    <>
      <EditorUiBootstrap />
      {mode === 'editor' ? <FrescavaEditorShell /> : <FrescavaHomeShell />}
    </>
  )
}
