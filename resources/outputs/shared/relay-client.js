// Relay client — SSE mode when URL contains ?relay=BASE&id=ROOM_ID
// Skips socket-client.js (local WS) entirely when relay mode is active
;(function () {
  const params = new URLSearchParams(location.search)
  const RELAY  = params.get('relay')
  const ROOM   = (params.get('id') || '').toUpperCase()

  if (!RELAY || !ROOM) return  // local mode — socket-client.js handles it

  window.__relayMode = true

  // --- Commands to desktop app via relay ---
  window.sendCommand = function (action, data) {
    fetch(RELAY + '/api/command.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: ROOM, action, ...(data || {}) })
    }).catch(() => {})
  }

  // --- Initial state fetch (instant, before SSE delivers) ---
  function fetchState () {
    fetch(RELAY + '/api/state.php?id=' + ROOM)
      .then(r => r.ok ? r.json() : null)
      .then(s => { if (s && window.onTimerState) window.onTimerState(s) })
      .catch(() => {})
  }

  // --- SSE for live updates ---
  let es = null
  let retryDelay = 2000

  function connect () {
    if (es) { try { es.close() } catch {} }

    es = new EventSource(RELAY + '/api/events.php?id=' + ROOM)

    es.addEventListener('state', e => {
      try {
        retryDelay = 2000
        if (window.onTimerState) window.onTimerState(JSON.parse(e.data))
        if (window.onConnect) window.onConnect()
      } catch {}
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
