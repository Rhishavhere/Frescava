import { useRef, useEffect, useCallback, useMemo } from 'react'
import { useEditStore, DEFAULT_EDIT_STATE } from '../../store/editStore'
import { useSessionStore } from '../../store/tabStore'
import { RenderPipeline } from '../../lib/RenderPipeline'
import { usePresetStore } from '../../store/presetStore'

export default function ImageCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const originalCanvasRef = useRef<HTMLCanvasElement>(null)
  const pipelineRef = useRef<RenderPipeline | null>(null)
  const originalPipelineRef = useRef<RenderPipeline | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>(0)
  const lastEditRef = useRef<string>('')
  const currentImageRef = useRef<HTMLImageElement | null>(null)
  const currentLUTRef = useRef<string | null>(null)
  // Store the raw LUT float data so it can be reused by full-res export
  const currentLUTDataRef = useRef<{ data: Float32Array; size: number } | null>(null)

  const { imagePath, imageDataURL, params, showOriginal, compareMode } = useEditStore()
  const session = useSessionStore(s => s.session)
  const activeImageDirty = useMemo(() => {
    if (!session?.activeImageId) return false
    return session.images.find(i => i.id === session.activeImageId)?.isDirty ?? false
  }, [session])
  const { presets, getPresetById } = usePresetStore()

  const activeFileLabel = imagePath ? imagePath.replace(/^.*[\\/]/, '') : ''
  const activeFileLabelShort = useMemo(() => {
    const MAX = 15
    if (activeFileLabel.length <= MAX) return activeFileLabel

    const dot = activeFileLabel.lastIndexOf('.')
    if (dot <= 0 || dot === activeFileLabel.length - 1) {
      return `${activeFileLabel.slice(0, MAX)}...`
    }

    const ext = activeFileLabel.slice(dot + 1)
    const sep = '...'
    const headBudget = MAX - sep.length - ext.length

    if (headBudget < 3) return `${activeFileLabel.slice(0, MAX)}...`
    return `${activeFileLabel.slice(0, headBudget)}${sep}${ext}`
  }, [activeFileLabel])

  // ── Initialize WebGL pipeline ──────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    try {
      const pipeline = new RenderPipeline(canvas)
      pipelineRef.current = pipeline

      if (originalCanvasRef.current) {
        originalPipelineRef.current = new RenderPipeline(originalCanvasRef.current)
      }

      // Expose canvas capture method globally so Toolbar can access it without prop-drilling
      window.__frescavaGetCanvasDataURL = () => pipeline.getCanvasDataURL()
      window.__frescavaGetLumaHistogram = () => pipeline.getLumaHistogram256()
      // Expose current LUT for full-res export reuse
      window.__frescavaGetCurrentLUT = () => currentLUTDataRef.current
    } catch (e) {
      console.error('[Canvas] WebGL init failed:', e)
    }

    return () => {
      window.__frescavaGetCanvasDataURL = undefined
      window.__frescavaGetLumaHistogram = undefined
      window.__frescavaGetCurrentLUT = undefined
      if (pipelineRef.current) {
        pipelineRef.current.destroy()
        pipelineRef.current = null
      }
      if (originalPipelineRef.current) {
        originalPipelineRef.current.destroy()
        originalPipelineRef.current = null
      }
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  // ── Load image into pipeline when it changes ───────────────────────────────
  useEffect(() => {
    if (!imageDataURL || !pipelineRef.current || !canvasRef.current || !originalCanvasRef.current || !containerRef.current) return

    let isCancelled = false

    const loadBitmap = async () => {
      try {
        const response = await fetch(imageDataURL)
        const blob = await response.blob()
        // ImageBitmaps ignore WebGL's UNPACK_FLIP_Y_WEBGL, so we must flip them here
        const img = await createImageBitmap(blob, { imageOrientation: 'flipY' })

        if (isCancelled || !pipelineRef.current || !containerRef.current) {
          img.close()
          return
        }

        currentImageRef.current = img as unknown as HTMLImageElement

        // Size canvas to fit container while maintaining aspect ratio
        const container = containerRef.current
        const containerW = container.clientWidth
        const containerH = container.clientHeight
        const aspect = img.width / img.height

        const availableW = compareMode ? (containerW - 72) / 2 : containerW - 48
        let displayW = availableW
        let displayH = displayW / aspect
        if (displayH > containerH - 48) {
          displayH = containerH - 48
          displayW = displayH * aspect
        }

        const canvas = canvasRef.current!
        canvas.width = Math.round(displayW)
        canvas.height = Math.round(displayH)
        const originalCanvas = originalCanvasRef.current!
        originalCanvas.width = Math.round(displayW)
        originalCanvas.height = Math.round(displayH)

        pipelineRef.current.resize(canvas.width, canvas.height)
        originalPipelineRef.current?.resize(originalCanvas.width, originalCanvas.height)
        pipelineRef.current.loadImage(img)
        originalPipelineRef.current?.loadImage(img)
        // Ensure requestRender is called, it will be defined by the time this async function resolves
        requestRender()
      } catch (e) {
        console.error('[Canvas] Failed to load ImageBitmap:', e)
      }
    }

    loadBitmap()

    return () => {
      isCancelled = true
    }
  }, [imageDataURL, compareMode])

  const preset = useMemo(() => params.presetId ? getPresetById(params.presetId) : null, [params.presetId, presets, getPresetById])

  // ── Load LUT when preset changes ───────────────────────────────────────────
  useEffect(() => {
    const presetId = params.presetId
    if (!pipelineRef.current) return

    if (!presetId || (showOriginal && !compareMode)) {
      pipelineRef.current.clearLUT()
      currentLUTRef.current = null
      requestRender()
      return
    }

    if (!preset?.lutFile) {
      pipelineRef.current.clearLUT()
      currentLUTRef.current = null
      requestRender()
      return
    }

    if (currentLUTRef.current === preset.lutFile) return // already loaded

    window.frame.assets.loadLUT(preset.lutFile).then(lutData => {
      if (!pipelineRef.current) return
      const float32 = new Float32Array(lutData.data)
      pipelineRef.current.loadLUT(float32, lutData.size)
      currentLUTRef.current = preset.lutFile
      currentLUTDataRef.current = { data: float32, size: lutData.size }
      requestRender()
    }).catch(e => {
      console.error('[Canvas] LUT load failed:', e)
    })
  }, [params.presetId, preset?.lutFile, showOriginal, compareMode])

  // ── Load Textures when preset changes ──────────────────────────────────────
  const currentTexturePresetRef = useRef<string | null>(null)
  useEffect(() => {
    const presetId = params.presetId
    if (!pipelineRef.current) return

    if (!presetId || (showOriginal && !compareMode)) {
      pipelineRef.current.clearOverlayTextures()
      currentTexturePresetRef.current = null
      requestRender()
      return
    }

    if (!preset) return

    pipelineRef.current.clearOverlayTextures()
    currentTexturePresetRef.current = presetId

    const loadTex = async (id: string, filename: string) => {
      try {
        const buffer = await window.frame.assets.loadTexture(filename)
        const blob = new Blob([buffer])
        const url = URL.createObjectURL(blob)
        const img = new Image()
        img.onload = () => {
          pipelineRef.current?.loadOverlayTexture(id, img)
          URL.revokeObjectURL(url)
          requestRender()
        }
        img.src = url
      } catch (e) {
        console.error(`[Canvas] Failed to load overlay texture ${filename}:`, e)
      }
    }

    if (preset.defaults.lightLeak?.textureFile) {
      loadTex('lightLeak', preset.defaults.lightLeak.textureFile)
    }
    if (preset.defaults.dustScratches?.textureFile) {
      loadTex('dustScratches', preset.defaults.dustScratches.textureFile)
    }
    if (preset.defaults.grain?.textureFile) {
      loadTex('presetGrain', preset.defaults.grain.textureFile)
    }
    if (preset.defaults.border?.textureFile) {
      loadTex('border', preset.defaults.border.textureFile)
    }
  }, [
    params.presetId,
    preset?.defaults.lightLeak?.textureFile,
    preset?.defaults.dustScratches?.textureFile,
    preset?.defaults.grain?.textureFile,
    preset?.defaults.border?.textureFile,
    showOriginal,
    compareMode
  ])

  // ── Re-render whenever params change ──────────────────────────────────────
  const requestRender = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      const pipeline = pipelineRef.current
      const originalPipeline = originalPipelineRef.current
      const img = currentImageRef.current
      if (!pipeline || !img) return

      const editState = useEditStore.getState()
      const state = showOriginal && !compareMode
        ? { ...DEFAULT_EDIT_STATE, presetId: null, presetIntensity: 1 }
        : editState.params

      if (compareMode && originalPipeline) {
        originalPipeline.render({
          imagePath: editState.imagePath ?? '',
          imageWidth: editState.imageWidth,
          imageHeight: editState.imageHeight,
          ...DEFAULT_EDIT_STATE,
          presetId: null,
          presetIntensity: 1,
        })
      }

      pipeline.render({
        imagePath: editState.imagePath ?? '',
        imageWidth: editState.imageWidth,
        imageHeight: editState.imageHeight,
        ...state,
        presetLutIntensity: preset?.lutIntensity ?? 1.0,
      } as any)
      window.dispatchEvent(new CustomEvent('frescava-canvas-repaint'))
    })
  }, [showOriginal, compareMode, preset?.lutIntensity])

  // Subscribe to store changes for re-rendering
  useEffect(() => {
    const stateKey = JSON.stringify({
      params,
      showOriginal,
      compareMode,
      lutFile: preset?.lutFile,
      lutIntensity: preset?.lutIntensity,
    })
    if (stateKey === lastEditRef.current) return
    lastEditRef.current = stateKey
    requestRender()
  }, [params, showOriginal, compareMode, preset?.lutFile, preset?.lutIntensity, requestRender])

  // ── Container resize observer ──────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const ro = new ResizeObserver(() => {
      if (!currentImageRef.current || !pipelineRef.current || !canvasRef.current || !originalCanvasRef.current) return
      const img = currentImageRef.current
      const w = compareMode ? (container.clientWidth - 72) / 2 : container.clientWidth - 48
      const h = container.clientHeight - 48
      const aspect = img.width / img.height
      let dW = w, dH = w / aspect
      if (dH > h) { dH = h; dW = h * aspect }
      const canvas = canvasRef.current
      canvas.width = Math.round(dW)
      canvas.height = Math.round(dH)
      const originalCanvas = originalCanvasRef.current
      originalCanvas.width = Math.round(dW)
      originalCanvas.height = Math.round(dH)
      pipelineRef.current.resize(canvas.width, canvas.height)
      originalPipelineRef.current?.resize(originalCanvas.width, originalCanvas.height)
      requestRender()
    })
    ro.observe(container)
    return () => ro.disconnect()
  }, [requestRender, compareMode])

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full flex items-center justify-center canvas-container ${compareMode ? 'gap-4 px-6' : ''}`}
    >
      {activeFileLabel && (
        <div
          className="absolute top-3 left-3 z-20 pointer-events-none max-w-[min(90%,32rem)] min-w-0 flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-white/90 dark:bg-zinc-950/90 text-[11px] font-medium text-text-primary dark:text-zinc-100 shadow-panel border border-black/5 dark:border-white/10 backdrop-blur-sm"
          title={activeFileLabel + (activeImageDirty ? ' — unsaved edits' : '')}
        >
          <span className="min-w-0 flex-1 truncate">{activeFileLabelShort}</span>
          {activeImageDirty && (
            <span
              className="h-2 w-2 shrink-0 rounded-full bg-amber-500 dark:bg-amber-400 ring-1 ring-white/60 dark:ring-zinc-900/80"
              aria-label="Unsaved edits"
            />
          )}
        </div>
      )}
      <div className={compareMode ? 'relative' : 'hidden'}>
        <canvas
          ref={originalCanvasRef}
          className="shadow-panel-lg rounded-sm"
          style={{ maxWidth: '100%', maxHeight: '100%', display: 'block' }}
        />
        {compareMode && (
          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/90 dark:bg-zinc-900/90 text-[10px] font-semibold text-text-primary dark:text-zinc-100 shadow-panel dark:shadow-[0_1px_12px_rgba(0,0,0,0.5)] pointer-events-none border border-black/5 dark:border-white/10">
            Before
          </div>
        )}
      </div>
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="shadow-panel-lg rounded-sm"
          style={{ maxWidth: '100%', maxHeight: '100%', display: 'block' }}
        />
        {compareMode && (
          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-text-primary/85 text-[10px] font-semibold text-white shadow-panel pointer-events-none">
            After
          </div>
        )}
      </div>
      {/* Before/after overlay label */}
      {showOriginal && !compareMode && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-text-primary bg-opacity-70 text-white text-xs font-medium backdrop-blur-sm pointer-events-none">
          Original
        </div>
      )}
    </div>
  )
}
