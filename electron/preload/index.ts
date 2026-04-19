import { contextBridge, ipcRenderer } from 'electron'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = {
  file: {
    open: () => ipcRenderer.invoke('file:open'),
    openMultiple: () => ipcRenderer.invoke('file:openMultiple'),
    load: (path: string) => ipcRenderer.invoke('file:load', path),
  },
  export: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    save: (opts: any) => ipcRenderer.invoke('export:save', opts),
  },
  assets: {
    loadLUT: (filename: string) => ipcRenderer.invoke('assets:loadLUT', filename),
    loadTexture: (filename: string) => ipcRenderer.invoke('assets:loadTexture', filename),
    listPresets: () => ipcRenderer.invoke('assets:listPresets'),
  },
  app: {
    minimize: () => ipcRenderer.invoke('app:minimize'),
    maximize: () => ipcRenderer.invoke('app:maximize'),
    close: () => ipcRenderer.invoke('app:close'),
    isMaximized: (): Promise<boolean> => ipcRenderer.invoke('app:isMaximized'),
  },
}

contextBridge.exposeInMainWorld('frame', api)
