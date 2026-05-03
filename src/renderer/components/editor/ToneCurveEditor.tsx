import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CurveChannel, CurvePoint, CurvesState } from '@shared/types'
import { evaluateToneCurve, normalizeCurvePoints } from '@shared/curveMath'

const PAD = 14
const W = 256
const H = 180
const GRID_FRACS = [0.25, 0.5, 0.75] as const
const KNOT_HIT_PX = 18
/** Click within this distance (SVG units) adds a knot on the curve (Photoshop-style). */
const CURVE_CLICK_PX = 10
/** Minimum horizontal spacing between knots (normalized 0–1). */
const MIN_KNOT_GAP = 0.018
const MAX_KNOTS = 16

const CHANNELS: { id: CurveChannel; label: string; stroke: string; fillRgba: string }[] = [
  { id: 'master', label: 'RGB', stroke: '#d4d4d8', fillRgba: 'rgba(212,212,216,0.08)' },
  { id: 'red', label: 'R', stroke: '#f87171', fillRgba: 'rgba(248,113,113,0.08)' },
  { id: 'green', label: 'G', stroke: '#4ade80', fillRgba: 'rgba(74,222,128,0.08)' },
  { id: 'blue', label: 'B', stroke: '#60a5fa', fillRgba: 'rgba(96,165,250,0.08)' },
]

type Props = {
  value: CurvesState
  onChange: (v: CurvesState) => void
  onChangeEnd: () => void
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

/** Insert a knot on the current spline so it lies on the curve (evaluated before insertion). */
function insertKnotOnCurve(points: CurvePoint[], nxNorm: number): CurvePoint[] | null {
  const sorted = normalizeCurvePoints(points)
  if (sorted.length >= MAX_KNOTS) return null

  let nx = clamp01(nxNorm)
  nx = Math.max(MIN_KNOT_GAP, Math.min(1 - MIN_KNOT_GAP, nx))

  let seg = -1
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i]!.x
    const b = sorted[i + 1]!.x
    if (nx >= a - 1e-9 && nx <= b + 1e-9) {
      seg = i
      break
    }
  }
  if (seg < 0) return null

  const xl = sorted[seg]!.x
  const xr = sorted[seg + 1]!.x
  if (xr - xl < MIN_KNOT_GAP * 3) return null
  if (nx <= xl + MIN_KNOT_GAP || nx >= xr - MIN_KNOT_GAP) return null

  const ny = evaluateToneCurve(sorted, nx)
  const next = [...sorted.slice(0, seg + 1), { x: nx, y: clamp01(ny) }, ...sorted.slice(seg + 1)]
  return normalizeCurvePoints(next)
}

