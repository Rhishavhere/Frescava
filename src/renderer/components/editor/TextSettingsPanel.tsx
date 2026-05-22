import { useEditStore } from '../../store/editStore'
import { useSessionStore } from '../../store/tabStore'
import { Toggle, Slider, PanelSection } from '../ui'

const FONT_FAMILIES = [
  { value: 'sans-serif', label: 'Sans Serif (Default)' },
  { value: 'serif', label: 'Serif (Default)' },
  { value: 'system-ui', label: 'System UI' },
  { value: 'CoffekanRegular', label: 'Coffekan (Local)' },
  { value: 'KenokyLight', label: 'Kenoky Light (Local)' },
  { value: 'Inter', label: 'Inter' },
  { value: 'Montserrat', label: 'Montserrat' },
  { value: 'Outfit', label: 'Outfit' },
  { value: 'Syncopate', label: 'Syncopate' },
  { value: 'Playfair Display', label: 'Playfair Display' },
  { value: 'Cormorant Garamond', label: 'Cormorant Garamond' },
  { value: 'Cinzel', label: 'Cinzel' },
  { value: 'Bodoni Moda', label: 'Bodoni Moda' },
  { value: 'Prata', label: 'Prata' },
  { value: 'Pinyon Script', label: 'Pinyon Script (Cursive)' }
]

const QUICK_COLORS = [
  { value: '#FFFFFF', name: 'White' },
  { value: '#E4E4E7', name: 'Light Gray' },
  { value: '#A1A1AA', name: 'Gray' },
  { value: '#52525B', name: 'Dark Gray' },
  { value: '#18181B', name: 'Black' },
  { value: '#F5F5DC', name: 'Beige' },
  { value: '#D4EBF2', name: 'Soft Blue' },
  { value: '#FFD6D6', name: 'Soft Red' }
]

