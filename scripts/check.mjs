#!/usr/bin/env node
// `npm run check`: the four checks, in three phases, stopping at the first
// failing phase.
//
//   1. check:api              ~10s, so a lint or type slip fails first
//   2. check:py + check:e2e   at the same time: neither reads what the other
//                             writes (pytest builds apps on `no-static`, and
//                             the wheel test copies the source without static/)
//   3. check:smoke            last, because its build empties static/, which
//                             the e2e servers are serving
//
// In phase 2 every output line is prefixed with its step's name. When one step
// fails, the other gets SIGINT (Playwright and pytest both clean up on it) and
// the run exits 1. `--plan` prints the phases as JSON and runs nothing.

import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

export const PHASES = [['check:api'], ['check:py', 'check:e2e'], ['check:smoke']]

const REPO = fileURLToPath(new URL('..', import.meta.url))
const running = new Set()
const stopped = new Set()

function prefixer(label, stream) {
  let rest = ''
  return {
    write(chunk) {
      const lines = (rest + chunk).split('\n')
      rest = lines.pop()
      for (const line of lines) stream.write(`${label}${line}\n`)
    },
    flush() {
      if (rest) stream.write(`${label}${rest}\n`)
      rest = ''
    },
  }
}

function runStep(step, prefixed) {
  return new Promise((resolve) => {
    const started = Date.now()
    // Its own process group, so a stop reaches npm's children (uv, pytest, playwright, the servers).
    const child = spawn('npm', ['run', step], {
      cwd: REPO,
      detached: true,
      stdio: prefixed ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    })
    running.add(child)
    const outs = []
    if (prefixed) {
      const label = `[${step}] `
      for (const [from, to] of [
        [child.stdout, process.stdout],
        [child.stderr, process.stderr],
      ]) {
        const out = prefixer(label, to)
        outs.push(out)
        from.setEncoding('utf8')
        from.on('data', (chunk) => out.write(chunk))
      }
    }
    child.on('close', (code, signal) => {
      running.delete(child)
      for (const out of outs) out.flush()
      const seconds = ((Date.now() - started) / 1000).toFixed(0)
      const how = stopped.has(child) ? 'stopped' : (signal ?? `exit ${code}`)
      resolve({ step, ok: code === 0, how, seconds })
    })
  })
}

function stopAll() {
  for (const child of running) {
    stopped.add(child)
    try {
      process.kill(-child.pid, 'SIGINT')
    } catch {
      // already gone
    }
  }
}

async function runPhase(steps) {
  const prefixed = steps.length > 1
  const results = await Promise.all(
    steps.map((step) =>
      runStep(step, prefixed).then((result) => {
        if (!result.ok) stopAll()
        return result
      }),
    ),
  )
  for (const { step, ok, how, seconds } of results) {
    const verdict = ok ? 'passed' : how === 'stopped' ? 'stopped' : `failed (${how})`
    console.error(`check: ${step} ${verdict} in ${seconds}s`)
  }
  return results.every((result) => result.ok)
}

async function main() {
  if (process.argv.includes('--plan')) {
    console.log(JSON.stringify(PHASES))
    return
  }
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
      stopAll()
      process.exitCode = 130
    })
  }
  for (const steps of PHASES) {
    if (!(await runPhase(steps))) {
      process.exitCode = 1
      return
    }
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main()
