import React, { useState, useEffect } from 'react'
import { formatCountdown, getTimerRemaining, isOvertime, getProgress, formatTimeOfDay } from '../utils/time.js'

export default function DashboardPreview({ state }) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const active = state.timers[state.activeTimerIndex]
  const remaining = active ? getTimerRemaining(active) : 0
  const overtime = active ? isOvertime(active) : false
  const progress = active ? getProgress(active) : 0

  const timeStr = now.toLocaleTimeString([], {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    timeZone: state.timezone, hour12: false
  })

  const barColor = overtime ? '#e53935'
    : remaining < 60 ? '#e53935'
    : remaining < 300 ? '#ff9800'
    : '#4caf50'

  // Calculate cue finish
  const cueFinish = active ? new Date(Date.now() + remaining * 1000) : null
  const cueStr = cueFinish
    ? cueFinish.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: state.timezone, hour12: false })
    : '--:--'

  // Over/Under: difference between scheduled end and actual
  const totalRemaining = state.timers.slice(state.activeTimerIndex).reduce((s, t) => s + (t.duration - t.elapsed), 0)

  const message = state.messages.find(m => m.visible)

  return (
    <div className="preview-panel">
      <div className="preview-screen" style={{ filter: state.blackout ? 'brightness(0)' : 'none' }}>
        <div className="preview-header">
          <span className="preview-logo">⏱ stagetimer</span>
          {active && <span className="preview-label">{active.name}</span>}
          <span className={`preview-dot ${active?.state === 'running' ? 'live' : ''}`} />
        </div>

        <div className={`preview-time ${overtime ? 'overtime' : ''}`}>
          {overtime && <span style={{ fontSize: '0.5em' }}>+</span>}
          {active ? formatCountdown(Math.abs(remaining)) : '--:--'}
        </div>

        {message && (
          <div className="preview-message" style={{ color: message.color === 'white' ? '#e8e8e8' : message.color, fontWeight: message.bold ? 700 : 400 }}>
            {message.text}
          </div>
        )}

        <div className="preview-progress-bar">
          <div style={{ height: '100%', width: `${progress * 100}%`, background: barColor, transition: 'width 0.1s linear' }} />
        </div>

        <div className="preview-color-bar">
          <div style={{ flex: 1, background: '#4caf50' }} />
          <div style={{ flex: 0.4, background: '#ff9800' }} />
          <div style={{ flex: 0.2, background: '#e53935' }} />
        </div>
      </div>

      <div className="preview-info">
        {active && (
          <div className="preview-status">
            <span className={`status-badge ${active.state}`}>{active.state.toUpperCase()}</span>
            <span className="preview-clock">{timeStr}</span>
          </div>
        )}

        <div className="preview-meta">
          <div>
            <div className="meta-label">Cue finish</div>
            <div className="meta-value">{cueStr}</div>
          </div>
          <div>
            <div className="meta-label">Over/Under</div>
            <div className={`meta-value ${totalRemaining < 0 ? 'red' : ''}`}>
              {totalRemaining >= 0 ? '+' : ''}{formatCountdown(Math.abs(totalRemaining))}
            </div>
          </div>
        </div>

        <div className="preview-nav">
          <button onClick={() => window.api.timerPrev()}>‹</button>
          <span>{(state.activeTimerIndex || 0) + 1} / {state.timers.length}</span>
          <button onClick={() => window.api.timerNext()}>›</button>
        </div>
      </div>

      <div className="preview-transport">
        <button className="transport-btn" onClick={() => window.api.timerAdjust(null, -60)}>-1m</button>
        <button className="transport-btn" onClick={() => window.api.timerPrev()}>⏮</button>
        <button className="transport-btn transport-main" onClick={() => {
          const a = state.timers[state.activeTimerIndex]
          if (!a) return
          a.state === 'running' ? window.api.timerPause(null) : window.api.timerStart(null)
        }}>
          {state.timers[state.activeTimerIndex]?.state === 'running' ? '⏸' : '▶'}
        </button>
        <button className="transport-btn" onClick={() => window.api.timerNext()}>⏭</button>
        <button className="transport-btn" onClick={() => window.api.timerAdjust(null, 60)}>+1m</button>
      </div>

      <div className="connections-section">
        <div className="connections-header">
          <span>Live Connections</span>
          <span className="connections-count">{state._connections ?? 0}</span>
        </div>
      </div>
    </div>
  )
}
