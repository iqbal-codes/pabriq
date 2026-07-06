#!/usr/bin/env node

import { spawn } from 'node:child_process'

const SHUTDOWN_GRACE_MS = Number(process.env.SHUTDOWN_GRACE_MS) || 10_000

let childExiting = false

const child = spawn('npm', ['run', 'start'], {
  stdio: 'inherit',
  shell: true,
})

function handleShutdown(signal) {
  if (childExiting) return
  childExiting = true
  child.kill(signal)
  const timer = setTimeout(() => {
    process.exit(1)
  }, SHUTDOWN_GRACE_MS)
  child.on('exit', () => {
    clearTimeout(timer)
    process.exit(0)
  })
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'))
process.on('SIGINT', () => handleShutdown('SIGINT'))

child.on('exit', (code) => {
  process.exit(code ?? 1)
})
