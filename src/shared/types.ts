// ─── Edit State ─────────────────────────────────────────────────────────────

export interface EditState {
  imagePath: string | null
  imageWidth: number
  imageHeight: number

  // Preset
  presetId: string | null
  presetIntensity: number // 0–1
  presetFilters: PresetEffectState // The embedded active effects supplied by the preset, tracked separately from user generic effects.

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
  lensBlur: number        // 0–100  shallow-DoF style defocus (after other detail)
  gaussianBlur: number   // 0–100
  zoomBlur: number       // 0–100

  /** Master + RGB tone curves. Points are normalized [0..1] and sorted by x. */
  curves: CurvesState
  /** Split toning: per-zone hue (0–360°) and saturation (0–100, 0 = off) */
  splitToning: SplitToningState
  /** Three-way channel color balance, values are -100..100. */
  colorBalance: ColorBalanceState
  /** HSL color mixer by hue family, values are -100..100. */
  hslMixer: HslMixerState
  dehaze: number // -100 to 100

  // Effects
  fade: FadeParams
  grain: GrainParams
  vignette: VignetteParams
  halation: HalationParams
  chromaticAberration: CaParams
  bloom: BloomParams
  lensDistortion: LensDistortionParams
  lightLeak: LightLeakParams
  dustScratches: DustScratchesParams
  border: BorderParams
  blur: BlurParams
  textLayers: TextLayer[]
  activeTextId: string | null
}

// ── Shared Preset Effect block (Layer 1) ────────────────────────────────────

export interface PresetEffectState {
  fade?: FadeParams
  grain?: DustScratchesParams // Presets use texture-based grain
  vignette?: VignetteParams
  halation?: HalationParams
  chromaticAberration?: CaParams
  bloom?: BloomParams
  lensDistortion?: LensDistortionParams
  lightLeak?: LightLeakParams
  dustScratches?: DustScratchesParams
  border?: BorderParams
  blur?: BlurParams
}

export interface SplitToningZone {
  hue: number        // 0–360
  saturation: number // 0–100
}

export interface SplitToningState {
  shadows: SplitToningZone
  midtones: SplitToningZone
  highlights: SplitToningZone
}

export interface CurvePoint {
  x: number // 0–1
  y: number // 0–1
}

export type CurveChannel = 'master' | 'red' | 'green' | 'blue'

export type CurvesState = Record<CurveChannel, CurvePoint[]>

export interface ColorBalanceTriplet {
  cyanRed: number // -100..100
  magentaGreen: number // -100..100
  yellowBlue: number // -100..100
}

export interface ColorBalanceState {
  shadows: ColorBalanceTriplet
  midtones: ColorBalanceTriplet
  highlights: ColorBalanceTriplet
}

export type HslMixerBand = 'red' | 'orange' | 'yellow' | 'green' | 'aqua' | 'blue' | 'purple' | 'magenta'

export interface HslMixerBandState {
  hue: number // -100..100
  saturation: number // -100..100
  luminance: number // -100..100
}

export type HslMixerState = Record<HslMixerBand, HslMixerBandState>

// ── Effect param types ──────────────────────────────────────────────────────

export interface FadeParams {
  enabled: boolean
  blackLift: number    // 0–0.3  lifts blacks for matte/film look
  whiteCeiling: number // 0.7–1  compresses whites
}

export interface GrainParams {
  enabled: boolean
  type: 'fine' | 'medium' | 'coarse' | 'film'
  intensity: number        // 0–1
  size: number             // 0–2
  roughness: number        // 0–1  uneven organic character
  luminosityMode: boolean  // grain affects luminosity only (preserves chroma)
  highlightReduction: number // 0–1  reduce grain in bright areas
}

export interface VignetteParams {
  enabled: boolean
  shape: 'oval' | 'rect'
  strength: number   // 0–1
  feather: number    // 0–1
  midpoint: number   // 0.3–1
  exposure: number   // -1–0  optional darkening at vignette center
}

export interface HalationParams {
  enabled: boolean
  color: string      // hex, default warm red '#FF4422'
  radius: number     // 0–200 (blur px at preview res)
  threshold: number  // 0.5–1.0
  intensity: number  // 0–1
  blendMode: 'screen' | 'add' | 'overlay'
}

export interface CaParams {
  enabled: boolean
  amount: number     // 0–20
  radialFalloff: boolean // stronger at corners, less at center
}

export interface BloomParams {
  enabled: boolean
  threshold: number  // 0.5–1.0
  intensity: number  // 0–1
  radius: number     // 5–50 px
  character: 'soft' | 'hard'
}

export interface LensDistortionParams {
  enabled: boolean
  amount: number     // -1 (barrel) to +1 (pincushion)
}

