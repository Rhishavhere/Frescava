import { useCallback, useRef } from 'react'

/** Pick `pill` (thick track, value beside label) or `line` (native range + compact readout). */
export type AdjustmentSliderVariant = 'pill' | 'line'

export function clampSteppedValue(raw: number, min: number, max: number, step: number): number {
  const snapped = Math.round((raw - min) / step) * step + min
  const decimals = step < 1 ? 4 : 0
  const v = decimals ? Number(snapped.toFixed(decimals)) : snapped
  return Math.min(max, Math.max(min, v))
}

/** Readout for pill sliders: `0`, `+ 75`, `-50`, spaced plus for integers. */
export function formatPillAdjustmentReadout(value: number, step: number): string {
  if (step < 1) {
    const s = value.toFixed(2)
    if (s === '0.00' || s === '-0.00') return '0'
    if (value > 0) return `+ ${s}`
    return s
  }
  if (value === 0) return '0'
  if (value > 0) return `+ ${value}`
  return `${value}`
}

/** Readout for line sliders: tight `+N` / decimals, matches classic adjustment rows. */
export function formatLineAdjustmentReadout(value: number, step: number): string {
  if (step < 1) return value.toFixed(2)
  return value > 0 ? `+${value}` : `${value}`
}

export interface AdjustmentSliderRowProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  onChangeEnd: () => void
  onReset: () => void
  /** Which control style to render. */
  variant: AdjustmentSliderVariant
  className?: string
}

export function AdjustmentSliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
  onChangeEnd,
  onReset,
  variant,
  className = '',
}: AdjustmentSliderRowProps) {
  const body =
    variant === 'pill' ? (
      <PillAdjustmentSliderRowInner
        label={label}
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={onChange}
        onChangeEnd={onChangeEnd}
        onReset={onReset}
      />
    ) : (
      <LineAdjustmentSliderRowInner
        label={label}
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={onChange}
        onChangeEnd={onChangeEnd}
        onReset={onReset}
      />
    )

  return className ? <div className={className}>{body}</div> : body
}

export function PillAdjustmentSliderRow(props: Omit<AdjustmentSliderRowProps, 'variant'>) {
  return <AdjustmentSliderRow {...props} variant="pill" />
}

export function LineAdjustmentSliderRow(props: Omit<AdjustmentSliderRowProps, 'variant'>) {
  return <AdjustmentSliderRow {...props} variant="line" />
}

// ─── Pill: custom track, fill from left to value, white marker ───────────────

