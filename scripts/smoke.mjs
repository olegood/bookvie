#!/usr/bin/env node
// FND-SMOKE-001: build the SPA, install bookvie the way a user does into an
// isolated uv tool dir, start it, and check that it serves the SPA.
//
// The install gets its own HOME, UV_TOOL_DIR and UV_TOOL_BIN_DIR under a temp
// folder, and reuses the real uv cache and Python install dir so it needs no
// network. Every temp folder is removed at the end, pass or fail.

import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync } from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = fileURLToPath(new URL('..', import.meta.url))
const START_TIMEOUT_MS = 30_000
const STOP_TIMEOUT_MS = 15_000

function say(message) {
  console.error(`smoke: ${message}`)
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: REPO, encoding: 'utf8', ...options })
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(' ')} exited with ${result.status}\n${result.stdout ?? ''}${result.stderr ?? ''}`,
    )
  }
  return result.stdout ?? ''
}

function uvDir(...args) {
  return run('uv', args).trim()
}

function freePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer()
    probe.on('error', reject)
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address()
      probe.close(() => resolve(port))
    })
  })
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function get(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(5_000) })
  return { status: response.status, body: await response.text() }
}

/** True when a health body is JSON reporting `dataDir`; anything else is "not yet". */
function answersFor(body, dataDir) {
  try {
    return JSON.parse(body).dataDir === dataDir
  } catch {
    return false
  }
}

async function main() {
  say('npm run build')
  run('npm', ['run', 'build'], { stdio: ['ignore', 'inherit', 'inherit'] })

  // Read the real dirs before HOME changes, since uv derives them from HOME.
  const uvCache = process.env.UV_CACHE_DIR || uvDir('cache', 'dir')
  const uvPython = process.env.UV_PYTHON_INSTALL_DIR || uvDir('python', 'dir')

  const temp = realpathSync.native(mkdtempSync(path.join(os.tmpdir(), 'bookvie-smoke-')))
  let server
  try {
    const home = path.join(temp, 'home')
    const binDir = path.join(temp, 'bin')
    const dataDir = path.join(temp, 'data')
    mkdirSync(home)
    const env = {
      ...process.env,
      HOME: home,
      UV_TOOL_DIR: path.join(temp, 'tools'),
      UV_TOOL_BIN_DIR: binDir,
      UV_CACHE_DIR: uvCache,
      UV_PYTHON_INSTALL_DIR: uvPython,
    }
    for (const name of ['XDG_CONFIG_HOME', 'XDG_DATA_HOME', 'XDG_BIN_HOME', 'XDG_CACHE_HOME']) {
      delete env[name]
    }

    say(`uv tool install --reinstall ./backend (UV_TOOL_DIR=${env.UV_TOOL_DIR})`)
    run('uv', ['tool', 'install', '--reinstall', './backend'], { env })

    const port = await freePort()
    const bookvie = path.join(binDir, 'bookvie')
    say(`${bookvie} --no-browser --port ${port} --data-dir ${dataDir}`)
    server = spawn(bookvie, ['--no-browser', '--port', String(port), '--data-dir', dataDir], {
      cwd: temp,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    server.stdout.setEncoding('utf8').on('data', (chunk) => (stdout += chunk))
    server.stderr.setEncoding('utf8').on('data', (chunk) => (stderr += chunk))
    const exited = new Promise((resolve) => server.once('exit', resolve))
    server.once('error', (error) => (stderr += `\nspawn error: ${error.message}`))

    const origin = `http://127.0.0.1:${port}`
    const deadline = Date.now() + START_TIMEOUT_MS
    for (;;) {
      if (server.exitCode !== null || server.signalCode !== null) {
        throw new Error(`bookvie exited before answering health\n${stderr}`)
      }
      const health = await get(`${origin}/api/health`).catch(() => null)
      if (health?.status === 200 && answersFor(health.body, dataDir)) break
      if (Date.now() > deadline) throw new Error(`bookvie never answered health\n${stderr}`)
      await sleep(100)
    }

    for (const route of ['/', '/catalog/x']) {
      const { status, body } = await get(`${origin}${route}`)
      if (status !== 200 || !body.includes('<div id="root">')) {
        throw new Error(`GET ${route} answered ${status} without the SPA:\n${body.slice(0, 500)}`)
      }
      say(`GET ${route} -> ${status} with <div id="root">`)
    }

    server.kill('SIGTERM')
    const timer = setTimeout(() => server.kill('SIGKILL'), STOP_TIMEOUT_MS)
    await exited
    clearTimeout(timer)
    if (server.exitCode !== 0 && server.signalCode !== 'SIGTERM') {
      throw new Error(
        `bookvie did not stop cleanly on SIGTERM (code ${server.exitCode}, signal ${server.signalCode})\n${stderr}`,
      )
    }
    if (stdout !== '') throw new Error(`bookvie wrote to stdout:\n${stdout}`)
    if (existsSync(path.join(dataDir, 'bookvie.lock'))) {
      throw new Error(`bookvie.lock was left in ${dataDir} after SIGTERM`)
    }
    if (existsSync(path.join(home, 'bookvie-data'))) {
      throw new Error(`bookvie created ${path.join(home, 'bookvie-data')}`)
    }
    say('ok')
  } finally {
    if (server && server.exitCode === null && server.signalCode === null) server.kill('SIGKILL')
    rmSync(temp, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(`smoke: FAILED: ${error.message}`)
  process.exitCode = 1
})
