// Fills and submits the Catalog's "New book" form in a hidden browser, then closes it.
//
//   node add_book.mjs --book /abs/path/book.json [--confirm-duplicate] [--base-url http://127.0.0.1:8765]
//
// book.json holds the form values by label:
//   { "title", "subtitle", "pages", "authors" ("A; B"), "edition", "language", "publisher",
//     "type" ("Paperback" | "Hardcover" | "Ebook"), "isbn", "year", "tags" ("added-by-skill, x"),
//     "cover" (absolute path to a JPEG/PNG/WebP), "finishedOn", "spineColor" }
// Empty or missing optional values are left blank.
//
// Prints JSON with "outcome":
//   saved      — the status read "Added <Title>." and Search titles found the spine ("verified": true)
//   duplicate  — the "Possible duplicate" dialog named existing books; without --confirm-duplicate
//                the script clicked "Don't add" and "Cancel", so nothing was saved
//   invalid    — "Not saved. N fields need attention: …", with each field's message
//   failed     — "Couldn't save. Your data wasn't changed."
//   error      — the script itself failed (bookvie down, a label missing, a timeout)
// Exit code: 0 for saved, 3 for duplicate, 1 otherwise.
import fs from 'node:fs'
import { run, withHeadlessPage } from './lib/browser.mjs'

function parseArgs(argv) {
  const args = { 'base-url': 'http://127.0.0.1:8765' }
  for (let i = 0; i < argv.length; i++) {
    const name = argv[i].replace(/^--/, '')
    if (name === 'confirm-duplicate') args[name] = true
    else args[name] = argv[++i]
  }
  return args
}

const TEXT_FIELDS = [
  ['textbox', 'Title', 'title'],
  ['textbox', 'Subtitle', 'subtitle'],
  ['spinbutton', 'Pages', 'pages'],
  ['textbox', 'Author(s)', 'authors'],
  ['spinbutton', 'Edition', 'edition'],
  ['textbox', 'Language', 'language'],
  ['textbox', 'Publisher', 'publisher'],
  ['textbox', 'ISBN', 'isbn'],
  ['spinbutton', 'Year', 'year'],
  ['textbox', 'Finished on', 'finishedOn'],
  ['textbox', 'Spine color', 'spineColor'],
]

const present = (value) => value !== undefined && value !== null && String(value).trim() !== ''

async function waitForOutcome(page) {
  const deadline = Date.now() + 20000
  while (Date.now() < deadline) {
    const state = await page.evaluate(() => ({
      status: [...document.querySelectorAll('[role=status]')].map((e) => e.innerText.trim()).filter(Boolean),
      alerts: [...document.querySelectorAll('[role=alert]')].map((e) => e.innerText.trim()).filter(Boolean),
      duplicate: document.querySelector('[role=alertdialog]')?.innerText.trim() || null,
    }))
    if (state.duplicate) return { kind: 'duplicate', text: state.duplicate }
    const added = state.status.find((s) => s.startsWith('Added '))
    if (added) return { kind: 'saved', text: added }
    const notSaved = state.alerts.find((s) => s.startsWith('Not saved'))
    if (notSaved) return { kind: 'invalid', text: notSaved }
    const failed = state.alerts.find((s) => s.startsWith("Couldn't save"))
    if (failed) return { kind: 'failed', text: failed }
    await page.waitForTimeout(250)
  }
  throw new Error('no outcome within 20 s after pressing Add book')
}

async function addBook(page, book, args) {
  await page.goto(args['base-url'] + '/catalog', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'New book', exact: true }).click()
  const form = page.getByRole('dialog', { name: 'New book' })
  await form.waitFor()

  for (const [role, label, key] of TEXT_FIELDS) {
    if (key === 'edition') {
      await form.getByRole(role, { name: label, exact: true }).fill(String(present(book.edition) ? book.edition : 1))
    } else if (present(book[key])) {
      await form.getByRole(role, { name: label, exact: true }).fill(String(book[key]))
    }
  }
  await form.getByRole('combobox', { name: 'Type', exact: true }).selectOption({ label: book.type })
  if (present(book.tags)) {
    const tags = form.getByRole('combobox', { name: 'Tags', exact: true })
    // No key press after it: Escape closes the whole panel, and Enter could pick a suggestion.
    await tags.fill(book.tags)
  }
  if (present(book.cover)) {
    // The Cover field is an <input type="file">; setting its files needs no chooser window.
    await form.getByLabel('Cover', { exact: true }).setInputFiles(book.cover)
  }

  await form.getByRole('button', { name: 'Add book', exact: true }).click()
  const outcome = await waitForOutcome(page)

  if (outcome.kind === 'duplicate') {
    const dialog = page.getByRole('alertdialog')
    if (args['confirm-duplicate']) {
      await dialog.getByRole('button', { name: 'Add anyway' }).click()
      const after = await waitForOutcome(page)
      if (after.kind !== 'saved') return { outcome: after.kind, message: after.text, exitCode: 1 }
      return await verify(page, book, after.text, true)
    }
    await dialog.getByRole('button', { name: "Don't add" }).click()
    await form.getByRole('button', { name: 'Cancel', exact: true }).click()
    return { outcome: 'duplicate', message: outcome.text, saved: false, exitCode: 3 }
  }
  if (outcome.kind === 'invalid') {
    const fields = await form.evaluate((root) =>
      [...root.querySelectorAll('[aria-invalid="true"]')].map((input) => ({
        field: input.labels?.[0]?.innerText.replace('(required)', '').trim() || input.getAttribute('aria-label'),
        message: (input.getAttribute('aria-describedby') || '')
          .split(' ')
          .map((id) => document.getElementById(id)?.innerText.trim())
          .filter(Boolean)
          .join(' '),
      })),
    )
    return { outcome: 'invalid', message: outcome.text, fields, exitCode: 1 }
  }
  if (outcome.kind === 'failed') return { outcome: 'failed', message: outcome.text, exitCode: 1 }
  return await verify(page, book, outcome.text, false)
}

async function verify(page, book, message, addedAnyway) {
  await page.getByRole('searchbox', { name: 'Search titles' }).fill(book.title)
  await page.waitForTimeout(500)
  const verified = await page.evaluate(
    (title) =>
      [...document.querySelectorAll('[aria-label]')].some((e) =>
        e.getAttribute('aria-label').startsWith(title + ' by'),
      ),
    book.title,
  )
  return { outcome: 'saved', message, addedAnyway, verified, exitCode: verified ? 0 : 1 }
}

run(async () => {
  const args = parseArgs(process.argv.slice(2))
  if (!args.book) throw new Error('pass --book /abs/path/book.json')
  const book = JSON.parse(fs.readFileSync(args.book, 'utf8'))
  for (const key of ['title', 'pages', 'authors', 'language', 'publisher', 'type'])
    if (!present(book[key])) throw new Error(`book.json lacks the required "${key}"`)
  if (present(book.cover) && !fs.existsSync(book.cover)) throw new Error(`cover file not found: ${book.cover}`)
  return withHeadlessPage((page) => addBook(page, book, args))
})
