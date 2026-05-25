// Thin wrapper around the pre-built grandiose.node (Electron 33 / Windows x64).
// Mirrors the public API of the grandiose npm package (grandiose@0.0.4),
// but loads the native addon directly so no npm install / compile step is needed.
'use strict'
const path = require('path')
const addon = require(path.join(__dirname, 'grandiose.node'))

const COLOR_FORMAT_BGRX_BGRA          = 0
const COLOR_FORMAT_UYVY_BGRA          = 1
const COLOR_FORMAT_RGBX_RGBA          = 2
const COLOR_FORMAT_UYVY_RGBA          = 3
const COLOR_FORMAT_BGRX_BGRA_FLIPPED  = 200
const COLOR_FORMAT_FASTEST            = 100

const BANDWIDTH_METADATA_ONLY = -10
const BANDWIDTH_AUDIO_ONLY    =  10
const BANDWIDTH_LOWEST        =   0
const BANDWIDTH_HIGHEST       = 100

const FORMAT_TYPE_PROGRESSIVE = 1
const FORMAT_TYPE_INTERLACED  = 0
const FORMAT_TYPE_FIELD_0     = 2
const FORMAT_TYPE_FIELD_1     = 3

const AUDIO_FORMAT_FLOAT_32_SEPARATE    = 0
const AUDIO_FORMAT_FLOAT_32_INTERLEAVED = 1
const AUDIO_FORMAT_INT_16_INTERLEAVED   = 2

function find(...args) {
  if (args.length === 0) return addon.find()
  if (Array.isArray(args[0].groups))   args[0].groups   = args[0].groups.join(',')
  if (Array.isArray(args[0].extraIPs)) args[0].extraIPs = args[0].extraIPs.join(',')
  return addon.find.apply(null, args)
}

module.exports = {
  version: addon.version,
  find,
  isSupportedCPU: addon.isSupportedCPU,
  receive: addon.receive,
  send: addon.send,
  COLOR_FORMAT_BGRX_BGRA, COLOR_FORMAT_UYVY_BGRA,
  COLOR_FORMAT_RGBX_RGBA, COLOR_FORMAT_UYVY_RGBA,
  COLOR_FORMAT_BGRX_BGRA_FLIPPED, COLOR_FORMAT_FASTEST,
  BANDWIDTH_METADATA_ONLY, BANDWIDTH_AUDIO_ONLY,
  BANDWIDTH_LOWEST, BANDWIDTH_HIGHEST,
  FORMAT_TYPE_PROGRESSIVE, FORMAT_TYPE_INTERLACED,
  FORMAT_TYPE_FIELD_0, FORMAT_TYPE_FIELD_1,
  AUDIO_FORMAT_FLOAT_32_SEPARATE, AUDIO_FORMAT_FLOAT_32_INTERLEAVED,
  AUDIO_FORMAT_INT_16_INTERLEAVED
}
