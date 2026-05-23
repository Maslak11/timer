import React from 'react'
import TimerCard from './TimerCard.jsx'

export default function TimerList({ state }) {
  function handleAddTimer() {
    window.api.timerAdd({ name: 'New Timer', duration: 600, type: 'countdown', color: 'green' })
  }

  return (
    <div className="timer-list">
      <div className="panel-header">
        <span className="panel-title">Timers</span>
        <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }}>Select</button>
      </div>

      <div className="timer-list-body">
        {state.timers.map((timer, i) => (
          <TimerCard
            key={timer.id}
            timer={timer}
            index={i}
            isActive={i === state.activeTimerIndex}
            state={state}
          />
        ))}
      </div>

      <div className="timer-list-footer">
        <button className="btn btn-ghost" onClick={handleAddTimer} style={{ width: '100%' }}>
          + Add Timer
        </button>
      </div>
    </div>
  )
}
