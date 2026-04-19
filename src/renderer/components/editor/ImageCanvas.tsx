import { useRef, useEffect, useCallback } from 'react'
import { useEditStore, DEFAULT_EDIT_STATE } from '../../store/editStore'
import { RenderPipeline } from '../../lib/RenderPipeline'
import { usePresetStore } from '../../store/presetStore'

export default function ImageCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pipelineRef = useRef<RenderPipeline | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>(0)
  const lastEditRef = useRef<string>('')
  const currentImageRef = useRef<HTMLImageElement | null>(null)
  const currentLUTRef = useRef<string | null>(null)

  const { imagePath, imageDataURL, params, showOriginal } = useEditStore()
  const { getPresetById } = usePresetStore()

  // ── Initialize WebGL pipeline ──────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    try {
      const pipeline = new RenderPipeline(canvas)
      pipelineRef.current = pipeline
    } catch (e) {
      console.error('[Canvas] WebGL init failed:', e)
    }

    return () => {
      if (pipelineRef.current) {
        pipelineRef.current.destroy()
        pipelineRef.current = null
      }
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  // ── Load image into pipeline when it changes ───────────────────────────────
  useEffect(() => {
    if (!imageDataURL || !pipelineRef.current || !canvasRef.current || !containerRef.current) return

    const img = new Image()
    img.onload = () => {
      if (!pipelineRef.current || !containerRef.current) return
      currentImageRef.current = img

      // Size canvas to fit container while maintaining aspect ratio
      const container = containerRef.current
      const containerW = container.clientWidth
      const containerH = container.clientHeight
      const aspect = img.width / img.height

      let displayW = containerW - 48 // padding
      let displayH = displayW / aspect
      if (displayH > containerH - 48) {
        displayH = containerH - 48
        displayW = displayH * aspect
      }

      const canvas = canvasRef.current!
      canvas.width = Math.round(displayW)
      canvas.height = Math.round(displayH)

      pipelineRef.current.resize(canvas.width, canvas.height)
      pipelineRef.current.loadImage(img)
      requestRender()
    }
    img.src = imageDataURL
  }, [imageDataURL])

  // ── Load LUT when preset changes ───────────────────────────────────────────
  useEffect(() => {
    const presetId = params.presetId
    if (!pipelineRef.current) return

    if (!presetId || showOriginal) {
      pipelineRef.current.clearLUT()
      currentLUTRef.current = null
      requestRender()
      return
    }

    const preset = getPresetById(presetId)
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
      requestRender()
    }).catch(e => {
      console.warn('[Canvas] LUT load failed:', e)
    })
  }, [params.presetId, getPresetById, showOriginal])

  // ── Re-render whenever params change ──────────────────────────────────────
  const requestRender = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      const pipeline = pipelineRef.current
      const img = currentImageRef.current
      if (!pipeline || !img) return

      const editState = useEditStore.getState()
      const state = showOriginal
        ? { ...DEFAULT_EDIT_STATE, presetId: null, presetIntensity: 1 }
        : editState.params

      pipeline.render({
        imagePath: editState.imagePath ?? '',
        imageWidth: editState.imageWidth,
        imageHeight: editState.imageHeight,
        ...state,
      })
    })
  }, [showOriginal])

  // Subscribe to store changes for re-rendering
  useEffect(() => {
    const stateKey = JSON.stringify({ params, showOriginal })
    if (stateKey === lastEditRef.current) return
    lastEditRef.current = stateKey
    requestRender()
  }, [params, showOriginal, requestRender])

  // ── Container resize observer ──────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const ro = new ResizeObserver(() => {
      if (!currentImageRef.current || !pipelineRef.current || !canvasRef.current) return
      const img = currentImageRef.current
      const w = container.clientWidth - 48
      const h = container.clientHeight - 48
      const aspect = img.width / img.height
      let dW = w, dH = w / aspect
      if (dH > h) { dH = h; dW = h * aspect }
      const canvas = canvasRef.current
      canvas.width = Math.round(dW)
      canvas.height = Math.round(dH)
      pipelineRef.current.resize(canvas.width, canvas.height)
      requestRender()
    })
    ro.observe(container)
    return () => ro.disconnect()
  }, [requestRender])

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex items-center justify-center canvas-container"
    >
      <canvas
        ref={canvasRef}
        className="shadow-panel-lg rounded-sm"
        style={{ maxWidth: '100%', maxHeight: '100%', display: 'block' }}
      />
      {/* Before/after overlay label */}
      {showOriginal && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-text-primary bg-opacity-70 text-white text-xs font-medium backdrop-blur-sm pointer-events-none">
          Original
        </div>
      )}
    </div>
  )
}
