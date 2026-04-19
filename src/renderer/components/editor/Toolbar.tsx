import { useEditStore } from '../../store/editStore'
import { useUIStore } from '../../store/uiStore'
import { useProjectStore } from '../../store/projectStore'
import { useTabStore } from '../../store/tabStore'
import { Button, Spinner } from '../ui'

// Exposed via ref from ImageCanvas
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
  const { isExporting, setIsExporting, setExportSuccess } = useUIStore()
  const { saveProject } = useProjectStore()
  const { openTab } = useTabStore()

  // Open a new image as an additional tab
  const handleNew = async () => {
    const result = await window.frame.file.open()
    if (!result) return
    openTab({ path: result.path, dataURL: result.dataURL, width: result.width, height: result.height })
  }

  // Open replaces the current tab (same as before)
  const handleOpenNew = async () => {
    const result = await window.frame.file.open()
    if (!result) return
    openTab({ path: result.path, dataURL: result.dataURL, width: result.width, height: result.height })
  }

  const handleExport = async () => {
    if (!imagePath) return
    setIsExporting(true)
    try {
      const fullState = useEditStore.getState()
      // Option A: capture WebGL canvas directly for 1:1 parity
      const canvasDataURL = window.__frescavaGetCanvasDataURL?.()

      const result = await window.frame.export.save({
        imagePath,
        outputPath: '',
        editState: {
          imagePath,
          imageWidth: fullState.imageWidth,
          imageHeight: fullState.imageHeight,
          ...params,
        },
        quality: 95,
        canvasDataURL, // Send canvas capture for Option A parity
      })

      if (result.success && result.outputPath) {
        setExportSuccess(result.outputPath)
        setTimeout(() => setExportSuccess(null), 4000)
      } else if (result.error && result.error !== 'Cancelled') {
        console.error('[Export]', result.error)
      }
    } finally {
      setIsExporting(false)
    }
  }


  const handleSave = async () => {
    if (!imagePath) return
    const canvasDataURL = window.__frescavaGetCanvasDataURL?.() ?? ''
    // Generate a thumbnail (small version from canvas)
    const previewDataURL = canvasDataURL

    const state = useEditStore.getState()
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

  const { showExportSuccess } = useUIStore()

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-white shrink-0">
      {/* Left actions */}
      <Button variant="ghost" size="sm" onClick={handleNew} title="New project">
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
        </svg>
        New
      </Button>

      <Button variant="ghost" size="sm" onClick={handleOpenNew}>
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

      {/* Before/after toggle */}
      {hasImage && (
        <button
          onMouseDown={() => setShowOriginal(true)}
          onMouseUp={() => setShowOriginal(false)}
          onMouseLeave={() => setShowOriginal(false)}
          className={`btn-ghost text-xs gap-1 ${showOriginal ? 'bg-surface-100 text-text-primary' : ''}`}
          title="Hold to see original"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          Before
        </button>
      )}

      {/* Reset */}
      {hasImage && (
        <button
          className="btn-ghost text-xs"
          onClick={() => { if (confirm('Reset all edits?')) resetAll() }}
          title="Reset all edits"
        >
          Reset
        </button>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Export success toast */}
      {showExportSuccess && (
        <span className="text-xs text-success font-medium animate-fade-in">
          ✓ Exported
        </span>
      )}

      {/* Preset name */}
      {params.presetId && (
        <span className="text-xs text-text-muted">
          {params.presetId}
          {' · '}
          <span className="text-text-primary">{Math.round(params.presetIntensity * 100)}%</span>
        </span>
      )}

      {/* Save */}
      {hasImage && (
        <Button variant="ghost" size="sm" onClick={handleSave} title="Save project">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline strokeLinecap="round" strokeLinejoin="round" points="17 21 17 13 7 13 7 21"/>
            <polyline strokeLinecap="round" strokeLinejoin="round" points="7 3 7 8 15 8"/>
          </svg>
          Save
        </Button>
      )}

      {/* Export */}
      <Button
        variant="primary"
        size="sm"
        disabled={!hasImage || isExporting}
        onClick={handleExport}
        loading={isExporting}
      >
        Export
      </Button>
    </div>
  )
}
