import { useSessionStore } from '../../store/tabStore'

export default function BatchStrip() {
  const { getActiveBatch, getActiveSession, setActiveImage, removeImage, addToSession } = useSessionStore()
  const batch = getActiveBatch()
  const session = getActiveSession()

  if (!session || batch.length <= 1) return null   // only show when 2+ images

  const handleAddMore = async () => {
    const results = await window.frame.file.openMultiple()
    if (!results.length) return
    addToSession(results.map(r => ({ path: r.path, dataURL: r.dataURL, width: r.width, height: r.height })))
  }

  return (
    <div className="batch-strip">
      <div className="batch-strip-inner">
        {/* Preset badge */}
        <div className="batch-preset-badge">
          <span className="text-[9px] font-mono uppercase tracking-wider opacity-50">
            {session.sharedPresetId ?? 'No preset'} · {batch.length} images
          </span>
        </div>

        {/* Thumbnails */}
        {batch.map((img, idx) => {
          const isActive = img.id === session.activeImageId
          return (
            <div
              key={img.id}
              className={`batch-thumb ${isActive ? 'batch-thumb-active' : ''}`}
              onClick={() => setActiveImage(img.id)}
              title={img.label}
            >
              {/* Image */}
              <div className="batch-thumb-img">
                <img
                  src={img.imageDataURL}
                  alt={img.label}
                  className="w-full h-full object-cover"
                />
                {/* Active ring */}
                {isActive && <div className="batch-thumb-ring" />}
              </div>

              {/* Index badge */}
              <span className="batch-thumb-idx">{idx + 1}</span>

              {/* Remove button — only on hover */}
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

        {/* Add more */}
        <button className="batch-add-btn" onClick={handleAddMore} title="Add images to batch">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
      </div>
    </div>
  )
}
