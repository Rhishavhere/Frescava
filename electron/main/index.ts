import { app, BrowserWindow, ipcMain, dialog, shell, nativeTheme, globalShortcut } from 'electron'
import { join } from 'path'
import { registerExportHandlers } from './ipc/export'
import { registerAssetHandlers } from './ipc/assets'

const isDev = process.env['ELECTRON_RENDERER_URL'] !== undefined || process.env['NODE_ENV'] === 'development'

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
  
  // Rotate resolves EXIF orientation. Resize to max 2560 on the longest edge to avoid WebGL memory bloat.
  const pipeline = sharp(filePath)
    .rotate()
    .resize({
      width: 2560,
      height: 2560,
      fit: 'inside',
      withoutEnlargement: true
    })

  const { data, info } = await pipeline.jpeg({ quality: 85, mozjpeg: true }).toBuffer({ resolveWithObject: true })

  const dataURL = `data:image/jpeg;base64,${data.toString('base64')}`

  return {
    path: filePath,
    width: info.width ?? 0,
    height: info.height ?? 0,
    dataURL,
  }
}

app.whenReady().then(() => {
  app.setAppUserModelId('co.frescava.desktop')

  registerExportHandlers()
  registerAssetHandlers()

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
