import { create } from 'zustand'
import type { AppAppearance, EditorUiPreferences } from '@shared/types'

type AppTab = 'home' | 'templates' | 'canvas' | 'explore' | 'settings'
type RightPanelTab = 'light' | 'color' | 'detail' | 'effects'

export type EditorWorkspace = 'main' | 'text' | 'templates'

interface ConfirmOptions {
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
}

function mergeEditorUi(
  current: { editorAppearance: AppAppearance },
  partial: Partial<EditorUiPreferences>
): { editorAppearance: AppAppearance } {
  return {
    editorAppearance: partial.appearance ?? current.editorAppearance,
  }
}

interface UIStore {
  /** Image workspace (Editor) only; Home ignores this for its chrome. */
  editorAppearance: AppAppearance
  setEditorUi: (partial: Partial<EditorUiPreferences>) => void
  commitEditorUi: (partial: Partial<EditorUiPreferences>) => Promise<void>

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

export const useUIStore = create<UIStore>((set, get) => ({
  editorAppearance: 'dark',
  setEditorUi: (partial) =>
    set(mergeEditorUi({ editorAppearance: get().editorAppearance }, partial)),

  commitEditorUi: async (partial) => {
    const next = mergeEditorUi({ editorAppearance: get().editorAppearance }, partial)
    set(next)
    await window.frame.preferences.setEditorUi(partial)
  },

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
