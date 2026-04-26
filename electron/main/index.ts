import { app, BrowserWindow, ipcMain, dialog, shell, nativeTheme, protocol, net } from 'electron'
import { join, basename } from 'path'
import { pathToFileURL } from 'url'
import * as fs from 'fs'
import { registerExportHandlers } from './ipc/export'
import { registerAssetHandlers } from './ipc/assets'
import { registerProjectHandlers } from './ipc/projects'
import type { FileOpenResult } from '@shared/types'

const isDev = process.env['ELECTRON_RENDERER_URL'] !== undefined || process.env['NODE_ENV'] === 'development'

type EditorLaunchPayload = { type: 'files'; files: FileOpenResult[] } | { type: 'empty' }

function cleanPreviewsDir(): void {
  const tempDir = join(app.getPath('temp'), 'frescava-previews')
  try {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  } catch (e) {
    console.error('Failed to clean temp previews:', e)
  }
}

protocol.registerSchemesAsPrivileged([
  { scheme: 'frescava', privileges: { secure: true, standard: true, bypassCSP: true, supportFetchAPI: true } },
])

let homeWindow: BrowserWindow | null = null
let editorWindow: BrowserWindow | null = null
/** Set before the editor window loads; read once by renderer via getLaunchPayload */
let pendingEditorPayload: EditorLaunchPayload | null = null

function winFrom(e: Electron.IpcMainEvent | Electron.IpcMainInvokeEvent): BrowserWindow | null {
  return BrowserWindow.fromWebContents(e.sender) ?? null
}

function defaultParentWindow(
  e: Electron.IpcMainEvent | Electron.IpcMainInvokeEvent
): BrowserWindow | undefined {
  return winFrom(e) ?? homeWindow ?? undefined
}

function getRendererBaseUrlWithHash(hash: 'home' | 'editor'): string {
  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    const base = process.env['ELECTRON_RENDERER_URL'].replace(/\/$/, '')
    return `${base}/#${hash}`
  }
  const fileUrl = pathToFileURL(join(__dirname, '../renderer/index.html')).href
  return `${fileUrl}#${hash}`
}

function buildBrowserWindowOptions(): Electron.BrowserWindowConstructorOptions {
  return {
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    frame: false,
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 16, y: 12 },
    backgroundColor: '#FFFFFF',
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  }
}

function createHomeWindow(): void {
  if (homeWindow && !homeWindow.isDestroyed()) {
    homeWindow.focus()
    return
  }
  const w = new BrowserWindow({
    ...buildBrowserWindowOptions(),
    minWidth: 900,
    minHeight: 600,
  })
  homeWindow = w
  w.on('closed', () => {
    if (homeWindow === w) homeWindow = null
  })
  w.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
  w.once('ready-to-show', () => w.show())
  w.loadURL(getRendererBaseUrlWithHash('home'))
  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    w.webContents.openDevTools({ mode: 'detach' })
  } else if (!isDev) {
    w.setContentProtection(true)
  }
}

function closeHomeWindow(): void {
  if (homeWindow && !homeWindow.isDestroyed()) {
    homeWindow.close()
  }
}

function createEditorWindow(): void {
  if (editorWindow && !editorWindow.isDestroyed()) {
    editorWindow.focus()
    editorWindow.maximize()
    return
  }
  const w = new BrowserWindow({
    ...buildBrowserWindowOptions(),
  })
  editorWindow = w
  w.on('closed', () => {
    if (editorWindow === w) editorWindow = null
  })
  w.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
  w.once('ready-to-show', () => {
    w.maximize()
    w.show()
  })
  w.loadURL(getRendererBaseUrlWithHash('editor'))
  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    w.webContents.openDevTools({ mode: 'detach' })
  } else if (!isDev) {
    w.setContentProtection(true)
  }
}

