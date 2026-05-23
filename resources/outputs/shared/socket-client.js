// Shared Socket.io connection helper for all output views
;(function() {
  const SOCKET_PATH = window.SOCKET_URL || `http://${window.location.hostname}:7000`
  const script = document.createElement('script')
  script.src = SOCKET_PATH + '/socket.io/socket.io.js'
  script.onload = function() {
    window.timerSocket = io(SOCKET_PATH)
    window.timerSocket.on('connect', () => console.log('Connected to StageTimer'))
    window.timerSocket.on('state', (state) => {
      if (window.onTimerState) window.onTimerState(state)
    })
    // Send commands back
    window.sendCommand = (action, data) => {
      window.timerSocket.emit('command', { action, ...data })
    }
  }
  document.head.appendChild(script)
})()
