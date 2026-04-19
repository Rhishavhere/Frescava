import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { EditState } from '@shared/types'

// ─── Default edit state ───────────────────────────────────────────────────────

export const DEFAULT_EDIT_STATE: Omit<EditState, 'imagePath' | 'imageWidth' | 'imageHeight'> = {
  presetId: null,
  presetIntensity: 1.0,

  // Light
  exposure: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  whites: 0,
  blacks: 0,

  // Color
  temperature: 0,
  tint: 0,
  vibrance: 0,
  saturation: 0,

  // Detail
  sharpness: 0,
  noiseReduction: 0,
  clarity: 0,
  texture: 0,

  // Effects
  grain: { enabled: false, type: 'fine', intensity: 0.3, size: 1.0 },
  vignette: { enabled: false, shape: 'oval', strength: 0.5, feather: 0.5, midpoint: 0.7 },
  halation: { enabled: false, color: '#FF4422', radius: 40, threshold: 0.75, intensity: 0.4 },
  chromaticAberration: { enabled: false, amount: 3 },
  bloom: { enabled: false, threshold: 0.75, intensity: 0.3, character: 'soft' },
  lensDistortion: { enabled: false, amount: 0 },
  lightLeak: { enabled: false, textureId: null, color: '#FFA050', position: [0, 0], intensity: 0.5 },
  border: { enabled: false, type: null, color: '#FFFFFF', width: 40, cornerRadius: 0 },
}

// ─── Store types ──────────────────────────────────────────────────────────────

interface HistoryEntry {
  params: Omit<EditState, 'imagePath' | 'imageWidth' | 'imageHeight'>
}

interface EditStore {
  // Current image
  imagePath: string | null
  imageWidth: number
  imageHeight: number
  imageDataURL: string | null

  // Current parameters
  params: Omit<EditState, 'imagePath' | 'imageWidth' | 'imageHeight'>

  // History
  history: HistoryEntry[]
  historyIndex: number

  // Before/after
  showOriginal: boolean

  // Actions
  loadImage: (path: string, width: number, height: number, dataURL: string) => void
  setParam: <K extends keyof EditStore['params']>(key: K, value: EditStore['params'][K]) => void
  setNestedParam: <K extends keyof EditStore['params']>(
    key: K,
    subKey: string,
    value: unknown
  ) => void
  applyPreset: (presetId: string, presetParams: Partial<EditStore['params']>) => void
  setPresetIntensity: (intensity: number) => void
  resetAll: () => void
  resetParam: (key: keyof EditStore['params']) => void
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
  setShowOriginal: (show: boolean) => void
  pushHistory: () => void
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useEditStore = create<EditStore>()(
  immer((set, get) => ({
    imagePath: null,
    imageWidth: 0,
    imageHeight: 0,
    imageDataURL: null,
    params: { ...DEFAULT_EDIT_STATE },
    history: [],
    historyIndex: -1,
    showOriginal: false,

    loadImage: (path, width, height, dataURL) => {
      set(state => {
        state.imagePath = path
        state.imageWidth = width
        state.imageHeight = height
        state.imageDataURL = dataURL
        state.params = { ...DEFAULT_EDIT_STATE }
        state.history = []
        state.historyIndex = -1
        state.showOriginal = false
      })
    },

    setParam: (key, value) => {
      set(state => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(state.params as any)[key] = value
      })
    },

    setNestedParam: (key, subKey, value) => {
      set(state => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(state.params as any)[key][subKey] = value
      })
    },

    applyPreset: (presetId, presetParams) => {
      set(state => {
        // Save current state to history before applying preset
        const entry: HistoryEntry = {
          params: JSON.parse(JSON.stringify(state.params))
        }
        state.history.splice(state.historyIndex + 1)
        state.history.push(entry)
        state.historyIndex = state.history.length - 1

        state.params.presetId = presetId
        Object.assign(state.params, presetParams)
      })
    },

    setPresetIntensity: (intensity) => {
      set(state => { state.params.presetIntensity = intensity })
    },

    resetAll: () => {
      set(state => {
        const entry: HistoryEntry = {
          params: JSON.parse(JSON.stringify(state.params))
        }
        state.history.splice(state.historyIndex + 1)
        state.history.push(entry)
        state.historyIndex = state.history.length - 1
        state.params = { ...DEFAULT_EDIT_STATE }
      })
    },

    resetParam: (key) => {
      set(state => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(state.params as any)[key] = (DEFAULT_EDIT_STATE as any)[key]
      })
    },

    pushHistory: () => {
      set(state => {
        const entry: HistoryEntry = {
          params: JSON.parse(JSON.stringify(state.params))
        }
        // Remove any redo history
        state.history.splice(state.historyIndex + 1)
        state.history.push(entry)
        if (state.history.length > 100) state.history.shift()
        state.historyIndex = state.history.length - 1
      })
    },

    undo: () => {
      const { history, historyIndex, params } = get()
      if (historyIndex < 0) return
      set(state => {
        // Save current if at tip
        if (state.historyIndex === state.history.length - 1) {
          // Store current as a "future" entry by simply going back
        }
        const prevIndex = historyIndex - 1
        if (prevIndex >= 0) {
          state.params = JSON.parse(JSON.stringify(history[prevIndex].params))
        } else {
          state.params = { ...DEFAULT_EDIT_STATE }
        }
        state.historyIndex = prevIndex
      })
    },

    redo: () => {
      const { history, historyIndex } = get()
      if (historyIndex >= history.length - 1) return
      set(state => {
        const nextIndex = historyIndex + 1
        state.params = JSON.parse(JSON.stringify(history[nextIndex].params))
        state.historyIndex = nextIndex
      })
    },

    canUndo: () => get().historyIndex >= 0,
    canRedo: () => get().historyIndex < get().history.length - 1,

    setShowOriginal: (show) => {
      set(state => { state.showOriginal = show })
    },
  }))
)
