import { useUIStore } from '../store/uiStore'
import { useEditStore } from '../store/editStore'
import ImageCanvas from '../components/editor/ImageCanvas'
import PresetStrip from '../components/editor/PresetStrip'
import AdjustmentPanel from '../components/editor/AdjustmentPanel'
import EffectsPanel from '../components/editor/EffectsPanel'
import DropZone from '../components/editor/DropZone'
import Toolbar from '../components/editor/Toolbar'
import { Button } from '../components/ui'

const PANEL_TABS = [
  { id: 'light', label: 'Light' },
  { id: 'color', label: 'Color' },
  { id: 'detail', label: 'Detail' },
  { id: 'effects', label: 'Effects' },
] as const

export default function Editor() {
  const { rightPanelTab, setRightPanelTab } = useUIStore()
  const { imagePath, imageDataURL } = useEditStore()

  const hasImage = !!imagePath && !!imageDataURL

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* ── Left: Preset Strip ─────────────────────────────────────────────── */}
      <aside className="w-48 shrink-0 flex flex-col border-r border-border bg-surface-50 overflow-hidden">
        <PresetStrip />
      </aside>

      {/* ── Center: Canvas ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <Toolbar hasImage={hasImage} />
        {/* Canvas or drop zone */}
        <div className="flex-1 canvas-container overflow-hidden">
          {hasImage ? <ImageCanvas /> : <DropZone />}
        </div>
      </div>

      {/* ── Right: Adjustment Panel ────────────────────────────────────────── */}
      <aside className="w-80 shrink-0 flex flex-col border-l border-border bg-white overflow-hidden">
        {/* Panel tab bar */}
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

        {/* Panel content */}
        <div className="flex-1 overflow-y-auto">
          {!hasImage ? (
            <div className="flex items-center justify-center h-full text-text-muted">
              <p className="text-xs text-center px-6">Open a photo to start editing</p>
            </div>
          ) : (
            <>
              {rightPanelTab !== 'effects' && <AdjustmentPanel activeSection={rightPanelTab as 'light' | 'color' | 'detail'} />}
              {rightPanelTab === 'effects' && <EffectsPanel />}
            </>
          )}
        </div>
      </aside>
    </div>
  )
}
