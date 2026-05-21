import { ipcMain, dialog, BrowserWindow } from 'electron'
import { join } from 'path'
import type { ExportOptions } from '../../src/shared/types'

export function registerExportHandlers(): void {
  ipcMain.handle('export:save', async (_event, opts: ExportOptions) => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return { success: false, error: 'No window' }

    // Show save dialog
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: 'Export Photo',
      defaultPath: `frescava_export_${Date.now()}.jpg`,
      filters: [
        { name: 'JPEG', extensions: ['jpg', 'jpeg'] },
        { name: 'PNG', extensions: ['png'] },
      ],
    })

    if (canceled || !filePath) return { success: false, error: 'Cancelled' }

    try {
      const sharp = require('sharp') as typeof import('sharp')
      let pipeline: ReturnType<typeof sharp>

      if (opts.canvasDataURL) {
        // Option A: use the WebGL canvas capture directly — perfect parity with preview
        const base64 = opts.canvasDataURL.replace(/^data:image\/\w+;base64,/, '')
        const buffer = Buffer.from(base64, 'base64')
        pipeline = sharp(buffer)
      } else {
        // Option B: full-res Sharp re-render from original file (no preview parity but full resolution)
        pipeline = sharp(opts.imagePath).rotate()

        const brightness = exposureToBrightness(opts.editState.exposure)
        const satMult = saturationToMultiplier(opts.editState.saturation)
        const { alpha: contrastAlpha, beta: contrastBeta } = contrastToLinear(opts.editState.contrast)

        pipeline = pipeline.modulate({ brightness, saturation: satMult })
        pipeline = pipeline.linear(contrastAlpha, contrastBeta)

        if (opts.editState.temperature !== 0) {
          const tempSat = 1 + (Math.abs(opts.editState.temperature) / 100) * 0.1
          pipeline = pipeline.modulate({ saturation: tempSat })
        }
        if (opts.editState.sharpness > 0) {
          const sigma = 0.5 + (opts.editState.sharpness / 100) * 1.5
          pipeline = pipeline.sharpen({ sigma })
        }
        if (opts.editState.lensBlur > 0) {
          const sigma = 0.25 + (opts.editState.lensBlur / 100) * 2.5
          pipeline = pipeline.blur(sigma)
        }
        if (opts.editState.gaussianBlur > 0) {
          const sigma = 0.25 + (opts.editState.gaussianBlur / 100) * 2.5
          pipeline = pipeline.blur(sigma)
        }
        if (opts.editState.zoomBlur > 0) {
          const sigma = 0.25 + (opts.editState.zoomBlur / 100) * 1.5
          pipeline = pipeline.blur(sigma)
        }
      }

      if (opts.maxDimension) {
        pipeline = pipeline.resize(opts.maxDimension, opts.maxDimension, {
          fit: 'inside',
          withoutEnlargement: true
        })
      }

      if (filePath.endsWith('.png')) {
        await pipeline.png({ compressionLevel: 8 }).toFile(filePath)
      } else {
        await pipeline.jpeg({ quality: opts.quality, mozjpeg: true }).toFile(filePath)
      }

      return { success: true, outputPath: filePath }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[Frescava Export]', err)
      return { success: false, error: message }
    }
  })

  // ── Batch export: export multiple images to a chosen folder ──────────────────
  ipcMain.handle('export:exportBatch', async (_event, opts: {
    images: ExportOptions[]
    outputDir: string
  }) => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return { success: false, error: 'No window' }

    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      title: 'Choose Export Folder',
      properties: ['openDirectory', 'createDirectory'],
    })
    if (canceled || !filePaths[0]) return { success: false, error: 'Cancelled' }

    const outDir = filePaths[0]
    const sharp = require('sharp') as typeof import('sharp')
    const exported: string[] = []

    for (const imgOpts of opts.images) {
      try {
        let pipeline: ReturnType<typeof sharp>
        if (imgOpts.canvasDataURL) {
          const base64 = imgOpts.canvasDataURL.replace(/^data:image\/\w+;base64,/, '')
          const buffer = Buffer.from(base64, 'base64')
          pipeline = sharp(buffer)
        } else {
          pipeline = sharp(imgOpts.imagePath).rotate()
          const brightness = exposureToBrightness(imgOpts.editState.exposure)
          const satMult = saturationToMultiplier(imgOpts.editState.saturation)
          const { alpha, beta } = contrastToLinear(imgOpts.editState.contrast)
          pipeline = pipeline.modulate({ brightness, saturation: satMult }).linear(alpha, beta)
          if (imgOpts.editState.sharpness > 0) {
            pipeline = pipeline.sharpen({ sigma: 0.5 + (imgOpts.editState.sharpness / 100) * 1.5 })
          }
          if (imgOpts.editState.lensBlur > 0) {
            const sigma = 0.25 + (imgOpts.editState.lensBlur / 100) * 2.5
            pipeline = pipeline.blur(sigma)
          }
          if (imgOpts.editState.gaussianBlur > 0) {
            const sigma = 0.25 + (imgOpts.editState.gaussianBlur / 100) * 2.5
            pipeline = pipeline.blur(sigma)
          }
          if (imgOpts.editState.zoomBlur > 0) {
            const sigma = 0.25 + (imgOpts.editState.zoomBlur / 100) * 1.5
            pipeline = pipeline.blur(sigma)
          }
        }
        const basename = imgOpts.imagePath.split(/[\\/]/).pop() ?? 'export'
        const nameNoExt = basename.replace(/\.[^.]+$/, '')
        const outPath = join(outDir, `frescava_${nameNoExt}.jpg`)
        await pipeline.jpeg({ quality: imgOpts.quality, mozjpeg: true }).toFile(outPath)
        exported.push(outPath)
      } catch (e) {
        console.error('[Batch Export] Failed for', imgOpts.imagePath, e)
      }
    }

    return { success: true, exported, count: exported.length }
  })
}

// ─── Conversion helpers ───────────────────────────────────────────────────────

function exposureToBrightness(exposure: number): number {
  // exposure: -5 to 5 EV → brightness multiplier
  return Math.pow(2, exposure / 2)
}

function saturationToMultiplier(saturation: number): number {
  // saturation: -100 to 100 → 0.0 to 2.0 multiplier (1.0 = no change)
  return 1 + saturation / 100
}

function contrastToLinear(contrast: number): { alpha: number; beta: number } {
  // contrast: -100 to 100 → linear transform y = alpha*x + beta
  // At contrast 0: alpha=1, beta=0
  // At contrast 100: alpha≈1.5, beta≈-40 (mid-grey preserved)
  const alpha = 1 + (contrast / 100) * 0.6
  const beta = -(alpha - 1) * 128  // keep mid-grey (128) stable
  return { alpha, beta }
}
