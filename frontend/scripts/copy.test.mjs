// Story 1.6 tone guard, ATDD red phase (UX-DR12, NFR6): every user-facing
// message, in server copy and client copy, stays calm. No exclamation marks,
// greetings or praise; no red or warning colors; no character-key shortcuts,
// drag and drop or hover-only affordances. Skipped until the task lands.

import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const frontend = resolve(fileURLToPath(new URL('..', import.meta.url)))
const repo = resolve(frontend, '..')
const SRC = join(frontend, 'src')
const SERVER = join(repo, 'backend', 'bookvie')

function files(dir, extensions) {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && extensions.some((ext) => entry.name.endsWith(ext)))
    .map((entry) => join(entry.parentPath, entry.name))
    .filter((file) => !/(\.test\.|[/\\]generated[/\\]|[/\\]__pycache__[/\\]|[/\\]static[/\\])/.test(file))
}

const where = (file) => relative(repo, file)
const withoutComments = (source) => source.replace(/\/\*[\s\S]*?\*\/|(^|[^:])\/\/.*$/gm, '$1')

/** Prose a user can read: JSX text and string literals with a letter and a space. */
function clientCopy() {
  const copy = []
  for (const file of files(SRC, ['.tsx', '.ts'])) {
    const source = withoutComments(readFileSync(file, 'utf8'))
    const jsxText = file.endsWith('.tsx')
      ? [...source.matchAll(/>([^<>{}=;]*[A-Za-z][^<>{}=;]*)</g)].map((m) => m[1])
      : []
    const literals = [...source.matchAll(/(['"`])((?:(?!\1)[^\\\n]|\\.)*)\1/g)].map((m) => m[2])
    for (const text of [...jsxText, ...literals]) {
      if (/[A-Za-z]/.test(text) && /\s/.test(text.trim())) copy.push({ file: where(file), text: text.trim() })
    }
  }
  return copy
}

/** Server messages: one-line double-quoted strings that start with a capital (AD-9 copy). */
function serverCopy() {
  const copy = []
  for (const file of files(SERVER, ['.py'])) {
    const source = readFileSync(file, 'utf8')
      .replace(/"""[\s\S]*?"""/g, '')
      .replace(/#.*$/gm, '')
    for (const [, text] of source.matchAll(/"([A-Z][^"\n]*\s[^"\n]*)"/g)) copy.push({ file: where(file), text })
  }
  return copy
}

const GREETING_OR_PRAISE =
  /\b(welcome|hello|hi there|hey|congrat\w*|great job|well done|nice work|good job|awesome|amazing|fantastic|yay|hooray)\b/i
const RED_NAMES = /\b(red|darkred|crimson|firebrick|tomato|orangered|orange|coral|salmon)\b/i

function hexHueSaturation(hex) {
  const value = hex.length === 4 ? [...hex.slice(1)].map((c) => c + c).join('') : hex.slice(1, 7)
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16) / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const lightness = (max + min) / 2
  if (max === min) return { hue: 0, saturation: 0 }
  const delta = max - min
  const saturation = delta / (1 - Math.abs(2 * lightness - 1))
  const hue = max === r ? (60 * ((g - b) / delta) + 360) % 360 : max === g ? 60 * ((b - r) / delta + 2) : 60 * ((r - g) / delta + 4)
  return { hue, saturation }
}

describe('copy and interaction guard', () => {
  it.skip('[P1] AC-14 no message shouts, greets or praises, and nothing is red, key-bound, draggable or hover-only', () => {
    const copy = [...serverCopy(), ...clientCopy()]
    assert.deepEqual(copy.filter(({ text }) => text.includes('!')), [])

    assert.ok(copy.some(({ text }) => text === "Couldn't save. Your data wasn't changed."), 'server copy was scanned')
    assert.ok(copy.some(({ text }) => text === 'Your shelf is empty. Add your first book.'), 'client copy was scanned')
    assert.deepEqual(copy.filter(({ text }) => GREETING_OR_PRAISE.test(text)), [])

    const css = files(SRC, ['.css']).map((file) => ({ file: where(file), source: withoutComments(readFileSync(file, 'utf8')) }))
    const reds = css.flatMap(({ file, source }) => [
      ...[...source.matchAll(/:\s*[^;{}]*/g)].filter((m) => RED_NAMES.test(m[0])).map((m) => `${file}: ${m[0]}`),
      ...[...source.matchAll(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g)]
        .filter((m) => {
          const { hue, saturation } = hexHueSaturation(m[0])
          return saturation > 0.55 && (hue < 40 || hue > 345)
        })
        .map((m) => `${file}: ${m[0]}`),
    ])
    assert.deepEqual(reds, [])

    // Every :hover rule has a :focus twin in the same selector list.
    const hoverOnly = css.flatMap(({ file, source }) =>
      [...source.matchAll(/([^{}]*:hover[^{}]*)\{/g)]
        .filter((m) => !/:focus/.test(m[1]))
        .map((m) => `${file}: ${m[1].trim()}`),
    )
    assert.deepEqual(hoverOnly, [])

    const code = files(SRC, ['.tsx', '.ts']).map((file) => ({
      file: where(file),
      source: withoutComments(readFileSync(file, 'utf8')),
    }))
    const forbidden = [
      /(document|window)\.addEventListener\(\s*['"]key(down|up|press)['"]/, // global key handlers
      /\.key\s*===?\s*['"][A-Za-z0-9/?]['"]/, // single-character shortcuts
      /\bdraggable\b|\bonDrag\w*|\bonDrop\b/, // drag and drop
    ]
    assert.deepEqual(
      code.flatMap(({ file, source }) => forbidden.filter((rule) => rule.test(source)).map((rule) => `${file}: ${rule}`)),
      [],
    )
  })
})
