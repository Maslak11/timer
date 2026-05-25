#!/usr/bin/env node
'use strict'
// Patches node_modules/grandiose/binding.gyp to add /Zc:strictStrings-
// which allows const char* → char* implicit conversions in MSVC.
// Run automatically via postinstall or as a CI step before electron-rebuild.
const fs   = require('fs')
const path = require('path')

const gypPath = path.join(__dirname, '..', 'node_modules', 'grandiose', 'binding.gyp')

if (!fs.existsSync(gypPath)) {
  console.log('grandiose not found — skipping binding.gyp patch')
  process.exit(0)
}

const gyp    = JSON.parse(fs.readFileSync(gypPath, 'utf8'))
const target = gyp.targets[0]

if (!target.conditions) target.conditions = []

const alreadyPatched = target.conditions.some(c => JSON.stringify(c).includes('strictStrings'))
if (alreadyPatched) {
  console.log('grandiose binding.gyp already patched — skipping')
  process.exit(0)
}

target.conditions.push([
  "OS=='win'",
  {
    msvs_settings: {
      VCCLCompilerTool: {
        AdditionalOptions: ['/Zc:strictStrings-']
      }
    }
  }
])

fs.writeFileSync(gypPath, JSON.stringify(gyp, null, 2))
console.log('✅ grandiose binding.gyp patched for MSVC')
