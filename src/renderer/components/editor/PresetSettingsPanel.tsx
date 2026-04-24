import { useEditStore } from '../../store/editStore'
import { useSessionStore } from '../../store/tabStore'
import { usePresetStore } from '../../store/presetStore'

type PresetFilters = ReturnType<typeof useEditStore.getState>['params']['presetFilters']

function MonoSliderRow({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit?: string
  onChange: (value: number) => void
}) {
  const rounded = Math.abs(value) >= 10 ? value.toFixed(0) : value.toFixed(2).replace(/\.00$/, '')
  const safeRange = max - min || 1
  const pct = ((value - min) / safeRange) * 100

  return (
    <div className="rounded-full border border-border bg-white px-3 py-2 flex items-center gap-3">
      <span className="text-[11px] font-semibold text-text-secondary whitespace-nowrap min-w-[112px]">
        {label}
      </span>
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
          background: `linear-gradient(to right, #111111 ${pct}%, #E6E8F2 ${pct}%)`,
        }}
        className="flex-1 cursor-grab active:cursor-grabbing"
      />
      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface-100 text-text-primary min-w-[52px] text-right">
        {rounded}
        {unit ?? ''}
      </span>
    </div>
  )
}

export default function PresetSettingsPanel() {
  const { params, setPresetFilterParam, setPresetIntensity } = useEditStore()
  const { markActiveImageDirty } = useSessionStore()
  const { getPresetById } = usePresetStore()

  const preset = params.presetId ? getPresetById(params.presetId) : null
  if (!preset) return null

  const filterParams = params.presetFilters

  const set = (effectKey: keyof PresetFilters, paramKey: string, value: unknown) => {
    setPresetFilterParam(effectKey, paramKey, value)
    if (paramKey !== 'enabled') {
      setPresetFilterParam(effectKey, 'enabled', true)
    }
    markActiveImageDirty()
  }

  return (
    <div className="flex flex-col border-t border-border mt-1 p-2.5 gap-2 bg-[#F5F6FD]">
      <div className="flex items-center gap-2 px-3 py-2 rounded-2xl border border-border bg-white">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
          Preset Settings
        </span>
        <span className="ml-auto text-[10px] text-text-secondary font-semibold truncate max-w-[120px]">
          {preset.name}
        </span>
      </div>

      <MonoSliderRow
        label="Overall Intensity"
        value={params.presetIntensity * 100}
        min={0}
        max={100}
        step={0.1}
        unit="%"
        onChange={v => {
          setPresetIntensity(v / 100)
          markActiveImageDirty()
        }}
      />

      {filterParams.fade && (
        <>
          <MonoSliderRow
            label="Fade Black Lift"
            value={filterParams.fade.blackLift * 100}
            min={0}
            max={30}
            step={0.1}
            unit="%"
            onChange={v => set('fade', 'blackLift', v / 100)}
          />
          <MonoSliderRow
            label="Fade White Ceiling"
            value={filterParams.fade.whiteCeiling * 100}
            min={70}
            max={100}
            step={0.1}
            unit="%"
            onChange={v => set('fade', 'whiteCeiling', v / 100)}
          />
        </>
      )}

      {filterParams.grain && (
        <MonoSliderRow
          label="Grain Opacity"
          value={(filterParams.grain.opacity ?? 0) * 100}
          min={0}
          max={100}
          step={0.1}
          unit="%"
          onChange={v => set('grain', 'opacity', v / 100)}
        />
      )}

      {filterParams.vignette && (
        <MonoSliderRow
          label="Vignette Strength"
          value={filterParams.vignette.strength * 100}
          min={0}
          max={100}
          step={0.1}
          unit="%"
          onChange={v => set('vignette', 'strength', v / 100)}
        />
      )}

      {filterParams.halation && (
        <MonoSliderRow
          label="Halation Intensity"
          value={filterParams.halation.intensity * 100}
          min={0}
          max={100}
          step={0.1}
          unit="%"
          onChange={v => set('halation', 'intensity', v / 100)}
        />
      )}

      {filterParams.chromaticAberration && (
        <MonoSliderRow
          label="Chromatic Amount"
          value={filterParams.chromaticAberration.amount}
          min={0}
          max={20}
          step={0.01}
          onChange={v => set('chromaticAberration', 'amount', v)}
        />
      )}

      {filterParams.bloom && (
        <MonoSliderRow
          label="Bloom Intensity"
          value={filterParams.bloom.intensity * 100}
          min={0}
          max={100}
          step={0.1}
          unit="%"
          onChange={v => set('bloom', 'intensity', v / 100)}
        />
      )}

      {filterParams.lensDistortion && (
        <MonoSliderRow
          label="Lens Distortion"
          value={filterParams.lensDistortion.amount * 100}
          min={-100}
          max={100}
          step={0.1}
          unit="%"
          onChange={v => set('lensDistortion', 'amount', v / 100)}
        />
      )}

      {filterParams.lightLeak && (
        <MonoSliderRow
          label="Light Leak Opacity"
          value={filterParams.lightLeak.opacity * 100}
          min={0}
          max={100}
          step={0.1}
          unit="%"
          onChange={v => set('lightLeak', 'opacity', v / 100)}
        />
      )}

      {filterParams.dustScratches && (
        <MonoSliderRow
          label="Dust Opacity"
          value={(filterParams.dustScratches.opacity ?? 0) * 100}
          min={0}
          max={100}
          step={0.1}
          unit="%"
          onChange={v => set('dustScratches', 'opacity', v / 100)}
        />
      )}

      {filterParams.border && (
        <MonoSliderRow
          label="Border Width"
          value={(filterParams.border.width ?? 0.04) * 200}
          min={0}
          max={60}
          step={0.1}
          onChange={v => set('border', 'width', v / 200)}
        />
      )}
    </div>
  )
}
