// Relay client — used by output views when accessed via timer.matlak.stream
// Activated when URL has ?relay=BASE_URL&id=ROOM_ID params
;(function () {
  const params = new URLSearchParams(location.search)
  const RELAY  = params.get('relay')   // e.g. https://timer.matlak.stream
  const ROOM   = (params.get('id') || '').toUpperCase()

  if (!RELAY || !ROOM) return   // no relay mode, socket-client.js handles local

  // Override window.sendCommand so output view controls POST to relay
  window.sendCommand = function (action, data) {
    fetch(RELAY + '/api/command.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: ROOM, action, ...(data || {}) })
    }).catch(() => {})
  }

  let es = null

  function connect () {
    if (es) es.close()
    es = new EventSource(RELAY + '/api/events.php?id=' + ROOM)

    es.addEventListener('state', e => {
      try {
        const state = JSON.parse(e.data)
        if (window.onTimerState) window.onTimerState(state)
      } catch {}
    })

    es.addEventListener('reconnect', () => {
      es.close()
      setTimeout(connect, 500)
    })

    es.addEventListener('error', () => {
      es.close()
      setTimeout(connect, 3000)
    })

    es.addEventListener('connected', e => {
      console.log('Relay connected to room', ROOM)
    })
  }

  connect()

  // Suppress socket-client.js from loading (it would try local WebSocket)
  window.__relayMode = true
})()
