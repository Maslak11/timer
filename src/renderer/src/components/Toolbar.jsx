import React, { useState, useEffect, useRef } from 'react'
import OutputLinksModal from './OutputLinksModal.jsx'
import RoomSettingsModal from './RoomSettingsModal.jsx'

export default function Toolbar({ state }) {
  const [showOutputs,   setShowOutputs]  = useState(false)
  const [showSettings,  setShowSettings] = useState(false)
  const [showRoomMenu,  setShowRoomMenu] = useState(false)
  const [showToolsMenu, setShowToolsMenu]= useState(false)
  const [rooms,         setRooms]        = useState([])
  const [activeRoomId,  setActiveRoomId] = useState(null)
  const [renaming,      setRenaming]     = useState(null)
  const [renameVal,     setRenameVal]    = useState('')
  const [addingRoom,    setAddingRoom]   = useState(false)
  const [newRoomName,   setNewRoomName]  = useState('')
  const [ndiStatus,     setNdiStatus]    = useState({ available: false, active: false })

  const roomMenuRef  = useRef(null)
  const toolsMenuRef = useRef(null)

  const blackout = state?.blackout
  const flash    = state?.flash

  // ── Load rooms list ──────────────────────────────────────────────────────
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
  }, [state?.id])

  // ── Poll NDI status every 2s ─────────────────────────────────────────────
  useEffect(() => {
    async function fetchNDI() {
      if (!window.api.ndiStatus) return
      const s = await window.api.ndiStatus()
      setNdiStatus(s || { available: false, active: false })
    }
    fetchNDI()
    const t = setInterval(fetchNDI, 2000)
    return () => clearInterval(t)
  }, [])

  // ── Close room menu on outside click ─────────────────────────────────────
  useEffect(() => {
    if (!showRoomMenu) return
    const h = (e) => {
      if (roomMenuRef.current && !roomMenuRef.current.contains(e.target)) setShowRoomMenu(false)
    }
    window.addEventListener('mousedown', h)
    return () => window.removeEventListener('mousedown', h)
  }, [showRoomMenu])

  // ── Close tools menu on outside click ────────────────────────────────────
  useEffect(() => {
    if (!showToolsMenu) return
    const h = (e) => {
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(e.target)) setShowToolsMenu(false)
    }
    window.addEventListener('mousedown', h)
    return () => window.removeEventListener('mousedown', h)
  }, [showToolsMenu])

  // ── Room actions ─────────────────────────────────────────────────────────
  async function handleSwitchRoom(id) {
    if (id === activeRoomId) return
    await window.api.roomSwitch(id)
    setActiveRoomId(id)
    setShowRoomMenu(false)
  }

  async function handleAddRoom() {
    setAddingRoom(true)
    setNewRoomName('New Room')
  }

  async function commitAddRoom() {
    const name = newRoomName.trim() || 'New Room'
    setAddingRoom(false)
    setNewRoomName('')
    const room = await window.api.roomAdd(name)
    setRooms(r => [...r, room])
    await window.api.roomSwitch(room.id)
    setActiveRoomId(room.id)
    setShowRoomMenu(false)
  }

  function cancelAddRoom() {
    setAddingRoom(false)
    setNewRoomName('')
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

  // ── NDI toggle ───────────────────────────────────────────────────────────
  async function handleNDIToggle() {
    if (!ndiStatus.available) return
    const active = await window.api.ndiToggle()
    setNdiStatus(s => ({ ...s, active }))
  }

  return (
    <>
      <div className="toolbar">
        {/* ── Left: room selector + output links ── */}
        <div className="toolbar-left">
          <div className="room-selector" ref={roomMenuRef} onClick={() => setShowRoomMenu(v => !v)}>
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
                        onKeyDown={e => {
                          if (e.key === 'Enter')  commitRename(r.id)
                          if (e.key === 'Escape') setRenaming(null)
                        }}
                        onBlur={() => commitRename(r.id)}
                      />
                    ) : (
                      <>
                        <span className="room-item-dot"
                          style={{ background: r.id === activeRoomId ? 'var(--green)' : 'var(--border)' }} />
                        <span className="room-item-name">{r.name}</span>
                        <span className="room-item-id">{r.relayId}</span>
                        <button className="room-item-btn" title="Rename"
                          onClick={e => handleRenameRoom(e, r.id)}>✎</button>
                        {rooms.length > 1 && (
                          <button className="room-item-btn room-item-del" title="Delete"
                            onClick={e => handleDeleteRoom(e, r.id)}>✕</button>
                        )}
                      </>
                    )}
                  </div>
                ))}
                <div className="room-menu-sep" />
                {addingRoom ? (
                  <div className="room-add-form">
                    <input
                      className="room-rename-input"
                      value={newRoomName}
                      autoFocus
                      placeholder="Room name"
                      onClick={e => e.stopPropagation()}
                      onChange={e => setNewRoomName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter')  commitAddRoom()
                        if (e.key === 'Escape') cancelAddRoom()
                      }}
                      onBlur={commitAddRoom}
                    />
                  </div>
                ) : (
                  <button className="room-menu-add" onClick={handleAddRoom}>+ New Room</button>
                )}
                <div className="room-menu-sep" />
                <button className="room-menu-settings"
                  onClick={() => { setShowSettings(true); setShowRoomMenu(false) }}>
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

        {/* ── Centre: logo ── */}
        <div className="toolbar-logo">
          <img
            src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNjAgOTAiIGZpbGw9Im5vbmUiPjxyZWN0IHg9IjMiIHk9IjMiIHdpZHRoPSIxMjAiIGhlaWdodD0iNzIiIHJ4PSIxMCIgZmlsbD0iIzFiMjYzNiIgc3Ryb2tlPSIjOWFhYmI4IiBzdHJva2Utd2lkdGg9IjQiLz48dGV4dCB4PSIxNCIgeT0iNjMiIGZvbnQtZmFtaWx5PSJBcmlhbCBCbGFjayxBcmlhbCxzYW5zLXNlcmlmIiBmb250LXdlaWdodD0iOTAwIiBmb250LXNpemU9IjU2IiBmaWxsPSIjOWFhYmI4Ij5NPC90ZXh0Pjx0ZXh0IHg9IjcxIiB5PSI2MyIgZm9udC1mYW1pbHk9IkFyaWFsIEJsYWNrLEFyaWFsLHNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSI5MDAiIGZvbnQtc2l6ZT0iNTYiIGZpbGw9IiMyOWI5ZTgiPlM8L3RleHQ+PHRleHQgeD0iMTM0IiB5PSI0MiIgZm9udC1mYW1pbHk9IkFyaWFsLHNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSI3MDAiIGZvbnQtc2l6ZT0iMjAiIGZpbGw9IiM5YWFiYjgiPm1hdGxhay48L3RleHQ+PHRleHQgeD0iMTM0IiB5PSI2OCIgZm9udC1mYW1pbHk9IkFyaWFsLHNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSI3MDAiIGZvbnQtc2l6ZT0iMjAiIGZpbGw9IiMyOWI5ZTgiPnN0cmVhbTwvdGV4dD48L3N2Zz4="
            alt="matlak.stream" height="32" style={{ opacity: 0.85 }}
          />
        </div>

        {/* ── Right: blackout, flash, NDI, ··· ── */}
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

          {/* NDI toggle button */}
          <button
            className={`btn btn-sm btn-ndi${ndiStatus.active ? ' on' : ''}`}
            disabled={!ndiStatus.available}
            onClick={handleNDIToggle}
            title={
              !ndiStatus.available ? 'NDI SDK nie zainstalowane — pobierz z ndi.tv'
              : ndiStatus.active   ? 'Wyłącz NDI Output'
              :                      'Włącz NDI Output'
            }
            style={{ marginLeft: 6 }}
          >
            ◈ NDI
          </button>

          {/* ··· tools menu */}
          <div className="tools-menu-wrap" ref={toolsMenuRef} style={{ marginLeft: 6 }}>
            <button
              className={`btn btn-ghost btn-sm btn-icon${showToolsMenu ? ' active' : ''}`}
              onClick={() => setShowToolsMenu(v => !v)}
              title="Więcej opcji"
            >
              ···
            </button>

            {showToolsMenu && (
              <div className="tools-menu">
                <button
                  className="tools-menu-item"
                  onClick={() => { setShowSettings(true); setShowToolsMenu(false) }}
                >
                  <span style={{ fontSize: 14 }}>⚙</span>
                  <span className="tools-menu-item-label">Room Settings</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showOutputs  && <OutputLinksModal  onClose={() => setShowOutputs(false)} />}
      {showSettings && <RoomSettingsModal state={state} onClose={() => setShowSettings(false)} />}
    </>
  )
}
