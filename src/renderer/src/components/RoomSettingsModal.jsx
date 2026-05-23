import React, { useState } from 'react'

const TIMEZONES = [
  'Europe/Warsaw', 'Europe/London', 'Europe/Paris', 'Europe/Berlin',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Kolkata', 'Australia/Sydney', 'UTC'
]

export default function RoomSettingsModal({ state, onClose }) {
  const [name, setName] = useState(state.name)
  const [timezone, setTimezone] = useState(state.timezone)
  const [overtime, setOvertime] = useState(state.overtime)
  const [overtimePrefix, setOvertimePrefix] = useState(state.overtimePrefix)

  function handleSave() {
    window.api.roomUpdate({ name, timezone, overtime, overtimePrefix })
    onClose()
  }

  const nowStr = new Date().toLocaleTimeString('en-GB', { timeZone: timezone, hour12: false })

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">⚙ Room Settings</div>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        <div className="form-group">
          <label className="form-label">Room Name</label>
          <input value={name} onChange={e => setName(e.target.value)} style={{ width: '100%' }} />
        </div>

        <div className="divider" />
        <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Timezone Settings</div>

        <div className="form-group">
          <label className="form-label">Timezone</label>
          <select value={timezone} onChange={e => setTimezone(e.target.value)} style={{ width: '100%' }}>
            {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
          </select>
        </div>

        <div style={{ background: 'var(--bg3)', borderRadius: 6, padding: '8px 12px', marginBottom: 16, fontSize: 13, color: 'var(--text2)' }}>
          Preview: <strong style={{ color: 'var(--text)' }}>{nowStr}</strong>
        </div>

        <div className="divider" />
        <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Overtime Settings</div>

        <div className="form-group">
          <label className="form-label">Behavior</label>
          <select value={overtime} onChange={e => setOvertime(e.target.value)} style={{ width: '100%' }}>
            <option value="continue">Continue counting past 0:00</option>
            <option value="stop">Stop at 0:00</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Prefix</label>
          <select value={overtimePrefix} onChange={e => setOvertimePrefix(e.target.value)} style={{ width: '100%' }}>
            <option value="+">Plus (+0:01)</option>
            <option value="-">Minus (-0:01)</option>
            <option value="">None</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>Confirm</button>
        </div>
      </div>
    </div>
  )
}
