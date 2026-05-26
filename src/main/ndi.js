import { BrowserWindow } from 'electron'
import { join } from 'path'
import { app as electronApp } from 'electron'

let ndiSender    = null
let ndiAvailable = false
let ndiWindow    = null

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
      // Dev mode: use the same pre-built grandiose.node + NDI DLL as the packaged app
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
    ndiAvailable = false
    return false
  }
}

// ── Offscreen 1920×1080 renderer window ──────────────────────────────────────
// offscreen: true → Electron renders to a memory buffer via paint events.
// No GPU hardware, no disk cache, no network service — none of the issues
// that a normal hidden BrowserWindow has on headless/restricted machines.

let _frameCount      = 0
let _frameErrLogged  = false
let _invalidateTimer = null

export function createNDIWindow () {
  ndiWindow = new BrowserWindow({
    width:  1920,
    height: 1080,
    show:   false,
    webPreferences: {
      offscreen:            true,   // software-render to buffer, no GPU hardware needed
      backgroundThrottling: false,
      nodeIntegration:      false,
      contextIsolation:     true
    }
  })

  const rendererPath = electronApp.isPackaged
    ? join(process.resourcesPath, 'resources', 'outputs', 'ndi-renderer.html')
    : join(process.cwd(), 'resources', 'outputs', 'ndi-renderer.html')

  ndiWindow.loadFile(rendererPath)
  ndiWindow.webContents.setFrameRate(30)

  // paint fires when Chromium renders a frame — wired to NDI send
  ndiWindow.webContents.on('paint', (event, _dirty, image) => {
    if (!ndiSender || !ndiAvailable) return
    const { width, height } = image.getSize()
    if (width === 0 || height === 0) return

    const bitmap = image.toBitmap()
    try {
      ndiSender.video({
        xres:               width,
        yres:               height,
        frameRateN:         30000,
        frameRateD:         1000,
        pictureAspectRatio: width / height,
        fourCC:             0x41524742,  // BGRA little-endian
        frameFormatType:    1,           // progressive
        lineStride:         width * 4,
        data:               bitmap
      })
      _frameCount++
      if (_frameCount === 1)   console.log(`[NDI] First frame sent (${width}×${height})`)
      if (_frameCount === 100) console.log('[NDI] 100 frames sent — source is broadcasting')
      _frameErrLogged = false
    } catch (err) {
      if (!_frameErrLogged) {
        console.error('[NDI] Frame send error:', err?.message || err)
        _frameErrLogged = true
      }
    }
  })

  ndiWindow.webContents.on('did-finish-load', () => {
    console.log('[NDI] Renderer loaded — starting paint loop')
    // Chromium won't paint a hidden offscreen window on its own.
    // The canonical pattern is: call invalidate() at the desired frame rate
    // to trigger paint events. startPainting() alone is not sufficient.
    _invalidateTimer = setInterval(() => {
      if (ndiWindow && !ndiWindow.isDestroyed()) {
        ndiWindow.webContents.invalidate()
      }
    }, Math.floor(1000 / 30))  // 30 fps
  })

  ndiWindow.on('closed', () => {
    if (_invalidateTimer) { clearInterval(_invalidateTimer); _invalidateTimer = null }
    ndiWindow = null
  })

  console.log('[NDI] Renderer window created (offscreen, 30 fps)')
}

// ── State push from broadcast listener ───────────────────────────────────────

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

export function disableNDICapture () {
  if (_invalidateTimer) { clearInterval(_invalidateTimer); _invalidateTimer = null }
  if (ndiWindow && !ndiWindow.isDestroyed()) { ndiWindow.close(); ndiWindow = null }
}

export function cleanup () {
  if (_invalidateTimer) { clearInterval(_invalidateTimer); _invalidateTimer = null }
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
