import { useEditStore } from '../../store/editStore'
import { Slider, PanelSection } from '../ui'

type Section = 'light' | 'color' | 'detail'

interface AdjustmentPanelProps {
  activeSection: Section
}

// ─── Slider config ────────────────────────────────────────────────────────────

const LIGHT_SLIDERS = [
  { key: 'exposure',   label: 'Exposure',   min: -5,   max: 5,   step: 0.05 },
  { key: 'contrast',   label: 'Contrast',   min: -100, max: 100, step: 1 },
  { key: 'highlights', label: 'Highlights', min: -100, max: 100, step: 1 },
  { key: 'shadows',    label: 'Shadows',    min: -100, max: 100, step: 1 },
  { key: 'whites',     label: 'Whites',     min: -100, max: 100, step: 1 },
  { key: 'blacks',     label: 'Blacks',     min: -100, max: 100, step: 1 },
] as const

const COLOR_SLIDERS = [
  { key: 'temperature', label: 'Temperature', min: -100, max: 100, step: 1 },
  { key: 'tint',        label: 'Tint',        min: -100, max: 100, step: 1 },
  { key: 'vibrance',    label: 'Vibrance',    min: -100, max: 100, step: 1 },
  { key: 'saturation',  label: 'Saturation',  min: -100, max: 100, step: 1 },
] as const

const DETAIL_SLIDERS = [
  { key: 'sharpness',      label: 'Sharpness',       min: 0,    max: 100, step: 1 },
  { key: 'noiseReduction', label: 'Noise Reduction',  min: 0,    max: 100, step: 1 },
  { key: 'clarity',        label: 'Clarity',          min: -100, max: 100, step: 1 },
  { key: 'texture',        label: 'Texture',          min: -100, max: 100, step: 1 },
] as const

export default function AdjustmentPanel({ activeSection }: AdjustmentPanelProps) {
  const { params, setParam, resetParam, pushHistory } = useEditStore()

  const sliders =
    activeSection === 'light'  ? LIGHT_SLIDERS  :
    activeSection === 'color'  ? COLOR_SLIDERS  :
    DETAIL_SLIDERS

  return (
    <div className="panel-slide-right">
      <PanelSection>
        <div className="flex flex-col gap-5">
          {sliders.map((slider) => {
            const value = params[slider.key as keyof typeof params] as number
            return (
              <SliderRow
                key={slider.key}
                label={slider.label}
                value={value}
                min={slider.min}
                max={slider.max}
                step={slider.step}
                onChange={(v) => setParam(slider.key as keyof typeof params, v as never)}
                onChangeEnd={() => pushHistory()}
                onReset={() => resetParam(slider.key as keyof typeof params)}
              />
            )
          })}
        </div>
      </PanelSection>

      {/* Quick reset all */}
      <div className="px-4 pb-4">
        <button
          className="w-full text-xs text-text-muted hover:text-text-primary py-1 transition-colors"
          onClick={() => {
            sliders.forEach(s => resetParam(s.key as keyof typeof params))
          }}
        >
          Reset section
        </button>
      </div>
    </div>
  )
}

// ─── Slider row with double-click reset ───────────────────────────────────────

function SliderRow({
  label, value, min, max, step, onChange, onChangeEnd, onReset
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  onChangeEnd: () => void
  onReset: () => void
}) {
  const pct = ((value - min) / (max - min)) * 100
  const displayVal = step < 1
    ? value.toFixed(2)
    : (value > 0 ? `+${value}` : `${value}`)

  const isModified = value !== 0

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label
          className={`text-xs font-medium transition-colors cursor-pointer select-none ${isModified ? 'text-text-primary' : 'text-text-secondary'}`}
          onDoubleClick={onReset}
          title="Double-click to reset"
        >
          {label}
        </label>
        <button
          onDoubleClick={onReset}
          title="Double-click to reset"
          className={`text-xs font-mono tabular-nums text-right min-w-[36px] transition-colors cursor-default ${
            isModified ? 'text-accent font-medium' : 'text-text-muted'
          }`}
        >
          {displayVal}
        </button>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{
          background: `linear-gradient(to right, ${isModified ? '#2563eb' : '#111111'} ${pct}%, #E8E8E8 ${pct}%)`
        }}
        className="w-full"
        onChange={e => onChange(parseFloat(e.target.value))}
        onMouseUp={onChangeEnd}
        onTouchEnd={onChangeEnd}
        onDoubleClick={onReset}
      />
    </div>
  )
}
