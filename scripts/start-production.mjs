#!/usr/bin/env node

import { execSync, spawn } from 'node:child_process'

const SHUTDOWN_GRACE_MS = Number(process.env.SHUTDOWN_GRACE_MS) || 10_000

if (process.env.RUN_MIGRATIONS_ON_STARTUP === 'true') {
  console.log('RUN_MIGRATIONS_ON_STARTUP is enabled. Running migrations...')
  try {
    execSync('node dist/migrate.js', { stdio: 'inherit' })
    console.log('Migrations completed successfully!')
  } catch (error) {
    console.error('Migration failed! Aborting startup.', error)
    if (error.stdout) {
      console.error('Migration stdout:', error.stdout.toString())
    }
    if (error.stderr) {
      console.error('Migration stderr:', error.stderr.toString())
    }
    process.exit(1)
  }
}

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
