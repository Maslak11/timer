import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { formatCountdown, getTimerRemaining, isOvertime, getProgress } from '../utils/time.js'
import TimerEditModal from './TimerEditModal.jsx'

export default function TimerCard({ timer, index, isActive, state }) {
  const [editing, setEditing] = useState(false)
  const [menuPos, setMenuPos] = useState(null)
  const menuBtnRef = useRef(null)

  const remaining = getTimerRemaining(timer)
  const overtime = isOvertime(timer)
  const progress = getProgress(timer)
  const running = timer.state === 'running'

  const scheduledStart = getScheduledTime(state, index)

  function handleReset() { window.api.timerReset(timer.id) }
  function handleRemove() {
    if (confirm(`Remove timer "${timer.name}"?`)) window.api.timerRemove(timer.id)
    setMenuPos(null)
  }

  function openMenu(e) {
    e.stopPropagation()
    if (menuPos) { setMenuPos(null); return }
    const rect = menuBtnRef.current.getBoundingClientRect()
    setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
  }

  // Close menu on outside click
  useEffect(() => {
    if (!menuPos) return
    const close = () => setMenuPos(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [menuPos])

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
              onClick={(e) => { e.stopPropagation(); running ? window.api.timerPause(timer.id) : window.api.timerStart(timer.id) }}
              title={running ? 'Pause' : 'Start'}
            >
              {running ? '⏸' : '▶'}
            </button>
            <button ref={menuBtnRef} className="ctrl-btn ctrl-btn-menu" onClick={openMenu}>
              ···
            </button>
          </div>
        </div>

        {isActive && (
          <div className="timer-progress-bar">
            <div className="timer-progress-fill" style={{ width: `${progress * 100}%`, background: barColor }} />
          </div>
        )}
      </div>

      {menuPos && createPortal(
        <div
          className="timer-menu-portal"
          style={{ top: menuPos.top, right: menuPos.right }}
          onClick={e => e.stopPropagation()}
        >
          <button onClick={() => { setEditing(true); setMenuPos(null) }}>Edit</button>
          <button onClick={handleRemove} className="danger">Remove</button>
        </div>,
        document.body
      )}

      {editing && (
        <TimerEditModal timer={timer} onClose={() => setEditing(false)} />
      )}
    </>
  )
}

function getScheduledTime(state, index) {
  const now = new Date()
  let offset = 0
  for (let i = 0; i < index; i++) offset += state.timers[i].duration
  const t = new Date(now.getTime() + offset * 1000)
  return t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