export interface LightLeakParams {
  enabled: boolean
  /** Filename relative to the preset's folder, e.g. "light_leak.png" */
  textureFile: string | null
  color: string        // hex tint
  colorStrength: number // 0–1 how much the tint overrides the texture
  position: [number, number] // UV offset [x, y]
  opacity: number      // 0–1
  blendMode: 'screen' | 'add' | 'overlay'
}

export interface DustScratchesParams {
  enabled: boolean
  /** Filename relative to the preset's folder, e.g. "dust.png" */
  textureFile: string | null
  opacity: number      // 0–1
  blendMode: 'screen' | 'multiply' | 'overlay'
}

export interface BorderParams {
  enabled: boolean
  /** 'solid' | 'polaroid' | 'filmstrip' | null for texture-based */
  type: 'solid' | 'polaroid' | 'filmstrip' | null
  /** Filename relative to the preset's folder if type=null */
  textureFile: string | null
  color: string        // hex, used in solid mode
  width: number        // 0–0.15 (fraction of image dimension)
  bottomWeight: number // 1–3 how much heavier the bottom border is vs sides
  cornerRadius: number // 0–1
  expandCanvas: boolean
}

export interface BlurParams {
  enabled: boolean
  type: 'gaussian' | 'lens' | 'zoom'
  radius: number // 0..100
}

// ─── Preset Definition (new rich schema) ─────────────────────────────────────

/**
 * PresetDef is the full rich preset as read from preset.json in each
 * assets/presets/{preset-id}/ folder.
 */
export interface PresetDef {
  id: string
  name: string
  category: PresetCategory
  pack: 'free' | 'pro' | 'community'
  tags: string[]

  /** LUT config. file is relative to assets/luts/free/ */
  lut: {
    file: string | null
    intensity: number
  }

  // Per-effect overrides (applied when the preset is loaded)
  fade: Partial<FadeParams>
  grain: Partial<DustScratchesParams & GrainParams>
  vignette: Partial<VignetteParams>
  halation: Partial<HalationParams>
  chromaticAberration: Partial<CaParams>
  bloom: Partial<BloomParams>
  lensDistortion: Partial<LensDistortionParams>
  lightLeak: Partial<LightLeakParams>
  dustScratches: Partial<DustScratchesParams>
  border: Partial<BorderParams>
  blur: Partial<BlurParams>

  /** UI-only metadata */
  ui: {
    accentColor: string
    thumbnailCropHint: number
    intensityDefault: number
    intensityMin: number
    intensityMax: number
    pairsWith: string[]
    moodTags: string[]
    bestFor: string[]
  }
}

/**
 * Preset is the normalized object sent to the renderer.
 * Includes the folder name for resolving preset-relative textures.
 */
export interface Preset {
  id: string
  name: string
  category: PresetCategory
  pack: 'free' | 'pro' | 'community'
  tags: string[]

  /** Subfolder name inside assets/presets/ (usually = id) */
  folderName: string

  /** LUT filename in assets/luts/free/, or null if no LUT */
  lutFile: string | null
  /** LUT intensity baked into preset (can be overridden by user) */
  lutIntensity: number

  /** Thumbnail filename relative to preset folder (e.g. "thumbnail.png") */
  thumbnailFile: string | null

  /** Full effect defaults to apply when this preset is selected */
  defaults: Partial<Omit<EditState,
    'imagePath' | 'imageWidth' | 'imageHeight' | 'presetId' | 'presetIntensity' | 'grain'
  > & {
    grain?: Partial<DustScratchesParams & GrainParams>
  }>

  /** UI metadata */
  ui: PresetDef['ui']
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
  quality: number        // 1–100
  maxDimension?: number
  canvasDataURL?: string // WebGL canvas capture for 1:1 export parity
}

// ─── Projects (.frex session files) ──────────────────────────────────────────

export interface ProjectMeta {
  path: string
  name: string
  presetId: string | null
  savedAt: string
  previewDataURL: string | null
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
  previewDataURL: string
  savedAt: string
}

export type OpenHomeView = 'default' | 'settings'

/** UI for the editor / canvas windows only. Home is always custom (not themed). */
export type AppAppearance = 'light' | 'dark'

/** Persisted: light/dark for the image workspace. Accent is hardcoded (monochrome zinc) in CSS. */
export interface EditorUiPreferences {
  appearance: AppAppearance
}

/** Home “Open” dialog: images and/or a single `.frex` project */
export type OpenForEditorResult =
  | { kind: 'empty' }
  | { kind: 'project'; filePath: string; project: ProjectFile }
  | { kind: 'images'; files: FileOpenResult[] }

