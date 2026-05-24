import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'
import type { FileOpenResult, EditorUiPreferences, FrescavaAPI } from '../../src/shared/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = {
  file: {
    open: () => ipcRenderer.invoke('file:open'),
    openMultiple: () => ipcRenderer.invoke('file:openMultiple'),
    openForEditor: () => ipcRenderer.invoke('file:openForEditor'),
    load: (path: string) => ipcRenderer.invoke('file:load', path),
    loadFull: (path: string) => ipcRenderer.invoke('file:loadFull', path),
  },
  export: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    save: (opts: any) => ipcRenderer.invoke('export:save', opts),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    exportBatch: (opts: any) => ipcRenderer.invoke('export:exportBatch', opts),
  },
  assets: {
    loadLUT: (filename: string) => ipcRenderer.invoke('assets:loadLUT', filename),
    loadTexture: (filename: string) => ipcRenderer.invoke('assets:loadTexture', filename),
    listPresets: () => ipcRenderer.invoke('assets:listPresets'),
    listLUTFiles: () => ipcRenderer.invoke('assets:listLUTFiles'),
    savePreset: (preset: any) => ipcRenderer.invoke('assets:savePreset', preset),
    listTextTemplates: () => ipcRenderer.invoke('assets:listTextTemplates'),
    saveTextTemplate: (template: any) => ipcRenderer.invoke('assets:saveTextTemplate', template),
  },
  projects: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    save: (project: any) => ipcRenderer.invoke('projects:save', project),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    saveAt: (filePath: string, project: any) => ipcRenderer.invoke('projects:saveAt', filePath, project),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    saveAs: (project: any) => ipcRenderer.invoke('projects:saveAs', project),
    list: () => ipcRenderer.invoke('projects:list'),
    load: (path: string) => ipcRenderer.invoke('projects:load', path),
  },
  app: {
    minimize: () => ipcRenderer.invoke('app:minimize'),
    maximize: () => ipcRenderer.invoke('app:maximize'),
    close: () => ipcRenderer.invoke('app:close'),
    isMaximized: (): Promise<boolean> => ipcRenderer.invoke('app:isMaximized'),
  },
  preferences: {
    getEditorUi: (): Promise<EditorUiPreferences> => ipcRenderer.invoke('preferences:getEditorUi'),
    setEditorUi: (partial: Partial<EditorUiPreferences>) =>
      ipcRenderer.invoke('preferences:setEditorUi', partial),
    onEditorUiChange: (cb: (prefs: EditorUiPreferences) => void) => {
      const handler = (_e: IpcRendererEvent, prefs: EditorUiPreferences) => {
        cb(prefs)
      }
      ipcRenderer.on('preferences:editorUiChanged', handler)
      return () => ipcRenderer.removeListener('preferences:editorUiChanged', handler)
    },
  },
  window: {
    openEditor: (opts?: { files?: FileOpenResult[]; project?: { filePath: string; project: import('../../src/shared/types').ProjectFile } }) =>
      ipcRenderer.invoke('window:openEditor', opts),
    openHome: (opts?: { view?: 'default' | 'settings' }) => ipcRenderer.invoke('window:openHome', opts),
    getHomeLaunchView: () =>
      ipcRenderer.invoke('window:getHomeLaunchView') as Promise<'default' | 'settings' | null>,
    onHomeOpenView: (cb: (view: 'default' | 'settings') => void) => {
      const handler = (_e: IpcRendererEvent, view: 'default' | 'settings') => {
        cb(view)
      }
      ipcRenderer.on('home:openView', handler)
      return () => ipcRenderer.removeListener('home:openView', handler)
    },
    getLaunchPayload: () =>
      ipcRenderer.invoke('window:getLaunchPayload') as Promise<
        | { type: 'files'; files: FileOpenResult[] }
        | { type: 'empty' }
        | { type: 'project'; filePath: string; project: import('../../src/shared/types').ProjectFile }
        | null
      >,
    onEditorOpenFiles: (cb: (files: FileOpenResult[]) => void) => {
      const handler = (_e: IpcRendererEvent, files: FileOpenResult[]) => {
        cb(files)
      }
      ipcRenderer.on('editor:openFiles', handler)
      return () => ipcRenderer.removeListener('editor:openFiles', handler)
    },
    onEditorOpenProject: (cb: (payload: { filePath: string; project: import('../../src/shared/types').ProjectFile }) => void) => {
      const handler = (
        _e: IpcRendererEvent,
        payload: { filePath: string; project: import('../../src/shared/types').ProjectFile }
      ) => {
        cb(payload)
      }
      ipcRenderer.on('editor:openProject', handler)
      return () => ipcRenderer.removeListener('editor:openProject', handler)
    },
  },
  auth: {
    signUp: (email, password, name) => ipcRenderer.invoke('auth:signUp', email, password, name),
    signIn: (email, password) => ipcRenderer.invoke('auth:signIn', email, password),
    signInWithGoogle: () => ipcRenderer.invoke('auth:signInWithGoogle'),
    signOut: () => ipcRenderer.invoke('auth:signOut'),
    getProfile: () => ipcRenderer.invoke('auth:getProfile'),
    updateProfile: (name) => ipcRenderer.invoke('auth:updateProfile', name),
    onAuthChange: (cb) => {
      const handler = (_e: IpcRendererEvent, payload: { session: any; user?: any; profile: any }) => {
        cb(payload)
      }
      ipcRenderer.on('auth:changed', handler)
      return () => ipcRenderer.removeListener('auth:changed', handler)
    }
  }
}

contextBridge.exposeInMainWorld('frame', api satisfies FrescavaAPI)
