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
    // Ensure Windows can find Processing.NDI.Lib.x64.dll when packaged.
    // electron-builder places it next to the .exe via extraFiles, but we also
    // add the exe directory to PATH as a belt-and-suspenders measure.
    if (electronApp.isPackaged) {
      const { dirname } = await import('path')
      const exeDir = dirname(electronApp.getPath('exe'))
      process.env.PATH = `${exeDir};${process.env.PATH ?? ''}`
    }

    // eslint-disable-next-line
    const grandiose = require('@julusian/grandiose')
    const sender = await grandiose.send({
      name:        'StageTimer Output',
      clockVideo:  true,
      clockAudio:  false
    })
    ndiSender    = sender
    ndiAvailable = true
    console.log('[NDI] Sender ready — "StageTimer Output"')
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
  } catch { /* swallow frame errors */ }
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
