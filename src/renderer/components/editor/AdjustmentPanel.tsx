import { useEditStore } from '../../store/editStore'
import { useSessionStore } from '../../store/tabStore'
import { PanelSection } from '../ui'
import AdvancedAdjustmentsSection from './AdvancedAdjustmentsSection'
import {
  AdjustmentSliderRow,
  type AdjustmentSliderVariant,
} from './AdjustmentSliderRow'

/** Light tab = former Light + Color; Detail unchanged. */
type Section = 'light' | 'detail'

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

/** Combined Light panel (tonality + chroma). Order: exposure…blacks, then temp…saturation. */
const LIGHT_PANEL_SLIDERS = [...LIGHT_SLIDERS, ...COLOR_SLIDERS] as const

const DETAIL_SLIDERS = [
  { key: 'sharpness',      label: 'Sharpness',       min: 0,    max: 100, step: 1 },
  { key: 'noiseReduction', label: 'Noise Reduction',  min: 0,    max: 100, step: 1 },
  { key: 'clarity',        label: 'Clarity',          min: -100, max: 100, step: 1 },
  { key: 'texture',        label: 'Texture',          min: -100, max: 100, step: 1 },
  { key: 'lensBlur',       label: 'Lens Blur',        min: 0,    max: 100, step: 1 },
] as const

type SliderParamKey =
  | (typeof LIGHT_PANEL_SLIDERS)[number]['key']
  | (typeof DETAIL_SLIDERS)[number]['key']

/** Fallback when no per-slider override is set */
const DEFAULT_ADJUSTMENT_SLIDER_VARIANT: Record<Section, AdjustmentSliderVariant> = {
  light: 'pill',
  detail: 'line',
}

/**
 * Per-parameter style overrides — former Color sliders stay line sliders by default.
 */
export const ADJUSTMENT_SLIDER_VARIANT_OVERRIDES: Partial<
  Record<SliderParamKey, AdjustmentSliderVariant>
> = {
  temperature: 'line',
  tint: 'line',
  vibrance: 'line',
  saturation: 'line',
}

type SliderDef =
  | (typeof LIGHT_SLIDERS)[number]
  | (typeof COLOR_SLIDERS)[number]
  | (typeof DETAIL_SLIDERS)[number]

export default function AdjustmentPanel({ activeSection }: AdjustmentPanelProps) {
  const { params, setParam, resetParam, pushHistory } = useEditStore()
  const { markActiveImageDirty } = useSessionStore()

  const sliders = activeSection === 'light' ? LIGHT_PANEL_SLIDERS : DETAIL_SLIDERS
  const sectionDefault = DEFAULT_ADJUSTMENT_SLIDER_VARIANT[activeSection]

  const sliderRow = (slider: SliderDef) => {
    const value = params[slider.key as keyof typeof params] as number
    const variant =
      ADJUSTMENT_SLIDER_VARIANT_OVERRIDES[slider.key as SliderParamKey] ?? sectionDefault

    return (
      <AdjustmentSliderRow
        key={slider.key}
        variant={variant}
        label={slider.label}
        value={value}
        min={slider.min}
        max={slider.max}
        step={slider.step}
        onChange={(v) => {
          setParam(slider.key as keyof typeof params, v as never)
          markActiveImageDirty()
        }}
        onChangeEnd={() => pushHistory()}
        onReset={() => {
          resetParam(slider.key as keyof typeof params)
          markActiveImageDirty()
        }}
      />
    )
  }

  return (
    <div className="panel-slide-right">
      <PanelSection>
        {activeSection === 'light' ? (
          <div className="flex flex-col">
            <div className="grid grid-cols-2 gap-x-3 gap-y-3">
              {LIGHT_SLIDERS.map(slider => sliderRow(slider))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-5">
              {COLOR_SLIDERS.map(slider => sliderRow(slider))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {DETAIL_SLIDERS.map(slider => sliderRow(slider))}
          </div>
        )}
      </PanelSection>

      <div className="px-4 pb-2 border-t border-border/60 dark:border-zinc-800/50 pt-3">
        <AdvancedAdjustmentsSection />
      </div>

      <div className="px-4 pb-4">
        <button
          className="w-full text-xs text-text-muted dark:text-zinc-500 hover:text-text-primary dark:hover:text-zinc-200 py-1 transition-colors"
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
