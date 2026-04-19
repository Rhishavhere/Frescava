import { useState } from 'react'
import { useEditStore } from '../../store/editStore'
import { useUIStore } from '../../store/uiStore'
import { useProjectStore } from '../../store/projectStore'
import { useSessionStore } from '../../store/tabStore'
import { Button } from '../ui'

declare global {
  interface Window {
    __frescavaGetCanvasDataURL?: () => string
  }
}

interface ToolbarProps {
  hasImage: boolean
}

export default function Toolbar({ hasImage }: ToolbarProps) {
  const { params, setShowOriginal, showOriginal, resetAll, undo, redo, canUndo, canRedo, imagePath, imageWidth, imageHeight } = useEditStore()
  const { isExporting, setIsExporting, setExportSuccess, showExportSuccess, setActiveTab } = useUIStore()
  const { saveProject } = useProjectStore()
  const { addToSession, getActiveBatch, getActiveSession } = useSessionStore()
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [exportMode, setExportMode] = useState<'canvas' | 'full-res'>('canvas')

  // ── File open → adds to current session batch ──────────────────────────────
  const handleOpen = async () => {
    const results = await window.frame.file.openMultiple()
    if (!results.length) return
    addToSession(results.map(r => ({ path: r.path, dataURL: r.dataURL, width: r.width, height: r.height })))
  }

  // ── Build export payload for a single image ───────────────────────────────
  const buildExportPayload = (overrideCanvasURL?: string) => {
    const fullState = useEditStore.getState()
    return {
      imagePath: fullState.imagePath ?? '',
      outputPath: '',
      editState: {
        imagePath: fullState.imagePath ?? '',
        imageWidth: fullState.imageWidth,
        imageHeight: fullState.imageHeight,
        ...fullState.params,
      },
      quality: 95,
      canvasDataURL: exportMode === 'canvas' ? (overrideCanvasURL ?? window.__frescavaGetCanvasDataURL?.()) : undefined,
    }
  }

  // ── Export current image ──────────────────────────────────────────────────
  const handleExportCurrent = async () => {
    if (!imagePath) return
    setIsExporting(true)
    setShowExportMenu(false)
    try {
      const result = await window.frame.export.save(buildExportPayload())
      if (result.success && result.outputPath) {
        setExportSuccess(result.outputPath)
        setTimeout(() => setExportSuccess(null), 4000)
      }
    } finally {
      setIsExporting(false)
    }
  }

  // ── Export all images in batch ────────────────────────────────────────────
  const handleExportAll = async () => {
    const batch = getActiveBatch()
    if (!batch.length) return
    setIsExporting(true)
    setShowExportMenu(false)
    try {
      const result = await window.frame.export.exportBatch({
        images: batch.map(img => ({
          imagePath: img.imagePath,
          outputPath: '',
          editState: {
            imagePath: img.imagePath,
            imageWidth: img.imageWidth,
            imageHeight: img.imageHeight,
            presetId: getActiveSession()?.sharedPresetId ?? null,
            presetIntensity: getActiveSession()?.sharedPresetIntensity ?? 1,
            ...img.adjustments,
          },
          quality: 95,
          canvasDataURL: undefined, // full-res mode for batch (source file)
        })),
        outputDir: '',
      })
      if (result.success) {
        setExportSuccess(`Exported ${batch.length} images`)
        setTimeout(() => setExportSuccess(null), 5000)
      }
    } finally {
      setIsExporting(false)
    }
  }

  // ── Save project ──────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!imagePath) return
    const previewDataURL = window.__frescavaGetCanvasDataURL?.() ?? ''
    const name = imagePath.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, '') ?? 'Untitled'
    await saveProject({
      version: 1,
      name,
      imagePath,
      imageWidth,
      imageHeight,
      editState: params,
      previewDataURL,
      savedAt: new Date().toISOString(),
    })
  }

  const batch = getActiveBatch()
  const isBatch = batch.length > 1

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-white shrink-0">
      {/* ── Left actions ── */}
      <Button variant="ghost" size="sm" onClick={handleOpen} title="Add images to batch (multi-select allowed)">
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
        </svg>
        Open
      </Button>

      <div className="w-px h-4 bg-border" />

      {/* Undo/Redo */}
      <button className="btn-icon" disabled={!canUndo()} onClick={undo} title="Undo (Ctrl+Z)">
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
        </svg>
      </button>
      <button className="btn-icon" disabled={!canRedo()} onClick={redo} title="Redo">
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="m15 15 6-6m0 0-6-6m6 6H9a6 6 0 0 0 0 12h3" />
        </svg>
      </button>

      <div className="w-px h-4 bg-border" />

      {/* Before/After */}
      {hasImage && (
        <button
          onMouseDown={() => setShowOriginal(true)}
          onMouseUp={() => setShowOriginal(false)}
          onMouseLeave={() => setShowOriginal(false)}
          className={`btn-ghost text-xs gap-1 ${showOriginal ? 'bg-surface-100 text-text-primary' : ''}`}
          title="Hold to see original"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />
          </svg>
          Before
        </button>
      )}

      {/* Reset */}
      {hasImage && (
        <button className="btn-ghost text-xs" onClick={() => { if (confirm('Reset all edits?')) resetAll() }}>
          Reset
        </button>
      )}

      {/* ── Center info ── */}
      <div className="flex-1 flex items-center justify-center gap-2">
        {isBatch && (
          <span className="text-[10px] font-mono text-text-muted px-2 py-0.5 bg-surface-100 rounded">
            Batch · {batch.length} images
          </span>
        )}
        {params.presetId && (
          <span className="text-xs text-text-muted">
            {params.presetId} · <span className="text-text-primary">{Math.round(params.presetIntensity * 100)}%</span>
          </span>
        )}
      </div>

      {/* Export success */}
      {showExportSuccess && (
        <span className="text-xs text-green-600 font-medium">✓ Exported</span>
      )}

      {/* Save */}
      {hasImage && (
        <Button variant="ghost" size="sm" onClick={handleSave} title="Save project (.frex)">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline strokeLinecap="round" strokeLinejoin="round" points="17 21 17 13 7 13 7 21"/>
            <polyline strokeLinecap="round" strokeLinejoin="round" points="7 3 7 8 15 8"/>
          </svg>
          Save
        </Button>
      )}

      {/* ── Export button with dropdown ── */}
      <div className="relative">
        <div className="flex">
          <Button
            variant="primary"
            size="sm"
            disabled={!hasImage || isExporting}
            onClick={handleExportCurrent}
            loading={isExporting}
            style={{ borderRadius: '6px 0 0 6px' }}
          >
            {isBatch ? 'Export Current' : 'Export'}
          </Button>
          <button
            disabled={!hasImage || isExporting}
            onClick={() => setShowExportMenu(v => !v)}
            className="flex items-center justify-center px-1.5 text-white disabled:opacity-40"
            style={{ background: '#111', borderRadius: '0 6px 6px 0', borderLeft: '1px solid rgba(255,255,255,0.2)' }}
            title="Export options"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
            </svg>
          </button>
        </div>

        {/* Dropdown menu */}
        {showExportMenu && (
          <div
            className="absolute right-0 bottom-full mb-1 w-52 bg-white border border-border rounded-lg shadow-lg z-50 overflow-hidden py-1"
            onMouseLeave={() => setShowExportMenu(false)}
          >
            {/* Export mode */}
            <div className="px-3 py-2 border-b border-border">
              <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">Resolution</p>
              <div className="flex gap-1">
                {(['canvas', 'full-res'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setExportMode(mode)}
                    className={`flex-1 py-1 px-2 rounded text-[10px] font-medium transition-colors ${
                      exportMode === mode ? 'bg-text-primary text-white' : 'bg-surface-100 text-text-muted hover:bg-surface-200'
                    }`}
                  >
                    {mode === 'canvas' ? 'Preview match' : 'Full-res'}
                  </button>
                ))}
              </div>
              {exportMode === 'canvas' && (
                <p className="text-[9px] text-text-muted mt-1">Canvas quality · exact preview match</p>
              )}
              {exportMode === 'full-res' && (
                <p className="text-[9px] text-text-muted mt-1">Full resolution from source file</p>
              )}
            </div>

            {/* Actions */}
            <button onClick={handleExportCurrent}
              className="w-full text-left px-3 py-2 text-xs hover:bg-surface-50 flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-4m0 0V8m0 4h4m-4 0H8m12 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2" />
              </svg>
              Export current image
            </button>

            {isBatch && (
              <button onClick={handleExportAll}
                className="w-full text-left px-3 py-2 text-xs hover:bg-surface-50 flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-3-3v6M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0z" />
                </svg>
                Export all {batch.length} images
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
