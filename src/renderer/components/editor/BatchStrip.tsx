import { useSessionStore } from '../../store/tabStore'
import { useEditStore } from '../../store/editStore'
import { usePresetStore } from '../../store/presetStore'

export default function BatchStrip() {
  const { setActiveImage, removeImage, addToSession, applyCurrentEditToAll } = useSessionStore()
  const session = useSessionStore(s => s.session)
  const batch = session?.images ?? []
  const params = useEditStore(s => s.params)
  const { getPresetById } = usePresetStore()

  if (!session || batch.length === 0) return null

  const presetLabel = params.presetId
    ? getPresetById(params.presetId)?.name ?? params.presetId
    : 'No preset'
  const canApplyAll = batch.length >= 2

  const handleAddMore = async () => {
    const results = await window.frame.file.openMultiple()
    if (!results.length) return
    addToSession(results.map(r => ({ path: r.path, dataURL: r.dataURL, width: r.width, height: r.height })))
  }

  return (
    <div className="h-20 shrink-0 overflow-hidden border-t border-[#E5E5E5] dark:border-[#E5E5E5]/30 bg-transparent dark:bg-transparent">
      <div className="flex h-full items-center gap-2 px-3 overflow-x-auto scrollbar-none bg-transparent dark:bg-transparent">
        <button
          type="button"
          className="shrink-0 px-[10px] py-[6px] text-[9px] font-mono font-semibold uppercase tracking-[0.06em] border border-[#111] bg-white text-[#111] rounded-none transition-[background,color,opacity,border-color] duration-100 cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed hover:enabled:bg-[#111] hover:enabled:text-white dark:border-white/20 dark:bg-[#19191b] dark:text-[#dbdbe1] dark:hover:enabled:bg-[color:var(--editor-accent)] dark:hover:enabled:border-[color:var(--editor-accent)] dark:hover:enabled:text-white"
          disabled={!canApplyAll}
          title={
            canApplyAll
              ? `Copy the current image's preset and all adjustments to every other image`
              : 'Add another image to enable Apply to all'
          }
          onClick={() => canApplyAll && applyCurrentEditToAll()}
        >
          Apply to all
        </button>

        <div className="shrink-0 px-2 mr-1 h-full flex items-center border-r border-[#E5E5E5] dark:border-white/10">
          <span className="text-[9px] font-mono uppercase tracking-wider opacity-50">
            {presetLabel} · {batch.length} {batch.length === 1 ? 'image' : 'images'}
          </span>
        </div>

        {batch.map((img, idx) => {
          const isActive = img.id === session.activeImageId
          return (
            <div
              key={img.id}
              className="relative shrink-0 cursor-pointer transition-transform duration-150 hover:-translate-y-0.5 group"
              onClick={() => setActiveImage(img.id)}
              title={img.label}
            >
              <div className={`relative w-[52px] h-[52px] rounded-[3px] overflow-hidden border-[1.5px] transition-colors duration-150 ${isActive ? 'border-[#111] dark:border-[color:var(--editor-accent)]' : 'border-transparent'}`}>
                <img
                  src={img.imageDataURL}
                  alt={img.label}
                  className="w-full h-full object-cover"
                />
                {isActive && <div className="absolute -inset-0.5 z-[1] border-2 border-[#111] dark:border-[color:var(--editor-accent)] rounded pointer-events-none" />}
              </div>

              <span className="absolute -bottom-[14px] left-1/2 -translate-x-1/2 text-[9px] font-mono whitespace-nowrap text-[#999] dark:text-zinc-700">{idx + 1}</span>

              <button
                className="absolute -top-[5px] -right-[5px] w-[15px] h-[15px] rounded-full bg-[#111] text-white border-0 cursor-pointer text-[8px] leading-none items-center justify-center hidden group-hover:flex"
                onClick={e => { e.stopPropagation(); removeImage(img.id) }}
                title="Remove from batch"
              >
                ✕
              </button>
            </div>
          )
        })}

        <button
          className="shrink-0 w-[38px] h-[38px] border-[1.5px] border-dashed border-black/20 rounded-[3px] bg-transparent cursor-pointer flex items-center justify-center text-black/35 transition-colors duration-150 hover:border-[#8B5C2A] hover:text-[#8B5C2A] dark:border-white/10 dark:text-white/35 dark:hover:border-[color:var(--editor-accent)] dark:hover:text-[color:var(--editor-accent-soft)]"
          onClick={handleAddMore}
          title="Add images to batch"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
      </div>
    </div>
  )
}