export interface FrescavaAPI {
  file: {
    open: () => Promise<FileOpenResult | null>
    openMultiple: () => Promise<FileOpenResult[]>
    /** Pick images and/or a Frescava project (if a `.frex` is included, the first is loaded as project) */
    openForEditor: () => Promise<OpenForEditorResult>
    load: (path: string) => Promise<FileOpenResult>
    loadFull: (path: string) => Promise<FileOpenResult>
  }
  export: {
    save: (opts: ExportOptions) => Promise<ExportResult>
    exportBatch: (opts: { images: ExportOptions[]; outputDir: string }) => Promise<ExportResult>
  }
  assets: {
    loadLUT: (filename: string) => Promise<LUTData>
    /** Load a texture by path relative to assets root.
     *  e.g. "presets/kodak-portra-400/dust.png" */
    loadTexture: (relativePath: string) => Promise<ArrayBuffer>
    listPresets: () => Promise<Preset[]>
    listLUTFiles: () => Promise<string[]>
    savePreset: (preset: PresetDef) => Promise<{ success: boolean; path: string }>
    listTextTemplates: () => Promise<TypographyTemplate[]>
    saveTextTemplate: (template: TypographyTemplate) => Promise<{ success: boolean; path: string }>
  }
  projects: {
    save: (project: ProjectFile) => Promise<{ path: string }>
    saveAt: (filePath: string, project: ProjectFile) => Promise<{ path: string }>
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
  /**
   * Image workspace (Editor / future Canvas) only — not used for the Home hub window.
   * Persisted in userData. Broadcast to all windows so an open editor updates from Settings.
   */
  preferences: {
    getEditorUi: () => Promise<EditorUiPreferences>
    setEditorUi: (partial: Partial<EditorUiPreferences>) => Promise<void>
    onEditorUiChange: (cb: (prefs: EditorUiPreferences) => void) => () => void
  }
  /**
   * Multi-window: Home vs Editor are separate BrowserWindows.
   */
  window: {
    openEditor: (opts?: {
      files?: FileOpenResult[]
      project?: { filePath: string; project: ProjectFile }
    }) => Promise<void>
    openHome: (opts?: { view?: OpenHomeView }) => Promise<void>
    getHomeLaunchView: () => Promise<OpenHomeView | null>
    /**
     * When the Home window is already open and get focused via openHome (e.g. from Editor),
     * main sends the target view so the client can switch tabs.
     */
    onHomeOpenView: (cb: (view: OpenHomeView) => void) => () => void
    getLaunchPayload: () => Promise<
      | { type: 'files'; files: FileOpenResult[] }
      | { type: 'empty' }
      | { type: 'project'; filePath: string; project: ProjectFile }
      | null
    >
    /** New batch opened from Home while the editor window is already open */
    onEditorOpenFiles: (cb: (files: FileOpenResult[]) => void) => () => void
    /** Open a saved `.frex` while the editor is already open */
    onEditorOpenProject: (cb: (payload: { filePath: string; project: ProjectFile }) => void) => () => void
  }
  auth: {
    signUp: (email: string, password: string, name: string) => Promise<{ success: boolean; user?: any; profile?: any; error?: string }>
    signIn: (email: string, password: string) => Promise<{ success: boolean; user?: any; profile?: any; error?: string }>
    signInWithGoogle: () => Promise<{ success: boolean; error?: string }>
    signOut: () => Promise<{ success: boolean; error?: string }>
    getProfile: () => Promise<{ session?: any; user?: any; profile?: any; error?: string }>
    updateProfile: (name: string) => Promise<{ success: boolean; profile?: any; error?: string }>
    onAuthChange: (cb: (payload: { session: any; user?: any; profile: any }) => void) => () => void
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
  data: number[]
  size: number
}

// ─── Template (v0.3) ─────────────────────────────────────────────────────────

export type HueRange = 'red' | 'orange' | 'yellow' | 'green' | 'aqua' | 'blue' | 'purple' | 'magenta'
export interface CurvePoint { x: number; y: number }

export interface TextLayer {
  id: string
  text: string
  fontFamily: string
  fontSize: number       // In percentage of image height/width to ensure scale independence, e.g. 5 (for 5%)
  fontWeight: string     // "300", "400", "500", "700", "900"
  fontStyle: 'normal' | 'italic'
  color: string          // Hex
  opacity: number        // 0..1
  letterSpacing: number  // tracking in em
  lineHeight: number     // em leading
  alignment: 'left' | 'center' | 'right'
  position: { x: number; y: number } // % relative to image canvas bounds [0..100]
  textCase: 'none' | 'uppercase' | 'lowercase'
  border?: {
    enabled: boolean
    type: 'pill' | 'oval' | 'rect'
    paddingX: number // % of image dimensions
    paddingY: number // % of image dimensions
    color: string
    width: number
  }
  decoLeftRight?: 'star' | 'none'
}

export interface TypographyTemplate {
  id: string
  name: string
  thumbnailText: string
  thumbnailStyle?: string
  layers: Omit<TextLayer, 'id'>[]
}

