import { ipcMain } from 'electron'
import { join } from 'path'
import { readFileSync, readdirSync, existsSync } from 'fs'
import type { Preset, LUTData } from '../../src/shared/types'

// Assets root — relative to compiled main process (out/main/)
// In dev and prod, the bundle lives in out/main/index.js, so two levels up is the project root (where assets/ lives)
const ASSETS_ROOT = join(__dirname, '../..', 'assets')

export function registerAssetHandlers(): void {
  // ── Load a .cube LUT file  ──────────────────────────────────────────────────
  ipcMain.handle('assets:loadLUT', async (_event, filename: string): Promise<LUTData> => {
    const lutPath = join(ASSETS_ROOT, 'luts', 'free', filename)

    if (!existsSync(lutPath)) {
      throw new Error(`LUT file not found: ${filename}`)
    }

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
        const r = parseFloat(parts[0])
        const g = parseFloat(parts[1])
        const b = parseFloat(parts[2])
        if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
          values.push(r, g, b)
        }
      }
    }

    return { filename, data: values, size }
  })

  // ── Load a texture (PNG as ArrayBuffer) ────────────────────────────────────
  ipcMain.handle('assets:loadTexture', async (_event, filename: string): Promise<ArrayBuffer> => {
    const texPath = join(ASSETS_ROOT, 'textures', filename)
    if (!existsSync(texPath)) throw new Error(`Texture not found: ${filename}`)
    const buf = readFileSync(texPath)
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  })

  // ── List all preset JSON definitions ───────────────────────────────────────
  ipcMain.handle('assets:listPresets', async (): Promise<Preset[]> => {
    const presetsDir = join(ASSETS_ROOT, 'presets')
    if (!existsSync(presetsDir)) return []

    const files = readdirSync(presetsDir).filter(f => f.endsWith('.json'))
    const presets: Preset[] = []

    for (const file of files) {
      try {
        const raw = readFileSync(join(presetsDir, file), 'utf-8')
        const preset = JSON.parse(raw) as Preset
        presets.push(preset)
      } catch (e) {
        console.warn(`[Assets] Failed to parse preset ${file}:`, e)
      }
    }

    return presets.sort((a, b) => a.name.localeCompare(b.name))
  })
}
