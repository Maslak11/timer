let ndiSender = null
let ndiAvailable = false

export async function initNDI() {
  try {
    // eslint-disable-next-line
    const grandiose = require('@julusian/grandiose')
    const sender = await grandiose.send({
      name: 'StageTimer Output',
      clockVideo: true,
      clockAudio: false
    })
    ndiSender = sender
    ndiAvailable = true
    console.log('NDI initialized: StageTimer Output')
    return true
  } catch {
    console.log('NDI not available — install NDI SDK from ndi.tv and @julusian/grandiose to enable NDI output')
    ndiAvailable = false
    return false
  }
}

export function isNDIAvailable() {
  return ndiAvailable
}

export function sendNDIFrame(pixelBuffer, width, height) {
  if (!ndiSender || !ndiAvailable) return
  try {
    ndiSender.video({
      xres: width,
      yres: height,
      frameRateN: 30000,
      frameRateD: 1000,
      pictureAspectRatio: width / height,
      frameFormatType: 1,
      lineStride: width * 4,
      data: pixelBuffer
    })
  } catch {}
}

export function cleanup() {
  if (ndiSender) {
    try { ndiSender.destroy() } catch {}
    ndiSender = null
  }
  ndiAvailable = false
}
