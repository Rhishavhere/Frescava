import { forwardRef } from 'react'

// ─── Button ───────────────────────────────────────────────────────────────────

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'icon' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'secondary',
  size = 'md',
  loading,
  className = '',
  children,
  disabled,
  ...props
}, ref) => {
  const base = 'inline-flex items-center justify-center gap-1.5 font-medium transition-all duration-100 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95'
  const variants = {
    primary: 'bg-text-primary text-white rounded-lg hover:opacity-85',
    secondary: 'bg-surface-100 text-text-primary rounded-lg border border-border hover:bg-surface-200',
    ghost: 'text-text-secondary rounded-lg hover:bg-surface-100 hover:text-text-primary',
    icon: 'text-text-muted rounded-lg hover:bg-surface-100 hover:text-text-primary',
    danger: 'bg-red-50 text-red-600 rounded-lg border border-red-100 hover:bg-red-100',
  }
  const sizes = {
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-3.5 py-1.5 text-sm',
    lg: 'px-5 py-2.5 text-sm',
  }
  const iconSizes = { sm: 'w-7 h-7', md: 'w-8 h-8', lg: 'w-9 h-9' }

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${variant === 'icon' ? iconSizes[size] : sizes[size]} ${className}`}
      {...props}
    >
      {loading ? <Spinner /> : children}
    </button>
  )
})
Button.displayName = 'Button'

// ─── Spinner ──────────────────────────────────────────────────────────────────

export function Spinner({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeOpacity="0.2" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

// ─── Slider ───────────────────────────────────────────────────────────────────

interface SliderProps {
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  onChangeEnd?: (value: number) => void
  label: string
  showValue?: boolean
  unit?: string
  className?: string
}

export function Slider({
  value, min, max, step = 1, onChange, onChangeEnd,
  label, showValue = true, unit = '', className = ''
}: SliderProps) {
  const pct = ((value - min) / (max - min)) * 100
  const displayVal = value > 0 ? `+${value}` : `${value}`

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-text-secondary">{label}</label>
        {showValue && (
          <span className="text-xs font-mono text-text-muted tabular-nums" style={{ minWidth: 36, textAlign: 'right' }}>
            {displayVal}{unit}
          </span>
        )}
      </div>
      <div className="relative flex items-center">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          style={{
            // Coloured track up to thumb
            background: `linear-gradient(to right, #111111 ${pct}%, #E8E8E8 ${pct}%)`,
          }}
          className="w-full"
          onChange={e => onChange(parseFloat(e.target.value))}
          onMouseUp={e => onChangeEnd && onChangeEnd(parseFloat((e.target as HTMLInputElement).value))}
        />
      </div>
    </div>
  )
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

interface ToggleProps {
  checked: boolean
  onChange: (v: boolean) => void
  label?: string
  size?: 'sm' | 'md'
}

export function Toggle({ checked, onChange, label, size = 'sm' }: ToggleProps) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      {label && <span className="text-xs text-text-secondary">{label}</span>}
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative flex-shrink-0 rounded-full transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
          size === 'sm' ? 'w-7 h-4' : 'w-9 h-5'
        } ${checked ? 'bg-text-primary' : 'bg-surface-300'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 rounded-full bg-white shadow-sm transition-transform duration-150 ${
            size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'
          } ${checked ? (size === 'sm' ? 'translate-x-3' : 'translate-x-4') : 'translate-x-0'}`}
        />
      </button>
    </label>
  )
}

// ─── Panel section ────────────────────────────────────────────────────────────

export function PanelSection({
  title,
  children,
  className = '',
  action,
}: {
  title?: string
  children: React.ReactNode
  className?: string
  action?: React.ReactNode
}) {
  return (
    <div className={`px-4 py-3 ${className}`}>
      {title && (
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">{title}</span>
          {action}
        </div>
      )}
      {children}
    </div>
  )
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

export function Tooltip({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="relative group">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 rounded bg-text-primary text-white text-[10px] whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity delay-300 z-50">
        {label}
      </div>
    </div>
  )
}
