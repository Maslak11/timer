import React, { useState } from 'react'
import { secondsToHHMMSS, parseDuration } from '../utils/time.js'

export default function TimerEditModal({ timer, onClose }) {
  const [name, setName] = useState(timer.name)
  const [duration, setDuration] = useState(secondsToHHMMSS(timer.duration))
  const [type, setType] = useState(timer.type)
  const [color, setColor] = useState(timer.color)
  const [wrap, setWrap] = useState(timer.wrap || '')

  function handleSave() {
    window.api.timerUpdate(timer.id, {
      name,
      duration: parseDuration(duration),
      type,
      color,
      wrap: wrap || null
    })
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">⚙ Timer Settings</div>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        <div className="form-group">
          <label className="form-label">Name</label>
          <input value={name} onChange={e => setName(e.target.value)} style={{ width: '100%' }} />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Duration (mm:ss or h:mm:ss)</label>
            <input value={duration} onChange={e => setDuration(e.target.value)} style={{ width: '100%' }} />
          </div>
          <div className="form-group">
            <label className="form-label">Type</label>
            <select value={type} onChange={e => setType(e.target.value)} style={{ width: '100%' }}>
              <option value="countdown">Countdown</option>
              <option value="countup">Count Up</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Color</label>
            <select value={color} onChange={e => setColor(e.target.value)} style={{ width: '100%' }}>
              <option value="green">Green</option>
              <option value="orange">Orange</option>
              <option value="red">Red</option>
              <option value="blue">Blue</option>
              <option value="white">White</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Wrap cue (e.g. +20m)</label>
            <input value={wrap} onChange={e => setWrap(e.target.value)} placeholder="optional" style={{ width: '100%' }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  )
}
