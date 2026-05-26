import { BrowserWindow } from 'electron'
import { join } from 'path'
import { app as electronApp } from 'electron'

let ndiSender    = null
let ndiAvailable = false
let ndiWindow    = null
let captureInterval  = null

// ── NDI SDK initialisation ────────────────────────────────────────────────────

export async function initNDI () {
  try {
    let grandiose
    if (electronApp.isPackaged) {
      const exeDir = require('path').dirname(electronApp.getPath('exe'))
      process.env.PATH = `${exeDir};${process.env.PATH ?? ''}`
      // eslint-disable-next-line
      grandiose = require(join(process.resourcesPath, 'resources', 'ndi', 'grandiose-loader.js'))
    } else {
      // Dev: use pre-built grandiose.node from resources/ndi/ + bundled NDI DLL
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
    console.log(`[NDI] Sender ready — "StageTimer Output" (SDK: ${ver})`)
    return true
  } catch (err) {
    console.log('[NDI] Not available:', err.message || err)
    ndiAvailable = false
    return false
  }
}

// ── Hidden renderer window ────────────────────────────────────────────────────
// Strategy: create a real (non-offscreen) BrowserWindow, show it with opacity 0
// so it is invisible to the user but Chromium allocates a real GPU surface and
// paints it normally.  capturePage() reads from Chromium's internal buffer —
// it is NOT affected by window opacity — so we get proper 1920×1080 frames.
//
// Why NOT offscreen:true — With offscreen + show:false, Chromium never
// allocates a GPU surface.  paint events only fire on visible DOM mutations,
// and capturePage() returns a 0×0 empty NativeImage (silently dropped).

let _frameCount     = 0
let _frameErrLogged = false

export function createNDIWindow () {
  ndiWindow = new BrowserWindow({
    width:       1920,
    height:      1080,
    show:        false,
    frame:       false,
    skipTaskbar: true,
    focusable:   false,
    transparent: true,   // required for setOpacity(0) to work cleanly
    webPreferences: {
      backgroundThrottling: false,
      nodeIntegration:      false,
      contextIsolation:     true
    }
  })

  const rendererPath = electronApp.isPackaged
    ? join(process.resourcesPath, 'resources', 'outputs', 'ndi-renderer.html')
    : join(process.cwd(), 'resources', 'outputs', 'ndi-renderer.html')

  ndiWindow.loadFile(rendererPath)

  ndiWindow.webContents.once('did-finish-load', () => {
    // Show the window invisibly — this causes Chromium to allocate a GPU
    // compositing surface and start painting, which capturePage() needs.
    ndiWindow.showInactive()
    ndiWindow.setOpacity(0)

    // Start 30 fps capture loop
    captureInterval = setInterval(captureAndSend, Math.floor(1000 / 30))
    console.log('[NDI] Renderer loaded — capture loop started (opacity-0 window)')
  })

  ndiWindow.on('closed', () => {
    clearCapture()
    ndiWindow = null
  })

  console.log('[NDI] Renderer window created')
}

// ── Frame helpers ─────────────────────────────────────────────────────────────

function sendFrame (image) {
  if (!ndiSender || !ndiAvailable) return
  try {
    const { width, height } = image.getSize()
    if (width === 0 || height === 0) return
    ndiSender.video({
      xres: width, yres: height,
      frameRateN: 30000, frameRateD: 1000,
      pictureAspectRatio: width / height,
      fourCC: 0x41524742,  // BGRA
      frameFormatType: 1,
      lineStride: width * 4,
      data: image.toBitmap()
    })
    _frameCount++
    if (_frameCount === 1)   console.log(`[NDI] First frame sent (${width}×${height})`)
    if (_frameCount === 100) console.log('[NDI] 100 frames sent — source should be visible in NDI Monitor')
    _frameErrLogged = false
  } catch (err) {
    if (!_frameErrLogged) {
      console.error('[NDI] Frame send error:', err?.message || err)
      _frameErrLogged = true
    }
  }
}

let _captureBusy = false
async function captureAndSend () {
  if (!ndiWindow || ndiWindow.isDestroyed()) return
  if (!ndiSender || !ndiAvailable) return
  if (_captureBusy) return
  _captureBusy = true
  try {
    const image = await ndiWindow.webContents.capturePage()
    sendFrame(image)
  } catch { /* swallow */ } finally {
    _captureBusy = false
  }
}

// ── State push ────────────────────────────────────────────────────────────────

export function updateNDIState (state) {
  if (!ndiWindow || ndiWindow.isDestroyed()) return
  try {
    const json = JSON.stringify(state)
    ndiWindow.webContents
      .executeJavaScript(`if(typeof window.onTimerState==='function') window.onTimerState(${json})`)
      .catch(() => {})
  } catch { /* swallow */ }
}

// ── Public helpers ────────────────────────────────────────────────────────────

export function isNDIAvailable () { return ndiAvailable }

export function isNDIActive () {
  return !!(ndiWindow && !ndiWindow.isDestroyed())
}

export function enableNDICapture () {
  if (!ndiAvailable) return false
  if (isNDIActive()) return true
  createNDIWindow()
  return true
}

function clearCapture () {
  if (captureInterval) { clearInterval(captureInterval); captureInterval = null }
}

export function disableNDICapture () {
  clearCapture()
  if (ndiWindow && !ndiWindow.isDestroyed()) { ndiWindow.close(); ndiWindow = null }
}

export function cleanup () {
  clearCapture()
  if (ndiWindow && !ndiWindow.isDestroyed()) { ndiWindow.close(); ndiWindow = null }
  if (ndiSender) {
    try { ndiSender.destroy() } catch {}
    ndiSender = null
  }
  ndiAvailable = false
}
