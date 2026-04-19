import { create } from 'zustand'
import type { ProjectMeta, ProjectFile } from '@shared/types'

interface ProjectStore {
  projects: ProjectMeta[]
  isLoading: boolean

  loadProjects: () => Promise<void>
  saveProject: (project: ProjectFile) => Promise<string>
  saveProjectAs: (project: ProjectFile) => Promise<string | null>
}

export const useProjectStore = create<ProjectStore>((set) => ({
  projects: [],
  isLoading: false,

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

  saveProject: async (project) => {
    const result = await window.frame.projects.save(project)
    // Refresh list
    const projects = await window.frame.projects.list()
    set({ projects })
    return result.path
  },

  saveProjectAs: async (project) => {
    const result = await window.frame.projects.saveAs(project)
    if (!result) return null
    const projects = await window.frame.projects.list()
    set({ projects })
    return result.path
  },
}))
