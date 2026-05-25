import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { getState } from './timer-store.js'
import * as engine from './timer-engine.js'
import * as store from './timer-store.js'
import { broadcastState } from './web-server.js'

const RELAY_URL = 'https://timer.matlak.stream'
const CONFIG_FILE = join(app.getPath('userData'), 'relay.json')

let roomId = null
let secret = null
let pushInterval = null
let enabled = false
let relayConnections = []

function genId (len = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let id = ''
  for (let i = 0; i < len; i++) id += chars[Math.floor(Math.random() * chars.length)]
  return id
}

function loadConfig () {
  if (existsSync(CONFIG_FILE)) {
    try {
      const c = JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'))
      roomId = c.roomId
      secret = c.secret
      return
    } catch {}
  }
  roomId = genId(6)
  secret = genId(32)
  writeFileSync(CONFIG_FILE, JSON.stringify({ roomId, secret }))
}

async function pushState () {
  if (!enabled) return
  const state = getState()
  try {
    const res = await fetch(`${RELAY_URL}/api/push.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: roomId, secret, state }),
      signal: AbortSignal.timeout(4000)
    })
    if (!res.ok) return
    const data = await res.json()
    if (data.commands?.length) {
      data.commands.forEach(cmd => handleRemoteCommand(cmd))
    }
    if (data.connections) {
      relayConnections = data.connections
      broadcastState()
    }
  } catch {}
}

function handleRemoteCommand (cmd) {
  let needsBroadcast = false
  switch (cmd.action) {
    // Engine actions — broadcast automatically via the 100ms tick loop
    case 'start':    engine.startTimer(cmd.id || null); break
    case 'pause':    engine.pauseTimer(cmd.id || null); break
    case 'stop':     engine.stopTimer(cmd.id || null); break
    case 'reset':    engine.resetTimer(cmd.id || null); break
    case 'adjust':   engine.adjustTimer(cmd.id || null, cmd.seconds || 60); break
    case 'next':     engine.nextTimer(); break
    case 'prev':     engine.prevTimer(); break
    case 'blackout': engine.setBlackout(cmd.value); break
    case 'flash':    engine.setFlash(cmd.value); break
    // Store mutations — must broadcast manually so Electron renderer + web clients update
    case 'message:show':   store.updateMessage(cmd.id, { visible: true });  needsBroadcast = true; break
    case 'message:hide':   store.updateMessage(cmd.id, { visible: false }); needsBroadcast = true; break
    case 'message:update': store.updateMessage(cmd.id, cmd.data);           needsBroadcast = true; break
    case 'message:add':    store.addMessage(cmd.data);                      needsBroadcast = true; break
    case 'message:remove': store.removeMessage(cmd.id);                     needsBroadcast = true; break
    case 'timer:add':      store.addTimer(cmd.data);                        needsBroadcast = true; break
    case 'timer:update':   store.updateTimer(cmd.id, cmd.data);             needsBroadcast = true; break
    case 'timer:remove':   store.removeTimer(cmd.id);                       needsBroadcast = true; break
    case 'room:update':    store.setState(cmd.data);                        needsBroadcast = true; break
  }
  if (needsBroadcast) broadcastState()
}

export function startRelay () {
  loadConfig()
  enabled = true
  // Push immediately, then every 500ms
  pushState()
  pushInterval = setInterval(pushState, 500)
  console.log(`Relay started — Room ID: ${roomId}`)
  return { roomId, relayUrl: RELAY_URL }
}

export function stopRelay () {
  enabled = false
  clearInterval(pushInterval)
}

export function getRelayConnections () { return relayConnections }

export async function kickRelayClient (clientId) {
  if (!roomId || !secret) return
  try {
    await fetch(`${RELAY_URL}/api/kick.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: roomId, secret, clientId }),
      signal: AbortSignal.timeout(4000)
    })
  } catch {}
}

export function getRoomId ()   { return roomId }
export function getRelayUrl () { return RELAY_URL }
export function getRelayInfo () {
  return {
    roomId,
    relayUrl: RELAY_URL,
    viewerUrl: `${RELAY_URL}/?id=${roomId}&view=viewer`,
    controllerUrl: `${RELAY_URL}/?id=${roomId}&view=controller`
  }
}
