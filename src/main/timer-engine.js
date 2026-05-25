import { getState, getActiveTimer, getTimerById, setState } from './timer-store.js'

let tickInterval = null
let lastTick = null
let broadcastFn = null

export function setBroadcastFn(fn) {
  broadcastFn = fn
}

function broadcast() {
  if (broadcastFn) broadcastFn(getState())
}

function tick() {
  const now = Date.now()
  const delta = lastTick ? (now - lastTick) / 1000 : 0
  lastTick = now

  const state = getState()
  const timer = getActiveTimer()
  if (!timer || timer.state !== 'running') return

  if (timer.type === 'countdown') {
    const remaining = timer.duration - timer.elapsed
    if (remaining <= 0) {
      if (state.overtime === 'stop') {
        timer.state = 'stopped'
        timer.elapsed = timer.duration
      } else {
        timer.elapsed += delta
      }
    } else {
      timer.elapsed += delta
    }
  } else if (timer.type === 'countup') {
    timer.elapsed += delta
  } else if (timer.type === 'time-of-day') {
    // time-of-day counts elapsed time toward target; just track elapsed
    timer.elapsed += delta
  }

  broadcast()
}

export function startTimer(id) {
  const state = getState()
  const timer = id ? getTimerById(id) : getActiveTimer()
  if (!timer) return false

  if (id) {
    const idx = state.timers.findIndex(t => t.id === id)
    if (idx !== -1) state.activeTimerIndex = idx
  }

  // Stop any currently running timer
  state.timers.forEach(t => { if (t.state === 'running') t.state = 'paused' })

  timer.state = 'running'
  lastTick = Date.now()

  if (!tickInterval) {
    tickInterval = setInterval(tick, 100)
  }

  broadcast()
  return true
}

export function pauseTimer(id) {
  const timer = id ? getTimerById(id) : getActiveTimer()
  if (!timer) return false
  timer.state = timer.state === 'running' ? 'paused' : 'running'
  if (timer.state === 'running') {
    lastTick = Date.now()
    if (!tickInterval) tickInterval = setInterval(tick, 100)
  }
  broadcast()
  return true
}

export function stopTimer(id) {
  const timer = id ? getTimerById(id) : getActiveTimer()
  if (!timer) return false
  timer.state = 'stopped'
  clearInterval(tickInterval)
  tickInterval = null
  broadcast()
  return true
}

export function resetTimer(id) {
  const timer = id ? getTimerById(id) : getActiveTimer()
  if (!timer) return false
  timer.elapsed = 0
  timer.state = 'stopped'
  clearInterval(tickInterval)
  tickInterval = null
  broadcast()
  return true
}

export function adjustTimer(id, seconds) {
  const timer = id ? getTimerById(id) : getActiveTimer()
  if (!timer) return false
  if (timer.type === 'countdown') {
    timer.duration = Math.max(0, timer.duration + seconds)
  } else {
    timer.elapsed = Math.max(0, timer.elapsed - seconds)
  }
  broadcast()
  return true
}

export function nextTimer() {
  const state = getState()
  stopAllTimers()
  state.activeTimerIndex = Math.min(state.activeTimerIndex + 1, state.timers.length - 1)
  broadcast()
}

export function prevTimer() {
  const state = getState()
  stopAllTimers()
  state.activeTimerIndex = Math.max(state.activeTimerIndex - 1, 0)
  broadcast()
}

function stopAllTimers() {
  const state = getState()
  state.timers.forEach(t => { t.state = 'stopped' })
  clearInterval(tickInterval)
  tickInterval = null
}

export function setBlackout(value) {
  setState(s => { s.blackout = value })
  broadcast()
}

export function setFlash(value) {
  setState(s => { s.flash = value })
  broadcast()
}

// Stop the tick loop (used when switching rooms)
export function stop() {
  const state = getState()
  state.timers.forEach(t => { t.state = 'stopped' })
  clearInterval(tickInterval)
  tickInterval = null
  lastTick = null
}

// Start the tick loop (idempotent — used after room switch)
export function start() {
  // Nothing to do — tick loop starts automatically when a timer is started
  broadcast()
}

export function cleanup() {
  clearInterval(tickInterval)
  tickInterval = null
}
