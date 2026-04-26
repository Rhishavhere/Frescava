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
    <div className="batch-strip">
      <div className="batch-strip-inner">
        <button
          type="button"
          className="batch-apply-all-btn"
          disabled={!canApplyAll}
          title={
            canApplyAll
              ? 'Copy the current image’s preset and all adjustments to every other image'
              : 'Add another image to enable Apply to all'
          }
          onClick={() => canApplyAll && applyCurrentEditToAll()}
        >
          Apply to all
        </button>

        <div className="batch-preset-badge">
          <span className="text-[9px] font-mono uppercase tracking-wider opacity-50">
            {presetLabel} · {batch.length} {batch.length === 1 ? 'image' : 'images'}
          </span>
        </div>

        {batch.map((img, idx) => {
          const isActive = img.id === session.activeImageId
          return (
            <div
              key={img.id}
              className={`batch-thumb ${isActive ? 'batch-thumb-active' : ''}`}
              onClick={() => setActiveImage(img.id)}
              title={img.label}
            >
              <div className="batch-thumb-img">
                <img
                  src={img.imageDataURL}
                  alt={img.label}
                  className="w-full h-full object-cover"
                />
                {isActive && <div className="batch-thumb-ring" />}
              </div>

              <span className="batch-thumb-idx">{idx + 1}</span>

              <button
                className="batch-thumb-remove"
                onClick={e => { e.stopPropagation(); removeImage(img.id) }}
                title="Remove from batch"
              >
                ✕
              </button>
            </div>
          )
        })}

        <button className="batch-add-btn" onClick={handleAddMore} title="Add images to batch">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
      </div>
    </div>
  )
}
