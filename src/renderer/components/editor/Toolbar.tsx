import { useState } from 'react'
import { useEditStore } from '../../store/editStore'
import { useUIStore } from '../../store/uiStore'
import { useProjectStore } from '../../store/projectStore'
import { useSessionStore } from '../../store/tabStore'
import { renderFullRes } from '../../lib/fullResRender'
import { Button } from '../ui'

declare global {
  interface Window {
    __frescavaGetCanvasDataURL?: () => string
    __frescavaGetCurrentLUT?: () => { data: Float32Array; size: number } | null
  }
}

interface ToolbarProps {
  hasImage: boolean
}

export default function Toolbar({ hasImage }: ToolbarProps) {
  const {
    params,
    setShowOriginal,
    showOriginal,
    compareMode,
    setCompareMode,
    resetAll,
    undo,
    redo,
    canUndo,
    canRedo,
    imagePath,
    imageWidth,
    imageHeight,
  } = useEditStore()
  const { isExporting, setIsExporting, setExportSuccess, showExportSuccess } = useUIStore()
  const { smartSave, saveAs: saveProjectAs } = useProjectStore()
  const { addToSession, getActiveBatch, getActiveSession, markActiveImageClean } = useSessionStore()
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

  // ── Export current image ───────────────────────────────────────────────────
  const handleExportCurrent = async () => {
    if (!imagePath) return
    setIsExporting(true)
    setShowExportMenu(false)
    try {
      let canvasDataURL: string | undefined

      if (exportMode === 'full-res') {
        // Offscreen WebGL at original resolution — identical to preview pipeline
        const lut = window.__frescavaGetCurrentLUT?.()
        const result = await renderFullRes({
          imagePath,
          params,
          lut,
          quality: 95,
        })
        canvasDataURL = result.dataURL
      } else {
        // Canvas-capture: exact preview match at display resolution
        canvasDataURL = window.__frescavaGetCanvasDataURL?.()
      }

      const result = await window.frame.export.save({
        imagePath,
        outputPath: '',
        editState: { imagePath, imageWidth, imageHeight, ...params },
        quality: 95,
        canvasDataURL,
      })
      if (result.success && result.outputPath) {
        setExportSuccess(result.outputPath)
        setTimeout(() => setExportSuccess(null), 4000)
      }
    } finally {
      setIsExporting(false)
    }
  }

  // ── Export all images in batch ────────────────────────────────────────────────
  const handleExportAll = async () => {
    const batch = getActiveBatch()
    if (!batch.length) return
    setIsExporting(true)
    setShowExportMenu(false)
    try {
      // For each image: do an offscreen WebGL render then save
      const lut = window.__frescavaGetCurrentLUT?.()
      const images = await Promise.all(batch.map(async img => {
        const sessionPresetId = getActiveSession()?.sharedPresetId ?? null
        const sessionPresetIntensity = getActiveSession()?.sharedPresetIntensity ?? 1
        const imgParams = {
          ...img.adjustments,
          presetId: sessionPresetId,
          presetIntensity: sessionPresetIntensity,
        }
        let canvasDataURL: string | undefined
        if (exportMode === 'full-res') {
          const result = await renderFullRes({
            imagePath: img.imagePath,
            params: imgParams as typeof params,
            lut,
            quality: 95,
          })
          canvasDataURL = result.dataURL
        }
        return {
          imagePath: img.imagePath,
          outputPath: '',
          editState: {
            imagePath: img.imagePath,
            imageWidth: img.imageWidth,
            imageHeight: img.imageHeight,
            ...imgParams,
          },
          quality: 95,
          canvasDataURL,
        }
      }))

      const result = await window.frame.export.exportBatch({ images, outputDir: '' })
      if (result.success) {
        setExportSuccess(`Exported ${batch.length} images`)
        setTimeout(() => setExportSuccess(null), 5000)
      }
    } finally {
      setIsExporting(false)
    }
  }

  // ── Save project (smart: first save = dialog, subsequent = overwrite) ─────
  const buildProjectFile = () => {
    const name = imagePath!.split(/[\/]/).pop()?.replace(/\.[^.]+$/, '') ?? 'Untitled'
    return {
      version: 1 as const,
      name,
      imagePath: imagePath!,
      imageWidth,
      imageHeight,
      editState: params,
      previewDataURL: window.__frescavaGetCanvasDataURL?.() ?? '',
      savedAt: new Date().toISOString(),
    }
  }

  const handleSave = async () => {
    if (!imagePath) return
    const path = await smartSave(buildProjectFile())
    if (path) markActiveImageClean()
  }

  const handleSaveAs = async () => {
    if (!imagePath) return
    const path = await saveProjectAs(buildProjectFile())
    if (path) markActiveImageClean()
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
          className={`btn-ghost text-xs gap-1 ${showOriginal && !compareMode ? 'bg-surface-100 text-text-primary' : ''}`}
          title="Hold to see original"
          disabled={compareMode}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />
          </svg>
          Before
        </button>
      )}

      {hasImage && (
        <button
          className={`btn-ghost text-xs gap-1 ${compareMode ? 'bg-text-primary text-white hover:bg-text-primary hover:text-white' : ''}`}
          onClick={() => setCompareMode(!compareMode)}
          title="Toggle side-by-side compare"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6Z" />
          </svg>
          Compare
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
      {/* Save — hover reveals Save As */}
      {hasImage && (
        <div className="relative group">
          <Button variant="ghost" size="sm" onClick={handleSave} title="Save project (.frex)">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
              <polyline strokeLinecap="round" strokeLinejoin="round" points="17 21 17 13 7 13 7 21"/>
              <polyline strokeLinecap="round" strokeLinejoin="round" points="7 3 7 8 15 8"/>
            </svg>
            Save
          </Button>
          <button
            onClick={handleSaveAs}
            className="absolute right-0 top-full mt-0.5 whitespace-nowrap bg-white border border-border rounded shadow-md px-2.5 py-1.5 text-[11px] text-text-secondary hover:bg-surface-50 z-40 hidden group-hover:block"
          >
            Save As…
          </button>
        </div>
      )}

      {/* ── Export — click = open dropdown ── */}
      <div className="relative">
        <Button
          variant="primary"
          size="sm"
          disabled={!hasImage || isExporting}
          onClick={() => setShowExportMenu(v => !v)}
          loading={isExporting}
        >
          {isBatch ? 'Export ▾' : 'Export ▾'}
        </Button>

        {/* Dropdown — opens BELOW the button */}
        {showExportMenu && (
          <div
            className="absolute right-0 top-full mt-1 w-56 bg-white border border-border rounded-lg shadow-xl z-50 overflow-hidden py-1"
          >
            {/* Resolution picker */}
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
              <p className="text-[9px] text-text-muted mt-1">
                {exportMode === 'canvas' ? 'Exact preview · canvas capture' : 'Full resolution from source file'}
              </p>
            </div>

            {/* Export current */}
            <button
              onClick={handleExportCurrent}
              className="w-full text-left px-3 py-2 text-xs hover:bg-surface-50 flex items-center gap-2"
            >
              <svg className="w-3.5 h-3.5 text-text-muted shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1M4 12l8 8m0 0 8-8M12 3v16" />
              </svg>
              Export current image
            </button>

            {/* Export all */}
            {isBatch && (
              <button
                onClick={handleExportAll}
                className="w-full text-left px-3 py-2 text-xs hover:bg-surface-50 flex items-center gap-2"
              >
                <svg className="w-3.5 h-3.5 text-text-muted shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-3-3v6M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0z" />
                </svg>
                Export all {batch.length} images
              </button>
            )}

            {/* Save As in export menu too */}
            <div className="border-t border-border mt-1 pt-1">
              <button
                onClick={() => { setShowExportMenu(false); handleSaveAs() }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-surface-50 flex items-center gap-2 text-text-muted"
              >
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                  <polyline strokeLinecap="round" strokeLinejoin="round" points="17 21 17 13 7 13 7 21"/>
                </svg>
                Save As… (browse location)
              </button>
            </div>

            {/* Close on outside click */}
            <div
              className="fixed inset-0 -z-10"
              onClick={() => setShowExportMenu(false)}
            />
          </div>
        )}
      </div>
    </div>
  )
}
