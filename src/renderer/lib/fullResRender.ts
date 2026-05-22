/**
 * fullResRender.ts
 *
 * Renders the current edit state at the ORIGINAL full resolution using an
 * offscreen WebGL canvas — exact same pipeline as the preview, so the output
 * is pixel-identical (LUT, grain, vignette, halation, CA, etc.) but at native
 * image dimensions instead of the 2560-capped preview size.
 */

import { RenderPipeline } from './RenderPipeline'
import type { EditState } from '@shared/types'
import { usePresetStore } from '../store/presetStore'

export interface FullResRenderOptions {
  /** Original source file path — will be loaded at full resolution */
  imagePath: string
  /** Current edit params to apply (preset, adjustments, effects) */
  params: Omit<EditState, 'imagePath' | 'imageWidth' | 'imageHeight'>
  /** LUT data if a preset with a LUT is active — caller must already have loaded this */
  lut?: { data: Float32Array; size: number } | null
  /** JPEG quality for the output data URL (0-100) */
  quality?: number
}

export interface FullResRenderResult {
  /** JPEG data URL at original resolution, ready to be saved */
  dataURL: string
  width: number
  height: number
}

export async function renderFullRes(opts: FullResRenderOptions): Promise<FullResRenderResult> {
  const { imagePath, params, lut } = opts

  // 1. Load original image at full resolution (no resize)
  const fullImg = await window.frame.file.loadFull(imagePath)

  // 2. Create an offscreen canvas at the original size
  const canvas = document.createElement('canvas')
  canvas.width = fullImg.width
  canvas.height = fullImg.height

  // 3. Instantiate a fresh RenderPipeline on the offscreen canvas
  let pipeline: RenderPipeline | null = null
  try {
    pipeline = new RenderPipeline(canvas)

    // 4. Load the source image into the pipeline
    await new Promise<void>((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        pipeline!.loadImage(img)
        resolve()
      }
      img.onerror = reject
      img.src = fullImg.dataURL
    })

    // 5. Load LUT if present
    if (lut) {
      pipeline.loadLUT(lut.data, lut.size)
    } else {
      pipeline.clearLUT()
    }

    // Load any missing Google Fonts before rendering
    if (params.textLayers && params.textLayers.length > 0) {
      const fontFamilies = Array.from(new Set(params.textLayers.map(l => l.fontFamily)))
      const localFonts = ['sans-serif', 'serif', 'monospace', 'CoffekanRegular', 'KenokyLight', 'system-ui']
      const fontsToLoad: Promise<void>[] = []
      
      fontFamilies.forEach(family => {
        if (!family || localFonts.includes(family)) return
        
        const id = `gfont-${family.replace(/\s+/g, '-').toLowerCase()}`
        if (!document.getElementById(id)) {
          const link = document.createElement('link')
          link.id = id
          link.rel = 'stylesheet'
          link.href = `https://fonts.googleapis.com/css2?family=${family.replace(/\s+/g, '+')}:ital,wght@0,300;0,400;0,500;0,700;0,900;1,300;1,400;1,700&display=swap`
          document.head.appendChild(link)
        }
        
        fontsToLoad.push(document.fonts.load(`12px "${family}"`).then(() => {}))
      })
      
      if (fontsToLoad.length > 0) {
        await Promise.all(fontsToLoad)
      }
      await document.fonts.ready
    }

    // Rasterize text layers at full resolution if present
    let textTexture: WebGLTexture | null = null
    if (params.textLayers && params.textLayers.length > 0) {
      const textCanvas = document.createElement('canvas')
      textCanvas.width = fullImg.width
      textCanvas.height = fullImg.height
      
      const ctx2d = textCanvas.getContext('2d')
      if (ctx2d) {
        const { drawTextLayers } = await import('../components/editor/ImageCanvas')
        drawTextLayers(ctx2d, params.textLayers, textCanvas.width, textCanvas.height)
      }
      
      textTexture = pipeline.uploadTextTexture(textCanvas)
    }

    // 6. Build a full EditState to pass to render()
    const fullState: EditState = {
      imagePath,
      imageWidth: fullImg.width,
      imageHeight: fullImg.height,
      ...params,
    }

    // Look up presetLutIntensity from the store
    const presetLutIntensity = params.presetId
      ? usePresetStore.getState().getPresetById(params.presetId)?.lutIntensity ?? 1.0
      : 1.0

    // 7. Render — same WebGL pipeline as the preview
    pipeline.render({ ...fullState, presetLutIntensity } as any, textTexture)

    // 8. Read pixels from the canvas into a JPEG data URL
    const dataURL = canvas.toDataURL('image/jpeg', (opts.quality ?? 95) / 100)

    return { dataURL, width: fullImg.width, height: fullImg.height }
  } catch (e) {
    throw new Error(`Full-res WebGL rendering failed: ${e}`)
  } finally {
    if (pipeline) {
      pipeline.destroy()
    }
  }
}
