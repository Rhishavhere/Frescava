import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { area, line, curveMonotoneX } from 'd3-shape'
import type { CurveChannel, CurvePoint, CurvesState } from '@shared/types'

const PAD = 14
const W = 256
const H = 180
const GRID_FRACS = [0.25, 0.5, 0.75] as const

const CHANNELS: { id: CurveChannel; label: string; stroke: string; fillRgba: string }[] = [
  { id: 'master', label: 'RGB', stroke: '#d4d4d8', fillRgba: 'rgba(212,212,216,0.08)' },
  { id: 'red',    label: 'R',   stroke: '#f87171', fillRgba: 'rgba(248,113,113,0.08)' },
  { id: 'green',  label: 'G',   stroke: '#4ade80', fillRgba: 'rgba(74,222,128,0.08)'  },
  { id: 'blue',   label: 'B',   stroke: '#60a5fa', fillRgba: 'rgba(96,165,250,0.08)'  },
]

type Props = {
  value: CurvesState
  onChange: (v: CurvesState) => void
  onChangeEnd: () => void
}

function clamp01(v: number) { return Math.max(0, Math.min(1, v)) }

function normalize(points: CurvePoint[]): CurvePoint[] {
  if (!points || points.length < 2) {
    return [
      { x: 0, y: 0 }, { x: 0.25, y: 0.25 }, { x: 0.5, y: 0.5 },
      { x: 0.75, y: 0.75 }, { x: 1, y: 1 },
    ]
  }
  const sorted = [...points]
    .map(p => ({ x: clamp01(p.x), y: clamp01(p.y) }))
    .sort((a, b) => a.x - b.x)

  sorted[0] = { x: 0, y: sorted[0]!.y }
  sorted[sorted.length - 1] = { x: 1, y: sorted[sorted.length - 1]!.y }

  const deduped: CurvePoint[] = [sorted[0]!]
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i]!.x - deduped[deduped.length - 1]!.x > 0.005) {
      deduped.push(sorted[i]!)
    }
  }
  if (deduped[deduped.length - 1]!.x < 1) deduped.push(sorted[sorted.length - 1]!)
  return deduped
}

