// ─── Edit State ─────────────────────────────────────────────────────────────

export interface EditState {
  imagePath: string | null
  imageWidth: number
  imageHeight: number

  // Preset
  presetId: string | null
  presetIntensity: number // 0–1

  // Light
  exposure: number       // -5 to 5
  contrast: number       // -100 to 100
  highlights: number     // -100 to 100
  shadows: number        // -100 to 100
  whites: number         // -100 to 100
  blacks: number         // -100 to 100

  // Color
  temperature: number    // -100 to 100
  tint: number           // -100 to 100
  vibrance: number       // -100 to 100
  saturation: number     // -100 to 100

  // Detail
  sharpness: number      // 0–100
  noiseReduction: number // 0–100
  clarity: number        // -100 to 100
  texture: number        // -100 to 100

  // Effects
  grain: GrainParams
  vignette: VignetteParams
  halation: HalationParams
  chromaticAberration: CaParams
  bloom: BloomParams
  lensDistortion: LensDistortionParams
  lightLeak: LightLeakParams
  border: BorderParams
}

export interface GrainParams {
  enabled: boolean
  type: 'fine' | 'medium' | 'coarse' | 'film'
  intensity: number  // 0–1
  size: number       // 0–1
}

export interface VignetteParams {
  enabled: boolean
  shape: 'oval' | 'rect'
  strength: number   // 0–1
  feather: number    // 0–1
  midpoint: number   // 0.3–1
}

export interface HalationParams {
  enabled: boolean
  color: string      // hex, default warm red '#FF4422'
  radius: number     // 0–200 (blur px)
  threshold: number  // 0.5–1.0
  intensity: number  // 0–1
}

export interface CaParams {
  enabled: boolean
  amount: number     // 0–20
}

export interface BloomParams {
  enabled: boolean
  threshold: number  // 0.5–1.0
  intensity: number  // 0–1
  character: 'soft' | 'hard'
}

export interface LensDistortionParams {
  enabled: boolean
  amount: number     // -1 to 1, negative=barrel, positive=pincushion
}

export interface LightLeakParams {
  enabled: boolean
  textureId: string | null
  color: string
  position: [number, number]
  intensity: number
}

export interface BorderParams {
  enabled: boolean
  type: string | null  // 'polaroid' | 'filmstrip' | 'thin' | 'rounded' | null
  color: string
  width: number
  cornerRadius: number
}

// ─── Preset ──────────────────────────────────────────────────────────────────

export interface Preset {
  id: string
  name: string
  category: PresetCategory
  lutFile: string | null          // filename inside assets/luts/free/ (e.g. "kodak_portra.cube")
  thumbnailFile: string | null    // filename inside assets/presets/thumbnails/
  params: Partial<Omit<EditState, 'imagePath' | 'imageWidth' | 'imageHeight' | 'presetId' | 'presetIntensity'>>
}

export type PresetCategory =
  | 'film-stock'
  | 'mood'
  | 'era'
  | 'cinematic'
  | 'editorial'
  | 'aesthetic'

// ─── Export ──────────────────────────────────────────────────────────────────

export interface ExportOptions {
  imagePath: string
  outputPath: string
  editState: EditState
  quality: number       // 1–100
  maxDimension?: number // optional cap for free tier
  canvasDataURL?: string // Option A: WebGL canvas capture for 1:1 export parity
}

// ─── Projects (.frex session files) ──────────────────────────────────────────

export interface ProjectMeta {
  path: string              // absolute path to .frex file on disk
  name: string
  presetId: string | null
  savedAt: string           // ISO date string
  previewDataURL: string | null  // base64 thumbnail for home screen card
  imageWidth: number
  imageHeight: number
}

export interface ProjectFile {
  version: 1
  name: string
  imagePath: string
  imageWidth: number
  imageHeight: number
  editState: Omit<EditState, 'imagePath' | 'imageWidth' | 'imageHeight'>
  previewDataURL: string    // 300px wide JPEG thumbnail
  savedAt: string
}

// ─── IPC API surface (matches preload contextBridge) ─────────────────────────

export interface FrescavaAPI {
  file: {
    open: () => Promise<FileOpenResult | null>
    openMultiple: () => Promise<FileOpenResult[]>
    load: (path: string) => Promise<FileOpenResult>
  }
  export: {
    save: (opts: ExportOptions) => Promise<ExportResult>
  }
  assets: {
    loadLUT: (filename: string) => Promise<LUTData>
    loadTexture: (filename: string) => Promise<ArrayBuffer>
    listPresets: () => Promise<Preset[]>
  }
  projects: {
    save: (project: ProjectFile) => Promise<{ path: string }>
    saveAs: (project: ProjectFile) => Promise<{ path: string } | null>
    list: () => Promise<ProjectMeta[]>
    load: (path: string) => Promise<ProjectFile>
  }
  app: {
    minimize: () => void
    maximize: () => void
    close: () => void
    isMaximized: () => Promise<boolean>
  }
}

export interface FileOpenResult {
  path: string
  width: number
  height: number
  dataURL: string
}

export interface ExportResult {
  success: boolean
  outputPath?: string
  error?: string
}

export interface LUTData {
  filename: string
  data: number[]   // Float32Array serialized as plain array for IPC
  size: number
}

// ─── Template (v0.3) ─────────────────────────────────────────────────────────

export type HueRange = 'red' | 'orange' | 'yellow' | 'green' | 'aqua' | 'blue' | 'purple' | 'magenta'
export interface CurvePoint { x: number; y: number }
