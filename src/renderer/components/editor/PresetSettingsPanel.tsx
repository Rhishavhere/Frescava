import { useEditStore } from '../../store/editStore'
import { useSessionStore } from '../../store/tabStore'
import { usePresetStore } from '../../store/presetStore'

type PresetFilters = ReturnType<typeof useEditStore.getState>['params']['presetFilters']

type NumericControlProps = {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit?: string
  accent: string
  onChange: (value: number) => void
}

function toHexColor(hex: string) {
  const match = /^#([0-9a-fA-F]{6})$/.exec(hex)
  return match ? hex : '#4F46E5'
}

function PillSwitch({
  value,
  onChange,
  accent,
}: {
  value: boolean
  onChange: () => void
  accent: string
}) {
  return (
    <button
      onClick={onChange}
      className="inline-flex items-center rounded-full p-0.5 border border-border bg-white transition-all duration-150"
      style={{ boxShadow: value ? `0 0 0 1px ${accent}22` : undefined }}
    >
      <span
        className={`px-2 py-1 text-[10px] font-semibold rounded-full transition-colors ${
          value ? 'text-white' : 'text-text-muted'
        }`}
        style={{ background: value ? accent : 'transparent' }}
      >
        ON
      </span>
      <span
        className={`px-2 py-1 text-[10px] font-semibold rounded-full transition-colors ${
          !value ? 'text-text-primary bg-surface-100' : 'text-text-muted'
        }`}
      >
        OFF
      </span>
    </button>
  )
}

function PillStepper({
  label,
  value,
  min,
  max,
  step,
  unit,
  accent,
  onChange,
}: NumericControlProps) {
  const rounded = step < 1 ? value.toFixed(2) : Math.round(value).toString()
  const safeRange = max - min || 1
  const pct = ((value - min) / safeRange) * 100

  return (
    <div className="rounded-2xl border border-border bg-white/90 px-3 py-2.5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold text-text-secondary">{label}</span>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface-100 text-text-primary">
          {rounded}
          {unit ?? ''}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{
          height: 8,
          borderRadius: 999,
          background: `linear-gradient(to right, ${accent} ${pct}%, #E6E8F2 ${pct}%)`,
        }}
        className="w-full cursor-grab active:cursor-grabbing"
      />
    </div>
  )
}

