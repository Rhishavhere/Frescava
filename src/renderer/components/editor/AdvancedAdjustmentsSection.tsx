import Wheel from '@uiw/react-color-wheel'
import { useEditStore, DEFAULT_EDIT_STATE } from '../../store/editStore'
import { useSessionStore } from '../../store/tabStore'
import type { SplitToningState, SplitToningZone } from '@shared/types'
import { PanelSection } from '../ui'
import ToneCurveEditor from './ToneCurveEditor'

const ZONES: { id: keyof SplitToningState; label: string }[] = [
  { id: 'highlights', label: 'Highlights' },
  { id: 'shadows', label: 'Shadows' },
  { id: 'midtones', label: 'Midtones' },
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
        {hasTint && (
          <div className="absolute inset-0 rounded-full pointer-events-none"
            style={{ boxShadow: `inset 0 0 0 2px ${tintHex}60` }} />
        )}
      </div>
      <div className="flex items-center gap-1.5 w-full">
        <div className="h-2 w-2 rounded-full flex-shrink-0 border border-zinc-700"
          style={{ backgroundColor: tintHex }} />
        <span className="text-[9px] font-mono text-zinc-600 tabular-nums flex-1">
          {hasTint ? `${Math.round(data.hue)}° · ${Math.round(data.saturation)}%` : 'neutral'}
        </span>
      </div>
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

export default function AdvancedAdjustmentsSection() {
  const { params, setParam, pushHistory } = useEditStore()
  const { markActiveImageDirty } = useSessionStore()

  const setSplit = (z: keyof SplitToningState, patch: Partial<SplitToningZone>) => {
    const cur = params.splitToning ?? DEFAULT_EDIT_STATE.splitToning
    setParam('splitToning', { ...cur, [z]: { ...cur[z], ...patch } })
    markActiveImageDirty()
  }

  const defaultCurve = DEFAULT_EDIT_STATE.curves
  const defaultSplit = DEFAULT_EDIT_STATE.splitToning
  const curves = params.curves ?? defaultCurve
  const splitToning = params.splitToning ?? defaultSplit

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
    </div>
  )
}
