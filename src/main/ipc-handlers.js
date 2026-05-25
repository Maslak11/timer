import { ipcMain } from 'electron'
import * as store from './timer-store.js'
import * as engine from './timer-engine.js'
import { getPort, addBroadcastListener, broadcastState, getConnectionCount } from './web-server.js'
import { isNDIAvailable } from './ndi.js'
import { getRelayInfo } from './relay.js'
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

let _forwardToRenderer = null

export function registerIpcHandlers(mainWindow) {
  _forwardToRenderer = state => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('state', { ...state, _connections: getConnectionCount() })
    }
  }
  // Engine broadcasts (timer tick, blackout, flash) reach renderer via this listener
  addBroadcastListener(_forwardToRenderer)

  // Store mutations bypass the engine, so we broadcast manually after each
  function storeBroadcast() {
    const s = store.getState()
    _forwardToRenderer(s)
    broadcastState() // also push to socket.io web panel clients
  }

  ipcMain.handle('get-state', () => store.getState())

  ipcMain.handle('get-server-info', async () => {
    const ip = getLocalIP()
    const port = getPort()
    const localUrl = `http://${ip}:${port}/viewer`
    const relay = getRelayInfo()
    const remoteUrl = `${relay.relayUrl}/?id=${relay.roomId}&view=viewer`
    const qr = await QRCode.toDataURL(remoteUrl, { width: 200, margin: 1 })
    return { ip, port, localUrl, qr, ndiAvailable: isNDIAvailable(), relay }
  })

  // Engine operations broadcast automatically via setBroadcastFn
  ipcMain.on('timer:start',  (_, id)              => engine.startTimer(id))
  ipcMain.on('timer:pause',  (_, id)              => engine.pauseTimer(id))
  ipcMain.on('timer:stop',   (_, id)              => engine.stopTimer(id))
  ipcMain.on('timer:reset',  (_, id)              => engine.resetTimer(id))
  ipcMain.on('timer:adjust', (_, { id, seconds }) => engine.adjustTimer(id, seconds))
  ipcMain.on('timer:next',   ()                   => engine.nextTimer())
  ipcMain.on('timer:prev',   ()                   => engine.prevTimer())
  ipcMain.on('blackout',     (_, val)             => engine.setBlackout(val))
  ipcMain.on('flash',        (_, val)             => engine.setFlash(val))

  // Store-only mutations — manual broadcast required
  ipcMain.on('timer:add',      (_, data)         => { store.addTimer(data);           storeBroadcast() })
  ipcMain.on('timer:update',   (_, { id, data }) => { store.updateTimer(id, data);    storeBroadcast() })
  ipcMain.on('timer:remove',   (_, id)           => { store.removeTimer(id);          storeBroadcast() })
  ipcMain.on('message:add',    (_, data)         => { store.addMessage(data);         storeBroadcast() })
  ipcMain.on('message:update', (_, { id, data }) => { store.updateMessage(id, data);  storeBroadcast() })
  ipcMain.on('message:remove', (_, id)           => { store.removeMessage(id);        storeBroadcast() })
  ipcMain.on('room:update',    (_, data)         => { store.setState(data);           storeBroadcast() })
}