export default function TextSettingsPanel() {
  const { params, updateTextLayer, removeTextLayer, pushHistory } = useEditStore()
  const { markActiveImageDirty } = useSessionStore()
  const activeTextId = params.activeTextId
  const activeLayer = params.textLayers.find(l => l.id === activeTextId)

  const handleUpdate = (updates: any) => {
    if (!activeTextId) return
    updateTextLayer(activeTextId, updates)
    markActiveImageDirty()
  }

  const handleUpdateEnd = () => {
    pushHistory()
  }

  if (!activeLayer) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center text-text-muted dark:text-zinc-500">
        <svg className="w-8 h-8 mb-3 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 7.5h9M12 7.5v12m-3 0h6m-11-13.5a1.5 1.5 0 011.5-1.5h15A1.5 1.5 0 0121 4.5v15a1.5 1.5 0 01-1.5 1.5h-15a1.5 1.5 0 01-1.5-1.5v-15z" />
        </svg>
        <p className="text-xs font-medium">No selected text layer</p>
        <p className="text-[11px] mt-1 max-w-[12rem] leading-relaxed">Select a layer on the canvas or click a template/custom layer on the left side to customize.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col divide-y divide-border dark:divide-zinc-800/80 panel-slide-right overflow-y-auto max-h-full pb-8 right-panel-scroll">
      
      {/* ── Content Text & Remove ── */}
      <PanelSection title="Text Content">
        <div className="flex flex-col gap-2">
          <textarea
            value={activeLayer.text}
            onChange={(e) => handleUpdate({ text: e.target.value })}
            onBlur={handleUpdateEnd}
            rows={2}
            className="w-full text-xs px-2.5 py-2 rounded-lg border border-border dark:border-zinc-800 bg-surface-50 dark:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:text-zinc-100 font-sans"
            placeholder="Type your text..."
          />
          <button
            onClick={() => removeTextLayer(activeLayer.id)}
            className="w-full py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400 border border-red-100 dark:border-red-900/40 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
          >
            Remove Layer
          </button>
        </div>
      </PanelSection>

      {/* ── Typography Styling ── */}
      <PanelSection title="Font & Style">
        <div className="flex flex-col gap-3.5">
          {/* Font Family */}
          <div>
            <label className="text-[11px] text-text-muted dark:text-zinc-500 mb-1 block">Font Family</label>
            <select
              value={activeLayer.fontFamily}
              onChange={(e) => {
                handleUpdate({ fontFamily: e.target.value })
                handleUpdateEnd()
              }}
              className="w-full text-xs px-2 py-1.5 rounded-lg border border-border dark:border-zinc-800 bg-surface-50 dark:bg-zinc-900 dark:text-zinc-100 focus:outline-none"
            >
              {FONT_FAMILIES.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Weight */}
            <div>
              <label className="text-[11px] text-text-muted dark:text-zinc-500 mb-1 block">Weight</label>
              <select
                value={activeLayer.fontWeight}
                onChange={(e) => {
                  handleUpdate({ fontWeight: e.target.value })
                  handleUpdateEnd()
                }}
                className="w-full text-xs px-2 py-1.5 rounded-lg border border-border dark:border-zinc-800 bg-surface-50 dark:bg-zinc-900 dark:text-zinc-100 focus:outline-none"
              >
                {['300', '400', '500', '700', '900'].map(w => (
                  <option key={w} value={w}>
                    {w === '300' ? 'Light (300)' : w === '400' ? 'Regular (400)' : w === '500' ? 'Medium (500)' : w === '700' ? 'Bold (700)' : 'Heavy (900)'}
                  </option>
                ))}
              </select>
            </div>

            {/* Font Style */}
            <div>
              <label className="text-[11px] text-text-muted dark:text-zinc-500 mb-1 block">Style</label>
              <div className="flex rounded-lg border border-border dark:border-zinc-800 p-0.5 bg-surface-50 dark:bg-zinc-900">
                {(['normal', 'italic'] as const).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      handleUpdate({ fontStyle: s })
                      handleUpdateEnd()
                    }}
                    className={`flex-1 py-1 rounded-md text-[10px] font-semibold capitalize transition-colors ${
                      activeLayer.fontStyle === s
                        ? 'bg-white dark:bg-zinc-800 text-text-primary dark:text-zinc-100 shadow-sm'
                        : 'text-text-muted dark:text-zinc-400 hover:text-text-primary'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Alignment */}
            <div>
              <label className="text-[11px] text-text-muted dark:text-zinc-500 mb-1 block">Alignment</label>
              <div className="flex rounded-lg border border-border dark:border-zinc-800 p-0.5 bg-surface-50 dark:bg-zinc-900">
                {(['left', 'center', 'right'] as const).map(align => (
                  <button
                    key={align}
                    type="button"
                    onClick={() => {
                      handleUpdate({ alignment: align })
                      handleUpdateEnd()
                    }}
                    className={`flex-1 py-1 rounded-md text-[10px] font-semibold capitalize transition-colors ${
                      activeLayer.alignment === align
                        ? 'bg-white dark:bg-zinc-800 text-text-primary dark:text-zinc-100 shadow-sm'
                        : 'text-text-muted dark:text-zinc-400 hover:text-text-primary'
                    }`}
                  >
                    {align}
                  </button>
                ))}
              </div>
            </div>

            {/* Text Case */}
            <div>
              <label className="text-[11px] text-text-muted dark:text-zinc-500 mb-1 block">Text Case</label>
              <select
                value={activeLayer.textCase || 'none'}
                onChange={(e) => {
                  handleUpdate({ textCase: e.target.value })
                  handleUpdateEnd()
                }}
                className="w-full text-xs px-2 py-1.5 rounded-lg border border-border dark:border-zinc-800 bg-surface-50 dark:bg-zinc-900 dark:text-zinc-100 focus:outline-none"
              >
                <option value="none">As Typed</option>
                <option value="uppercase">ALL CAPS</option>
                <option value="lowercase">lowercase</option>
              </select>
            </div>
          </div>
        </div>
      </PanelSection>

      {/* ── Spacing & Layout ── */}
      <PanelSection title="Layout & Scale">
        <div className="flex flex-col gap-4">
          <Slider
            label="Font Size"
            value={activeLayer.fontSize}
            min={0.5}
            max={20}
            step={0.1}
            unit="%"
            onChange={(v) => handleUpdate({ fontSize: v })}
            onChangeEnd={handleUpdateEnd}
          />
          <Slider
            label="Letter Spacing"
            value={activeLayer.letterSpacing || 0}
            min={-0.1}
            max={0.8}
            step={0.01}
            unit="em"
            onChange={(v) => handleUpdate({ letterSpacing: v })}
            onChangeEnd={handleUpdateEnd}
          />
          <Slider
            label="Line Height"
            value={activeLayer.lineHeight || 1.2}
            min={0.8}
            max={2.5}
            step={0.05}
            unit="em"
            onChange={(v) => handleUpdate({ lineHeight: v })}
            onChangeEnd={handleUpdateEnd}
          />
          <Slider
            label="Opacity"
            value={Math.round((activeLayer.opacity !== undefined ? activeLayer.opacity : 1.0) * 100)}
            min={0}
            max={100}
            step={1}
            unit="%"
            onChange={(v) => handleUpdate({ opacity: v / 100 })}
            onChangeEnd={handleUpdateEnd}
          />
        </div>
      </PanelSection>

      {/* ── Color Pickers ── */}
      <PanelSection title="Text Color">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-secondary dark:text-zinc-400 flex-1">Hex Code</span>
            <input
              type="text"
              value={activeLayer.color}
              onChange={(e) => handleUpdate({ color: e.target.value })}
              onBlur={handleUpdateEnd}
              className="w-20 text-xs text-right font-mono px-1.5 py-1 rounded bg-surface-50 dark:bg-zinc-900 border border-border dark:border-zinc-800 dark:text-zinc-100"
            />
            <input
              type="color"
              value={activeLayer.color.startsWith('#') && activeLayer.color.length === 7 ? activeLayer.color : '#FFFFFF'}
              onChange={(e) => handleUpdate({ color: e.target.value })}
              onBlur={handleUpdateEnd}
              className="w-7 h-6 rounded border border-border dark:border-zinc-800 cursor-pointer overflow-hidden p-0 bg-transparent"
            />
          </div>
          {/* Quick aesthetic colors grid */}
          <div className="grid grid-cols-8 gap-1.5 mt-1">
            {QUICK_COLORS.map(c => (
              <button
                key={c.value}
                type="button"
                onClick={() => {
                  handleUpdate({ color: c.value })
                  handleUpdateEnd()
                }}
                title={c.name}
                className={`w-full aspect-square rounded border transition-transform hover:scale-105 active:scale-95 ${
                  activeLayer.color.toLowerCase() === c.value.toLowerCase()
                    ? 'border-indigo-500 scale-105 ring-1 ring-indigo-500/20'
                    : 'border-border dark:border-zinc-700/80'
                }`}
                style={{ backgroundColor: c.value }}
              />
            ))}
          </div>
        </div>
      </PanelSection>

      {/* ── Background Border / Pill ── */}
      <PanelSection>
        <div className="flex items-center justify-between mb-3.5">
          <span className={`text-xs font-semibold transition-colors ${activeLayer.border?.enabled ? 'text-text-primary dark:text-zinc-100' : 'text-text-muted dark:text-zinc-500'}`}>
            Pill / Border Frame
          </span>
          <Toggle
            checked={!!activeLayer.border?.enabled}
            onChange={(checked) => {
              const border = activeLayer.border || {
                enabled: false,
                type: 'pill',
                paddingX: 3.0,
                paddingY: 1.0,
                color: '#FFFFFF',
                width: 1
              }
              handleUpdate({ border: { ...border, enabled: checked } })
              handleUpdateEnd()
            }}
          />
        </div>
        {activeLayer.border?.enabled && (
          <div className="flex flex-col gap-4 panel-slide-right pt-1">
            {/* Border Type */}
            <div>
              <span className="text-[11px] text-text-muted dark:text-zinc-500 mb-1 block">Shape</span>
              <div className="flex rounded-lg border border-border dark:border-zinc-800 p-0.5 bg-surface-50 dark:bg-zinc-900">
                {(['pill', 'oval', 'rect'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      handleUpdate({ border: { ...activeLayer.border!, type: t } })
                      handleUpdateEnd()
                    }}
                    className={`flex-1 py-1 rounded-md text-[10px] font-semibold capitalize transition-colors ${
                      activeLayer.border?.type === t
                        ? 'bg-white dark:bg-zinc-800 text-text-primary dark:text-zinc-100 shadow-sm'
                        : 'text-text-muted dark:text-zinc-400 hover:text-text-primary'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Padding X */}
            <Slider
              label="Padding X"
              value={activeLayer.border.paddingX}
              min={0}
              max={15}
              step={0.1}
              unit="%"
              onChange={(v) => handleUpdate({ border: { ...activeLayer.border!, paddingX: v } })}
              onChangeEnd={handleUpdateEnd}
            />

            {/* Padding Y */}
            <Slider
              label="Padding Y"
              value={activeLayer.border.paddingY}
              min={0}
              max={15}
              step={0.1}
              unit="%"
              onChange={(v) => handleUpdate({ border: { ...activeLayer.border!, paddingY: v } })}
              onChangeEnd={handleUpdateEnd}
            />

            {/* Border Color */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-secondary dark:text-zinc-400 flex-1">Frame Color</span>
              <input
                type="text"
                value={activeLayer.border.color || '#FFFFFF'}
                onChange={(e) => handleUpdate({ border: { ...activeLayer.border!, color: e.target.value } })}
                onBlur={handleUpdateEnd}
                className="w-20 text-xs text-right font-mono px-1.5 py-1 rounded bg-surface-50 dark:bg-zinc-900 border border-border dark:border-zinc-800 dark:text-zinc-100"
              />
              <input
                type="color"
                value={activeLayer.border.color?.startsWith('#') && activeLayer.border.color.length === 7 ? activeLayer.border.color : '#FFFFFF'}
                onChange={(e) => handleUpdate({ border: { ...activeLayer.border!, color: e.target.value } })}
                onBlur={handleUpdateEnd}
                className="w-7 h-6 rounded border border-border dark:border-zinc-800 cursor-pointer overflow-hidden p-0 bg-transparent"
              />
            </div>
            {/* Quick border color presets */}
            <div className="grid grid-cols-8 gap-1.5">
              {QUICK_COLORS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => {
                    handleUpdate({ border: { ...activeLayer.border!, color: c.value } })
                    handleUpdateEnd()
                  }}
                  title={c.name}
                  className={`w-full aspect-square rounded border transition-transform hover:scale-105 active:scale-95 ${
                    activeLayer.border?.color?.toLowerCase() === c.value.toLowerCase()
                      ? 'border-indigo-500 scale-105 ring-1 ring-indigo-500/20'
                      : 'border-border dark:border-zinc-700/80'
                  }`}
                  style={{ backgroundColor: c.value }}
                />
              ))}
            </div>
          </div>
        )}
      </PanelSection>

      {/* ── Star Sparkles Deco ── */}
      <PanelSection>
        <div className="flex items-center justify-between">
          <span className={`text-xs font-semibold transition-colors ${activeLayer.decoLeftRight === 'star' ? 'text-text-primary dark:text-zinc-100' : 'text-text-muted dark:text-zinc-500'}`}>
            Editorial Star Sparkles
          </span>
          <Toggle
            checked={activeLayer.decoLeftRight === 'star'}
            onChange={(checked) => {
              handleUpdate({ decoLeftRight: checked ? 'star' : 'none' })
              handleUpdateEnd()
            }}
          />
        </div>
        {activeLayer.decoLeftRight === 'star' && (
          <p className="text-[10px] text-text-muted dark:text-zinc-500 mt-1.5 leading-relaxed">
            Renders two starry flourishes on the left and right sides of this text layer. Keep size large enough and text aligned to center for best alignment.
          </p>
        )}
      </PanelSection>

    </div>
  )
}
