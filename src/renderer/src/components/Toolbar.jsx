import React, { useState } from 'react'
import OutputLinksModal from './OutputLinksModal.jsx'
import RoomSettingsModal from './RoomSettingsModal.jsx'

export default function Toolbar({ state }) {
  const [showOutputs, setShowOutputs] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showRoomMenu, setShowRoomMenu] = useState(false)

  const blackout = state?.blackout
  const flash = state?.flash

  return (
    <>
      <div className="toolbar">
        <div className="toolbar-left">
          <div className="room-selector" onClick={() => setShowRoomMenu(v => !v)}>
            <span className="room-icon">📡</span>
            <span className="room-name">{state?.name || 'Room'}</span>
            <span className="room-arrow">▾</span>
            {showRoomMenu && (
              <div className="room-menu" onMouseLeave={() => setShowRoomMenu(false)}>
                <button onClick={() => { setShowSettings(true); setShowRoomMenu(false) }}>⚙ Room Settings</button>
              </div>
            )}
          </div>
          <span className="toolbar-sep" />
          <button className="btn btn-ghost btn-sm toolbar-outputs" onClick={() => setShowOutputs(true)}>
            🖥 Output Links
          </button>
        </div>

        <div className="toolbar-title">
          <span style={{ fontWeight: 700, letterSpacing: 1 }}>StageTimer</span>
          <span style={{ fontSize: 11, color: 'var(--text2)', marginLeft: 8 }}>v1.0.0</span>
        </div>

        <div className="toolbar-right">
          <button
            className={`btn btn-sm ${blackout ? 'btn-danger' : 'btn-ghost'}`}
            onClick={() => window.api.setBlackout(!blackout)}
          >
            ● Blackout
          </button>
          <button
            className={`btn btn-sm ${flash ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => window.api.setFlash(!flash)}
            style={{ marginLeft: 6 }}
          >
            ⚡ Flash
          </button>
          <button className="btn btn-ghost btn-sm btn-icon" style={{ marginLeft: 6 }}>···</button>
        </div>
      </div>

      {showOutputs && <OutputLinksModal onClose={() => setShowOutputs(false)} />}
      {showSettings && <RoomSettingsModal state={state} onClose={() => setShowSettings(false)} />}
    </>
  )
}
