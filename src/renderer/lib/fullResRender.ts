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
  let pipeline: RenderPipeline
  try {
    pipeline = new RenderPipeline(canvas)
  } catch (e) {
    throw new Error(`Full-res WebGL context creation failed: ${e}`)
  }

  // 4. Load the source image into the pipeline
  await new Promise<void>((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      pipeline.loadImage(img)
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

  // 6. Build a full EditState to pass to render()
  const fullState: EditState = {
    imagePath,
    imageWidth: fullImg.width,
    imageHeight: fullImg.height,
    ...params,
  }

  // 7. Render — same WebGL pipeline as the preview
  pipeline.render(fullState)

  // 8. Read pixels from the canvas into a JPEG data URL
  const dataURL = canvas.toDataURL('image/jpeg', (opts.quality ?? 95) / 100)

  return { dataURL, width: fullImg.width, height: fullImg.height }
}
