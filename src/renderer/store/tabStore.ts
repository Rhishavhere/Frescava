import { create } from 'zustand'
import { useEditStore, DEFAULT_EDIT_STATE } from './editStore'
import type { EditState } from '@shared/types'

// ─── Tab ─────────────────────────────────────────────────────────────────────

export interface EditorTab {
  id: string
  label: string            // filename (e.g. "sunlight.jpg")
  imagePath: string
  imageDataURL: string
  imageWidth: number
  imageHeight: number
  params: Omit<EditState, 'imagePath' | 'imageWidth' | 'imageHeight'>
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface TabStore {
  tabs: EditorTab[]
  activeTabId: string | null

  openTab: (result: { path: string; dataURL: string; width: number; height: number }) => void
  closeTab: (id: string) => void
  switchTab: (id: string) => void
  syncActiveTabParams: () => void  // call before switching to save current params
}

let uid = 0

export const useTabStore = create<TabStore>((set, get) => ({
  tabs: [],
  activeTabId: null,

  openTab: (result) => {
    const { tabs, activeTabId } = get()

    // Save current edit params into the current tab before opening new
    if (activeTabId) {
      const currentParams = useEditStore.getState().params
      set((s) => ({
        tabs: s.tabs.map(t => t.id === activeTabId ? { ...t, params: currentParams } : t),
      }))
    }

    const id = `tab-${++uid}`
    const label = result.path.split(/[\\/]/).pop() ?? 'Image'
    const newTab: EditorTab = {
      id,
      label,
      imagePath: result.path,
      imageDataURL: result.dataURL,
      imageWidth: result.width,
      imageHeight: result.height,
      params: { ...DEFAULT_EDIT_STATE },
    }

    set((s) => ({ tabs: [...s.tabs, newTab], activeTabId: id }))

    // Load into edit store
    useEditStore.getState().loadImage(result.path, result.width, result.height, result.dataURL)
    useEditStore.getState().resetAll()
  },

  closeTab: (id) => {
    const { tabs, activeTabId } = get()
    const idx = tabs.findIndex(t => t.id === id)
    if (idx === -1) return

    const newTabs = tabs.filter(t => t.id !== id)
    set({ tabs: newTabs })

    if (activeTabId === id) {
      // Switch to adjacent tab
      const next = newTabs[Math.min(idx, newTabs.length - 1)]
      if (next) {
        get().switchTab(next.id)
      } else {
        // No more tabs — clear editor
        set({ activeTabId: null })
        useEditStore.getState().loadImage('', 0, 0, '')
      }
    }
  },

  switchTab: (id) => {
    const { tabs, activeTabId } = get()

    // Save current params back into the currently active tab
    if (activeTabId && activeTabId !== id) {
      const currentParams = useEditStore.getState().params
      set((s) => ({
        tabs: s.tabs.map(t => t.id === activeTabId ? { ...t, params: currentParams } : t),
      }))
    }

    const tab = tabs.find(t => t.id === id)
    if (!tab) return

    set({ activeTabId: id })
    // Restore the tab's image + params into editStore
    const es = useEditStore.getState()
    es.loadImage(tab.imagePath, tab.imageWidth, tab.imageHeight, tab.imageDataURL)
    // Restore params — reset first then re-apply
    es.resetAll()
    Object.entries(tab.params).forEach(([k, v]) => {
      if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
        Object.entries(v as Record<string, unknown>).forEach(([sk, sv]) => {
          es.setNestedParam(k as any, sk, sv)
        })
      } else {
        es.setParam(k as any, v as any)
      }
    })
  },

  syncActiveTabParams: () => {
    const { activeTabId } = get()
    if (!activeTabId) return
    const currentParams = useEditStore.getState().params
    set((s) => ({
      tabs: s.tabs.map(t => t.id === activeTabId ? { ...t, params: currentParams } : t),
    }))
  },
}))
