import { useEditStore } from '../../store/editStore'
import { useSessionStore } from '../../store/tabStore'
import { usePresetStore } from '../../store/presetStore'
import { Slider } from '../ui'
import type {
  PresetEffectState,
  FadeParams,
  VignetteParams,
  HalationParams,
  CaParams,
  BloomParams,
  LensDistortionParams,
  LightLeakParams,
  DustScratchesParams,
  BorderParams,
} from '@shared/types'

const EFFECT_ORDER: (keyof PresetEffectState)[] = [
  'grain',
  'vignette',
  'fade',
  'halation',
  'bloom',
  'chromaticAberration',
  'lightLeak',
  'dustScratches',
  'lensDistortion',
  'border',
]

const EFFECT_LABEL: Record<keyof PresetEffectState, string> = {
  fade: 'Fade',
  grain: 'Grain',
  vignette: 'Vignette',
  halation: 'Halation',
  chromaticAberration: 'Chrom. Ab.',
  bloom: 'Bloom',
  lensDistortion: 'Lens',
  lightLeak: 'Light Leak',
  dustScratches: 'Dust',
  border: 'Border',
}

type PresetFilters = NonNullable<ReturnType<typeof useEditStore.getState>['params']>['presetFilters']

function sortedPresetFilterKeys(fp: PresetEffectState): (keyof PresetEffectState)[] {
  const present = (Object.keys(fp) as (keyof PresetEffectState)[]).filter(k => fp[k] != null)
  return present.sort(
    (a, b) => EFFECT_ORDER.indexOf(a) - EFFECT_ORDER.indexOf(b) || String(a).localeCompare(String(b))
  )
}

function formatPresetEffectValue(
  key: keyof PresetEffectState,
  block: PresetEffectState[keyof PresetEffectState] | null | undefined
): string {
  if (!block || typeof block !== 'object') return '—'
  if (!(block as { enabled?: boolean }).enabled) return 'off'

  const pct = (n: number) => `${Math.round(n * 100)}%`
  const pct1 = (n: number) => `${Math.round(n * 1000) / 10}%`

  switch (key) {
    case 'fade': {
      const f = block as FadeParams
      return `${Math.round((f.blackLift ?? 0) * 100)}% · ${Math.round((f.whiteCeiling ?? 1) * 100)}%`
    }
    case 'grain': {
      const g = block as DustScratchesParams
      return pct1(g.opacity ?? 0)
    }
    case 'vignette': {
      const v = block as VignetteParams
      return pct(v.strength ?? 0)
    }
    case 'halation': {
      const h = block as HalationParams
      return pct(h.intensity ?? 0)
    }
    case 'bloom': {
      const b = block as BloomParams
      return pct(b.intensity ?? 0)
    }
    case 'chromaticAberration': {
      const c = block as CaParams
      return `${Math.round(c.amount ?? 0)}`
    }
    case 'lensDistortion': {
      const l = block as LensDistortionParams
      const a = l.amount ?? 0
      return `${a >= 0 ? '+' : ''}${Math.round(a * 100)}%`
    }
    case 'lightLeak': {
      const ll = block as LightLeakParams
      return pct1(ll.opacity ?? 0)
    }
    case 'dustScratches': {
      const d = block as DustScratchesParams
      return pct1(d.opacity ?? 0)
    }
    case 'border': {
      const br = block as BorderParams
      if (br.type) return br.type
      return br.textureFile ? 'texture' : `${Math.round((br.width ?? 0) * 100)}% w`
    }
    default:
      return '—'
  }
}

function PresetEffectCard({
  label,
  enabled,
  valueText,
  onToggle,
}: {
  label: string
  enabled: boolean
  valueText: string
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative text-left rounded-md border transition-colors pl-1.5 pr-5 py-1 min-h-[2.35rem] sm:min-h-[2.5rem] ${
        enabled
          ? 'bg-surface-100 border-border'
          : 'bg-surface-50/90 border-border'
      }`}
    >
      <span
        className={`text-[12px] leading-tight pr-0.5 block ${
          enabled ? 'text-text-primary' : 'text-text-muted'
        }`}
      >
        {label}
      </span>
      <span
        className={`mt-2 block text-[9px] font-mono leading-none tracking-tight pl-0.5 pr-0.5 truncate ${
          enabled ? 'text-text-secondary' : 'text-text-muted'
        }`}
        title={valueText}
      >
        {valueText}
      </span>
      <span
        className="absolute top-1 right-1.5 flex h-1.5 w-1.5 items-center justify-center"
        aria-hidden
      >
        {enabled ? (
          <span className="h-1.5 w-1.5 rounded-full bg-text-primary" />
        ) : (
          <span className="h-1.5 w-1.5 rounded-full border border-surface-300 bg-white" />
        )}
      </span>
    </button>
  )
}

export default function PresetSettingsPanel() {
  const { params, setPresetFilterParam, setPresetIntensity, pushHistory } = useEditStore()
  const { markActiveImageDirty } = useSessionStore()
  const { getPresetById } = usePresetStore()

  const preset = params.presetId ? getPresetById(params.presetId) : null
  if (!preset) return null

  const filterParams = params.presetFilters as PresetFilters
  const keys = sortedPresetFilterKeys(filterParams)
  const intensityPct = params.presetIntensity * 100

  const setEnabled = (effectKey: keyof PresetEffectState, value: boolean) => {
    setPresetFilterParam(effectKey, 'enabled', value)
    markActiveImageDirty()
  }

  const resetAllPresetEffects = () => {
    for (const k of keys) {
      setPresetFilterParam(k, 'enabled', false)
    }
    markActiveImageDirty()
  }

  return (
    <div className="flex flex-col pt-2.5 px-4 pb-3 gap-3 mb-20">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
          Preset effects
        </span>
        <button
          type="button"
          onClick={resetAllPresetEffects}
          className="text-[10px] font-medium uppercase tracking-wider text-text-muted hover:text-text-primary"
        >
          Reset all
        </button>
      </div>
      <div className="h-px w-full bg-border" />
      
      <Slider
        label="Overall intensity"
        value={Math.round(intensityPct * 10) / 10}
        min={0}
        max={100}
        step={0.1}
        unit="%"
        onChange={v => {
          setPresetIntensity(v / 100)
          markActiveImageDirty()
        }}
        onChangeEnd={() => {
          pushHistory()
        }}
      />

      {keys.length > 0 && (
        <>
          
          <div className="grid grid-cols-2 gap-1 sm:gap-1.5">
            {keys.map((key) => {
              const block = filterParams[key]
              if (!block) return null
              const enabled = !!(block as { enabled?: boolean }).enabled
              return (
                <PresetEffectCard
                  key={String(key)}
                  label={EFFECT_LABEL[key]}
                  enabled={enabled}
                  valueText={formatPresetEffectValue(key, block)}
                  onToggle={() => setEnabled(key, !enabled)}
                />
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
