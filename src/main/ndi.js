import { BrowserWindow } from 'electron'
import { join } from 'path'
import { app as electronApp } from 'electron'

let ndiSender    = null
let ndiAvailable = false
let ndiWindow    = null
let captureInterval = null

// ── NDI SDK initialisation ────────────────────────────────────────────────────

export async function initNDI () {
  try {
    // In packaged app, load the pre-built grandiose.node from resources/ndi/.
    // The NDI runtime DLL (Processing.NDI.Lib.x64.dll) is next to the .exe
    // (placed there by electron-builder extraFiles from resources/ndi/).
    // In dev mode, load from node_modules/grandiose normally.
    let grandiose
    if (electronApp.isPackaged) {
      const exeDir = require('path').dirname(electronApp.getPath('exe'))
      process.env.PATH = `${exeDir};${process.env.PATH ?? ''}`
      // eslint-disable-next-line
      grandiose = require(join(process.resourcesPath, 'resources', 'ndi', 'grandiose-loader.js'))
    } else {
      // Dev mode: use the same pre-built grandiose.node + NDI DLL as the packaged app.
      // This ensures the native binary and the runtime DLL are always the same version.
      const ndiDir = join(process.cwd(), 'resources', 'ndi')
      process.env.PATH = `${ndiDir};${process.env.PATH ?? ''}`
      // eslint-disable-next-line
      grandiose = require(join(ndiDir, 'grandiose-loader.js'))
    }
    const sender = await grandiose.send({
      name:        'StageTimer Output',
      clockVideo:  true,
      clockAudio:  false
    })
    ndiSender    = sender
    ndiAvailable = true
    const ver = grandiose.version ? grandiose.version() : 'unknown'
    console.log(`[NDI] Sender ready — "StageTimer Output" (SDK version: ${ver})`)
    return true
  } catch (err) {
    console.log('[NDI] Not available:', err.message || err)
    console.log('[NDI] Install NDI SDK from https://ndi.tv/sdk/ and @julusian/grandiose to enable NDI output')
    ndiAvailable = false
    return false
  }
}

// ── Hidden 1920×1080 renderer window ─────────────────────────────────────────

export function createNDIWindow () {
  ndiWindow = new BrowserWindow({
    width:          1920,
    height:         1080,
    show:           false,
    skipTaskbar:    true,
    resizable:      false,
    webPreferences: {
      nodeIntegration:  false,
      contextIsolation: true
    }
  })

  const rendererPath = electronApp.isPackaged
    ? join(process.resourcesPath, 'resources', 'outputs', 'ndi-renderer.html')
    : join(process.cwd(), 'resources', 'outputs', 'ndi-renderer.html')

  ndiWindow.loadFile(rendererPath)

  ndiWindow.on('closed', () => { ndiWindow = null })

  // Start the capture-and-send loop at ~30 fps
  captureInterval = setInterval(captureAndSend, Math.floor(1000 / 30))
  console.log('[NDI] Renderer window created, capture loop started (30 fps)')
}

// ── Per-frame capture → NDI send ─────────────────────────────────────────────

let _frameCount = 0
let _frameErrorLogged = false

async function captureAndSend () {
  if (!ndiWindow || ndiWindow.isDestroyed()) return
  if (!ndiSender || !ndiAvailable)           return
  if (ndiWindow.webContents.isLoading())     return   // wait until page is ready

  try {
    const image             = await ndiWindow.webContents.capturePage()
    const { width, height } = image.getSize()
    if (width === 0 || height === 0) return

    // toBitmap() returns raw BGRA pixels on Windows (same layout as NDI BGRA)
    const bitmap = image.toBitmap()

    ndiSender.video({
      xres:               width,
      yres:               height,
      frameRateN:         30000,
      frameRateD:         1000,
      pictureAspectRatio: width / height,
      // NDI FourCC for BGRA: 0x41524742 ("BGRA" in little-endian)
      fourCC:             0x41524742,
      frameFormatType:    1,          // progressive
      lineStride:         width * 4,
      data:               bitmap
    })

    _frameCount++
    if (_frameCount === 1)   console.log(`[NDI] First frame sent (${width}×${height})`)
    if (_frameCount === 100) console.log('[NDI] 100 frames sent — source is broadcasting')
    _frameErrorLogged = false
  } catch (err) {
    if (!_frameErrorLogged) {
      console.error('[NDI] Frame send error:', err?.message || err)
      _frameErrorLogged = true
    }
  }
}

// ── State push from broadcast listener ───────────────────────────────────────

export function updateNDIState (state) {
  if (!ndiWindow || ndiWindow.isDestroyed()) return
  try {
    const json = JSON.stringify(state)
    // Push state into the hidden renderer's window.onTimerState callback
    ndiWindow.webContents
      .executeJavaScript(`if(typeof window.onTimerState==='function') window.onTimerState(${json})`)
      .catch(() => {})
  } catch { /* swallow IPC errors */ }
}

// ── Public helpers ────────────────────────────────────────────────────────────

export function isNDIAvailable () {
  return ndiAvailable
}

export function isNDIActive () {
  return !!(ndiWindow && !ndiWindow.isDestroyed() && captureInterval)
}

export function enableNDICapture () {
  if (!ndiAvailable) return false
  if (isNDIActive()) return true   // already running
  createNDIWindow()
  return true
}

export function disableNDICapture () {
  if (captureInterval) { clearInterval(captureInterval); captureInterval = null }
  if (ndiWindow && !ndiWindow.isDestroyed()) { ndiWindow.close(); ndiWindow = null }
}

export function cleanup () {
  if (captureInterval) {
    clearInterval(captureInterval)
    captureInterval = null
  }
  if (ndiWindow && !ndiWindow.isDestroyed()) {
    ndiWindow.close()
    ndiWindow = null
  }
  if (ndiSender) {
    try { ndiSender.destroy() } catch {}
    ndiSender = null
  }
  ndiAvailable = false
}
