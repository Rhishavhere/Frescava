import { useUIStore } from '../store/uiStore'
import type { AppAppearance } from '@shared/types'

const THEME_OPTIONS: { value: AppAppearance; label: string; hint: string }[] = [
  { value: 'dark', label: 'Darkroom', hint: 'Void-black canvas, warm stone panels, selenium-gold accents.' },
  { value: 'light', label: 'Safelight', hint: 'Warm ivory workspace — tactile panels, amber highlights.' },
]

export default function SettingsPage() {
  const editorAppearance = useUIStore(s => s.editorAppearance)
  const commitEditorUi = useUIStore(s => s.commitEditorUi)

  return (
    <div className="flex flex-col h-full w-full p-8 bg-white text-text-primary">
      <h1 className="text-[11px] font-mono font-semibold text-text-muted uppercase tracking-widest mb-1">Settings</h1>
      <p className="text-xs text-text-muted max-w-md leading-relaxed mb-6">
        These options apply to the <span className="text-text-primary font-medium">image workspace</span> (Editor and
        future canvas tools). Home stays on its own fixed design.
      </p>

      <section className="max-w-lg">
        <h2 className="text-[10px] font-mono font-semibold text-text-muted uppercase tracking-widest mb-3">Editor theme</h2>
        <div className="flex flex-col gap-2">
          {THEME_OPTIONS.map((opt) => {
            const selected = editorAppearance === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => void commitEditorUi({ appearance: opt.value })}
                className={`text-left rounded-md border px-4 py-3 transition-colors active:scale-[0.99] ${
                  selected
                    ? 'border-accent/60 bg-accent-light'
                    : 'border-border bg-surface-50/50 hover:border-text-muted/50'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-text-primary">{opt.label}</span>
                  {selected && (
                    <span className="text-[10px] font-mono text-accent uppercase tracking-widest">active</span>
                  )}
                </div>
                <p className="text-xs text-text-muted mt-1 leading-relaxed">{opt.hint}</p>
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