function EffectRow({
  label,
  enabled,
  onToggle,
  accent,
  children,
}: {
  label: string
  enabled: boolean
  onToggle: () => void
  accent: string
  children?: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-border bg-[#FBFBFD] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2.5 bg-white/70">
        <span className="text-[11px] font-semibold text-text-primary">{label}</span>
        <PillSwitch value={enabled} onChange={onToggle} accent={accent} />
      </div>
      {enabled && children && (
        <div className="px-3 pb-3 flex flex-col gap-2.5">
          {children}
        </div>
      )}
    </div>
  )
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export default function PresetSettingsPanel() {
  const { params, setPresetFilterParam, setPresetIntensity } = useEditStore()
  const { markActiveImageDirty } = useSessionStore()
  const { getPresetById } = usePresetStore()

  const preset = params.presetId ? getPresetById(params.presetId) : null

  // Return nothing if no preset is active
  if (!preset) return null

  const accent = preset.ui.accentColor ?? '#555'
  const accentHex = toHexColor(accent)
  const filterParams = params.presetFilters

  const set = (effectKey: keyof PresetFilters, paramKey: string, value: unknown) => {
    setPresetFilterParam(effectKey, paramKey, value)
    markActiveImageDirty()
  }

  const toggle = (effectKey: keyof PresetFilters) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const current = (filterParams as any)[effectKey]?.enabled ?? false
    set(effectKey, 'enabled', !current)
  }

  return (
    <div className="flex flex-col border-t border-border mt-1 p-2.5 gap-2.5 bg-[#F5F6FD]">

      <div className="flex items-center gap-2 px-3 py-2 rounded-2xl border border-border bg-white">
        <div
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: accentHex }}
        />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
          Preset Modifiers
        </span>
        <span className="ml-auto text-[10px] text-text-secondary font-semibold truncate max-w-[110px]">
          {preset.name}
        </span>
      </div>

      <div className="rounded-2xl border border-border bg-[#FBFBFD] p-3">
        <PillStepper
          label="Overall Intensity"
          value={Math.round(params.presetIntensity * 100)}
          min={Math.round((preset.ui.intensityMin ?? 0) * 100)}
          max={100}
          step={5}
          unit="%"
          accent={accentHex}
          onChange={v => {
            setPresetIntensity(v / 100)
            markActiveImageDirty()
          }}
        />
      </div>

      {filterParams.fade && (
        <EffectRow label="Fade / Matte" enabled={filterParams.fade.enabled} onToggle={() => toggle('fade')} accent={accentHex}>
          <PillStepper
            label="Black Lift"
            value={Math.round(filterParams.fade.blackLift * 100)}
            min={0}
            max={30}
            step={1}
            unit="%"
            accent={accentHex}
            onChange={v => set('fade', 'blackLift', v / 100)}
          />
          <PillStepper
            label="White Ceiling"
            value={Math.round(filterParams.fade.whiteCeiling * 100)}
            min={70}
            max={100}
            step={1}
            unit="%"
            accent={accentHex}
            onChange={v => set('fade', 'whiteCeiling', v / 100)}
          />
        </EffectRow>
      )}

      {filterParams.grain && (
        <EffectRow label="Film Grain" enabled={filterParams.grain.enabled} onToggle={() => toggle('grain')} accent={accentHex}>
          {filterParams.grain.textureFile ? (
            <p className="text-[10px] font-mono text-text-muted bg-surface-100 px-2 py-1 rounded-full truncate">
              {filterParams.grain.textureFile}
            </p>
          ) : (
            <p className="text-[10px] text-text-muted italic">No texture file in preset folder</p>
          )}
          <PillStepper
            label="Opacity"
            value={Math.round((filterParams.grain.opacity ?? 0) * 100)}
            min={0}
            max={100}
            step={5}
            unit="%"
            accent={accentHex}
            onChange={v => set('grain', 'opacity', v / 100)}
          />
        </EffectRow>
      )}

      {filterParams.vignette && (
        <EffectRow label="Vignette" enabled={filterParams.vignette.enabled} onToggle={() => toggle('vignette')} accent={accentHex}>
          <PillStepper
            label="Strength"
            value={Math.round(filterParams.vignette.strength * 100)}
            min={0}
            max={100}
            step={5}
            unit="%"
            accent={accentHex}
            onChange={v => set('vignette', 'strength', v / 100)}
          />
        </EffectRow>
      )}

      {filterParams.halation && (
        <EffectRow label="Halation" enabled={filterParams.halation.enabled} onToggle={() => toggle('halation')} accent={accentHex}>
          <PillStepper
            label="Intensity"
            value={Math.round(filterParams.halation.intensity * 100)}
            min={0}
            max={100}
            step={5}
            unit="%"
            accent={accentHex}
            onChange={v => set('halation', 'intensity', v / 100)}
          />
        </EffectRow>
      )}

      {filterParams.chromaticAberration && (
        <EffectRow label="Chromatic Aberration" enabled={filterParams.chromaticAberration.enabled}
          onToggle={() => toggle('chromaticAberration')} accent={accentHex}>
          <PillStepper
            label="Amount"
            value={Math.round(filterParams.chromaticAberration.amount)}
            min={0}
            max={20}
            step={1}
            accent={accentHex}
            onChange={v => set('chromaticAberration', 'amount', v)}
          />
        </EffectRow>
      )}

      {filterParams.bloom && (
        <EffectRow label="Bloom" enabled={filterParams.bloom.enabled} onToggle={() => toggle('bloom')} accent={accentHex}>
          <PillStepper
            label="Intensity"
            value={Math.round(filterParams.bloom.intensity * 100)}
            min={0}
            max={100}
            step={5}
            unit="%"
            accent={accentHex}
            onChange={v => set('bloom', 'intensity', v / 100)}
          />
        </EffectRow>
      )}

      {filterParams.lensDistortion && (
        <EffectRow label="Lens Distortion" enabled={filterParams.lensDistortion.enabled}
          onToggle={() => toggle('lensDistortion')} accent={accentHex}>
          <PillStepper
            label="Amount"
            value={Math.round(filterParams.lensDistortion.amount * 100)}
            min={-100}
            max={100}
            step={5}
            unit="%"
            accent={accentHex}
            onChange={v => set('lensDistortion', 'amount', v / 100)}
          />
        </EffectRow>
      )}

      {filterParams.lightLeak && (
        <EffectRow label="Light Leak" enabled={filterParams.lightLeak.enabled} onToggle={() => toggle('lightLeak')} accent={accentHex}>
          {filterParams.lightLeak.textureFile ? (
            <p className="text-[10px] font-mono text-text-muted bg-surface-100 px-2 py-1 rounded-full truncate">
              {filterParams.lightLeak.textureFile}
            </p>
          ) : (
            <p className="text-[10px] text-text-muted italic">No texture file in preset folder</p>
          )}
          <PillStepper
            label="Opacity"
            value={Math.round(filterParams.lightLeak.opacity * 100)}
            min={0}
            max={100}
            step={5}
            unit="%"
            accent={accentHex}
            onChange={v => set('lightLeak', 'opacity', v / 100)}
          />
        </EffectRow>
      )}

      {filterParams.dustScratches && (
        <EffectRow label="Dust & Scratches" enabled={filterParams.dustScratches?.enabled ?? false}
          onToggle={() => toggle('dustScratches')} accent={accentHex}>
          {filterParams.dustScratches?.textureFile ? (
            <p className="text-[10px] font-mono text-text-muted bg-surface-100 px-2 py-1 rounded-full truncate">
              {filterParams.dustScratches.textureFile}
            </p>
          ) : (
            <p className="text-[10px] text-text-muted italic">No texture file in preset folder</p>
          )}
          <PillStepper
            label="Opacity"
            value={Math.round((filterParams.dustScratches?.opacity ?? 0) * 100)}
            min={0}
            max={100}
            step={5}
            unit="%"
            accent={accentHex}
            onChange={v => set('dustScratches', 'opacity', v / 100)}
          />
        </EffectRow>
      )}

      {filterParams.border && (
        <EffectRow label="Border" enabled={filterParams.border.enabled} onToggle={() => toggle('border')} accent={accentHex}>
          <PillStepper
            label="Width"
            value={Math.round((filterParams.border.width ?? 0.04) * 200)}
            min={0}
            max={60}
            step={1}
            accent={accentHex}
            onChange={v => set('border', 'width', v / 200)}
          />
        </EffectRow>
      )}

      {preset.ui.bestFor && preset.ui.bestFor.length > 0 && (
        <div className="px-3 py-2.5 rounded-2xl border border-border bg-white/80">
          <p className="text-[9px] uppercase tracking-wider text-text-muted mb-1.5">Best for</p>
          <div className="flex flex-wrap gap-1">
            {preset.ui.bestFor.map(tag => (
              <span
                key={tag}
                className="text-[10px] px-2 py-1 rounded-full bg-surface-50 border border-border text-text-secondary"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
