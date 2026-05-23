import { app, BrowserWindow, Tray, Menu, nativeImage, shell } from 'electron'
import { join } from 'path'
import { loadState } from './timer-store.js'
import { startWebServer } from './web-server.js'
import { startCompanionApi } from './companion-api.js'
import { initNDI, cleanup as cleanupNDI } from './ndi.js'
import { registerIpcHandlers } from './ipc-handlers.js'
import { setBroadcastFn } from './timer-engine.js'
import { startRelay, stopRelay } from './relay.js'

let mainWindow = null
let tray = null

function getIconPath() {
  const iconFile = app.isPackaged
    ? join(process.resourcesPath, 'resources', 'icons', 'icon.png')
    : join(process.cwd(), 'resources', 'icons', 'icon.png')
  return iconFile
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#0f0f0f',
    titleBarStyle: 'default',
    icon: getIconPath(),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.setMenu(null)

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('close', (e) => {
    e.preventDefault()
    mainWindow.hide()
  })

  registerIpcHandlers(mainWindow)

  // Forward socket.io broadcasts to renderer
  setBroadcastFn((state) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('state', state)
    }
    // Also broadcast via Socket.io (web-server handles this separately)
  })
}

function createTray() {
  const icon = nativeImage.createFromPath(getIconPath())
  tray = new Tray(icon.resize({ width: 16, height: 16 }))

  const updateMenu = () => {
    const menu = Menu.buildFromTemplate([
      { label: 'StageTimer', enabled: false },
      { type: 'separator' },
      { label: 'Open Dashboard', click: () => { mainWindow.show(); mainWindow.focus() } },
      { label: 'Open Viewer in Browser', click: () => shell.openExternal(`http://localhost:7000/viewer`) },
      { type: 'separator' },
      { label: 'Quit', click: () => { app.exit(0) } }
    ])
    tray.setContextMenu(menu)
  }

  tray.setToolTip('StageTimer')
  updateMenu()

  tray.on('double-click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.focus()
    } else {
      mainWindow.show()
    }
  })
}

app.whenReady().then(async () => {
  loadState()
  startWebServer()
  startCompanionApi()
  startRelay()
  initNDI()
  createWindow()
  createTray()
})

app.on('window-all-closed', () => {
  // Keep running in tray
})

app.on('before-quit', () => {
  stopRelay()
  cleanupNDI()
})

app.on('activate', () => {
  if (mainWindow) mainWindow.show()
})
