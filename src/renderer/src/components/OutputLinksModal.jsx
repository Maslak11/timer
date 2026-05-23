import React, { useState, useEffect } from 'react'

const VIEWS = [
  { id: 'viewer', label: 'Viewer', icon: '🖥' },
  { id: 'operator', label: 'Operator', icon: '🎮' },
  { id: 'controller', label: 'Controller', icon: '🕹' },
  { id: 'agenda', label: 'Agenda', icon: '📋' },
  { id: 'moderator', label: 'Moderator', icon: '🎤' }
]

export default function OutputLinksModal({ onClose }) {
  const [info, setInfo] = useState(null)
  const [activeView, setActiveView] = useState('viewer')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (window.api) {
      window.api.getServerInfo().then(setInfo)
    }
  }, [])

  function getUrl(view) {
    if (!info) return ''
    return `http://${info.ip}:${info.port}/${view}`
  }

  function handleCopy() {
    navigator.clipboard.writeText(getUrl(activeView))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleOpen() {
    const url = getUrl(activeView)
    if (window.require) {
      window.require('electron').shell.openExternal(url)
    } else {
      window.open(url, '_blank')
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ minWidth: 640, maxWidth: 700 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">🖥 Output Links</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-sm">+ Add Output ★</button>
            <button className="btn btn-ghost btn-sm">···</button>
            <button className="btn-icon" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="output-tabs">
          {VIEWS.map(v => (
            <button
              key={v.id}
              className={`output-tab ${activeView === v.id ? 'active' : ''}`}
              onClick={() => setActiveView(v.id)}
            >
              <div className="output-tab-preview" />
              <span>{v.label}</span>
            </button>
          ))}
        </div>

        <div className="output-body">
          <div className="output-preview-col">
            <div className="output-preview-box">
              <div style={{ fontSize: 48, fontWeight: 700, color: '#fff', textAlign: 'center', lineHeight: 1.2 }}>10:00</div>
            </div>
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 8, width: '100%' }}>✏ Customize</button>
          </div>

          <div className="output-options-col">
            <div className="form-group">
              <label className="form-label">Logo</label>
              <div className="btn-group">
                <button className="btn btn-ghost btn-sm active-tab">Stagetimer</button>
                <button className="btn btn-ghost btn-sm">Hidden</button>
                <button className="btn btn-ghost btn-sm">Custom</button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input placeholder="Enter password..." style={{ width: '100%' }} />
            </div>

            <div className="divider" />

            <div className="form-group">
              <label className="form-label">Identifier</label>
              <input placeholder="Enter device name (optional)" style={{ width: '100%' }} />
            </div>

            <div className="form-group">
              <label className="form-label">Delay</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input defaultValue="0" style={{ width: 80 }} />
                <span style={{ lineHeight: '32px', color: 'var(--text2)' }}>Seconds</span>
              </div>
            </div>
          </div>
        </div>

        {info && (
          <div className="output-footer">
            <div className="output-qr">
              {info.qr && <img src={info.qr} alt="QR" width={80} height={80} />}
            </div>
            <div className="output-url-bar">
              <span className="output-url-text">{getUrl(activeView)}</span>
              <button className="btn btn-ghost btn-sm" onClick={handleCopy}>
                {copied ? '✓ Copied' : '📋 Copy'}
              </button>
            </div>
            <div className="output-actions">
              <button className="btn btn-ghost btn-sm">QR &amp; Short Link</button>
              <button className="btn btn-primary btn-sm" onClick={handleOpen}>Open Link ↗</button>
            </div>
          </div>
        )}

        {!info && (
          <div style={{ padding: 16, color: 'var(--text2)', textAlign: 'center' }}>
            {window.api ? 'Loading server info...' : 'Running in browser mode — open output views directly'}
          </div>
        )}

        <div style={{ marginTop: 12, padding: '8px 12px', background: 'var(--bg3)', borderRadius: 6, fontSize: 12, color: 'var(--text2)' }}>
          💡 Scan the QR code or share the URL with devices on your network.
          Companion API: <code style={{ color: 'var(--text)' }}>{info ? `http://${info.ip}:7001/api/status` : 'http://[ip]:7001/api/status'}</code>
        </div>
      </div>
    </div>
  )
}
