import { useState, useEffect, useId, useMemo } from 'react'
import { max } from 'd3-array'
import { area, line, curveMonotoneX } from 'd3-shape'

/**
 * Map raw bin counts to display heights [0, 1] using log1p / log1p(max).
 * Spreads the mid-tones and tails so small edits (contrast, etc.) stay visible
 * vs linear max-normalization, which crushes all shapes to the same peak height.
 */
function countsToDisplayHeights(counts: number[]): number[] {
  const m = max(counts) ?? 0
  if (m <= 0) return Array.from({ length: 256 }, () => 0)
  const logMax = Math.log1p(m)
  const out: number[] = new Array(256)
  for (let i = 0; i < 256; i++) {
    const c = counts[i] ?? 0
    out[i] = c <= 0 ? 0 : Math.log1p(c) / logMax
  }
  return out
}

/** y1 for SVG: small top margin so the curve does not clip */
const FILL = 0.92

function useHistogramPaths(heights: number[] | null) {
  return useMemo(() => {
    if (!heights || heights.length !== 256) return { fillPath: '', linePath: '' }

    const A = area<number>()
      .x((_, i) => i)
      .y0(1)
      .y1(d => 1 - FILL * d)
      .curve(curveMonotoneX)

    const L = line<number>()
      .x((_, i) => i)
      .y(d => 1 - FILL * d)
      .curve(curveMonotoneX)

    return {
      fillPath: A(heights) ?? '',
      linePath: L(heights) ?? '',
    }
  }, [heights])
}

/**
 * Luminance histogram of the current main canvas preview (after WebGL render).
 * Updates when the canvas fires `frescava-canvas-repaint` (same frame as the preview).
 * Uses d3-scale-friendly mapping (log1p) and d3-shape smooth area for display.
 */
type AdjustmentHistogramProps = {
  /** Floating on canvas vs legacy right-inspector strip */
  variant?: 'overlay' | 'inspector'
}

export default function AdjustmentHistogram({ variant = 'overlay' }: AdjustmentHistogramProps) {
  const [counts, setCounts] = useState<number[] | null>(null)
  const baseId = useId().replace(/:/g, '')
  const gradId = `hist-fill-${baseId}`

  const heights = useMemo(() => (counts && counts.length === 256 ? countsToDisplayHeights(counts) : null), [counts])
  const { fillPath, linePath } = useHistogramPaths(heights)

  useEffect(() => {
    const sample = () => {
      const h = window.__frescavaGetLumaHistogram?.()
      if (h && h.length === 256) {
        setCounts(h)
      }
    }
    const onRepaint = () => sample()
    window.addEventListener('frescava-canvas-repaint', onRepaint)
    requestAnimationFrame(sample)
    return () => window.removeEventListener('frescava-canvas-repaint', onRepaint)
  }, [])

  const shell =
    variant === 'overlay'
      ? 'backdrop-blur-sm p-1.5 pointer-events-none'
      : 'shrink-0 border-b border-border dark:border-zinc-800/60 bg-surface-50 dark:bg-zinc-950/80 p-1'

  return (
    <div
      className={shell}
      role="img"
      aria-label="Luminance histogram of the current preview"
    >
      <div
        className={`h-16 w-full overflow-hidden bg-white dark:bg-transparent ${
          variant === 'overlay' ? 'pt-0' : 'pt-6'
        }`}
      >
        {heights && fillPath ? (
          <svg
            className="w-full h-full text-text-primary dark:text-white block"
            viewBox="0 0 256 1"
            preserveAspectRatio="none"
            aria-hidden
          >
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.6" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0.01" />
              </linearGradient>
            </defs>
            <path d={fillPath} fill={`url(#${gradId})`} />
            {linePath ? (
              <path
                d={linePath}
                fill="none"
                stroke="none"
                strokeOpacity="0.5"
                strokeWidth={0.35}
                vectorEffect="non-scaling-stroke"
              />
            ) : null}
          </svg>
        ) : (
          <div className="h-full w-full bg-surface-100 dark:bg-zinc-800/30" />
        )}
      </div>
    </div>
  )
}
