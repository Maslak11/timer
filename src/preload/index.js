import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  getState: () => ipcRenderer.invoke('get-state'),
  getServerInfo: () => ipcRenderer.invoke('get-server-info'),

  onState: (cb) => {
    const handler = (_, state) => cb(state)
    ipcRenderer.on('state', handler)
    return () => ipcRenderer.removeListener('state', handler)
  },

  timerStart: (id) => ipcRenderer.send('timer:start', id),
  timerPause: (id) => ipcRenderer.send('timer:pause', id),
  timerStop: (id) => ipcRenderer.send('timer:stop', id),
  timerReset: (id) => ipcRenderer.send('timer:reset', id),
  timerAdjust: (id, seconds) => ipcRenderer.send('timer:adjust', { id, seconds }),
  timerNext: () => ipcRenderer.send('timer:next'),
  timerPrev: () => ipcRenderer.send('timer:prev'),

  timerAdd: (data) => ipcRenderer.send('timer:add', data),
  timerUpdate: (id, data) => ipcRenderer.send('timer:update', { id, data }),
  timerRemove: (id) => ipcRenderer.send('timer:remove', id),

  messageAdd: (data) => ipcRenderer.send('message:add', data),
  messageUpdate: (id, data) => ipcRenderer.send('message:update', { id, data }),
  messageRemove: (id) => ipcRenderer.send('message:remove', id),

  setBlackout: (val) => ipcRenderer.send('blackout', val),
  setFlash: (val) => ipcRenderer.send('flash', val),

  roomUpdate: (data) => ipcRenderer.send('room:update', data),

  // Multi-room management
  getRoomsList:  ()            => ipcRenderer.invoke('rooms:list'),
  getActiveRoom: ()            => ipcRenderer.invoke('rooms:active'),
  roomAdd:       (name)        => ipcRenderer.invoke('rooms:add', name),
  roomSwitch:    (id)          => ipcRenderer.invoke('rooms:switch', id),
  roomRename:    (id, name)    => ipcRenderer.invoke('rooms:rename', { id, name }),
  roomDelete:    (id)          => ipcRenderer.invoke('rooms:delete', id),

  kickConnection: (id, source) => ipcRenderer.send('connection:kick', { id, source }),

  // NDI output
  ndiStatus: ()  => ipcRenderer.invoke('ndi:status'),
  ndiToggle: ()  => ipcRenderer.invoke('ndi:toggle')
})
