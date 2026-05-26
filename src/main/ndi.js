import { BrowserWindow } from 'electron'
import { join } from 'path'
import { app as electronApp } from 'electron'

let ndiSender    = null
let ndiAvailable = false
let ndiWindow    = null
let captureInterval  = null
let _invalidateTimer = null

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

    // Diagnostic: verify our source appears in discovery after 3 s
    setTimeout(async () => {
      try {
        const found = await grandiose.find({ wait: 2000 })
        const names = (found || []).map(s => s.name || s)
        console.log('[NDI] Sources visible via grandiose.find():', names.length ? names.join(', ') : '(none)')
        if (names.some(n => String(n).includes('StageTimer'))) {
          console.log('[NDI] ✓ Own source is discoverable — NDI Monitor firewall rule may be missing')
        } else {
          console.log('[NDI] ✗ Own source NOT found by grandiose.find() — SDK or DLL issue')
        }
      } catch (e) {
        console.log('[NDI] grandiose.find() failed:', e.message)
      }
    }, 3000)

    return true
  } catch (err) {
    console.log('[NDI] Not available:', err.message || err)
    ndiAvailable = false
    return false
  }
}

// ── Hidden 1920×1080 renderer window ─────────────────────────────────────────
// Strategy: offscreen:true avoids GPU-cache crashes. For frames, use
// capturePage() triggered from setInterval — started only AFTER did-finish-load
// so we never hit the isLoading() === true deadlock of the original approach.

let _frameCount     = 0
let _frameErrLogged = false

export function createNDIWindow () {
  ndiWindow = new BrowserWindow({
    width:  1920,
    height: 1080,
    show:   false,
    webPreferences: {
      offscreen:            true,  // avoid GPU disk-cache / network-service crashes
      backgroundThrottling: false,
      nodeIntegration:      false,
      contextIsolation:     true
    }
  })

  const rendererPath = electronApp.isPackaged
    ? join(process.resourcesPath, 'resources', 'outputs', 'ndi-renderer.html')
    : join(process.cwd(), 'resources', 'outputs', 'ndi-renderer.html')

  ndiWindow.loadFile(rendererPath)

  // ── paint event (offscreen) ────────────────────────────────────────────────
  ndiWindow.webContents.on('paint', (event, _dirty, image) => {
    sendFrame(image)
  })

  // ── fallback: capturePage() loop — started after did-finish-load ───────────
  // If the offscreen paint event never fires (known issue on some Windows configs),
  // capturePage() on an offscreen window still works once the page is loaded.
  ndiWindow.webContents.once('did-finish-load', () => {
    console.log('[NDI] Renderer loaded')

    // Try to kick offscreen paint loop
    if (typeof ndiWindow.webContents.startPainting === 'function') {
      ndiWindow.webContents.startPainting()
    }
    ndiWindow.webContents.setFrameRate(30)

    // invalidate loop to drive paint events
    _invalidateTimer = setInterval(() => {
      if (ndiWindow && !ndiWindow.isDestroyed()) ndiWindow.webContents.invalidate()
    }, Math.floor(1000 / 30))

    // capturePage fallback — captures whatever the offscreen renderer has
    captureInterval = setInterval(captureAndSend, Math.floor(1000 / 30))
  })

  ndiWindow.on('closed', () => {
    clearIntervals()
    ndiWindow = null
  })

  console.log('[NDI] Renderer window created (offscreen)')
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
  if (_captureBusy) return  // don't stack concurrent captures
  if (_frameCount > 0) return  // paint event is working — capturePage not needed

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

function clearIntervals () {
  if (captureInterval)  { clearInterval(captureInterval);  captureInterval  = null }
  if (_invalidateTimer) { clearInterval(_invalidateTimer); _invalidateTimer = null }
}

export function disableNDICapture () {
  clearIntervals()
  if (ndiWindow && !ndiWindow.isDestroyed()) { ndiWindow.close(); ndiWindow = null }
}

export function cleanup () {
  clearIntervals()
  if (ndiWindow && !ndiWindow.isDestroyed()) { ndiWindow.close(); ndiWindow = null }
  if (ndiSender) {
    try { ndiSender.destroy() } catch {}
    ndiSender = null
  }
  ndiAvailable = false
}
