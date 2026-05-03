import type { CurvePoint, CurvesState } from '@shared/types'

export const CURVE_LUT_WIDTH = 1024

const IDENTITY: CurvePoint[] = [
  { x: 0, y: 0 },
  { x: 1, y: 1 },
]

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0))
}

/** Stable sorted curve: clamps to graph, snaps endpoints x=0 and x=1, drops duplicate xs. */
export function normalizeCurvePoints(points: CurvePoint[] | undefined): CurvePoint[] {
  if (!points || points.length < 2) return IDENTITY.map(p => ({ ...p }))
  let sorted = points
    .map(p => ({ x: clamp01(p.x), y: clamp01(p.y) }))
    .sort((a, b) => a.x - b.x)

  sorted = sorted.map((p, i) =>
    i === 0 ? { x: 0, y: p.y } : i === sorted.length - 1 ? { x: 1, y: p.y } : p,
  )

  const merged: CurvePoint[] = []
  for (const p of sorted) {
    const last = merged[merged.length - 1]
    if (!last || p.x - last.x > 1e-4) merged.push(p)
    else last.y = p.y
  }

  merged[0] = { x: 0, y: clamp01(sorted[0]!.y) }
  merged[merged.length - 1] = { x: 1, y: clamp01(sorted[sorted.length - 1]!.y) }

  return merged.length >= 2 ? merged : IDENTITY.map(p => ({ ...p }))
}

function pchipSlopes(xs: Float64Array, ys: Float64Array): Float64Array {
  const n = xs.length
  const m = new Float64Array(n)
  const h = new Float64Array(n - 1)
  const dd = new Float64Array(n - 1)

  for (let i = 0; i < n - 1; i++) {
    h[i] = xs[i + 1]! - xs[i]!
    dd[i] = (ys[i + 1]! - ys[i]!) / h[i]!
  }

  if (n === 2) {
    m[0] = dd[0]!
    m[1] = dd[0]!
    return m
  }

  for (let i = 1; i < n - 1; i++) {
    const dL = dd[i - 1]!
    const dR = dd[i]!
    if (dL === 0 || dR === 0 || Math.sign(dL) !== Math.sign(dR)) {
      m[i] = 0
    } else {
      const wL = 2 * h[i - 1]! + h[i]!
      const wR = h[i - 1]! + 2 * h[i]!
      m[i] = (wL + wR) / (wL / dL + wR / dR)
    }
  }

  let m0 = ((2 * h[0]! + h[1]!) * dd[0]! - h[0]! * dd[1]!) / (h[0]! + h[1]!)
  if (Math.sign(m0) !== Math.sign(dd[0]!)) m0 = 0
  else if (Math.sign(dd[0]!) !== Math.sign(dd[1]!) && Math.abs(m0) > 3 * Math.abs(dd[0]!))
    m0 = 3 * Math.sign(dd[0]!) * Math.abs(dd[0]!)
  m[0] = m0

  const lm = n - 2
  let mn =
    ((h[lm - 1]! + 2 * h[lm]!) * dd[lm]! - h[lm]! * dd[lm - 1]!) / (h[lm - 1]! + h[lm]!)
  if (Math.sign(mn) !== Math.sign(dd[lm]!)) mn = 0
  else if (
    Math.sign(dd[lm]!) !== Math.sign(dd[lm - 1]!) &&
    Math.abs(mn) > 3 * Math.abs(dd[lm]!)
  )
    mn = 3 * Math.sign(dd[lm]!) * Math.abs(dd[lm]!)
  m[n - 1] = mn

  return m
}

function evalHermite(
  x: number,
  x0: number,
  y0: number,
  m0: number,
  x1: number,
  y1: number,
  m1: number,
): number {
  const h = x1 - x0
  if (Math.abs(h) < 1e-12) return y0
  const t = (x - x0) / h
  const t2 = t * t
  const t3 = t2 * t
  const h00 = 2 * t3 - 3 * t2 + 1
  const h10 = t3 - 2 * t2 + t
  const h01 = -2 * t3 + 3 * t2
  const h11 = t3 - t2
  return h00 * y0 + h10 * h * m0 + h01 * y1 + h11 * h * m1
}

/**
 * Monotone PCHIP spline through knots — stable, smooth, no oscillation/unstable Catmull-Rom overshoots.
 */
export function evaluateToneCurve(points: CurvePoint[] | undefined, x: number): number {
  const pts = normalizeCurvePoints(points)
  const xq = clamp01(x)

  const n = pts.length
  if (n === 0) return xq
  if (xq <= pts[0]!.x) return pts[0]!.y
  if (xq >= pts[n - 1]!.x) return pts[n - 1]!.y
  if (n === 2) {
    const a = pts[0]!
    const b = pts[1]!
    const tt = xq <= a.x ? 0 : xq >= b.x ? 1 : (xq - a.x) / (b.x - a.x || 1e-12)
    return a.y + (b.y - a.y) * tt
  }

  const xs = new Float64Array(n)
  const ys = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    xs[i] = pts[i]!.x
    ys[i] = pts[i]!.y
  }
  const slopes = pchipSlopes(xs, ys)

  for (let k = 0; k < n - 1; k++) {
    if (xq >= xs[k]! && xq <= xs[k + 1]!) {
      return evalHermite(xq, xs[k]!, ys[k]!, slopes[k]!, xs[k + 1]!, ys[k + 1]!, slopes[k + 1]!)
    }
  }
  return ys[n - 1]!
}

export function buildCurveLutRGBA8(curves: CurvesState | undefined): Uint8Array {
  const c = curves ?? {
    master: IDENTITY.map(p => ({ ...p })),
    red: IDENTITY.map(p => ({ ...p })),
    green: IDENTITY.map(p => ({ ...p })),
    blue: IDENTITY.map(p => ({ ...p })),
  }
  const w = CURVE_LUT_WIDTH
  const buf = new Uint8Array(w * 4)
  const denom = w > 1 ? w - 1 : 1
  const q = (v: number) => Math.round(Math.min(1, Math.max(0, Number.isFinite(v) ? v : 0)) * 255)
  for (let i = 0; i < w; i++) {
    const t = i / denom
    buf[i * 4 + 0] = q(evaluateToneCurve(c.master, t))
    buf[i * 4 + 1] = q(evaluateToneCurve(c.red, t))
    buf[i * 4 + 2] = q(evaluateToneCurve(c.green, t))
    buf[i * 4 + 3] = q(evaluateToneCurve(c.blue, t))
  }
  return buf
}

export function defaultIdentityCurves(): CurvesState {
  const line = (): CurvePoint[] => IDENTITY.map(p => ({ ...p }))
  return { master: line(), red: line(), green: line(), blue: line() }
}
