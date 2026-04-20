import { ipcMain } from 'electron'
import { join } from 'path'
import { readFileSync, readdirSync, existsSync, statSync } from 'fs'
import type { Preset, PresetDef, LUTData } from '../../src/shared/types'

// Assets root — two levels up from out/main/index.js
const ASSETS_ROOT = join(__dirname, '../..', 'assets')

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hexToRgb(hex: string) {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ]
}

/** Normalize a raw PresetDef JSON into the Preset shape the renderer uses */
function normalizePreset(raw: PresetDef, folderName: string): Preset {
  // Detect thumbnail
  const folderPath = join(ASSETS_ROOT, 'presets', folderName)
  const THUMB_NAMES = ['thumbnail.png', 'thumbnail.jpg', 'thumbnail.webp']
  const thumbFile = THUMB_NAMES.find(f => existsSync(join(folderPath, f))) ?? null

  // Build effect defaults from the rich JSON
  const defaults: Preset['defaults'] = {}

  if (raw.fade) {
    defaults.fade = {
      enabled: raw.fade.enabled ?? false,
      blackLift: raw.fade.blackLift ?? 0,
      whiteCeiling: raw.fade.whiteCeiling ?? 1,
    }
  }

  if (raw.grain) {
    defaults.grain = {
      enabled: raw.grain.enabled ?? false,
      textureFile: raw.grain.textureFile ?? null,
      opacity: raw.grain.opacity ?? 0.5,
      blendMode: raw.grain.blendMode ?? 'overlay',
    }
  }

  if (raw.vignette) {
    defaults.vignette = {
      enabled: raw.vignette.enabled ?? false,
      shape: raw.vignette.shape ?? 'oval',
      strength: raw.vignette.strength ?? 0.4,
      feather: raw.vignette.feather ?? 0.7,
      midpoint: raw.vignette.midpoint ?? 0.5,
      exposure: raw.vignette.exposure ?? 0,
    }
  }

  if (raw.halation) {
    defaults.halation = {
      enabled: raw.halation.enabled ?? false,
      color: raw.halation.color ?? '#FF4422',
      radius: raw.halation.radius ?? 30,
      threshold: raw.halation.threshold ?? 0.75,
      intensity: raw.halation.intensity ?? 0.3,
      blendMode: raw.halation.blendMode ?? 'screen',
    }
  }

  if (raw.chromaticAberration) {
    defaults.chromaticAberration = {
      enabled: raw.chromaticAberration.enabled ?? false,
      amount: raw.chromaticAberration.amount ?? 0,
      radialFalloff: raw.chromaticAberration.radialFalloff ?? true,
    }
  }

  if (raw.bloom) {
    defaults.bloom = {
      enabled: raw.bloom.enabled ?? false,
      threshold: raw.bloom.threshold ?? 0.8,
      intensity: raw.bloom.intensity ?? 0.3,
      radius: raw.bloom.radius ?? 15,
      character: raw.bloom.character ?? 'soft',
    }
  }

  if (raw.lensDistortion) {
    defaults.lensDistortion = {
      enabled: raw.lensDistortion.enabled ?? false,
      amount: raw.lensDistortion.amount ?? 0,
    }
  }

  if (raw.lightLeak) {
    defaults.lightLeak = {
      enabled: raw.lightLeak.enabled ?? false,
      textureFile: raw.lightLeak.textureFile ?? null,
      color: raw.lightLeak.color ?? '#FFA050',
      colorStrength: raw.lightLeak.colorStrength ?? 0.5,
      position: raw.lightLeak.position ?? [0, 0],
      opacity: raw.lightLeak.opacity ?? 0,
      blendMode: raw.lightLeak.blendMode ?? 'screen',
    }
  }

  if (raw.dustScratches) {
    defaults.dustScratches = {
      enabled: raw.dustScratches.enabled ?? false,
      textureFile: raw.dustScratches.textureFile ?? null,
      opacity: raw.dustScratches.opacity ?? 0,
      blendMode: raw.dustScratches.blendMode ?? 'screen',
    }
  }

  if (raw.border) {
    defaults.border = {
      enabled: raw.border.enabled ?? false,
      type: raw.border.type ?? null,
      textureFile: raw.border.textureFile ?? null,
      color: raw.border.color ?? '#FFFFFF',
      width: raw.border.width ?? 0.04,
      bottomWeight: raw.border.bottomWeight ?? 1,
      cornerRadius: raw.border.cornerRadius ?? 0,
      expandCanvas: raw.border.expandCanvas ?? false,
    }
  }

  return {
    id: raw.id,
    name: raw.name,
    category: raw.category,
    pack: raw.pack ?? 'free',
    tags: raw.tags ?? [],
    folderName,
    lutFile: raw.lut?.file ?? null,
    lutIntensity: raw.lut?.intensity ?? 1,
    thumbnailFile: thumbFile,
    defaults,
    ui: raw.ui ?? {
      accentColor: '#888888',
      thumbnailCropHint: 0.5,
      intensityDefault: 1,
      intensityMin: 0,
      intensityMax: 1,
      pairsWith: [],
      moodTags: [],
      bestFor: [],
    },
  }
}

