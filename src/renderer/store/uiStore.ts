import { create } from 'zustand'

type AppTab = 'home' | 'editor' | 'templates' | 'canvas'
type RightPanelTab = 'light' | 'color' | 'detail' | 'effects'

interface UIStore {
  // Navigation
  activeTab: AppTab
  setActiveTab: (tab: AppTab) => void

  // Panel state
  rightPanelTab: RightPanelTab
  setRightPanelTab: (tab: RightPanelTab) => void

  // Panels visibility
  showPresetsPanel: boolean
  togglePresetsPanel: () => void

  // Loading states
  isExporting: boolean
  setIsExporting: (v: boolean) => void

  isLoadingImage: boolean
  setIsLoadingImage: (v: boolean) => void

  // Modals
  showExportSuccess: boolean
  exportedPath: string | null
  setExportSuccess: (path: string | null) => void
}

export const useUIStore = create<UIStore>((set) => ({
  activeTab: 'editor',
  setActiveTab: (tab) => set({ activeTab: tab }),

  rightPanelTab: 'light',
  setRightPanelTab: (tab) => set({ rightPanelTab: tab }),

  showPresetsPanel: true,
  togglePresetsPanel: () => set((s) => ({ showPresetsPanel: !s.showPresetsPanel })),

  isExporting: false,
  setIsExporting: (v) => set({ isExporting: v }),

  isLoadingImage: false,
  setIsLoadingImage: (v) => set({ isLoadingImage: v }),

  showExportSuccess: false,
  exportedPath: null,
  setExportSuccess: (path) => set({ showExportSuccess: !!path, exportedPath: path }),
}))
