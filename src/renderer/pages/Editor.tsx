import { useEffect } from 'react'
import { useUIStore } from '../store/uiStore'
import { useEditStore } from '../store/editStore'
import { useSessionStore } from '../store/tabStore'
import { loadProjectIntoEditor } from '../lib/hydrateProject'
import ImageCanvas from '../components/editor/ImageCanvas'
import EditorLeftPanel from '../components/editor/EditorLeftPanel'
import AdjustmentPanel from '../components/editor/AdjustmentPanel'
import EffectsPanel from '../components/editor/EffectsPanel'
import PresetSettingsPanel from '../components/editor/PresetSettingsPanel'
import AdjustmentHistogram from '../components/editor/AdjustmentHistogram'
import { PresetColumnStub, InspectorColumnStub } from '../components/editor/EditorWorkspaceStubs'
import DropZone from '../components/editor/DropZone'
import Toolbar from '../components/editor/Toolbar'
import BatchStrip from '../components/editor/BatchStrip'
import ConfirmModal from '../components/ui/ConfirmModal'

const PANEL_TABS = [
  { id: 'light' as const, label: 'Light' },
  { id: 'color' as const, label: 'Color' },
  { id: 'detail' as const, label: 'Detail' },
  { id: 'effects' as const, label: 'Effects' },
] as const

function EditorWindowSessionBootstrap() {
  useEffect(() => {
    const offFiles = window.frame.window.onEditorOpenFiles((files) => {
      if (files.length) useSessionStore.getState().openSession(files)
    })
    const offProject = window.frame.window.onEditorOpenProject((p) => {
      void loadProjectIntoEditor(p.filePath, p.project)
    })
    void (async () => {
      const payload = await window.frame.window.getLaunchPayload()
      if (payload?.type === 'project') {
        await loadProjectIntoEditor(payload.filePath, payload.project)
      } else if (payload?.type === 'files' && payload.files.length > 0) {
        useSessionStore.getState().openSession(payload.files)
      }
    })()
    return () => {
      offFiles()
      offProject()
    }
  }, [])
  return null
}

export default function Editor() {
  const { rightPanelTab, setRightPanelTab, editorWorkspace } = useUIStore()
  const imagePath = useEditStore(s => s.imagePath)
  const imageDataURL = useEditStore(s => s.imageDataURL)
  const presetId = useEditStore(s => s.params.presetId)

  const hasImage = !!imagePath && !!imageDataURL
  const showPresetDock = hasImage && !!presetId
  const isMainWorkspace = editorWorkspace === 'main'

  return (
    <>
      <EditorWindowSessionBootstrap />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Left: tool rail + category (Effects hosts preset library) — stub for Text / Templates workspace */}
          <aside
            className={`w-60 sm:w-64 shrink-0 flex flex-col border-r border-border dark:border-zinc-800/60 overflow-hidden min-h-0 ${
              isMainWorkspace ? '' : 'bg-surface-50 dark:bg-zinc-950/90'
            }`}
          >
            {isMainWorkspace ? <EditorLeftPanel /> : <PresetColumnStub mode={editorWorkspace} />}
          </aside>

          {/* Center: same canvas + batch for all in-editor modes; toolbar switches workspace panels */}
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            <Toolbar hasImage={hasImage} />
            <div className="flex-1 relative flex-col canvas-container overflow-hidden min-h-0">
              {hasImage ? <ImageCanvas /> : <DropZone />}
              <BatchStrip />
              {hasImage && isMainWorkspace && (
                <div className="absolute top-3 right-3 z-[25] w-[min(220px,42vw)] bg-transparent">
                  <AdjustmentHistogram variant="overlay" />
                </div>
              )}
              {showPresetDock && isMainWorkspace && (
                <div className="absolute left-3 top-24 z-20 w-[140px] max-w-[calc(100%-1.5rem)] rounded-xl border border-border/80 dark:border-zinc-700/70 bg-white/95 dark:bg-zinc-950/90 shadow-xl backdrop-blur-sm overflow-visible">
                  <PresetSettingsPanel />
                </div>
              )}
            </div>
          </div>

          {/* Right: inspector — adjustments on main, stub otherwise */}
          <aside className="w-72 shrink-0 flex flex-col border-l border-border dark:border-zinc-800/60 bg-white dark:bg-zinc-950/95 overflow-hidden">
            {isMainWorkspace ? (
              <>
                <div className="flex border-b border-border px-0.5 shrink-0">
                  {PANEL_TABS.map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setRightPanelTab(tab.id)}
                      className={`tab-item px-1 flex-1 text-center text-xs py-2.5 ${
                        rightPanelTab === tab.id ? 'active' : ''
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <div className="flex-1 flex flex-col min-h-0">
                  {!hasImage ? (
                    <div className="flex flex-1 items-center justify-center text-text-muted dark:text-zinc-500 overflow-y-auto right-panel-scroll">
                      <p className="text-xs text-center px-6">Open a photo to start editing</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden right-panel-scroll">
                        {rightPanelTab !== 'effects' && (
                          <AdjustmentPanel activeSection={rightPanelTab} />
                        )}
                        {rightPanelTab === 'effects' && <EffectsPanel />}
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <InspectorColumnStub mode={editorWorkspace} />
            )}
          </aside>
        </div>
      </div>
      <ConfirmModal />
    </>
  )
}
