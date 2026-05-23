export function formatCountdown(seconds, showHours = true) {
  const abs = Math.abs(seconds)
  const h = Math.floor(abs / 3600)
  const m = Math.floor((abs % 3600) / 60)
  const s = Math.floor(abs % 60)

  if (showHours && h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function formatTimeOfDay(timezone) {
  return new Date().toLocaleTimeString('en-GB', { timeZone: timezone, hour12: false })
}

export function getTimerRemaining(timer) {
  if (timer.type === 'countdown') {
    return timer.duration - timer.elapsed
  }
  return timer.elapsed
}

export function isOvertime(timer) {
  return timer.type === 'countdown' && timer.elapsed > timer.duration
}

export function getProgress(timer) {
  if (timer.type === 'countdown') {
    return Math.min(timer.elapsed / timer.duration, 1)
  }
  return 0
}

export function secondsToHHMMSS(secs) {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = Math.floor(secs % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function parseDuration(str) {
  // Accepts "MM:SS", "H:MM:SS", or plain seconds
  if (!str) return 0
  const parts = str.trim().split(':').map(Number)
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return parseInt(str) || 0
}

export function getTimerColor(timer) {
  if (isOvertime(timer)) return '#e53935'
  const remaining = getTimerRemaining(timer)
  if (timer.duration > 0 && remaining < 60) return '#e53935'
  if (timer.duration > 0 && remaining < 300) return '#ff9800'
  return timer.color === 'red' ? '#e53935' : timer.color === 'orange' ? '#ff9800' : '#4caf50'
}
