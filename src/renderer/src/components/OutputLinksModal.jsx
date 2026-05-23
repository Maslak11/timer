import React, { useState, useEffect } from 'react'

const VIEWS = [
  { id: 'viewer',     label: 'Viewer',     icon: '🖥',  desc: 'Large timer for audience' },
  { id: 'operator',   label: 'Operator',   icon: '🎮',  desc: 'Timer + transport controls' },
  { id: 'controller', label: 'Controller', icon: '🕹',  desc: 'Full control panel' },
  { id: 'agenda',     label: 'Agenda',     icon: '📋',  desc: 'Schedule overview' },
  { id: 'moderator',  label: 'Moderator',  icon: '🎤',  desc: 'Timer + messages' }
]

export default function OutputLinksModal ({ onClose }) {
  const [info, setInfo]         = useState(null)
  const [activeView, setActiveView] = useState('viewer')
  const [tab, setTab]           = useState('remote')  // 'remote' | 'local'
  const [copied, setCopied]     = useState(false)

  useEffect(() => {
    if (window.api) window.api.getServerInfo().then(setInfo)
  }, [])

  const relay    = info?.relay
  const roomId   = relay?.roomId ?? '——'
  const relayBase = relay?.relayUrl ?? 'https://timer.matlak.stream'

  const remoteUrl = relay ? `${relayBase}/?id=${relay.roomId}&view=${activeView}` : ''
  const localUrl  = info  ? `http://${info.ip}:${info.port}/${activeView}` : ''
  const activeUrl = tab === 'remote' ? remoteUrl : localUrl

  function handleCopy () {
    navigator.clipboard.writeText(activeUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleOpen () {
    if (!activeUrl) return
    if (window.require) window.require('electron').shell.openExternal(activeUrl)
    else window.open(activeUrl, '_blank')
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal ol-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">🖥 Output Links</div>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        {/* Room ID hero */}
        <div className="room-id-hero">
          <div className="room-id-label">Room ID</div>
          <div className="room-id-value">{roomId}</div>
          <div className="room-id-sub">
            Wejdź na <strong style={{ color: 'var(--accent)' }}>timer.matlak.stream</strong> i wpisz ten kod
          </div>
        </div>

        {/* View selector */}
        <div className="output-tabs">
          {VIEWS.map(v => (
            <button
              key={v.id}
              className={`output-tab ${activeView === v.id ? 'active' : ''}`}
              onClick={() => setActiveView(v.id)}
            >
              <span style={{ fontSize: 18 }}>{v.icon}</span>
              <span style={{ fontWeight: 600 }}>{v.label}</span>
            </button>
          ))}
        </div>

        {/* Local / Remote tab switch */}
        <div className="ol-tab-switch">
          <button
            className={`ol-tab ${tab === 'remote' ? 'active' : ''}`}
            onClick={() => setTab('remote')}
          >
            🌐 Remote (timer.matlak.stream)
          </button>
          <button
            className={`ol-tab ${tab === 'local' ? 'active' : ''}`}
            onClick={() => setTab('local')}
          >
            🏠 Local network
          </button>
        </div>

        {/* QR + URL */}
        <div className="ol-url-row">
          {tab === 'remote' && info?.qr && (
            <img src={info.qr} alt="QR" width={80} height={80} style={{ borderRadius: 8, flexShrink: 0 }} />
          )}
          <div className="ol-url-box">
            <div className="ol-url-text">{activeUrl || '…'}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <button className="btn btn-ghost btn-sm" onClick={handleCopy} style={{ flex: 1 }}>
                {copied ? '✓ Skopiowano' : '📋 Kopiuj link'}
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleOpen}>
                Otwórz ↗
              </button>
            </div>
          </div>
        </div>

        {tab === 'remote' && (
          <div style={{ fontSize: 12, color: 'var(--text2)', padding: '8px 0', lineHeight: 1.5 }}>
            ☁ Działa z każdego urządzenia — nie wymaga tej samej sieci.<br />
            Companion API: <code style={{ color: 'var(--accent)', fontSize: 11 }}>POST https://timer.matlak.stream/api/command.php</code>
            {' '}<code style={{ color: 'var(--text3)', fontSize: 11 }}>{`{"id":"${roomId}","action":"start"}`}</code>
          </div>
        )}

        {tab === 'local' && (
          <div style={{ fontSize: 12, color: 'var(--text2)', padding: '8px 0' }}>
            🏠 Tylko dla urządzeń w tej samej sieci Wi-Fi.
            {info && <span> Companion API: <code style={{ color: 'var(--accent)', fontSize: 11 }}>http://{info.ip}:7001/api/status</code></span>}
          </div>
        )}
      </div>
    </div>
  )
}
