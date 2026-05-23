import { v4 as uuidv4 } from 'uuid'
import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'

const DATA_FILE = join(app.getPath('userData'), 'room.json')

function defaultRoom() {
  return {
    id: uuidv4(),
    name: 'Room 1',
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
      { id: uuidv4(), text: 'Please wrap up', color: 'orange', visible: false, bold: false },
      { id: uuidv4(), text: 'Questions', color: 'white', visible: false, bold: false },
      { id: uuidv4(), text: 'Next speaker starting soon', color: 'red', visible: false, bold: true }
    ]
  }
}

let state = null

export function loadState() {
  if (existsSync(DATA_FILE)) {
    try {
      state = JSON.parse(readFileSync(DATA_FILE, 'utf-8'))
      state.timers.forEach(t => { t.state = 'stopped'; t.elapsed = 0 })
      state.blackout = false
      state.flash = false
    } catch {
      state = defaultRoom()
    }
  } else {
    state = defaultRoom()
  }
  return state
}

export function saveState() {
  try {
    writeFileSync(DATA_FILE, JSON.stringify(state, null, 2))
  } catch {}
}

export function getState() {
  return state
}

export function setState(updater) {
  if (typeof updater === 'function') {
    updater(state)
  } else {
    Object.assign(state, updater)
  }
  saveState()
}

export function getActiveTimer() {
  return state.timers[state.activeTimerIndex] || null
}

export function getTimerById(id) {
  return state.timers.find(t => t.id === id) || null
}

export function addTimer(data) {
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
  state.timers.push(timer)
  saveState()
  return timer
}

export function updateTimer(id, data) {
  const timer = getTimerById(id)
  if (!timer) return null
  Object.assign(timer, data)
  saveState()
  return timer
}

export function removeTimer(id) {
  const idx = state.timers.findIndex(t => t.id === id)
  if (idx === -1) return false
  state.timers.splice(idx, 1)
  if (state.activeTimerIndex >= state.timers.length) {
    state.activeTimerIndex = Math.max(0, state.timers.length - 1)
  }
  saveState()
  return true
}

export function addMessage(data) {
  const msg = {
    id: uuidv4(),
    text: data.text || '',
    color: data.color || 'white',
    visible: false,
    bold: data.bold || false
  }
  state.messages.push(msg)
  saveState()
  return msg
}

export function updateMessage(id, data) {
  const msg = state.messages.find(m => m.id === id)
  if (!msg) return null
  Object.assign(msg, data)
  saveState()
  return msg
}

export function removeMessage(id) {
  const idx = state.messages.findIndex(m => m.id === id)
  if (idx === -1) return false
  state.messages.splice(idx, 1)
  saveState()
  return true
}
