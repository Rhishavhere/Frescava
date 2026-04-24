import { useUIStore } from '../store/uiStore'
import { useEditStore } from '../store/editStore'
import { useSessionStore } from '../store/tabStore'
import ImageCanvas from '../components/editor/ImageCanvas'
import PresetStrip from '../components/editor/PresetStrip'
import AdjustmentPanel from '../components/editor/AdjustmentPanel'
import EffectsPanel from '../components/editor/EffectsPanel'
import PresetSettingsPanel from '../components/editor/PresetSettingsPanel'
import DropZone from '../components/editor/DropZone'
import Toolbar from '../components/editor/Toolbar'
import EditorTabBar from '../components/editor/EditorTabBar'
import BatchStrip from '../components/editor/BatchStrip'
import ConfirmModal from '../components/ui/ConfirmModal'

const PANEL_TABS = [
  { id: 'light',   label: 'Light' },
  { id: 'color',   label: 'Color' },
  { id: 'detail',  label: 'Detail' },
  { id: 'effects', label: 'Effects' },
] as const

export default function Editor() {
  const { rightPanelTab, setRightPanelTab } = useUIStore()
  const { imagePath, imageDataURL } = useEditStore()
  const { sessions } = useSessionStore()

  const hasImage = !!imagePath && !!imageDataURL

  return (
    <>
      <div className="flex-1 flex flex-col overflow-hidden">

        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* ── Left: Preset + Templates strip ─────────────────────────────── */}
          <aside className="w-48 shrink-0 flex flex-col border-r border-border bg-surface-50 overflow-hidden">
            <PresetStrip />
          </aside>

          {/* ── Center: Toolbar → Tabs → Canvas → Batch ────────────────────── */}
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            <Toolbar hasImage={hasImage} />
            {/* Session tabs — below toolbar, above canvas */}
            {sessions.length > 0 && <EditorTabBar />}
            <div className="flex-1 canvas-container overflow-hidden min-h-0">
              {hasImage ? <ImageCanvas /> : <DropZone />}
            </div>
            {/* Batch image strip — shows when 2+ images in session */}
            <BatchStrip />
          </div>

          {/* ── Right: Adjustment Panel ────────────────────────────────────── */}
          <aside className="w-80 shrink-0 flex flex-col border-l border-border bg-white overflow-hidden">
            <div className="flex border-b border-border px-0.5 shrink-0">
              {PANEL_TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setRightPanelTab(tab.id)}
                  className={`tab-item px-1 flex-1 text-center text-xs py-2.5 ${rightPanelTab === tab.id ? 'active' : ''}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto right-panel-scroll">
              {!hasImage ? (
                <div className="flex items-center justify-center h-full text-text-muted">
                  <p className="text-xs text-center px-6">Open a photo to start editing</p>
                </div>
              ) : (
                <>
                  {rightPanelTab !== 'effects' && (
                    <AdjustmentPanel activeSection={rightPanelTab as 'light' | 'color' | 'detail'} />
                  )}
                  {rightPanelTab === 'effects' && <EffectsPanel />}
                  {/* Preset settings live below the adjustment area, not in a separate tab */}
                  <PresetSettingsPanel />
                </>
              )}
            </div>
          </aside>
        </div>
      </div>
      <ConfirmModal />
    </>
  )
}
