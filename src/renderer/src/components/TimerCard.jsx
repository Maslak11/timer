import React, { useState } from 'react'
import { formatCountdown, getTimerRemaining, isOvertime, getProgress } from '../utils/time.js'
import TimerEditModal from './TimerEditModal.jsx'

export default function TimerCard({ timer, index, isActive, state }) {
  const [editing, setEditing] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  const remaining = getTimerRemaining(timer)
  const overtime = isOvertime(timer)
  const progress = getProgress(timer)
  const running = timer.state === 'running'
  const paused = timer.state === 'paused'

  // Calculate scheduled start time based on previous timers
  const scheduledStart = getScheduledTime(state, index)

  function handleStart() { window.api.timerStart(timer.id) }
  function handlePause() { window.api.timerPause(timer.id) }
  function handleStop() { window.api.timerStop(timer.id) }
  function handleReset() { window.api.timerReset(timer.id) }
  function handleRemove() {
    if (confirm(`Remove timer "${timer.name}"?`)) window.api.timerRemove(timer.id)
    setShowMenu(false)
  }

  const barColor = overtime ? '#e53935'
    : remaining < 60 ? '#e53935'
    : remaining < 300 ? '#ff9800'
    : '#4caf50'

  return (
    <>
      <div
        className={`timer-card ${isActive ? 'active' : ''} ${running ? 'running' : ''}`}
        onClick={() => { if (!isActive) window.api.timerStop(null) }}
      >
        <div className="timer-card-inner">
          <div className="timer-number">{index + 1}</div>

          <div className="timer-scheduled">{scheduledStart}</div>

          <div className="timer-duration-display">
            <span className={`timer-main-time ${overtime ? 'overtime' : ''}`}>
              {overtime && <span className="overtime-prefix">+</span>}
              {formatCountdown(Math.abs(remaining))}
            </span>
            {timer.wrap && <span className="timer-wrap">{timer.wrap}</span>}
          </div>

          <div className="timer-name">{timer.name}</div>

          <div className="timer-controls">
            <button className="ctrl-btn" onClick={(e) => { e.stopPropagation(); handleReset() }} title="Reset">
              ⏮
            </button>
            <button className="ctrl-btn ctrl-btn-settings" onClick={(e) => { e.stopPropagation(); setEditing(true) }} title="Settings">
              ⚙
            </button>
            <button
              className={`ctrl-btn ctrl-btn-play ${running ? 'active' : ''}`}
              onClick={(e) => { e.stopPropagation(); running ? handlePause() : handleStart() }}
              title={running ? 'Pause' : 'Start'}
            >
              {running ? '⏸' : '▶'}
            </button>
            <button className="ctrl-btn ctrl-btn-menu" onClick={(e) => { e.stopPropagation(); setShowMenu(v => !v) }}>
              ···
            </button>
            {showMenu && (
              <div className="timer-menu" onMouseLeave={() => setShowMenu(false)}>
                <button onClick={(e) => { e.stopPropagation(); setEditing(true); setShowMenu(false) }}>Edit</button>
                <button onClick={(e) => { e.stopPropagation(); handleRemove() }} className="danger">Remove</button>
              </div>
            )}
          </div>
        </div>

        {isActive && (
          <div className="timer-progress-bar">
            <div className="timer-progress-fill" style={{ width: `${progress * 100}%`, background: barColor }} />
          </div>
        )}
      </div>

      {editing && (
        <TimerEditModal timer={timer} onClose={() => setEditing(false)} />
      )}
    </>
  )
}

function getScheduledTime(state, index) {
  // Calculate when this timer would start if run sequentially
  const now = new Date()
  let offset = 0
  for (let i = 0; i < index; i++) {
    offset += state.timers[i].duration
  }
  const t = new Date(now.getTime() + offset * 1000)
  return t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
