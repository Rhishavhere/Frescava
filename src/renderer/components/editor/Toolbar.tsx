import { useState, useEffect } from 'react'
import { useEditStore } from '../../store/editStore'
import { useUIStore, type EditorWorkspace } from '../../store/uiStore'
import { useProjectStore } from '../../store/projectStore'
import { useSessionStore } from '../../store/tabStore'
import { fileStem } from '@shared/pathUtils'
import { renderFullRes } from '../../lib/fullResRender'
import { Button } from '../ui'

declare global {
  interface Window {
    __frescavaGetCanvasDataURL?: () => string
    __frescavaGetCurrentLUT?: () => { data: Float32Array; size: number } | null
    __frescavaGetLumaHistogram?: () => number[] | null
  }
}

const WORKSPACE_TABS: { id: EditorWorkspace; label: string; soon?: boolean }[] = [
  { id: 'main', label: 'Editor' },
  { id: 'text', label: 'Text', soon: true },
  { id: 'templates', label: 'Templates', soon: true },
]

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
  const {
    isExporting,
    setIsExporting,
    setExportSuccess,
    showExportSuccess,
    editorWorkspace,
    setEditorWorkspace,
    openConfirm,
  } = useUIStore()
  const { smartSave, saveAs: saveProjectAs } = useProjectStore()
  const { addToSession, getActiveBatch, getActiveSession, markActiveImageClean } = useSessionStore()
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [exportMode, setExportMode] = useState<'canvas' | 'full-res'>('canvas')

  // Compare mode and “before” are mutually exclusive: never show original while compare is on
  useEffect(() => {
    if (compareMode) setShowOriginal(false)
  }, [compareMode, setShowOriginal])

  const handleOpen = async () => {
    const results = await window.frame.file.openMultiple()
    if (!results.length) return
    addToSession(results.map(r => ({ path: r.path, dataURL: r.dataURL, width: r.width, height: r.height })))
  }

  const handleExportCurrent = async () => {
    if (!imagePath) return
    setIsExporting(true)
    setShowExportMenu(false)
    try {
      let canvasDataURL: string | undefined
      if (exportMode === 'full-res') {
        const lut = window.__frescavaGetCurrentLUT?.()
        const result = await renderFullRes({ imagePath, params, lut, quality: 95 })
        canvasDataURL = result.dataURL
      } else {
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

  const handleExportAll = async () => {
    const batch = getActiveBatch()
    if (!batch.length) return
    setIsExporting(true)
    setShowExportMenu(false)
    try {
      const lut = window.__frescavaGetCurrentLUT?.()
      const images = await Promise.all(
        batch.map(async img => {
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
        })
      )
      const result = await window.frame.export.exportBatch({ images, outputDir: '' })
      if (result.success) {
        setExportSuccess(`Exported ${batch.length} images`)
        setTimeout(() => setExportSuccess(null), 5000)
      }
    } finally {
      setIsExporting(false)
    }
  }

  const buildProjectFile = () => {
    const session = getActiveSession()
    const primaryPath = session?.images[0]?.imagePath ?? imagePath!
    const name = fileStem(primaryPath) || 'Untitled'
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

  const toolBtn = (active: boolean) =>
    `btn-icon ${active ? 'bg-surface-200 text-text-primary dark:bg-zinc-800 dark:text-zinc-100' : ''}`

  return (
    <div className="relative flex items-center gap-1 px-2 py-1.5 border-b border-border dark:border-zinc-800/60 bg-white dark:bg-zinc-950/80 shrink-0 min-h-11">
      {/* ── Left: icon-only tools (batch count stays visible on the left) ── */}
      <div className="flex items-center gap-0.5 shrink-0 no-drag">
        <button className="btn-icon" type="button" onClick={handleOpen} title="Add images" aria-label="Add images">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"
            />
          </svg>
        </button>
        {isBatch && (
          <span
            className="text-[9px] font-mono tabular-nums text-text-muted dark:text-zinc-500 px-1"
            title={`${batch.length} images in batch`}
            aria-hidden
          >
            {batch.length}
          </span>
        )}
        <div className="w-px h-4 bg-border dark:bg-zinc-800 mx-0.5" />
        <button className="btn-icon" type="button" disabled={!canUndo()} onClick={undo} title="Undo" aria-label="Undo">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
          </svg>
        </button>
        <button className="btn-icon" type="button" disabled={!canRedo()} onClick={redo} title="Redo" aria-label="Redo">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="m15 15 6-6m0 0-6-6m6 6H9a6 6 0 0 0 0 12h3" />
          </svg>
        </button>
        <div className="w-px h-4 bg-border dark:bg-zinc-800 mx-0.5" />
        {hasImage && (
          <>
            <button
              type="button"
              className={`btn-icon transition-opacity ${
                compareMode
                  ? 'opacity-40 !cursor-not-allowed text-text-placeholder dark:text-zinc-600'
                  : showOriginal
                    ? 'bg-surface-200 text-text-primary dark:bg-zinc-800 dark:text-zinc-100'
                    : ''
              }`}
              onMouseDown={() => {
                if (!compareMode) setShowOriginal(true)
              }}
              onMouseUp={() => setShowOriginal(false)}
              onMouseLeave={() => setShowOriginal(false)}
              title={compareMode ? 'Turn off compare to use Before' : 'Hold for original'}
              aria-label="Before"
              aria-pressed={showOriginal}
              disabled={compareMode}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
            <button
              type="button"
              className={toolBtn(compareMode)}
              onClick={() => {
                setCompareMode(!compareMode)
                if (!compareMode) setShowOriginal(false)
              }}
              title="Side-by-side compare"
              aria-label="Compare"
              aria-pressed={compareMode}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4v16M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6Z"
                />
              </svg>
            </button>
            <button
              className="btn-icon"
              type="button"
              onClick={() =>
                openConfirm({
                  title: 'Reset all edits?',
                  message: 'This will reset sliders and effects for this image.',
                  confirmLabel: 'Reset',
                  onConfirm: () => resetAll(),
                })
              }
              title="Reset all"
              aria-label="Reset all"
            >
              <span className="text-sm leading-none font-mono">↺</span>
            </button>
          </>
        )}
      </div>

      {/* ── Center: Editor / Text / Templates (in-editor workspace) ── */}
      <div className="flex-1 flex justify-center min-w-0 px-2 no-drag">
        <div
          className="inline-flex rounded-lg p-0.5 bg-surface-100 dark:bg-zinc-900/80 border border-border dark:border-zinc-800/80"
          role="tablist"
          aria-label="Editor workspace"
        >
          {WORKSPACE_TABS.map(t => {
            const active = editorWorkspace === t.id
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setEditorWorkspace(t.id)}
                className={`px-2.5 sm:px-3 py-1 rounded-md text-[10px] sm:text-xs font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-white text-text-primary shadow-sm dark:bg-zinc-800 dark:text-zinc-100 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                    : 'text-text-muted dark:text-zinc-500 hover:text-text-primary dark:hover:text-zinc-200'
                }`}
              >
                {t.label}
                {t.soon && <span className="text-[8px] opacity-50 ml-0.5">·soon</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Right: labels for Save + Export only ── */}
      <div className="flex items-center gap-1.5 shrink-0 no-drag">
        {showExportSuccess && <span className="text-xs text-green-600 dark:text-emerald-400 font-medium hidden sm:inline">✓</span>}
        {hasImage && (
          <div className="relative group">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSave}
              title="Save project"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"
                />
                <polyline strokeLinecap="round" strokeLinejoin="round" points="17 21 17 13 7 13 7 21" />
                <polyline strokeLinecap="round" strokeLinejoin="round" points="7 3 7 8 15 8" />
              </svg>
              Save
            </Button>
            {/* <button
              type="button"
              onClick={handleSaveAs}
              className="absolute right-0 top-full mt-0.5 whitespace-nowrap bg-white border border-border rounded shadow-md px-2.5 py-1.5 text-[11px] text-text-secondary dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-300 hover:bg-surface-50 dark:hover:bg-zinc-800 z-40 hidden group-hover:block"
            >
              Save As…
            </button> */}
          </div>
        )}
        <div className="relative">
          <Button
            variant="primary"
            size="sm"
            disabled={!hasImage || isExporting}
            onClick={() => setShowExportMenu(v => !v)}
            loading={isExporting}
          >
            Export ▾
          </Button>
          {showExportMenu && (
            <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-border rounded-lg shadow-xl z-50 overflow-hidden py-1 dark:bg-zinc-900 dark:border-zinc-700">
              <div className="px-3 py-2 border-b border-border dark:border-zinc-800">
                <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">Resolution</p>
                <div className="flex gap-1">
                  {(['canvas', 'full-res'] as const).map(mode => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setExportMode(mode)}
                      className={`flex-1 py-1 px-2 rounded text-[10px] font-medium transition-colors ${
                        exportMode === mode
                          ? 'bg-text-primary text-white dark:bg-zinc-100 dark:text-zinc-900'
                          : 'bg-surface-100 text-text-muted dark:bg-zinc-800/80 dark:text-zinc-400 hover:bg-surface-200 dark:hover:bg-zinc-800'
                      }`}
                    >
                      {mode === 'canvas' ? 'Preview match' : 'Full-res'}
                    </button>
                  ))}
                </div>
                <p className="text-[9px] text-text-muted dark:text-zinc-500 mt-1">
                  {exportMode === 'canvas' ? 'Exact preview · canvas capture' : 'Full resolution from source file'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportCurrent}
                className="w-full text-left px-3 py-2 text-xs hover:bg-surface-50 dark:hover:bg-zinc-800/80 flex items-center gap-2"
              >
                <svg
                  className="w-3.5 h-3.5 text-text-muted dark:text-zinc-500 shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1M4 12l8 8m0 0 8-8M12 3v16"
                  />
                </svg>
                Export current image
              </button>
              {isBatch && (
                <button
                  type="button"
                  onClick={handleExportAll}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-surface-50 dark:hover:bg-zinc-800/80 flex items-center gap-2"
                >
                  <svg
                    className="w-3.5 h-3.5 text-text-muted dark:text-zinc-500 shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12h6m-3-3v6M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0z"
                    />
                  </svg>
                  Export all {batch.length} images
                </button>
              )}
              <div className="border-t border-border dark:border-zinc-800 mt-1 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowExportMenu(false)
                    void handleSaveAs()
                  }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-surface-50 dark:hover:bg-zinc-800/80 flex items-center gap-2 text-text-muted dark:text-zinc-500"
                >
                  <svg
                    className="w-3.5 h-3.5 shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"
                    />
                    <polyline strokeLinecap="round" strokeLinejoin="round" points="17 21 17 13 7 13 7 21" />
                  </svg>
                  Export Save File (.frex)
                </button>
              </div>
              <div className="fixed inset-0 -z-10" onClick={() => setShowExportMenu(false)} aria-hidden />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
