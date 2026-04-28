import Wheel from '@uiw/react-color-wheel'
import { useEditStore, DEFAULT_EDIT_STATE } from '../../store/editStore'
import { useSessionStore } from '../../store/tabStore'
import type {
  ColorBalanceState,
  ColorBalanceTriplet,
  HslMixerBand,
  HslMixerBandState,
  SplitToningState,
  SplitToningZone,
} from '@shared/types'
import { PanelSection } from '../ui'
import ToneCurveEditor from './ToneCurveEditor'

const ZONES: { id: keyof SplitToningState; label: string }[] = [
  { id: 'highlights', label: 'Highlights' },
  { id: 'shadows', label: 'Shadows' },
  { id: 'midtones', label: 'Midtones' },
]

const BALANCE_AXES: { key: keyof ColorBalanceTriplet; label: string; left: string; right: string }[] = [
  { key: 'cyanRed', label: 'C/R', left: 'C', right: 'R' },
  { key: 'magentaGreen', label: 'M/G', left: 'M', right: 'G' },
  { key: 'yellowBlue', label: 'Y/B', left: 'Y', right: 'B' },
]

const HSL_BANDS: { id: HslMixerBand; label: string; swatch: string }[] = [
  { id: 'red', label: 'Red', swatch: '#ef4444' },
  { id: 'orange', label: 'Orange', swatch: '#f97316' },
  { id: 'yellow', label: 'Yellow', swatch: '#eab308' },
  { id: 'green', label: 'Green', swatch: '#22c55e' },
  { id: 'aqua', label: 'Aqua', swatch: '#06b6d4' },
  { id: 'blue', label: 'Blue', swatch: '#3b82f6' },
  { id: 'purple', label: 'Purple', swatch: '#8b5cf6' },
  { id: 'magenta', label: 'Magenta', swatch: '#d946ef' },
]

function hsvToHex(h: number, s: number): string {
  const sn = s / 100; const l = 1 - sn / 2
  const m = sn * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    return Math.round((l - m * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255)
  }
  return `#${[f(0), f(8), f(4)].map(x => x.toString(16).padStart(2, '0')).join('')}`
}

function SplitWheel({
  label,
  zone,
  data,
  onColorChange,
  onPointerEnd,
  onReset,
}: {
  label: string
  zone: keyof SplitToningState
  data: SplitToningZone
  onColorChange: (z: keyof SplitToningState, patch: Partial<SplitToningZone>) => void
  onPointerEnd: () => void
  onReset: () => void
}) {
  const color = { h: data.hue, s: data.saturation, v: 100, a: 1 as const }
  const tintHex = data.saturation > 2 ? hsvToHex(data.hue, Math.min(data.saturation * 1.4, 100)) : '#52525b'
  const hasTint = data.saturation > 1

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex items-center justify-between w-full px-0.5">
        <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500">{label}</span>
        {hasTint && (
          <button type="button" onClick={onReset}
            className="text-[9px] text-zinc-600 hover:text-zinc-400 transition-colors">✕</button>
        )}
      </div>
      <div className="relative" onPointerUp={onPointerEnd}>
        <Wheel
          color={color}
          width={88}
          height={88}
          className="max-w-full !shadow-none"
          onChange={(c) => onColorChange(zone, { hue: c.hsva.h, saturation: c.hsva.s })}
        />
        {/* Active tint indicator ring */}
        {hasTint && (
          <div className="absolute inset-0 rounded-full pointer-events-none"
            style={{ boxShadow: `inset 0 0 0 2px ${tintHex}60` }} />
        )}
      </div>
      {/* H/S readout + saturation mini-slider */}
      <div className="flex items-center gap-1.5 w-full">
        <div className="h-2 w-2 rounded-full flex-shrink-0 border border-zinc-700"
          style={{ backgroundColor: tintHex }} />
        <span className="text-[9px] font-mono text-zinc-600 tabular-nums flex-1">
          {hasTint ? `${Math.round(data.hue)}° · ${Math.round(data.saturation)}%` : 'neutral'}
        </span>
      </div>
      {/* Saturation strength slider */}
      <input
        type="range" min={0} max={100} step={1}
        value={data.saturation}
        className="w-full"
        style={{ accentColor: tintHex }}
        onChange={e => onColorChange(zone, { saturation: Number(e.target.value) })}
        onMouseUp={onPointerEnd}
        onTouchEnd={onPointerEnd}
      />
    </div>
  )
}

