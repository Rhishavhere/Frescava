import { create } from 'zustand'

type AppTab = 'home' | 'templates' | 'canvas' | 'explore' | 'settings'
type RightPanelTab = 'light' | 'color' | 'detail' | 'effects'

export type EditorWorkspace = 'main' | 'text' | 'templates'

interface ConfirmOptions {
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
}

interface UIStore {
  // App-level navigation
  activeTab: AppTab
  setActiveTab: (tab: AppTab) => void

  /** In-editor tool mode: main photo tools vs text vs templates (same session; different side panels) */
  editorWorkspace: EditorWorkspace
  setEditorWorkspace: (w: EditorWorkspace) => void

  // Right inspector tab (main workspace)
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

  // Export success toast
  showExportSuccess: boolean
  exportedPath: string | null
  setExportSuccess: (path: string | null) => void

  // Confirmation modal
  confirm: ConfirmOptions | null
  openConfirm: (opts: ConfirmOptions) => void
  closeConfirm: () => void
}

export const useUIStore = create<UIStore>((set) => ({
  activeTab: 'home',
  setActiveTab: (tab) => set({ activeTab: tab }),

  editorWorkspace: 'main' as EditorWorkspace,
  setEditorWorkspace: (w) => set({ editorWorkspace: w }),

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

  // Confirmation modal
  confirm: null,
  openConfirm: (opts) => set({ confirm: opts }),
  closeConfirm: () => set({ confirm: null }),
}))
