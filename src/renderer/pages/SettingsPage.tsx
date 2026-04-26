import { useUIStore } from '../store/uiStore'
import type { AppAppearance } from '@shared/types'

const THEME_OPTIONS: { value: AppAppearance; label: string; hint: string }[] = [
  { value: 'dark', label: 'Dark', hint: 'Premium dark workspace for the editor and future canvas view.' },
  { value: 'light', label: 'Light', hint: 'Bright UI for the image workspace. Home stays unchanged below.' },
]

export default function SettingsPage() {
  const editorAppearance = useUIStore(s => s.editorAppearance)
  const commitEditorUi = useUIStore(s => s.commitEditorUi)

  return (
    <div className="flex flex-col h-full w-full p-8 bg-white text-text-primary">
      <h1 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-1">Settings</h1>
      <p className="text-xs text-text-muted max-w-md leading-relaxed mb-6">
        These options apply to the <span className="text-text-primary font-medium">image workspace</span> (Editor, and
        future canvas tools). The Home experience stays on its own fixed design.
      </p>

      <section className="max-w-lg">
        <h2 className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-3">Editor theme</h2>
        <div className="flex flex-col gap-2">
          {THEME_OPTIONS.map((opt) => {
            const selected = editorAppearance === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => void commitEditorUi({ appearance: opt.value })}
                className={`text-left rounded-lg border px-4 py-3 transition-colors ${
                  selected
                    ? 'border-film/80 bg-amber-50/90'
                    : 'border-border bg-surface-50/50 hover:border-text-muted/60'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-text-primary">{opt.label}</span>
                  {selected && (
                    <span className="text-[10px] font-mono text-film uppercase tracking-wider">active</span>
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
