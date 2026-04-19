import { ipcMain, dialog, app } from 'electron'
import { join } from 'path'
import {
  readFileSync, writeFileSync, readdirSync,
  existsSync, mkdirSync
} from 'fs'
import type { ProjectFile, ProjectMeta } from '../../src/shared/types'

const PROJECTS_DIR = join(app.getPath('documents'), 'Frescava Projects')

function ensureDir() {
  if (!existsSync(PROJECTS_DIR)) mkdirSync(PROJECTS_DIR, { recursive: true })
}

function readMeta(filePath: string): ProjectMeta | null {
  try {
    const raw = readFileSync(filePath, 'utf-8')
    const project = JSON.parse(raw) as ProjectFile
    return {
      path: filePath,
      name: project.name,
      presetId: project.editState.presetId ?? null,
      savedAt: project.savedAt,
      previewDataURL: project.previewDataURL ?? null,
      imageWidth: project.imageWidth,
      imageHeight: project.imageHeight,
    }
  } catch {
    return null
  }
}

export function registerProjectHandlers(): void {
  // Save to default location (or overwrite existing path if known)
  ipcMain.handle('projects:save', async (_event, project: ProjectFile) => {
    ensureDir()
    const safeName = project.name.replace(/[^a-z0-9_\- ]/gi, '_')
    const filename = `${safeName}_${Date.now()}.frex`
    const filePath = join(PROJECTS_DIR, filename)
    writeFileSync(filePath, JSON.stringify(project, null, 2), 'utf-8')
    return { path: filePath }
  })

  // Save As — shows a dialog for location picking
  ipcMain.handle('projects:saveAs', async (_event, project: ProjectFile) => {
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Save Frescava Project',
      defaultPath: join(PROJECTS_DIR, `${project.name}.frex`),
      filters: [{ name: 'Frescava Project', extensions: ['frex'] }],
    })
    if (canceled || !filePath) return null

    ensureDir()
    writeFileSync(filePath, JSON.stringify(project, null, 2), 'utf-8')
    return { path: filePath }
  })

  // List all .frex files in projects directory
  ipcMain.handle('projects:list', async (): Promise<ProjectMeta[]> => {
    ensureDir()
    const files = readdirSync(PROJECTS_DIR).filter(f => f.endsWith('.frex'))
    const metas = files
      .map(f => readMeta(join(PROJECTS_DIR, f)))
      .filter((m): m is ProjectMeta => m !== null)

    // Sort by most recently saved
    return metas.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())
  })

  // Load a specific .frex file
  ipcMain.handle('projects:load', async (_event, filePath: string): Promise<ProjectFile> => {
    const raw = readFileSync(filePath, 'utf-8')
    return JSON.parse(raw) as ProjectFile
  })
}