function MiniSlider({
  label,
  value,
  min = -100,
  max = 100,
  step = 1,
  left,
  right,
  onChange,
  onChangeEnd,
}: {
  label: string
  value: number
  min?: number
  max?: number
  step?: number
  left?: string
  right?: string
  onChange: (v: number) => void
  onChangeEnd: () => void
}) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] text-text-secondary dark:text-zinc-500 truncate">{label}</span>
        <span className="text-[10px] font-mono text-text-muted dark:text-zinc-600 tabular-nums">{value > 0 ? `+${value}` : value}</span>
      </div>
      <div className="flex items-center gap-1.5">
        {left && <span className="w-3 text-[9px] text-text-muted dark:text-zinc-600">{left}</span>}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          style={{ background: `linear-gradient(to right, var(--frescava-adj-modified) ${pct}%, var(--frescava-range-track) ${pct}%)` }}
          className="min-w-0 flex-1"
          onChange={e => onChange(Number(e.target.value))}
          onMouseUp={onChangeEnd}
          onTouchEnd={onChangeEnd}
        />
        {right && <span className="w-3 text-right text-[9px] text-text-muted dark:text-zinc-600">{right}</span>}
      </div>
    </div>
  )
}

export default function AdvancedAdjustmentsSection() {
  const { params, setParam, pushHistory } = useEditStore()
  const { markActiveImageDirty } = useSessionStore()

  const setSplit = (z: keyof SplitToningState, patch: Partial<SplitToningZone>) => {
    const cur = params.splitToning ?? DEFAULT_EDIT_STATE.splitToning
    setParam('splitToning', { ...cur, [z]: { ...cur[z], ...patch } })
    markActiveImageDirty()
  }

  const setBalance = (z: keyof ColorBalanceState, key: keyof ColorBalanceTriplet, value: number) => {
    const cur = params.colorBalance ?? DEFAULT_EDIT_STATE.colorBalance
    setParam('colorBalance', {
      ...cur,
      [z]: { ...cur[z], [key]: value },
    })
    markActiveImageDirty()
  }

  const setHsl = (band: HslMixerBand, patch: Partial<HslMixerBandState>) => {
    const cur = params.hslMixer ?? DEFAULT_EDIT_STATE.hslMixer
    setParam('hslMixer', { ...cur, [band]: { ...cur[band], ...patch } })
    markActiveImageDirty()
  }

  const defaultCurve = DEFAULT_EDIT_STATE.curves
  const defaultSplit = DEFAULT_EDIT_STATE.splitToning
  const defaultBalance = DEFAULT_EDIT_STATE.colorBalance
  const defaultHsl = DEFAULT_EDIT_STATE.hslMixer
  const curves = params.curves ?? defaultCurve
  const splitToning = params.splitToning ?? defaultSplit
  const colorBalance = params.colorBalance ?? defaultBalance
  const hslMixer = params.hslMixer ?? defaultHsl
  const dehaze = params.dehaze ?? 0

  return (
    <div className="flex flex-col gap-5">
      <PanelSection title="Tone curve" className="!py-0 !px-0">
        <ToneCurveEditor
          value={curves}
          onChange={v => {
            setParam('curves', v)
            markActiveImageDirty()
          }}
          onChangeEnd={() => pushHistory()}
        />
        <button
          type="button"
          className="mt-2 w-full text-[10px] text-text-muted dark:text-zinc-500 hover:text-text-primary dark:hover:text-zinc-200 py-0.5"
          onClick={() => {
            setParam('curves', {
              master: defaultCurve.master.map(p => ({ ...p })),
              red: defaultCurve.red.map(p => ({ ...p })),
              green: defaultCurve.green.map(p => ({ ...p })),
              blue: defaultCurve.blue.map(p => ({ ...p })),
            })
            markActiveImageDirty()
            pushHistory()
          }}
        >
          Reset curve
        </button>
      </PanelSection>

      <PanelSection title="Color grading" className="!py-0 !px-0">
        {/* Triangle layout: Highlights top-centre, Shadows bottom-left, Midtones bottom-right */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-3 place-items-center">
          {ZONES.map(({ id, label }, i) => (
            <div key={id} className={`flex flex-col items-center w-full ${i === 0 ? 'col-span-2' : ''}`}>
              <SplitWheel
                label={label}
                zone={id}
                data={splitToning[id]}
                onColorChange={(z, p) => { setSplit(z, p) }}
                onPointerEnd={() => pushHistory()}
                onReset={() => {
                  setSplit(id, { hue: 0, saturation: 0 })
                  pushHistory()
                }}
              />
            </div>
          ))}
        </div>
        <button
          type="button"
          className="mt-1 w-full text-[10px] text-zinc-600 hover:text-zinc-400 py-0.5 transition-colors"
          onClick={() => {
            setParam('splitToning', {
              shadows: { ...defaultSplit.shadows },
              midtones: { ...defaultSplit.midtones },
              highlights: { ...defaultSplit.highlights },
            })
            markActiveImageDirty()
            pushHistory()
          }}
        >
          Reset all zones
        </button>
      </PanelSection>

      <PanelSection title="Color balance" className="!py-0 !px-0">
        <div className="flex flex-col gap-3">
          {ZONES.map(({ id, label }) => (
            <div key={id} className="rounded-lg border border-border/70 dark:border-zinc-800/70 p-2">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-text-muted dark:text-zinc-500 mb-2">{label}</div>
              <div className="flex flex-col gap-2">
                {BALANCE_AXES.map(axis => (
                  <MiniSlider
                    key={axis.key}
                    label={axis.label}
                    value={colorBalance[id][axis.key]}
                    left={axis.left}
                    right={axis.right}
                    onChange={v => setBalance(id, axis.key, v)}
                    onChangeEnd={() => pushHistory()}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="mt-2 w-full text-[10px] text-text-muted dark:text-zinc-500 hover:text-text-primary dark:hover:text-zinc-200 py-0.5"
          onClick={() => {
            setParam('colorBalance', {
              shadows: { ...defaultBalance.shadows },
              midtones: { ...defaultBalance.midtones },
              highlights: { ...defaultBalance.highlights },
            })
            markActiveImageDirty()
            pushHistory()
          }}
        >
          Reset balance
        </button>
      </PanelSection>

      <PanelSection title="HSL mixer" className="!py-0 !px-0">
        <div className="flex flex-col gap-2">
          {HSL_BANDS.map(band => (
            <div key={band.id} className="rounded-lg border border-border/60 dark:border-zinc-800/60 p-2">
              <div className="flex items-center gap-2 mb-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: band.swatch }} />
                <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted dark:text-zinc-500">{band.label}</span>
              </div>
              <div className="flex flex-col gap-2">
                <MiniSlider label="Hue" value={hslMixer[band.id].hue} onChange={v => setHsl(band.id, { hue: v })} onChangeEnd={() => pushHistory()} />
                <MiniSlider label="Saturation" value={hslMixer[band.id].saturation} onChange={v => setHsl(band.id, { saturation: v })} onChangeEnd={() => pushHistory()} />
                <MiniSlider label="Luminance" value={hslMixer[band.id].luminance} onChange={v => setHsl(band.id, { luminance: v })} onChangeEnd={() => pushHistory()} />
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="mt-2 w-full text-[10px] text-text-muted dark:text-zinc-500 hover:text-text-primary dark:hover:text-zinc-200 py-0.5"
          onClick={() => {
            setParam('hslMixer', Object.fromEntries(HSL_BANDS.map(b => [b.id, { ...defaultHsl[b.id] }])) as typeof params.hslMixer)
            markActiveImageDirty()
            pushHistory()
          }}
        >
          Reset HSL mixer
        </button>
      </PanelSection>

      <PanelSection title="Atmosphere" className="!py-0 !px-0">
        <MiniSlider
          label="Dehaze"
          value={dehaze}
          onChange={v => {
            setParam('dehaze', v)
            markActiveImageDirty()
          }}
          onChangeEnd={() => pushHistory()}
        />
      </PanelSection>
    </div>
  )
}
