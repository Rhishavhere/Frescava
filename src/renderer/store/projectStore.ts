import { create } from 'zustand'
import type { ProjectMeta, ProjectFile } from '@shared/types'

interface ProjectStore {
  projects: ProjectMeta[]
  isLoading: boolean

  /** Path of the currently open/saved project. null = never saved yet (first save = Save As) */
  currentFilePath: string | null
  setCurrentFilePath: (path: string | null) => void

  loadProjects: () => Promise<void>

  /**
   * Smart save:
   * - If no currentFilePath → show Save As dialog (first save ever)
   * - Otherwise → silently overwrite the existing file
   * Returns the saved path, or null if cancelled (Save As dialog)
   */
  smartSave: (project: ProjectFile) => Promise<string | null>

  /**
   * Always shows the Save As dialog, updates currentFilePath on success.
   */
  saveAs: (project: ProjectFile) => Promise<string | null>
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  isLoading: false,
  currentFilePath: null,

  setCurrentFilePath: (path) => set({ currentFilePath: path }),

  loadProjects: async () => {
    set({ isLoading: true })
    try {
      const projects = await window.frame.projects.list()
      set({ projects, isLoading: false })
    } catch (e) {
      console.error('[Projects] Failed to list:', e)
      set({ isLoading: false })
    }
  },

  smartSave: async (project) => {
    const { currentFilePath } = get()

    if (!currentFilePath) {
      // First save — always show dialog
      return get().saveAs(project)
    }

    // Overwrite existing file silently
    const result = await window.frame.projects.saveAt(currentFilePath, project)
    const projects = await window.frame.projects.list()
    set({ projects })
    return result.path
  },

  saveAs: async (project) => {
    const result = await window.frame.projects.saveAs(project)
    if (!result) return null
    set({ currentFilePath: result.path })
    const projects = await window.frame.projects.list()
    set({ projects })
    return result.path
  },

  // Keep old API for backward compat
  saveProject: async (project: ProjectFile) => {
    return get().smartSave(project) as unknown as string
  },
  saveProjectAs: async (project: ProjectFile) => {
    return get().saveAs(project)
  },
}))

// Augment old call sites that use saveProject
declare module './projectStore' {
  interface ProjectStore {
    saveProject: (project: ProjectFile) => Promise<string>
    saveProjectAs: (project: ProjectFile) => Promise<string | null>
  }
}