export default function ToneCurveEditor({ value, onChange, onChangeEnd }: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const dragI = useRef<number | null>(null)
  const valueRef = useRef(value)
  valueRef.current = value

  const [channel, setChannel] = useState<CurveChannel>('master')
  const [hoveredI, setHoveredI] = useState<number | null>(null)
  const [activeI, setActiveI] = useState<number | null>(null)
  const [histogram, setHistogram] = useState<number[] | null>(null)

  const chan = CHANNELS.find(c => c.id === channel) ?? CHANNELS[0]!

  const activePoints = useMemo(
    () => normalize(value[channel] ?? [{ x: 0, y: 0 }, { x: 1, y: 1 }]),
    [channel, value],
  )

  useEffect(() => {
    const sample = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const h = (window as any).__frescavaGetLumaHistogram?.()
      if (h && h.length === 256) setHistogram(h)
    }
    sample()
    window.addEventListener('frescava-canvas-repaint', sample)
    return () => window.removeEventListener('frescava-canvas-repaint', sample)
  }, [])

  const toSvg = useCallback((p: CurvePoint) => ({
    x: PAD + p.x * (W - 2 * PAD),
    y: H - PAD - p.y * (H - 2 * PAD),
  }), [])

  const svgPts = useMemo(() => activePoints.map(p => toSvg(p)), [activePoints, toSvg])

  const linePath = useMemo(() => {
    const gen = line<{ x: number; y: number }>()
      .x(d => d.x)
      .y(d => d.y)
      .curve(curveMonotoneX)
    return gen(svgPts) ?? ''
  }, [svgPts])

  const fillPath = useMemo(() => {
    const gen = area<{ x: number; y: number }>()
      .x(d => d.x)
      .y0(H - PAD)
      .y1(d => d.y)
      .curve(curveMonotoneX)
    return gen(svgPts) ?? ''
  }, [svgPts])

  const histPath = useMemo(() => {
    if (!histogram) return ''
    const maxH = Math.max(...histogram, 1)
    let d = ''
    for (let i = 0; i < 256; i++) {
      const xS = (PAD + (i / 255) * (W - 2 * PAD)).toFixed(1)
      const hgt = (Math.log1p(histogram[i]!) / Math.log1p(maxH)) * (H - 2 * PAD)
      const yS = (H - PAD - hgt).toFixed(1)
      d += `${i === 0 ? 'M' : 'L'}${xS},${yS}`
    }
    d += ` L${(PAD + W - 2 * PAD).toFixed(1)},${H - PAD} L${PAD},${H - PAD} Z`
    return d
  }, [histogram])

  // Convert client coordinates to normalised (0-1, 0-1) curve space.
  // IMPORTANT: must scale by getBoundingClientRect / viewBox ratio to handle
  // responsive SVG scaling correctly.
  const toNorm = useCallback((clientX: number, clientY: number): CurvePoint => {
    const el = svgRef.current
    if (!el) return { x: 0, y: 0 }
    const r = el.getBoundingClientRect()
    const svgX = (clientX - r.left) / r.width * W
    const svgY = (clientY - r.top) / r.height * H
    return {
      x: clamp01((svgX - PAD) / (W - 2 * PAD)),
      y: clamp01((H - PAD - svgY) / (H - 2 * PAD)),
    }
  }, [])

  const nearestHit = useCallback((clientX: number, clientY: number): { index: number; distSvg: number } => {
    const el = svgRef.current
    if (!el) return { index: 0, distSvg: 1e9 }
    const r = el.getBoundingClientRect()
    const mx = (clientX - r.left) / r.width * W
    const my = (clientY - r.top) / r.height * H
    let best = 0; let bestD = 1e9
    for (let i = 0; i < activePoints.length; i++) {
      const p = toSvg(activePoints[i]!)
      const d = Math.hypot(mx - p.x, my - p.y)
      if (d < bestD) { best = i; bestD = d }
    }
    return { index: best, distSvg: bestD }
  }, [activePoints, toSvg])

  const setChannelPoints = useCallback((pts: CurvePoint[]) => {
    onChange({ ...valueRef.current, [channel]: normalize(pts) })
  }, [channel, onChange])

  const movePoint = useCallback((index: number, norm: CurvePoint) => {
    const pts = [...normalize(valueRef.current[channel] ?? [{ x: 0, y: 0 }, { x: 1, y: 1 }])]
    const prev = pts[index - 1]
    const next = pts[index + 1]
    const isEnd = index === 0 || index === pts.length - 1
    const x = isEnd
      ? pts[index]!.x
      : clamp01(Math.max((prev?.x ?? 0) + 0.005, Math.min((next?.x ?? 1) - 0.005, norm.x)))
    pts[index] = { x, y: norm.y }
    onChange({ ...valueRef.current, [channel]: normalize(pts) })
  }, [channel, onChange])

  const onGlobalMove = useCallback((e: PointerEvent) => {
    if (dragI.current === null) return
    movePoint(dragI.current, toNorm(e.clientX, e.clientY))
  }, [movePoint, toNorm])

  const onGlobalUp = useCallback(() => {
    if (dragI.current !== null) onChangeEnd()
    dragI.current = null
    setActiveI(null)
    window.removeEventListener('pointermove', onGlobalMove)
    window.removeEventListener('pointerup', onGlobalUp)
  }, [onChangeEnd, onGlobalMove])

  useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', onGlobalMove)
      window.removeEventListener('pointerup', onGlobalUp)
    }
  }, [onGlobalMove, onGlobalUp])

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Channel tabs */}
      <div className="flex items-center gap-1">
        <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 flex-1">Curves</span>
        {CHANNELS.map(c => (
          <button
            key={c.id}
            type="button"
            onClick={() => setChannel(c.id)}
            style={channel === c.id ? { background: c.stroke, color: '#09090b' } : undefined}
            className={`rounded px-2 py-0.5 text-[10px] font-mono font-bold transition-colors ${
              channel === c.id ? '' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* SVG Curve Editor */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', aspectRatio: `${W}/${H}`, background: '#0e0e10', display: 'block' }}
        className="rounded-md border border-zinc-800 touch-none select-none cursor-crosshair"
        onPointerMove={e => {
          const hit = nearestHit(e.clientX, e.clientY)
          setHoveredI(hit.distSvg < 14 ? hit.index : null)
        }}
        onPointerLeave={() => setHoveredI(null)}
        onPointerDown={e => {
          e.currentTarget.setPointerCapture(e.pointerId)
          const hit = nearestHit(e.clientX, e.clientY)
          let idx: number
          if (hit.distSvg > 14 && activePoints.length < 14) {
            const norm = toNorm(e.clientX, e.clientY)
            const next = normalize([...activePoints, norm])
            setChannelPoints(next)
            idx = next.findIndex(v => Math.abs(v.x - norm.x) < 0.01)
            if (idx < 0) idx = 1
          } else {
            idx = hit.index
          }
          dragI.current = idx
          setActiveI(idx)
          movePoint(idx, toNorm(e.clientX, e.clientY))
          window.addEventListener('pointermove', onGlobalMove)
          window.addEventListener('pointerup', onGlobalUp)
        }}
      >
        {/* Histogram background */}
        {histPath && <path d={histPath} fill="rgba(255,255,255,0.055)" />}

        {/* Grid vertical */}
        {GRID_FRACS.map(f => {
          const x = PAD + f * (W - 2 * PAD)
          return <line key={`v${f}`} x1={x} y1={PAD} x2={x} y2={H - PAD} stroke="rgba(255,255,255,0.07)" strokeWidth="0.5" />
        })}
        {/* Grid horizontal */}
        {GRID_FRACS.map(f => {
          const y = H - PAD - f * (H - 2 * PAD)
          return <line key={`h${f}`} x1={PAD} y1={y} x2={W - PAD} y2={y} stroke="rgba(255,255,255,0.07)" strokeWidth="0.5" />
        })}

        {/* Border frame */}
        <rect x={PAD} y={PAD} width={W - 2 * PAD} height={H - 2 * PAD}
          fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />

        {/* Identity diagonal reference */}
        <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={PAD}
          stroke="rgba(255,255,255,0.14)" strokeWidth="0.7" strokeDasharray="3,3" />

        {/* Area fill under curve */}
        {fillPath && <path d={fillPath} fill={chan.fillRgba} />}

        {/* Curve line */}
        {linePath && (
          <path d={linePath} fill="none" stroke={chan.stroke} strokeWidth="1.6"
            strokeLinecap="round" strokeLinejoin="round" />
        )}

        {/* Control points */}
        {activePoints.map((pt, i) => {
          const { x, y } = toSvg(pt)
          const isEnd = i === 0 || i === activePoints.length - 1
          const isActive = activeI === i
          const isHover = hoveredI === i
          const r = isActive ? 5.5 : isHover ? 4.5 : 3.5
          return (
            <g key={i}>
              {/* Large invisible hit area */}
              <circle cx={x} cy={y} r={13} fill="transparent"
                onDoubleClick={ev => {
                  ev.stopPropagation()
                  if (isEnd) return
                  setChannelPoints(activePoints.filter((_, idx) => idx !== i))
                  onChangeEnd()
                }}
              />
              {/* Visible control point */}
              <circle
                cx={x} cy={y} r={r}
                fill={isActive || isHover ? chan.stroke : '#18181b'}
                stroke={chan.stroke}
                strokeWidth={isActive ? 0 : 1.5}
              />
            </g>
          )
        })}
      </svg>

      <p className="text-[9px] text-zinc-700 leading-tight">
        Click empty space to add · drag to adjust · double-click interior point to delete
      </p>
    </div>
  )
}
