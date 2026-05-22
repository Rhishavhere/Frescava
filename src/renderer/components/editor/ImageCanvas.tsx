import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useEditStore, DEFAULT_EDIT_STATE } from '../../store/editStore'
import { useSessionStore } from '../../store/tabStore'
import { RenderPipeline } from '../../lib/RenderPipeline'
import { usePresetStore } from '../../store/presetStore'

// Helper to draw editorial star sparkles
function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(cx, cy - r)
  ctx.quadraticCurveTo(cx, cy, cx + r, cy)
  ctx.quadraticCurveTo(cx, cy, cx, cy + r)
  ctx.quadraticCurveTo(cx, cy, cx - r, cy)
  ctx.quadraticCurveTo(cx, cy, cx, cy - r)
  ctx.closePath()
  ctx.fill()
}

// Draw all text layers onto context
export function drawTextLayers(
  ctx: CanvasRenderingContext2D,
  layers: any[],
  width: number,
  height: number,
  onMeasure?: (bounds: { id: string; x: number; y: number; w: number; h: number }) => void
) {
  ctx.clearRect(0, 0, width, height)

  for (const layer of layers) {
    ctx.save()

    // 1. Setup typography basics
    const sz = (layer.fontSize / 100) * height // size relative to canvas height
    const weight = layer.fontWeight || '400'
    const style = layer.fontStyle || 'normal'
    const fontName = layer.fontFamily || 'sans-serif'
    ctx.font = `${style} ${weight} ${sz}px "${fontName}"`
    ctx.fillStyle = layer.color || '#FFFFFF'
    ctx.globalAlpha = layer.opacity !== undefined ? layer.opacity : 1.0
    ctx.textAlign = layer.alignment || 'center'
    ctx.textBaseline = 'alphabetic'

    // Letter spacing (em tracking)
    if (layer.letterSpacing !== undefined) {
      ctx.letterSpacing = `${layer.letterSpacing}em`
    } else {
      ctx.letterSpacing = '0px'
    }

    // Text case
    let text = layer.text || ''
    if (layer.textCase === 'uppercase') text = text.toUpperCase()
    else if (layer.textCase === 'lowercase') text = text.toLowerCase()

    // Multi-line support
    const lines = text.split('\n')
    const lineHeight = layer.lineHeight || 1.2
    const leadingPx = lineHeight * sz

    // Compute coordinates in display space
    const cx = (layer.position.x / 100) * width
    const cy = (layer.position.y / 100) * height

    // Bounding box calculations
    // Measure each line to find the max width
    let maxLineWidth = 0
    lines.forEach(line => {
      const metrics = ctx.measureText(line)
      if (metrics.width > maxLineWidth) {
        maxLineWidth = metrics.width
      }
    })

    // Height of text block
    const blockHeight = lines.length * leadingPx
    
    // Compute block bounding box relative to text layout (textAlign alignment)
    let blockX = cx
    if (layer.alignment === 'center') {
      blockX = cx - maxLineWidth / 2
    } else if (layer.alignment === 'right') {
      blockX = cx - maxLineWidth
    }
    const blockY = cy - sz // top of first line is roughly cy - sz

    // Notify parent of measured bounding box for interactive selection overlay
    if (onMeasure) {
      onMeasure({
        id: layer.id,
        x: blockX,
        y: blockY,
        w: maxLineWidth,
        h: blockHeight
      })
    }

    // 2. Draw border/background pill behind the text if enabled
    if (layer.border?.enabled) {
      ctx.save()
      const borderPadX = (layer.border.paddingX / 100) * width
      const borderPadY = (layer.border.paddingY / 100) * height
      const bx = blockX - borderPadX
      const by = blockY - borderPadY
      const bw = maxLineWidth + borderPadX * 2
      const bh = blockHeight + borderPadY * 2
      
      ctx.fillStyle = layer.border.color || '#FFFFFF'
      ctx.strokeStyle = layer.border.color || '#FFFFFF'
      ctx.lineWidth = layer.border.width || 1

      ctx.beginPath()
      if (layer.border.type === 'pill' || layer.border.type === 'oval') {
        const radius = Math.min(bw, bh) / 2
        ctx.roundRect(bx, by, bw, bh, radius)
      } else {
        ctx.roundRect(bx, by, bw, bh, 0)
      }
      ctx.fill()
      ctx.restore()
    }

    // 3. Draw Deco Left/Right (star sparkles) if enabled
    if (layer.decoLeftRight === 'star') {
      ctx.save()
      ctx.fillStyle = layer.color || '#FFFFFF'
      const starRadius = sz * 0.4
      const starOffset = sz * 0.6 // distance from text edge
      
      // Draw left star
      const leftStarX = blockX - starOffset
      const leftStarY = cy - sz * 0.35
      drawStar(ctx, leftStarX, leftStarY, starRadius)

      // Draw right star
      const rightStarX = blockX + maxLineWidth + starOffset
      const rightStarY = cy - sz * 0.35
      drawStar(ctx, rightStarX, rightStarY, starRadius)
      
      ctx.restore()
    }

    // 4. Draw text lines
    lines.forEach((line, index) => {
      const lineY = cy + index * leadingPx
      ctx.fillText(line, cx, lineY)
    })

    ctx.restore()
  }
}

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
  const currentLUTDataRef = useRef<{ data: Float32Array; size: number } | null>(null)

  // Text layers states & refs
  const [boundsMap, setBoundsMap] = useState<Record<string, { x: number; y: number; w: number; h: number }>>({})
  const boundsMapRef = useRef<Record<string, { x: number; y: number; w: number; h: number }>>({})
  const textCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const prevBoundsStrRef = useRef<string>('')

  // Dragging/resizing state refs
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number; startSize: number } | null>(null)
  const dragModeRef = useRef<'move' | 'resize' | null>(null)

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

      window.__frescavaGetCanvasDataURL = () => pipeline.getCanvasDataURL()
      window.__frescavaGetLumaHistogram = () => pipeline.getLumaHistogram256()
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
        const img = await createImageBitmap(blob, { imageOrientation: 'flipY' })

        if (isCancelled || !pipelineRef.current || !containerRef.current) {
          img.close()
          return
        }

        currentImageRef.current = img as unknown as HTMLImageElement

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

  // ── Load Google Fonts when text layers change ──────────────────────────────
  useEffect(() => {
    if (!params.textLayers || params.textLayers.length === 0 || showOriginal) return

    const fontFamilies = Array.from(new Set(params.textLayers.map(l => l.fontFamily)))
    const localFonts = ['sans-serif', 'serif', 'monospace', 'CoffekanRegular', 'KenokyLight', 'system-ui']

    let fontLoaded = false

    fontFamilies.forEach(family => {
      if (!family || localFonts.includes(family)) return

      const id = `gfont-${family.replace(/\s+/g, '-').toLowerCase()}`
      if (!document.getElementById(id)) {
        const link = document.createElement('link')
        link.id = id
        link.rel = 'stylesheet'
        link.href = `https://fonts.googleapis.com/css2?family=${family.replace(/\s+/g, '+')}:ital,wght@0,300;0,400;0,500;0,700;0,900;1,300;1,400;1,700&display=swap`
        document.head.appendChild(link)
        fontLoaded = true
      }
    })

    if (fontLoaded) {
      document.fonts.ready.then(() => {
        requestRender()
      })
    }
  }, [params.textLayers, showOriginal, requestRender])

  // ── Re-render whenever params change ──────────────────────────────────────
  const requestRender = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      const pipeline = pipelineRef.current
      const originalPipeline = originalPipelineRef.current
      const img = currentImageRef.current
      const canvas = canvasRef.current
      if (!pipeline || !img || !canvas) return

      try {
        const editState = useEditStore.getState()
        const state = showOriginal && !compareMode
          ? { ...DEFAULT_EDIT_STATE, presetId: null, presetIntensity: 1, textLayers: [] }
          : editState.params

        if (compareMode && originalPipeline) {
          originalPipeline.render({
            imagePath: editState.imagePath ?? '',
            imageWidth: editState.imageWidth,
            imageHeight: editState.imageHeight,
            ...DEFAULT_EDIT_STATE,
            presetId: null,
            presetIntensity: 1,
            textLayers: [],
          } as any)
        }

        // Rasterize text layers onto offscreen canvas if present
        let textTexture: WebGLTexture | null = null
        if (state.textLayers && state.textLayers.length > 0) {
          if (!textCanvasRef.current) {
            textCanvasRef.current = document.createElement('canvas')
          }
          const textCanvas = textCanvasRef.current
          textCanvas.width = canvas.width
          textCanvas.height = canvas.height
          
          const ctx2d = textCanvas.getContext('2d')
          if (ctx2d) {
            const newBoundsMap: Record<string, { x: number; y: number; w: number; h: number }> = {}
            drawTextLayers(ctx2d, state.textLayers, textCanvas.width, textCanvas.height, (b) => {
              newBoundsMap[b.id] = { x: b.x, y: b.y, w: b.w, h: b.h }
            })
            
            const boundsStr = JSON.stringify(newBoundsMap)
            if (boundsStr !== prevBoundsStrRef.current) {
              prevBoundsStrRef.current = boundsStr
              boundsMapRef.current = newBoundsMap
              setTimeout(() => {
                setBoundsMap(newBoundsMap)
              }, 0)
            }
          }
          textTexture = pipeline.uploadTextTexture(textCanvas)
        } else {
          pipeline.clearTextTexture()
          if (Object.keys(boundsMapRef.current).length > 0) {
            boundsMapRef.current = {}
            prevBoundsStrRef.current = ''
            setTimeout(() => {
              setBoundsMap({})
            }, 0)
          }
        }

        pipeline.render({
          imagePath: editState.imagePath ?? '',
          imageWidth: editState.imageWidth,
          imageHeight: editState.imageHeight,
          ...state,
          presetLutIntensity: preset?.lutIntensity ?? 1.0,
        } as any, textTexture)

        window.dispatchEvent(new CustomEvent('frescava-canvas-repaint'))
      } catch (err) {
        console.error('[Canvas] Render execution failed:', err)
      }
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

  // ── Interactive Drag & Resize Handlers ─────────────────────────────────────
  const handleMouseMove = useCallback((e: MouseEvent) => {
    const start = dragStartRef.current
    const mode = dragModeRef.current
    const canvas = canvasRef.current
    if (!start || !mode || !canvas) return

    const { activeTextId, textLayers } = useEditStore.getState().params
    if (!activeTextId) return
    const activeLayer = textLayers.find(l => l.id === activeTextId)
    if (!activeLayer) return

    const deltaX = e.clientX - start.mouseX
    const deltaY = e.clientY - start.mouseY
    const canvasW = canvas.width
    const canvasH = canvas.height

    if (mode === 'move') {
      const pctX = (deltaX / canvasW) * 100
      const pctY = (deltaY / canvasH) * 100
      useEditStore.getState().updateTextLayer(activeTextId, {
        position: {
          x: Math.max(0, Math.min(100, start.startX + pctX)),
          y: Math.max(0, Math.min(100, start.startY + pctY)),
        }
      })
    } else if (mode === 'resize') {
      const pctChangeY = (deltaY / canvasH) * 100
      const newSize = Math.max(0.5, start.startSize + pctChangeY)
      useEditStore.getState().updateTextLayer(activeTextId, {
        fontSize: parseFloat(newSize.toFixed(2)),
      })
    }
  }, [])

  const handleMouseUp = useCallback(() => {
    dragStartRef.current = null
    dragModeRef.current = null
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }, [handleMouseMove])

  const handleMouseDown = useCallback((e: React.MouseEvent, mode: 'move' | 'resize') => {
    const { activeTextId, textLayers } = useEditStore.getState().params
    if (!activeTextId) return
    const activeLayer = textLayers.find(l => l.id === activeTextId)
    const activeBounds = boundsMapRef.current[activeTextId]
    if (!activeLayer || !activeBounds) return

    e.preventDefault()
    e.stopPropagation()

    dragModeRef.current = mode
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: activeLayer.position.x,
      startY: activeLayer.position.y,
      startSize: activeLayer.fontSize,
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [handleMouseMove, handleMouseUp])

  const activeTextId = params.activeTextId
  const activeBounds = activeTextId ? boundsMap[activeTextId] : null
  const activeLayer = activeTextId ? params.textLayers.find(l => l.id === activeTextId) : null

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
        
        {/* Absolute interactive bounds container for active/inactive text layers */}
        {!showOriginal && params.textLayers && params.textLayers.length > 0 && (
          <div className="absolute left-0 top-0 w-full h-full pointer-events-none overflow-hidden select-none">
            {/* Outline box for other inactive layers so they can be clicked */}
            {Object.entries(boundsMap).map(([id, bounds]) => {
              if (id === activeTextId) return null
              return (
                <div
                  key={id}
                  style={{
                    position: 'absolute',
                    left: bounds.x,
                    top: bounds.y,
                    width: bounds.w,
                    height: bounds.h,
                    cursor: 'pointer',
                    pointerEvents: 'auto',
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation()
                    useEditStore.getState().setActiveTextId(id)
                  }}
                  title="Click to select text layer"
                />
              )
            })}

            {/* Active bounding box with resize handle */}
            {activeBounds && activeLayer && (
              <div
                style={{
                  position: 'absolute',
                  left: activeBounds.x,
                  top: activeBounds.y,
                  width: activeBounds.w,
                  height: activeBounds.h,
                  border: '1.5px solid #3b82f6',
                  boxShadow: '0 0 6px rgba(0, 0, 0, 0.5)',
                  pointerEvents: 'auto',
                  cursor: 'move',
                }}
                onMouseDown={(e) => handleMouseDown(e, 'move')}
              >
                {/* Resize handle at bottom-right corner */}
                <div
                  style={{
                    position: 'absolute',
                    right: -6,
                    bottom: -6,
                    width: 12,
                    height: 12,
                    backgroundColor: '#3b82f6',
                    border: '1.5px solid #ffffff',
                    borderRadius: '50%',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                    cursor: 'se-resize',
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation()
                    handleMouseDown(e, 'resize')
                  }}
                />
              </div>
            )}
          </div>
        )}

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
