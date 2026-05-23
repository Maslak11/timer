import React, { useState } from 'react'

const COLORS = ['white', 'orange', 'red', 'green', 'blue', 'yellow']
const COLOR_MAP = {
  white: '#e8e8e8', orange: '#ff9800', red: '#e53935',
  green: '#4caf50', blue: '#2196f3', yellow: '#ffeb3b'
}

export default function MessagePanel({ state }) {
  const [editing, setEditing] = useState(null) // message id being edited
  const [editText, setEditText] = useState('')

  function handleToggleVisible(msg) {
    window.api.messageUpdate(msg.id, { visible: !msg.visible })
  }

  function handleFlashAll() {
    window.api.setFlash(!state.flash)
  }

  function handleAdd() {
    window.api.messageAdd({ text: 'New message', color: 'white', bold: false })
  }

  function handleRemove(id) {
    window.api.messageRemove(id)
  }

  function startEdit(msg) {
    setEditing(msg.id)
    setEditText(msg.text)
  }

  function commitEdit(msg) {
    window.api.messageUpdate(msg.id, { text: editText })
    setEditing(null)
  }

  return (
    <div className="message-panel">
      <div className="panel-header">
        <span className="panel-title">Messages</span>
        <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }}>Select</button>
        <button
          className={`btn btn-sm ${state.flash ? 'btn-primary' : 'btn-ghost'}`}
          onClick={handleFlashAll}
          style={{ marginLeft: 4 }}
        >
          ⚡ Flash
        </button>
      </div>

      <div className="message-list">
        {state.messages.map((msg, i) => (
          <div key={msg.id} className={`message-card ${msg.visible ? 'visible' : ''}`}>
            <div className="message-index">{i + 1}</div>
            <div className="message-body">
              {editing === msg.id ? (
                <textarea
                  className="message-textarea"
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  onBlur={() => commitEdit(msg)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEdit(msg) } }}
                  autoFocus
                />
              ) : (
                <div
                  className="message-text"
                  style={{ color: COLOR_MAP[msg.color] || msg.color, fontWeight: msg.bold ? 700 : 400 }}
                  onClick={() => startEdit(msg)}
                >
                  {msg.text || <span style={{ color: '#555' }}>Click to edit...</span>}
                </div>
              )}
              <div className="message-actions">
                {COLORS.map(c => (
                  <button
                    key={c}
                    className={`color-btn ${msg.color === c ? 'selected' : ''}`}
                    style={{ background: COLOR_MAP[c] }}
                    onClick={() => window.api.messageUpdate(msg.id, { color: c })}
                    title={c}
                  />
                ))}
                <button
                  className={`msg-action-btn ${msg.bold ? 'active' : ''}`}
                  onClick={() => window.api.messageUpdate(msg.id, { bold: !msg.bold })}
                  title="Bold"
                >B</button>
                <button
                  className="msg-action-btn"
                  onClick={() => handleRemove(msg.id)}
                  title="Remove"
                >✕</button>
              </div>
            </div>
            <div className="message-show-col">
              <button
                className={`btn btn-sm ${msg.visible ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => handleToggleVisible(msg)}
              >
                {msg.visible ? 'Hide' : 'Show'}
              </button>
              <button className="btn-icon" style={{ marginTop: 4 }}>⤢</button>
            </div>
          </div>
        ))}
      </div>

      <div className="message-footer">
        <button className="btn btn-ghost" style={{ width: '100%' }} onClick={handleAdd}>
          + Add Message
        </button>
      </div>
    </div>
  )
}