function PillAdjustmentSliderRowInner({
  label,
  value,
  min,
  max,
  step,
  onChange,
  onChangeEnd,
  onReset,
}: Omit<AdjustmentSliderRowProps, 'variant' | 'className'>) {
  const trackRef = useRef<HTMLDivElement>(null)
  const t = ((value - min) / (max - min)) * 100
  const displayVal = formatPillAdjustmentReadout(value, step)
  const isModified = value !== 0

  const applyClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const ratio = rect.width > 0 ? (clientX - rect.left) / rect.width : 0
      const raw = min + ratio * (max - min)
      const next = clampSteppedValue(raw, min, max, step)
      if (next !== value) onChange(next)
    },
    [min, max, step, value, onChange],
  )

  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <div className="flex items-center justify-between gap-2 min-w-0">
        <label
          className={`text-xs font-medium transition-colors cursor-pointer select-none truncate ${
            isModified
              ? 'text-text-primary dark:text-zinc-100'
              : 'text-text-secondary dark:text-zinc-100/90'
          }`}
          onDoubleClick={onReset}
          title="Double-click label to reset"
        >
          {label}
        </label>
        <button
          type="button"
          onDoubleClick={onReset}
          title="Double-click to reset"
          className={`text-xs font-mono tabular-nums text-right shrink-0 transition-colors cursor-default ${
            isModified
              ? 'text-text-primary dark:text-zinc-200'
              : 'text-text-muted dark:text-zinc-500'
          }`}
        >
          {displayVal}
        </button>
      </div>

      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={displayVal}
        aria-label={label}
        className="relative h-7 w-full cursor-pointer overflow-hidden rounded-full bg-zinc-700
          shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)] outline-none
          focus-visible:ring-2 focus-visible:ring-blue-500/35 focus-visible:ring-offset-1
          focus-visible:ring-offset-white dark:bg-[#2d2d35] dark:focus-visible:ring-offset-zinc-950"
        onPointerDown={e => {
          e.currentTarget.setPointerCapture(e.pointerId)
          applyClientX(e.clientX)
        }}
        onPointerMove={e => {
          if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
          applyClientX(e.clientX)
        }}
        onPointerUp={e => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId)
            onChangeEnd()
          }
        }}
        onPointerCancel={e => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId)
            onChangeEnd()
          }
        }}
        onDoubleClick={e => {
          e.preventDefault()
          onReset()
        }}
        onKeyDown={e => {
          let next = value
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
            e.preventDefault()
            next = clampSteppedValue(value + step, min, max, step)
          } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
            e.preventDefault()
            next = clampSteppedValue(value - step, min, max, step)
          } else if (e.key === 'Home') {
            e.preventDefault()
            next = min
          } else if (e.key === 'End') {
            e.preventDefault()
            next = max
          } else if (e.key === 'PageUp') {
            e.preventDefault()
            const jump = (max - min) * 0.1
            next = clampSteppedValue(value + jump, min, max, step)
          } else if (e.key === 'PageDown') {
            e.preventDefault()
            const jump = (max - min) * 0.1
            next = clampSteppedValue(value - jump, min, max, step)
          } else {
            return
          }
          if (next !== value) onChange(next)
          onChangeEnd()
        }}
      >
        {t > 1e-4 && (
          <div
            className="pointer-events-none absolute inset-y-0 left-0 bg-zinc-600 dark:bg-[color:var(--editor-accent,#caa48e)]"
            style={{ width: `${t}%` }}
          />
        )}
        <div
          className="pointer-events-none absolute inset-y-0 z-[1] w-px bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.2)]"
          style={{ left: `${t}%`, transform: 'translateX(-50%)' }}
        />
      </div>
    </div>
  )
}

// ─── Line: native range, gradient track ──────────────────────────────────────

function LineAdjustmentSliderRowInner({
  label,
  value,
  min,
  max,
  step,
  onChange,
  onChangeEnd,
  onReset,
}: Omit<AdjustmentSliderRowProps, 'variant' | 'className'>) {
  const pct = ((value - min) / (max - min)) * 100
  const displayVal = formatLineAdjustmentReadout(value, step)
  const isModified = value !== 0

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label
          className={`text-xs font-medium transition-colors cursor-pointer select-none ${
            isModified ? 'text-text-primary dark:text-zinc-100' : 'text-text-secondary dark:text-zinc-500'
          }`}
          onDoubleClick={onReset}
          title="Double-click to reset"
        >
          {label}
        </label>
        <button
          type="button"
          onDoubleClick={onReset}
          title="Double-click to reset"
          className={`text-xs font-mono tabular-nums text-right min-w-[36px] transition-colors cursor-default ${
            isModified
              ? 'text-accent font-medium dark:text-[color:var(--editor-accent-mid)]'
              : 'text-text-muted dark:text-zinc-600'
          }`}
        >
          {displayVal}
        </button>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{
          background: `linear-gradient(to right, ${isModified ? 'var(--frescava-adj-modified)' : 'var(--frescava-range-fill)'} ${pct}%, var(--frescava-range-track) ${pct}%)`,
        }}
        className="w-full"
        onChange={e => onChange(parseFloat(e.target.value))}
        onMouseUp={onChangeEnd}
        onTouchEnd={onChangeEnd}
        onDoubleClick={onReset}
      />
    </div>
  )
}
