import { v4 as uuidv4 } from 'uuid'
import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'

const ROOMS_FILE = join(app.getPath('userData'), 'rooms.json')
const LEGACY_FILE = join(app.getPath('userData'), 'room.json')

// ── Helpers ────────────────────────────────────────────────────────────────

function genRelayId (len = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let id = ''
  for (let i = 0; i < len; i++) id += chars[Math.floor(Math.random() * chars.length)]
  return id
}

function defaultRoom (name = 'Room 1') {
  return {
    id: uuidv4(),
    name,
    relayId: genRelayId(6),
    relaySecret: genRelayId(32),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    overtime: 'continue',
    overtimePrefix: '+',
    activeTimerIndex: 0,
    blackout: false,
    flash: false,
    timers: [
      {
        id: uuidv4(),
        name: 'Session 1',
        duration: 600,
        elapsed: 0,
        state: 'stopped',
        type: 'countdown',
        targetTime: null,
        wrap: null,
        color: 'green'
      }
    ],
    messages: [
      { id: uuidv4(), text: 'Please wrap up',        color: 'orange', visible: false, bold: false },
      { id: uuidv4(), text: 'Questions',              color: 'white',  visible: false, bold: false },
      { id: uuidv4(), text: 'Next speaker starting soon', color: 'red', visible: false, bold: true }
    ]
  }
}

// ── State ──────────────────────────────────────────────────────────────────

let rooms = []       // array of room objects
let activeId = null  // id of the currently active room

function activeRoom () {
  return rooms.find(r => r.id === activeId) || rooms[0]
}

// ── Persistence ────────────────────────────────────────────────────────────

export function loadState () {
  // Migrate legacy single-room file
  if (!existsSync(ROOMS_FILE) && existsSync(LEGACY_FILE)) {
    try {
      const legacy = JSON.parse(readFileSync(LEGACY_FILE, 'utf-8'))
      // Assign relay credentials (migrated from relay.json if present)
      const relayFile = join(app.getPath('userData'), 'relay.json')
      let relayId = genRelayId(6)
      let relaySecret = genRelayId(32)
      if (existsSync(relayFile)) {
        try {
          const rc = JSON.parse(readFileSync(relayFile, 'utf-8'))
          relayId = rc.roomId || relayId
          relaySecret = rc.secret || relaySecret
        } catch {}
      }
      legacy.relayId = relayId
      legacy.relaySecret = relaySecret
      if (!legacy.id) legacy.id = uuidv4()
      if (!legacy.name) legacy.name = 'Room 1'
      rooms = [legacy]
      activeId = legacy.id
      saveRooms()
      return
    } catch {}
  }

  if (existsSync(ROOMS_FILE)) {
    try {
      const data = JSON.parse(readFileSync(ROOMS_FILE, 'utf-8'))
      rooms = data.rooms || []
      activeId = data.activeId
      if (!rooms.length) {
        rooms = [defaultRoom()]
        activeId = rooms[0].id
      }
      if (!rooms.find(r => r.id === activeId)) activeId = rooms[0].id
    } catch {
      rooms = [defaultRoom()]
      activeId = rooms[0].id
    }
  } else {
    rooms = [defaultRoom()]
    activeId = rooms[0].id
    saveRooms()
  }

  // Reset runtime state on load
  const room = activeRoom()
  room.timers.forEach(t => { t.state = 'stopped'; t.elapsed = 0 })
  room.blackout = false
  room.flash = false
}

function saveRooms () {
  try {
    writeFileSync(ROOMS_FILE, JSON.stringify({ activeId, rooms }, null, 2))
  } catch {}
}

export function saveState () {
  saveRooms()
}

// ── Active room read/write ─────────────────────────────────────────────────

export function getState () {
  return activeRoom()
}

export function setState (updater) {
  const room = activeRoom()
  if (typeof updater === 'function') {
    updater(room)
  } else {
    Object.assign(room, updater)
  }
  saveRooms()
}

export function getActiveTimer () {
  const room = activeRoom()
  return room.timers[room.activeTimerIndex] || null
}

export function getTimerById (id) {
  return activeRoom().timers.find(t => t.id === id) || null
}

// ── Timer CRUD ─────────────────────────────────────────────────────────────

export function addTimer (data) {
  const timer = {
    id: uuidv4(),
    name: data.name || 'New Timer',
    duration: data.duration || 600,
    elapsed: 0,
    state: 'stopped',
    type: data.type || 'countdown',
    targetTime: data.targetTime || null,
    wrap: data.wrap || null,
    color: data.color || 'green'
  }
  activeRoom().timers.push(timer)
  saveRooms()
  return timer
}

export function updateTimer (id, data) {
  const timer = getTimerById(id)
  if (!timer) return null
  Object.assign(timer, data)
  saveRooms()
  return timer
}

export function removeTimer (id) {
  const room = activeRoom()
  const idx = room.timers.findIndex(t => t.id === id)
  if (idx === -1) return false
  room.timers.splice(idx, 1)
  if (room.activeTimerIndex >= room.timers.length) {
    room.activeTimerIndex = Math.max(0, room.timers.length - 1)
  }
  saveRooms()
  return true
}

// ── Message CRUD ───────────────────────────────────────────────────────────

export function addMessage (data) {
  const msg = {
    id: uuidv4(),
    text: data.text || '',
    color: data.color || 'white',
    visible: false,
    bold: data.bold || false
  }
  activeRoom().messages.push(msg)
  saveRooms()
  return msg
}

export function updateMessage (id, data) {
  const msg = activeRoom().messages.find(m => m.id === id)
  if (!msg) return null
  Object.assign(msg, data)
  saveRooms()
  return msg
}

export function removeMessage (id) {
  const room = activeRoom()
  const idx = room.messages.findIndex(m => m.id === id)
  if (idx === -1) return false
  room.messages.splice(idx, 1)
  saveRooms()
  return true
}

// ── Room management ────────────────────────────────────────────────────────

export function getRoomsList () {
  return rooms.map(r => ({ id: r.id, name: r.name, relayId: r.relayId }))
}

export function getActiveRoomId () {
  return activeId
}

export function addRoom (name = 'New Room') {
  const room = defaultRoom(name)
  rooms.push(room)
  saveRooms()
  return room
}

export function switchRoom (id) {
  if (!rooms.find(r => r.id === id)) return false
  activeId = id
  const room = activeRoom()
  room.timers.forEach(t => { t.state = 'stopped'; t.elapsed = 0 })
  room.blackout = false
  room.flash = false
  saveRooms()
  return true
}

export function updateRoomMeta (id, data) {
  const room = rooms.find(r => r.id === id)
  if (!room) return false
  if (data.name) room.name = data.name
  saveRooms()
  return true
}

export function deleteRoom (id) {
  if (rooms.length <= 1) return false  // always keep at least one
  const idx = rooms.findIndex(r => r.id === id)
  if (idx === -1) return false
  rooms.splice(idx, 1)
  if (activeId === id) {
    activeId = rooms[0].id
    const room = activeRoom()
    room.timers.forEach(t => { t.state = 'stopped'; t.elapsed = 0 })
  }
  saveRooms()
  return true
}
