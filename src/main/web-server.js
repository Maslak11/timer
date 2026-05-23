import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { join } from 'path'
import { app as electronApp } from 'electron'
import { getState, updateTimer, updateMessage, addTimer, removeTimer, addMessage, removeMessage, setState } from './timer-store.js'
import * as engine from './timer-engine.js'

const PORT = 7000
let io = null
let httpServer = null
const broadcastListeners = []

export function addBroadcastListener(fn) {
  broadcastListeners.push(fn)
}

function broadcastAll(state) {
  if (io) io.emit('state', state)
  broadcastListeners.forEach(fn => fn(state))
}

export function startWebServer() {
  const app = express()

  const outputDir = electronApp.isPackaged
    ? join(process.resourcesPath, 'resources', 'outputs')
    : join(process.cwd(), 'resources', 'outputs')

  app.use('/outputs', express.static(outputDir))
  app.use(express.static(outputDir))

  app.get('/viewer',     (_, res) => res.sendFile(join(outputDir, 'viewer.html')))
  app.get('/operator',   (_, res) => res.sendFile(join(outputDir, 'operator.html')))
  app.get('/controller', (_, res) => res.sendFile(join(outputDir, 'controller.html')))
  app.get('/agenda',     (_, res) => res.sendFile(join(outputDir, 'agenda.html')))
  app.get('/moderator',  (_, res) => res.sendFile(join(outputDir, 'moderator.html')))
  app.get('/state',      (_, res) => res.json(getState()))

  httpServer = createServer(app)

  io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
  })

  io.on('connection', socket => {
    socket.emit('state', getState())
    socket.on('command', cmd => handleSocketCommand(cmd))
  })

  engine.setBroadcastFn(broadcastAll)

  httpServer.listen(PORT, '0.0.0.0')
  return PORT
}

function handleSocketCommand(cmd) {
  switch (cmd.action) {
    case 'start':           engine.startTimer(cmd.id); break
    case 'pause':           engine.pauseTimer(cmd.id); break
    case 'stop':            engine.stopTimer(cmd.id); break
    case 'reset':           engine.resetTimer(cmd.id); break
    case 'adjust':          engine.adjustTimer(cmd.id, cmd.seconds); break
    case 'next':            engine.nextTimer(); break
    case 'prev':            engine.prevTimer(); break
    case 'blackout':        engine.setBlackout(cmd.value); break
    case 'flash':           engine.setFlash(cmd.value); break
    case 'message:show':    updateMessage(cmd.id, { visible: true }); broadcastAll(getState()); break
    case 'message:hide':    updateMessage(cmd.id, { visible: false }); broadcastAll(getState()); break
    case 'message:update':  updateMessage(cmd.id, cmd.data); broadcastAll(getState()); break
    case 'message:add':     addMessage(cmd.data); broadcastAll(getState()); break
    case 'message:remove':  removeMessage(cmd.id); broadcastAll(getState()); break
    case 'timer:update':    updateTimer(cmd.id, cmd.data); broadcastAll(getState()); break
    case 'timer:add':       addTimer(cmd.data); broadcastAll(getState()); break
    case 'timer:remove':    removeTimer(cmd.id); broadcastAll(getState()); break
    case 'room:update':     setState(cmd.data); broadcastAll(getState()); break
  }
}

export function getPort() { return PORT }

export function stopWebServer() {
  if (httpServer) httpServer.close()
}
