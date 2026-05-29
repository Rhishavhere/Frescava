import { forwardRef } from 'react'

// ΓöÇΓöÇΓöÇ Button ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

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
  const base = 'inline-flex items-center justify-center gap-1.5 font-medium transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed'
  const variants = {
    primary: 'bg-accent text-zinc-950 rounded-md hover:bg-accent-hover dark:bg-[color:var(--editor-accent)] dark:text-zinc-950',
    secondary: 'bg-white text-text-primary rounded-md border border-border hover:bg-surface-100 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700 dark:hover:bg-zinc-700',
    ghost: 'text-text-secondary rounded-md hover:bg-surface-100 hover:text-text-primary dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100',
    icon: 'text-text-muted rounded-md hover:bg-surface-100 hover:text-text-primary dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-200',
    danger: 'bg-red-50 text-red-600 rounded-md border border-red-100 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/50 dark:hover:bg-red-900/30',
  }
  const sizes = {
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-3.5 py-1.5 text-sm',
    lg: 'px-5 py-2.5 text-sm',
  }
  const iconSizes = { sm: 'w-8 h-8', md: 'w-9 h-9', lg: 'w-10 h-10' }

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

// ΓöÇΓöÇΓöÇ Spinner ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export function Spinner({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeOpacity="0.2" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

// ΓöÇΓöÇΓöÇ Slider ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

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

  const lineColor = 'var(--frescava-range-fill, #111111)'
  const trackColor = 'var(--frescava-range-track, #E8E8E8)'
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-mono font-medium uppercase tracking-widest text-text-secondary dark:text-zinc-400">{label}</label>
        {showValue && (
          <span className="text-xs font-mono text-text-muted tabular-nums dark:text-zinc-500" style={{ minWidth: 36, textAlign: 'right' }}>
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
            background: `linear-gradient(to right, ${lineColor} ${pct}%, ${trackColor} ${pct}%)`,
          }}
          className="w-full"
          onChange={e => onChange(parseFloat(e.target.value))}
          onMouseUp={e => onChangeEnd && onChangeEnd(parseFloat((e.target as HTMLInputElement).value))}
        />
      </div>
    </div>
  )
}

// ΓöÇΓöÇΓöÇ Toggle ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

interface ToggleProps {
  checked: boolean
  onChange: (v: boolean) => void
  label?: string
  size?: 'sm' | 'md'
}

export function Toggle({ checked, onChange, label, size = 'sm' }: ToggleProps) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      {label && <span className="text-xs text-text-secondary dark:text-zinc-400">{label}</span>}
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative flex-shrink-0 rounded-full transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
          size === 'sm' ? 'w-7 h-4' : 'w-9 h-5'
        } ${checked ? 'bg-accent dark:bg-[color:var(--editor-accent)]' : 'bg-surface-300 dark:bg-[#48484a]'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 rounded-full bg-white dark:bg-zinc-900 shadow-sm transition-transform duration-150 ${
            size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'
          } ${checked ? (size === 'sm' ? 'translate-x-3' : 'translate-x-4') : 'translate-x-0'}`}
        />
      </button>
    </label>
  )
}

// ΓöÇΓöÇΓöÇ Panel section ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

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
          <span className="text-[10px] font-mono font-semibold text-text-muted dark:text-zinc-500 uppercase tracking-widest">{title}</span>
          {action}
        </div>
      )}
      {children}
    </div>
  )
}

// ΓöÇΓöÇΓöÇ Tooltip ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

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
