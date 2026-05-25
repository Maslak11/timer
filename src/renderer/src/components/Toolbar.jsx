import React, { useState, useEffect, useRef } from 'react'
import OutputLinksModal from './OutputLinksModal.jsx'
import RoomSettingsModal from './RoomSettingsModal.jsx'

export default function Toolbar({ state }) {
  const [showOutputs,  setShowOutputs]  = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showRoomMenu, setShowRoomMenu] = useState(false)
  const [rooms,        setRooms]        = useState([])
  const [activeRoomId, setActiveRoomId] = useState(null)
  const [renaming,     setRenaming]     = useState(null) // id being renamed
  const [renameVal,    setRenameVal]    = useState('')
  const menuRef = useRef(null)

  const blackout = state?.blackout
  const flash    = state?.flash

  // Load rooms list
  useEffect(() => {
    async function load() {
      const [list, active] = await Promise.all([
        window.api.getRoomsList(),
        window.api.getActiveRoom()
      ])
      setRooms(list || [])
      setActiveRoomId(active)
    }
    load()
  }, [state?.id]) // reload when active room id changes

  // Close menu on outside click
  useEffect(() => {
    if (!showRoomMenu) return
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowRoomMenu(false)
    }
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [showRoomMenu])

  async function handleSwitchRoom(id) {
    if (id === activeRoomId) return
    await window.api.roomSwitch(id)
    setActiveRoomId(id)
    setShowRoomMenu(false)
  }

  async function handleAddRoom() {
    const name = prompt('Room name:', 'New Room')
    if (!name) return
    const room = await window.api.roomAdd(name)
    setRooms(r => [...r, room])
    await window.api.roomSwitch(room.id)
    setActiveRoomId(room.id)
    setShowRoomMenu(false)
  }

  async function handleDeleteRoom(e, id) {
    e.stopPropagation()
    if (rooms.length <= 1) return
    if (!confirm('Delete this room? All its timers and messages will be lost.')) return
    await window.api.roomDelete(id)
    const [list, active] = await Promise.all([window.api.getRoomsList(), window.api.getActiveRoom()])
    setRooms(list || [])
    setActiveRoomId(active)
  }

  async function handleRenameRoom(e, id) {
    e.stopPropagation()
    setRenaming(id)
    setRenameVal(rooms.find(r => r.id === id)?.name || '')
  }

  async function commitRename(id) {
    if (renameVal.trim()) {
      await window.api.roomRename(id, renameVal.trim())
      setRooms(rs => rs.map(r => r.id === id ? { ...r, name: renameVal.trim() } : r))
    }
    setRenaming(null)
  }

  return (
    <>
      <div className="toolbar">
        <div className="toolbar-left">
          {/* Room selector */}
          <div className="room-selector" ref={menuRef} onClick={() => setShowRoomMenu(v => !v)}>
            <span className="room-icon">📡</span>
            <span className="room-name">{state?.name || 'Room'}</span>
            <span className="room-arrow">▾</span>

            {showRoomMenu && (
              <div className="room-menu" onClick={e => e.stopPropagation()}>
                {rooms.map(r => (
                  <div
                    key={r.id}
                    className={`room-menu-item${r.id === activeRoomId ? ' active' : ''}`}
                    onClick={() => handleSwitchRoom(r.id)}
                  >
                    {renaming === r.id ? (
                      <input
                        className="room-rename-input"
                        value={renameVal}
                        autoFocus
                        onClick={e => e.stopPropagation()}
                        onChange={e => setRenameVal(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') commitRename(r.id); if (e.key === 'Escape') setRenaming(null) }}
                        onBlur={() => commitRename(r.id)}
                      />
                    ) : (
                      <>
                        <span className="room-item-dot" style={{ background: r.id === activeRoomId ? 'var(--green)' : 'var(--border)' }} />
                        <span className="room-item-name">{r.name}</span>
                        <span className="room-item-id">{r.relayId}</span>
                        <button className="room-item-btn" title="Rename" onClick={e => handleRenameRoom(e, r.id)}>✎</button>
                        {rooms.length > 1 && (
                          <button className="room-item-btn room-item-del" title="Delete" onClick={e => handleDeleteRoom(e, r.id)}>✕</button>
                        )}
                      </>
                    )}
                  </div>
                ))}
                <div className="room-menu-sep" />
                <button className="room-menu-add" onClick={handleAddRoom}>+ New Room</button>
                <div className="room-menu-sep" />
                <button className="room-menu-settings" onClick={() => { setShowSettings(true); setShowRoomMenu(false) }}>
                  ⚙ Room Settings
                </button>
              </div>
            )}
          </div>

          <span className="toolbar-sep" />
          <button className="btn btn-ghost btn-sm toolbar-outputs" onClick={() => setShowOutputs(true)}>
            🖥 Output Links
          </button>
        </div>

        {/* Logo centre */}
        <div className="toolbar-logo">
          <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNjAgOTAiIGZpbGw9Im5vbmUiPjxyZWN0IHg9IjMiIHk9IjMiIHdpZHRoPSIxMjAiIGhlaWdodD0iNzIiIHJ4PSIxMCIgZmlsbD0iIzFiMjYzNiIgc3Ryb2tlPSIjOWFhYmI4IiBzdHJva2Utd2lkdGg9IjQiLz48dGV4dCB4PSIxNCIgeT0iNjMiIGZvbnQtZmFtaWx5PSJBcmlhbCBCbGFjayxBcmlhbCxzYW5zLXNlcmlmIiBmb250LXdlaWdodD0iOTAwIiBmb250LXNpemU9IjU2IiBmaWxsPSIjOWFhYmI4Ij5NPC90ZXh0Pjx0ZXh0IHg9IjcxIiB5PSI2MyIgZm9udC1mYW1pbHk9IkFyaWFsIEJsYWNrLEFyaWFsLHNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSI5MDAiIGZvbnQtc2l6ZT0iNTYiIGZpbGw9IiMyOWI5ZTgiPlM8L3RleHQ+PHRleHQgeD0iMTM0IiB5PSI0MiIgZm9udC1mYW1pbHk9IkFyaWFsLHNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSI3MDAiIGZvbnQtc2l6ZT0iMjAiIGZpbGw9IiM5YWFiYjgiPm1hdGxhay48L3RleHQ+PHRleHQgeD0iMTM0IiB5PSI2OCIgZm9udC1mYW1pbHk9IkFyaWFsLHNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSI3MDAiIGZvbnQtc2l6ZT0iMjAiIGZpbGw9IiMyOWI5ZTgiPnN0cmVhbTwvdGV4dD48L3N2Zz4=" alt="matlak.stream" height="32" style={{ opacity: 0.85 }} />
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

      {showOutputs  && <OutputLinksModal onClose={() => setShowOutputs(false)} />}
      {showSettings && <RoomSettingsModal state={state} onClose={() => setShowSettings(false)} />}
    </>
  )
}
