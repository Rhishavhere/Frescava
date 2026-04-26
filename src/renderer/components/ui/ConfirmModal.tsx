import { useEffect } from 'react'
import { useUIStore } from '../../store/uiStore'

export default function ConfirmModal() {
  const { confirm, closeConfirm } = useUIStore()

  useEffect(() => {
    if (!confirm) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeConfirm()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [confirm, closeConfirm])

  if (!confirm) return null

  const handleConfirm = () => {
    confirm.onConfirm()
    closeConfirm()
  }

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 dark:bg-black/60 backdrop-blur-sm"
      onClick={closeConfirm}
    >
      <div
        className="relative w-[380px] max-w-[calc(100vw-2rem)] rounded-xl border border-border dark:border-zinc-700/80 overflow-hidden bg-white dark:bg-zinc-900 text-text-primary dark:text-zinc-100 shadow-2xl dark:shadow-[0_20px_60px_rgba(0,0,0,0.65)]"
        onClick={e => e.stopPropagation()}
      >
        <div
          className="h-[3px] bg-gradient-to-r from-text-primary from-60% to-neutral-500 dark:from-amber-600/90 dark:via-amber-300/50 dark:to-zinc-500"
        />

        <div className="px-6 pt-5 pb-6">
          <div className="flex items-start gap-3 mb-3">
            <div className="shrink-0 flex items-center justify-center w-9 h-9 rounded-lg border border-amber-100 dark:border-amber-900/40 bg-amber-50/80 dark:bg-amber-950/40">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-film dark:text-amber-300" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-text-primary dark:text-zinc-100">
                {confirm.title}
              </h2>
              <p className="text-xs text-text-secondary dark:text-zinc-400 mt-0.5 leading-relaxed">
                {confirm.message}
              </p>
            </div>
          </div>

          <div className="my-4 h-px bg-border dark:bg-zinc-800" />

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeConfirm}
              className="px-4 py-2 rounded-lg text-xs font-medium border border-border dark:border-zinc-600 bg-surface-100 dark:bg-zinc-800 text-text-secondary dark:text-zinc-300 hover:bg-surface-200 dark:hover:bg-zinc-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-4 py-2 rounded-lg text-xs font-semibold border border-text-primary bg-text-primary text-white dark:border-[color:var(--editor-accent-mid)] dark:bg-[color:var(--editor-accent-mid)] dark:text-zinc-950 hover:opacity-90 transition-colors"
            >
              {confirm.confirmLabel ?? 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
