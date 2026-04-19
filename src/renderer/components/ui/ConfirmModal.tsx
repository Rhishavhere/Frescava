import { useEffect } from 'react'
import { useUIStore } from '../../store/uiStore'

export default function ConfirmModal() {
  const { confirm, closeConfirm } = useUIStore()

  // Close on Escape key
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
      className="fixed inset-0 z-[999] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)' }}
      onClick={closeConfirm}
    >
      {/* Panel */}
      <div
        className="relative rounded-xl shadow-2xl overflow-hidden"
        style={{
          width: 380,
          background: '#fff',
          border: '1px solid #E0E0E0',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Top accent bar */}
        <div style={{ height: 3, background: 'linear-gradient(90deg, #111 60%, #888 100%)' }} />

        {/* Content */}
        <div className="px-6 pt-5 pb-6">
          {/* Icon + title */}
          <div className="flex items-start gap-3 mb-3">
            <div
              className="shrink-0 flex items-center justify-center rounded-lg"
              style={{ width: 36, height: 36, background: '#F5F0E8', border: '1px solid #E0D8CC' }}
            >
              {/* Warning icon */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C4873A" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-text-primary" style={{ letterSpacing: '-0.01em' }}>
                {confirm.title}
              </h2>
              <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">
                {confirm.message}
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="my-4" style={{ height: 1, background: '#EBEBEB' }} />

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <button
              onClick={closeConfirm}
              className="px-4 py-2 rounded-lg text-xs font-medium transition-colors"
              style={{
                background: '#F5F5F5',
                color: '#555',
                border: '1px solid #E0E0E0',
              }}
              onMouseEnter={e => ((e.target as HTMLButtonElement).style.background = '#EBEBEB')}
              onMouseLeave={e => ((e.target as HTMLButtonElement).style.background = '#F5F5F5')}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="px-4 py-2 rounded-lg text-xs font-semibold transition-colors"
              style={{
                background: '#111',
                color: '#fff',
                border: '1px solid #111',
              }}
              onMouseEnter={e => ((e.target as HTMLButtonElement).style.background = '#333')}
              onMouseLeave={e => ((e.target as HTMLButtonElement).style.background = '#111')}
            >
              {confirm.confirmLabel ?? 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
