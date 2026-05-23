// Local WebSocket client — skipped in relay mode (?relay= param present)
;(function () {
  if (new URLSearchParams(location.search).get('relay')) return  // relay-client.js handles it

  const host = window.location.hostname
  const port = new URLSearchParams(location.search).get('port') || '7000'
  const SOCKET_URL = `http://${host}:${port}`

  const script = document.createElement('script')
  script.src = SOCKET_URL + '/socket.io/socket.io.js'
  script.onload = function () {
    const sock = io(SOCKET_URL)
    sock.on('connect',    ()      => { if (window.onConnect)    window.onConnect() })
    sock.on('disconnect', ()      => { if (window.onDisconnect) window.onDisconnect() })
    sock.on('state',      state   => { if (window.onTimerState) window.onTimerState(state) })

    window.sendCommand = (action, data) => sock.emit('command', { action, ...(data || {}) })
  }
  script.onerror = function () {
    console.warn('Could not load socket.io — desktop app may not be running on this host')
  }
  document.head.appendChild(script)
})()
