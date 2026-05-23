import express from 'express'
import { createServer } from 'http'
import { getState } from './timer-store.js'
import * as engine from './timer-engine.js'
import * as store from './timer-store.js'

const PORT = 7001
let server = null

export function startCompanionApi() {
  const app = express()
  app.use(express.json())

  const cors = (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.header('Access-Control-Allow-Headers', 'Content-Type')
    if (req.method === 'OPTIONS') return res.sendStatus(200)
    next()
  }
  app.use(cors)

  app.get('/api/status', (req, res) => res.json(getState()))

  app.post('/api/timer/start', (req, res) => {
    engine.startTimer(req.query.id || null)
    res.json({ ok: true, state: getState() })
  })

  app.post('/api/timer/pause', (req, res) => {
    engine.pauseTimer(req.query.id || null)
    res.json({ ok: true, state: getState() })
  })

  app.post('/api/timer/stop', (req, res) => {
    engine.stopTimer(req.query.id || null)
    res.json({ ok: true, state: getState() })
  })

  app.post('/api/timer/reset', (req, res) => {
    engine.resetTimer(req.query.id || null)
    res.json({ ok: true, state: getState() })
  })

  app.post('/api/timer/next', (req, res) => {
    engine.nextTimer()
    res.json({ ok: true, state: getState() })
  })

  app.post('/api/timer/previous', (req, res) => {
    engine.prevTimer()
    res.json({ ok: true, state: getState() })
  })

  app.post('/api/timer/adjust', (req, res) => {
    const seconds = parseInt(req.query.seconds || req.body?.seconds || 60)
    engine.adjustTimer(req.query.id || null, seconds)
    res.json({ ok: true, state: getState() })
  })

  app.post('/api/blackout', (req, res) => {
    const val = req.query.state === 'false' ? false : req.query.state === 'true' ? true : !getState().blackout
    engine.setBlackout(val)
    res.json({ ok: true, blackout: val })
  })

  app.post('/api/flash', (req, res) => {
    const val = req.query.state === 'false' ? false : req.query.state === 'true' ? true : !getState().flash
    engine.setFlash(val)
    res.json({ ok: true, flash: val })
  })

  app.post('/api/message/:id/show', (req, res) => {
    store.updateMessage(req.params.id, { visible: true })
    res.json({ ok: true })
  })

  app.post('/api/message/:id/hide', (req, res) => {
    store.updateMessage(req.params.id, { visible: false })
    res.json({ ok: true })
  })

  server = createServer(app)
  server.listen(PORT, '0.0.0.0')
  return PORT
}

export function stopCompanionApi() {
  if (server) server.close()
}
