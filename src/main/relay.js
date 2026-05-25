import { getState } from './timer-store.js'
import * as engine from './timer-engine.js'
import * as store from './timer-store.js'
import { broadcastState } from './web-server.js'

const RELAY_URL = 'https://timer.matlak.stream'

let pushInterval = null
let enabled = false
let relayConnections = []

// ── Push state ─────────────────────────────────────────────────────────────

async function pushState () {
  if (!enabled) return
  const state = getState()
  const { relayId, relaySecret } = state
  if (!relayId || !relaySecret) return

  try {
    const res = await fetch(`${RELAY_URL}/api/push.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: relayId, secret: relaySecret, state }),
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

// ── Remote command handler ─────────────────────────────────────────────────

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
    // Store mutations — must broadcast manually
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

// ── Lifecycle ──────────────────────────────────────────────────────────────

export function startRelay () {
  enabled = true
  pushState()
  pushInterval = setInterval(pushState, 500)
  const state = getState()
  console.log(`Relay started — Room ID: ${state.relayId}`)
}

export function stopRelay () {
  enabled = false
  clearInterval(pushInterval)
}

// ── Exports ────────────────────────────────────────────────────────────────

export function getRelayConnections () { return relayConnections }

export async function kickRelayClient (clientId) {
  const { relayId, relaySecret } = getState()
  if (!relayId || !relaySecret) return
  try {
    await fetch(`${RELAY_URL}/api/kick.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: relayId, secret: relaySecret, clientId }),
      signal: AbortSignal.timeout(4000)
    })
  } catch {}
}

export function getRelayUrl () { return RELAY_URL }

export function getRelayInfo () {
  const state = getState()
  return {
    roomId: state.relayId,
    relayUrl: RELAY_URL,
    viewerUrl: `${RELAY_URL}/?id=${state.relayId}&view=viewer`,
    controllerUrl: `${RELAY_URL}/?id=${state.relayId}&view=controller`
  }
}