function registerWindowIpc(): void {
  ipcMain.handle('app:minimize', e => {
    winFrom(e)?.minimize()
  })
  ipcMain.handle('app:maximize', e => {
    const w = winFrom(e)
    if (w?.isMaximized()) w.unmaximize()
    else w?.maximize()
  })
  ipcMain.handle('app:close', e => {
    winFrom(e)?.close()
  })
  ipcMain.handle('app:isMaximized', e => winFrom(e)?.isMaximized() ?? false)

  ipcMain.handle('file:open', async (e) => {
    const parent = defaultParentWindow(e)
    if (!parent) return null
    const { canceled, filePaths } = await dialog.showOpenDialog(parent, {
      title: 'Open Photo',
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] }],
      properties: ['openFile'],
    })
    if (canceled || filePaths.length === 0) return null
    return await loadImageFile(filePaths[0])
  })

  ipcMain.handle('file:openMultiple', async (e) => {
    const parent = defaultParentWindow(e)
    if (!parent) return []
    const { canceled, filePaths } = await dialog.showOpenDialog(parent, {
      title: 'Open Photos',
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] }],
      properties: ['openFile', 'multiSelections'],
    })
    if (canceled) return []
    return Promise.all(filePaths.map(loadImageFile))
  })

  ipcMain.handle('file:load', async (_event, filePath: string) => {
    return await loadImageFile(filePath)
  })

  ipcMain.handle('file:loadFull', async (_event, filePath: string) => {
    return await loadImageFileFull(filePath)
  })

  ipcMain.handle('window:openEditor', async (_e, opts?: { files?: FileOpenResult[] }) => {
    if (opts?.files && opts.files.length > 0) {
      if (editorWindow && !editorWindow.isDestroyed()) {
        editorWindow.focus()
        editorWindow.maximize()
        editorWindow.webContents.send('editor:openFiles', opts.files)
        closeHomeWindow()
        return
      }
      pendingEditorPayload = { type: 'files', files: opts.files }
    } else {
      if (editorWindow && !editorWindow.isDestroyed()) {
        editorWindow.focus()
        editorWindow.maximize()
        closeHomeWindow()
        return
      }
      pendingEditorPayload = { type: 'empty' }
    }
    closeHomeWindow()
    createEditorWindow()
  })

  ipcMain.handle('window:openHome', () => {
    if (homeWindow && !homeWindow.isDestroyed()) {
      homeWindow.focus()
    } else {
      createHomeWindow()
    }
  })

  ipcMain.handle('window:getLaunchPayload', (): EditorLaunchPayload | null => {
    const p = pendingEditorPayload
    pendingEditorPayload = null
    return p
  })
}

async function loadImageFile(filePath: string): Promise<{
  path: string; width: number; height: number; dataURL: string
}> {
  const sharp = require('sharp')

  const tempDir = join(app.getPath('temp'), 'frescava-previews')
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true })
  }

  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.jpg`
  const tempPath = join(tempDir, fileName)

  const info = await sharp(filePath)
    .rotate()
    .resize({
      width: 2560,
      height: 2560,
      fit: 'inside',
      withoutEnlargement: true
    })
    .jpeg({ quality: 85, mozjpeg: true })
    .toFile(tempPath)

  return {
    path: filePath,
    width: info.width ?? 0,
    height: info.height ?? 0,
    dataURL: `frescava://load/${encodeURIComponent(fileName)}`,
  }
}

/** Same as loadImageFile but NO size cap — original dimensions */
async function loadImageFileFull(filePath: string): Promise<{
  path: string; width: number; height: number; dataURL: string
}> {
  const sharp = require('sharp')
  const { data, info } = await sharp(filePath)
    .rotate()
    .jpeg({ quality: 95, mozjpeg: true })
    .toBuffer({ resolveWithObject: true })

  const dataURL = `data:image/jpeg;base64,${data.toString('base64')}`
  return {
    path: filePath,
    width: info.width ?? 0,
    height: info.height ?? 0,
    dataURL,
  }
}

app.whenReady().then(() => {
  cleanPreviewsDir()

  protocol.handle('frescava', (request) => {
    const url = request.url.replace('frescava://load/', '')
    const decodedName = decodeURIComponent(url)
    const tempDir = join(app.getPath('temp'), 'frescava-previews')

    const safePath = join(tempDir, basename(decodedName))

    if (safePath.startsWith(tempDir) && fs.existsSync(safePath)) {
      return net.fetch('file://' + safePath)
    }
    return new Response('Not Found', { status: 404 })
  })

  app.setAppUserModelId('co.frescava.desktop')
  nativeTheme.themeSource = 'light'

  registerWindowIpc()
  registerExportHandlers()
  registerAssetHandlers()
  registerProjectHandlers()

  createHomeWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createHomeWindow()
  })
})

app.on('window-all-closed', () => {
  cleanPreviewsDir()
  if (process.platform !== 'darwin') app.quit()
})
