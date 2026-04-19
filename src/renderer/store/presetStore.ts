import { create } from 'zustand'
import type { Preset } from '@shared/types'

interface PresetStore {
  presets: Preset[]
  favorites: Set<string>
  selectedPresetId: string | null
  isLoading: boolean
  error: string | null

  loadPresets: () => Promise<void>
  selectPreset: (id: string | null) => void
  toggleFavorite: (id: string) => void
  getPresetById: (id: string) => Preset | undefined
  getPresetsByCategory: (category: string) => Preset[]
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
    } catch (err) {
      set({ error: 'Failed to load presets', isLoading: false })
      console.error('[Presets]', err)
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
}))
