import { app, BrowserWindow, ipcMain, dialog, shell, nativeTheme, protocol, net } from 'electron'
import { join, basename } from 'path'
import * as fs from 'fs'
import { registerExportHandlers } from './ipc/export'
import { registerAssetHandlers } from './ipc/assets'
import { registerProjectHandlers } from './ipc/projects'

const isDev = process.env['ELECTRON_RENDERER_URL'] !== undefined || process.env['NODE_ENV'] === 'development'

protocol.registerSchemesAsPrivileged([
  { scheme: 'frescava', privileges: { secure: true, standard: true, bypassCSP: true, supportFetchAPI: true } }
])

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

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    frame: false,           // Custom frameless window
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 16, y: 12 }, // macOS traffic lights
    backgroundColor: '#FFFFFF',
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // Content protection in production (blacks out in screen recordings)
  if (!isDev) {
    mainWindow.setContentProtection(true)
  }

  // Force light mode regardless of OS preference
  nativeTheme.themeSource = 'light'

  mainWindow.on('ready-to-show', () => {
    mainWindow!.show()
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Window control IPC
  ipcMain.handle('app:minimize', () => mainWindow?.minimize())
  ipcMain.handle('app:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow?.maximize()
    }
  })
  ipcMain.handle('app:close', () => mainWindow?.close())
  ipcMain.handle('app:isMaximized', () => mainWindow?.isMaximized() ?? false)

  // File open dialog
  ipcMain.handle('file:open', async () => {
    if (!mainWindow) return null
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'Open Photo',
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] }],
      properties: ['openFile'],
    })
    if (canceled || filePaths.length === 0) return null
    return await loadImageFile(filePaths[0])
  })

  ipcMain.handle('file:openMultiple', async () => {
    if (!mainWindow) return []
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'Open Photos',
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] }],
      properties: ['openFile', 'multiSelections'],
    })
    if (canceled) return []
    return Promise.all(filePaths.map(loadImageFile))
  })

  // Make sure we have file:load for dropzone
  ipcMain.handle('file:load', async (_event, filePath: string) => {
    return await loadImageFile(filePath)
  })

  // Load image at FULL resolution (no resize) — used for full-res WebGL export
  ipcMain.handle('file:loadFull', async (_event, filePath: string) => {
    return await loadImageFileFull(filePath)
  })

  // Load dev or production URL
  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
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

  // Write DIRECTLY to file — no intermediate buffer, single Sharp pass
  const info = await sharp(filePath)
    .rotate()
    .resize({
      width: 2560,
      height: 2560,
      fit: 'inside',
      withoutEnlargement: true
    })
    .jpeg({ quality: 85, mozjpeg: true })
    .toFile(tempPath)  // ← direct to file, no .toBuffer() first

  return {
    path: filePath,
    width: info.width ?? 0,
    height: info.height ?? 0,
    dataURL: `frescava://load/${encodeURIComponent(fileName)}`,
  }
}

/** Same as loadImageFile but NO size cap — returns original dimensions */
async function loadImageFileFull(filePath: string): Promise<{
  path: string; width: number; height: number; dataURL: string
}> {
  const sharp = require('sharp')
  // Only apply EXIF rotation, no resize
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
  cleanPreviewsDir() // Clean on startup for crash recovery
  
  protocol.handle('frescava', (request) => {
    const url = request.url.replace('frescava://load/', '')
    const decodedName = decodeURIComponent(url)
    const tempDir = join(app.getPath('temp'), 'frescava-previews')
    
    // Sandbox to temp directory
    const safePath = join(tempDir, basename(decodedName))
    
    if (safePath.startsWith(tempDir) && fs.existsSync(safePath)) {
      return net.fetch('file://' + safePath)
    }
    return new Response('Not Found', { status: 404 })
  })

  app.setAppUserModelId('co.frescava.desktop')

  registerExportHandlers()
  registerAssetHandlers()
  registerProjectHandlers()

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  cleanPreviewsDir() // Clean on exit
  if (process.platform !== 'darwin') app.quit()
})
