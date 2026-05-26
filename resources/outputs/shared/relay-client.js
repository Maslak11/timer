// Relay client — SSE mode when URL contains ?relay=BASE&id=ROOM_ID
// Skips socket-client.js (local WS) entirely when relay mode is active
;(function () {
  const params = new URLSearchParams(location.search)
  const RELAY  = params.get('relay')
  const ROOM   = (params.get('id') || '').toUpperCase()

  if (!RELAY || !ROOM) return  // local mode — socket-client.js handles it

  window.__relayMode = true

  // Stable client ID for this browser tab (survives SSE reconnects)
  const CID  = (sessionStorage.getItem('_stCid') || (() => {
    const id = Math.random().toString(36).substr(2, 10) + Date.now().toString(36)
    sessionStorage.setItem('_stCid', id)
    return id
  })())
  // Detect view name from filename: /outputs/viewer.html → "viewer"
  const VIEW = location.pathname.split('/').pop().replace('.html', '') || 'unknown'

  // --- Commands to desktop app via relay ---
  window.sendCommand = function (action, data) {
    fetch(RELAY + '/api/command.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: ROOM, action, ...(data || {}) })
    }).catch(() => {})
  }

  // --- Initial state fetch (shows time immediately while SSE handshake completes) ---
  function fetchState () {
    fetch(RELAY + '/api/state.php?id=' + ROOM)
      .then(r => r.ok ? r.json() : null)
      .then(s => { if (s && window.onTimerState) window.onTimerState(s) })
      .catch(() => {})
  }

  // --- SSE for live updates ---
  let es = null
  let retryDelay = 2000
  let kicked = false

  function connect () {
    if (kicked) return
    if (es) { try { es.close() } catch {} }

    const url = RELAY + '/api/events.php?id=' + ROOM + '&cid=' + CID + '&view=' + VIEW
    es = new EventSource(url)

    es.addEventListener('state', e => {
      try {
        retryDelay = 2000
        if (window.onTimerState) window.onTimerState(JSON.parse(e.data))
        if (window.onConnect) window.onConnect()
      } catch {}
    })

    es.addEventListener('kick', () => {
      // Server kicked this client — stop reconnecting
      kicked = true
      es.close()
      sessionStorage.removeItem('_stCid')
      if (window.onDisconnect) window.onDisconnect('kicked')
    })

    es.addEventListener('error', () => {
      // PHP sent event: error (room not found / not yet registered)
      if (window.onDisconnect) window.onDisconnect('waiting')
      es.close()
      retryDelay = Math.min(retryDelay * 1.5, 10000)
      setTimeout(connect, retryDelay)
    })

    es.addEventListener('reconnect', () => {
      es.close()
      setTimeout(connect, 500)
    })

    // Network-level error
    es.onerror = () => {
      if (window.onDisconnect) window.onDisconnect('offline')
      es.close()
      retryDelay = Math.min(retryDelay * 1.5, 10000)
      setTimeout(connect, retryDelay)
    }
  }

  fetchState()
  connect()
})()
