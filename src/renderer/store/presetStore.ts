import { create } from 'zustand'
import type { Preset } from '@shared/types'

interface PresetStore {
  presets: Preset[]
  favorites: Set<string>
  selectedPresetId: string | null
  isLoading: boolean
  error: string | null

  loadPresets: () => Promise<Preset[]>
  selectPreset: (id: string | null) => void
  toggleFavorite: (id: string) => void
  getPresetById: (id: string) => Preset | undefined
  getPresetsByCategory: (category: string) => Preset[]
  updatePresetInMemory: (id: string, updates: Partial<Preset>) => void
}

export const usePresetStore = create<PresetStore>((set, get) => ({
  presets: [],
  favorites: new Set(),
  selectedPresetId: null,
  isLoading: false,
  error: null,

  loadPresets: async () => {
    set({ isLoading: true, error: null })
    try {
      const presets = await window.frame.assets.listPresets()
      set({ presets, isLoading: false })
      return presets
    } catch (err) {
      set({ error: 'Failed to load presets', isLoading: false })
      console.error('[Presets]', err)
      return []
    }
  },

  selectPreset: (id) => set({ selectedPresetId: id }),

  toggleFavorite: (id) => {
    set(state => {
      const next = new Set(state.favorites)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return { favorites: next }
    })
  },

  getPresetById: (id) => get().presets.find(p => p.id === id),
  getPresetsByCategory: (category) => get().presets.filter(p => p.category === category),

  updatePresetInMemory: (id, updates) => {
    set(state => {
      const exists = state.presets.find(p => p.id === id)
      if (exists) {
        return {
          presets: state.presets.map(p => p.id === id ? { ...p, ...updates } : p)
        }
      } else if (id === 'new-preset') {
        const newPreset: Preset = {
          id: 'new-preset',
          name: 'New Preset',
          category: 'film-stock',
          pack: 'free',
          tags: [],
          folderName: 'new-preset',
          lutFile: null,
          lutIntensity: 1,
          thumbnailFile: null,
          defaults: {},
          ui: {
            accentColor: '#888888',
            thumbnailCropHint: 0.5,
            intensityDefault: 1,
            intensityMin: 0,
            intensityMax: 1,
            pairsWith: [],
            moodTags: [],
            bestFor: [],
          },
          ...updates
        }
        return {
          presets: [...state.presets, newPreset]
        }
      }
      return {}
    })
  }
}))