export default function ToneCurveEditor({ value, onChange, onChangeEnd }: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const dragIndex = useRef<number | null>(null)
  /** True only after we've started drag or add-move (successful pointerdown branch). */
  const dragHadPendingHistory = useRef(false)
  const draggingRef = useRef(false)
  const curvesRef = useRef<CurvesState>(value)
  /** Pointer captured on the SVG — events do not reach window listeners reliably. */
  const activePointerId = useRef<number | null>(null)

  useEffect(() => {
    if (!draggingRef.current) curvesRef.current = value
  }, [value])

  const [channel, setChannel] = useState<CurveChannel>('master')
  const [hoveredI, setHoveredI] = useState<number | null>(null)
  const [activeI, setActiveI] = useState<number | null>(null)
  const [histogram, setHistogram] = useState<number[] | null>(null)

  const chan = CHANNELS.find(c => c.id === channel) ?? CHANNELS[0]!

  const activePoints = useMemo(
    () => normalizeCurvePoints(value[channel] ?? [{ x: 0, y: 0 }, { x: 1, y: 1 }]),
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

  const toSvg = useCallback((p: CurvePoint) => {
    return {
      x: PAD + p.x * (W - 2 * PAD),
      y: H - PAD - p.y * (H - 2 * PAD),
    }
  }, [])

  /** Polyline sampled from the same spline as the GPU (PCHIP / curveMath). */
  const sampledPath = useMemo(() => {
    const steps = Math.max(activePoints.length * 32, 96)
    let dFill = ''
    let dLine = ''
    for (let i = 0; i <= steps; i++) {
      const tt = steps > 0 ? i / steps : 0
      const yn = evaluateToneCurve(activePoints, tt)
      const { x, y } = toSvg({ x: tt, y: yn })
      if (i === 0) {
        dLine = `M${x},${y}`
        dFill = `M${x},${y}`
      } else {
        dLine += ` L${x},${y}`
        dFill += ` L${x},${y}`
      }
    }
    dFill += ` L${PAD + (W - 2 * PAD)},${H - PAD} L${PAD},${H - PAD} Z`
    return { dLine, dFill }
  }, [activePoints, toSvg])

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

  const clientToSvg = useCallback((clientX: number, clientY: number) => {
    const el = svgRef.current
    if (!el) return { sx: W / 2, sy: H / 2 }
    const r = el.getBoundingClientRect()
    return {
      sx: ((clientX - r.left) / r.width) * W,
      sy: ((clientY - r.top) / r.height) * H,
    }
  }, [])

  const toNormFromClient = useCallback(
    (clientX: number, clientY: number): CurvePoint => {
      const { sx, sy } = clientToSvg(clientX, clientY)
      return {
        x: clamp01((sx - PAD) / (W - 2 * PAD)),
        y: clamp01((H - PAD - sy) / (H - 2 * PAD)),
      }
    },
    [clientToSvg],
  )

  const nearestKnotSvg = useCallback(
    (clientX: number, clientY: number) => {
      const { sx, sy } = clientToSvg(clientX, clientY)
      let best = 0
      let bestD = 1e9
      for (let i = 0; i < activePoints.length; i++) {
        const p = toSvg(activePoints[i]!)
        const d = Math.hypot(sx - p.x, sy - p.y)
        if (d < bestD) {
          best = i
          bestD = d
        }
      }
      return { index: best, distSvg: bestD }
    },
    [activePoints, clientToSvg, toSvg],
  )

  /** Perpendicular-ish distance from click to spline (SVG px): sample at mouse x on curve vs mouse y. */
  const distClickToSplinePx = useCallback(
    (clientX: number, clientY: number) => {
      const norm = toNormFromClient(clientX, clientY)
      const nx = clamp01(norm.x)
      const nySpline = evaluateToneCurve(activePoints, nx)
      const pCurve = toSvg({ x: nx, y: nySpline })
      const { sx, sy } = clientToSvg(clientX, clientY)
      return Math.hypot(sx - pCurve.x, sy - pCurve.y)
    },
    [activePoints, clientToSvg, toNormFromClient, toSvg],
  )

  const commitChannel = useCallback(
    (pts: CurvePoint[]) => {
      const ch = normalizeCurvePoints(pts)
      const full: CurvesState = { ...curvesRef.current, [channel]: ch }
      curvesRef.current = full
      onChange(full)
    },
    [channel, onChange],
  )

  const moveKnot = useCallback(
    (index: number, norm: CurvePoint) => {
      const base = curvesRef.current[channel] ?? activePoints
      const pts = normalizeCurvePoints(base)
      const prev = pts[index - 1]
      const next = pts[index + 1]
      const isEnd = index === 0 || index === pts.length - 1
      const x = isEnd
        ? pts[index]!.x
        : clamp01(
            Math.max(
              (prev?.x ?? 0) + MIN_KNOT_GAP * 0.5,
              Math.min((next?.x ?? 1) - MIN_KNOT_GAP * 0.5, norm.x),
            ),
          )
      pts[index] = { x, y: norm.y }
      commitChannel(pts)
    },
    [activePoints, channel, commitChannel],
  )

  const endDrag = useCallback(() => {
    const pid = activePointerId.current
    activePointerId.current = null

    const shouldHistory = dragHadPendingHistory.current
    dragHadPendingHistory.current = false

    draggingRef.current = false
    dragIndex.current = null
    setActiveI(null)

    try {
      if (pid != null && svgRef.current?.hasPointerCapture?.(pid))
        svgRef.current.releasePointerCapture(pid)
    } catch {
      /* ignore */
    }

    if (shouldHistory) onChangeEnd()
  }, [onChangeEnd])


  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex items-center gap-1">
        <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 flex-1">
          Curves
        </span>
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

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', aspectRatio: `${W}/${H}`, background: '#0e0e10', display: 'block' }}
        className="rounded-md border border-zinc-800 touch-none select-none cursor-crosshair"
        onPointerMove={e => {
          if (dragIndex.current !== null) {
            e.preventDefault()
            moveKnot(dragIndex.current, toNormFromClient(e.clientX, e.clientY))
            return
          }
          const hit = nearestKnotSvg(e.clientX, e.clientY)
          setHoveredI(hit.distSvg < KNOT_HIT_PX ? hit.index : null)
        }}
        onPointerLeave={() => !draggingRef.current && dragIndex.current === null && setHoveredI(null)}
        onPointerDown={e => {
          if (e.button !== 0) return
          e.preventDefault()

          curvesRef.current = value
          const hit = nearestKnotSvg(e.clientX, e.clientY)
          let idx: number | null = null

          if (hit.distSvg <= KNOT_HIT_PX) {
            idx = hit.index
          } else if (distClickToSplinePx(e.clientX, e.clientY) <= CURVE_CLICK_PX && activePoints.length < MAX_KNOTS) {
            const nx = toNormFromClient(e.clientX, e.clientY).x
            const inserted = insertKnotOnCurve(activePoints, nx)
            if (inserted) {
              const full = { ...value, [channel]: inserted }
              curvesRef.current = full
              onChange(full)
              idx = inserted.findIndex(p => Math.abs(p.x - nx) < MIN_KNOT_GAP * 2)
              if (idx < 0) idx = 1
              if (idx >= inserted.length) idx = inserted.length - 2
            }
          }

          if (idx === null) return

          activePointerId.current = e.pointerId
          dragHadPendingHistory.current = true
          draggingRef.current = true
          dragIndex.current = idx
          setActiveI(idx)
          svgRef.current?.setPointerCapture(e.pointerId)

          moveKnot(idx, toNormFromClient(e.clientX, e.clientY))
        }}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
        onDoubleClick={e => {
          e.preventDefault()
          const hit = nearestKnotSvg(e.clientX, e.clientY)
          const isEnd = hit.index === 0 || hit.index === activePoints.length - 1
          if (!isEnd && hit.distSvg <= KNOT_HIT_PX) {
            commitChannel(activePoints.filter((_, i) => i !== hit.index))
            onChangeEnd()
          }
        }}
      >
        {histPath && <path d={histPath} fill="rgba(255,255,255,0.055)" pointerEvents="none" />}

        {GRID_FRACS.map(f => {
          const x = PAD + f * (W - 2 * PAD)
          return (
            <line
              key={`v${f}`}
              x1={x}
              y1={PAD}
              x2={x}
              y2={H - PAD}
              stroke="rgba(255,255,255,0.07)"
              strokeWidth="0.5"
              pointerEvents="none"
            />
          )
        })}
        {GRID_FRACS.map(f => {
          const y = H - PAD - f * (H - 2 * PAD)
          return (
            <line
              key={`h${f}`}
              x1={PAD}
              y1={y}
              x2={W - PAD}
              y2={y}
              stroke="rgba(255,255,255,0.07)"
              strokeWidth="0.5"
              pointerEvents="none"
            />
          )
        })}

        <rect
          x={PAD}
          y={PAD}
          width={W - 2 * PAD}
          height={H - 2 * PAD}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="0.5"
          pointerEvents="none"
        />

        <line
          x1={PAD}
          y1={H - PAD}
          x2={W - PAD}
          y2={PAD}
          stroke="rgba(255,255,255,0.14)"
          strokeWidth="0.7"
          strokeDasharray="3,3"
          pointerEvents="none"
        />

        {sampledPath.dFill && <path d={sampledPath.dFill} fill={chan.fillRgba} pointerEvents="none" />}
        {sampledPath.dLine && (
          <path
            d={sampledPath.dLine}
            fill="none"
            stroke={chan.stroke}
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            pointerEvents="none"
          />
        )}

        {activePoints.map((pt, i) => {
          const { x, y } = toSvg(pt)
          const isActive = activeI === i
          const isHover = hoveredI === i
          const rr = isActive ? 5.5 : isHover ? 4.5 : 3.5
          return (
            <circle
              key={`knot-${channel}-${i}-${activePoints.length}`}
              cx={x}
              cy={y}
              r={rr}
              fill={isActive || isHover ? chan.stroke : '#18181b'}
              stroke={chan.stroke}
              strokeWidth={isActive ? 0 : 1.5}
              pointerEvents="none"
            />
          )
        })}
      </svg>

      <p className="text-[9px] text-zinc-700 leading-tight">
        Identity diagonal by default · click the curve to add a point · drag to move · double-click an
        interior point to remove · endpoints slide vertically only
      </p>
    </div>
  )
}
