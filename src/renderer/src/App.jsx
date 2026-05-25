import React from 'react'
import { useTimerState } from './hooks/useTimerState.js'
import Toolbar from './components/Toolbar.jsx'
import DashboardPreview from './components/DashboardPreview.jsx'
import TimerList from './components/TimerList.jsx'
import MessagePanel from './components/MessagePanel.jsx'
import './styles/dashboard.css'

export default function App() {
  const state = useTimerState()

  if (!state) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text2)' }}>
        Loading...
      </div>
    )
  }

  return (
    <div className="app">
      <Toolbar state={state} />
      <div className="dashboard">
        <DashboardPreview state={state} />
        <TimerList state={state} />
        <MessagePanel state={state} />
      </div>
    </div>
  )
}
