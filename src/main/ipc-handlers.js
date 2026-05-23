import { ipcMain } from 'electron'
import * as store from './timer-store.js'
import * as engine from './timer-engine.js'
import { getPort, addBroadcastListener } from './web-server.js'
import { isNDIAvailable } from './ndi.js'
import os from 'os'
import QRCode from 'qrcode'

function getLocalIP() {
  const ifaces = os.networkInterfaces()
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address
    }
  }
  return '127.0.0.1'
}

export function registerIpcHandlers(mainWindow) {
  // Forward broadcasts to renderer
  addBroadcastListener(state => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('state', state)
    }
  })

  ipcMain.handle('get-state', () => store.getState())

  ipcMain.handle('get-server-info', async () => {
    const ip = getLocalIP()
    const port = getPort()
    const url = `http://${ip}:${port}/viewer`
    const qr = await QRCode.toDataURL(url, { width: 200, margin: 1 })
    return { ip, port, url, qr, ndiAvailable: isNDIAvailable() }
  })

  ipcMain.on('timer:start',  (_, id)              => engine.startTimer(id))
  ipcMain.on('timer:pause',  (_, id)              => engine.pauseTimer(id))
  ipcMain.on('timer:stop',   (_, id)              => engine.stopTimer(id))
  ipcMain.on('timer:reset',  (_, id)              => engine.resetTimer(id))
  ipcMain.on('timer:adjust', (_, { id, seconds }) => engine.adjustTimer(id, seconds))
  ipcMain.on('timer:next',   ()                   => engine.nextTimer())
  ipcMain.on('timer:prev',   ()                   => engine.prevTimer())

  ipcMain.on('timer:add',    (_, data)       => store.addTimer(data))
  ipcMain.on('timer:update', (_, { id, data }) => store.updateTimer(id, data))
  ipcMain.on('timer:remove', (_, id)         => store.removeTimer(id))

  ipcMain.on('message:add',    (_, data)         => store.addMessage(data))
  ipcMain.on('message:update', (_, { id, data }) => store.updateMessage(id, data))
  ipcMain.on('message:remove', (_, id)           => store.removeMessage(id))

  ipcMain.on('blackout',    (_, val)  => engine.setBlackout(val))
  ipcMain.on('flash',       (_, val)  => engine.setFlash(val))
  ipcMain.on('room:update', (_, data) => store.setState(data))
}