// ─── IPC Handlers ─────────────────────────────────────────────────────────────

export function registerAssetHandlers(): void {

  // ── Load a .cube LUT file ─────────────────────────────────────────────────
  ipcMain.handle('assets:loadLUT', async (_event, filename: string): Promise<LUTData> => {
    const lutsDir = join(ASSETS_ROOT, 'luts', 'free')

    let resolvedFilename = filename
    if (!existsSync(join(lutsDir, filename))) {
      try {
        const files = readdirSync(lutsDir)
        const match = files.find(f => f.toLowerCase() === filename.toLowerCase())
        if (match) resolvedFilename = match
      } catch { /* ignore */ }
    }

    const lutPath = join(lutsDir, resolvedFilename)
    if (!existsSync(lutPath)) throw new Error(`LUT file not found: ${filename}`)

    const content = readFileSync(lutPath, 'utf-8')
    const values: number[] = []
    let size = 33

    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (trimmed.startsWith('LUT_3D_SIZE')) {
        size = parseInt(trimmed.split(/\s+/)[1], 10)
        continue
      }
      if (trimmed.startsWith('#') || trimmed.startsWith('TITLE') ||
          trimmed.startsWith('DOMAIN') || trimmed === '') continue
      const parts = trimmed.split(/\s+/)
      if (parts.length === 3) {
        const r = parseFloat(parts[0]), g = parseFloat(parts[1]), b = parseFloat(parts[2])
        if (!isNaN(r) && !isNaN(g) && !isNaN(b)) values.push(r, g, b)
      }
    }

    return { filename, data: values, size }
  })

  // ── Load a texture file (path relative to ASSETS_ROOT) ───────────────────
  // Examples: "presets/kodak-portra-400/dust.png"
  //           "textures/some_global_texture.png"
  ipcMain.handle('assets:loadTexture', async (_event, relativePath: string): Promise<ArrayBuffer> => {
    const texPath = join(ASSETS_ROOT, relativePath)
    if (!existsSync(texPath)) throw new Error(`Texture not found: ${relativePath}`)
    const buf = readFileSync(texPath)
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  })

  // ── List all presets — scans assets/presets/*/preset.json ────────────────
  ipcMain.handle('assets:listPresets', async (): Promise<Preset[]> => {
    const presetsRoot = join(ASSETS_ROOT, 'presets')
    if (!existsSync(presetsRoot)) return []

    const entries = readdirSync(presetsRoot)
    const presets: Preset[] = []

    for (const entry of entries) {
      const entryPath = join(presetsRoot, entry)
      // Only process directories
      try {
        if (!statSync(entryPath).isDirectory()) continue
      } catch { continue }

      const jsonPath = join(entryPath, 'preset.json')
      if (!existsSync(jsonPath)) continue

      try {
        const raw = JSON.parse(readFileSync(jsonPath, 'utf-8')) as PresetDef
        presets.push(normalizePreset(raw, entry))
      } catch (e) {
        console.warn(`[Assets] Failed to parse preset in ${entry}:`, e)
      }
    }

    return presets.sort((a, b) => a.name.localeCompare(b.name))
  })
}
