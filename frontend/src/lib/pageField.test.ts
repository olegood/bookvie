import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { pageRangeMessage, pageSavedCopy, parsePage } from './pageField.ts'

describe('the page field', () => {
  it('takes a whole number from 0 to the page count, a lower one and 0 included', () => {
    assert.equal(parsePage('212', 330), 212)
    assert.equal(parsePage(' 0 ', 330), 0)
    assert.equal(parsePage('330', 330), 330)
    assert.equal(parsePage('007', 330), 7)
  })

  it('refuses empty, fractional, negative, too-large and non-numeric values', () => {
    for (const typed of ['', '   ', '212.5', '212.0', '-1', '331', '1e2', 'abc', '+5']) {
      assert.equal(parsePage(typed, 330), null, typed)
    }
  })

  it('words the range message and the saved line', () => {
    assert.equal(pageRangeMessage(330), 'Page must be between 0 and 330.')
    assert.equal(pageSavedCopy(212, 330, 64), 'Page 212 of 330, 64%.')
    assert.equal(pageSavedCopy(330, 330, 100), 'Page 330 of 330, 100%.')
  })
})

// The same table backend/tests/test_update_page.py reads: the pre-check must
// accept and refuse exactly what update-page does, with the server's copy.
const cases = JSON.parse(readFileSync(new URL('./pageField.cases.json', import.meta.url), 'utf8')) as {
  pages: number
  accepted: number[]
  refused: number[]
  messages: Record<string, string>
}

describe('the page field agrees with update-page', () => {
  it('accepts and refuses the shared cases', () => {
    for (const page of cases.accepted) assert.equal(parsePage(String(page), cases.pages), page, String(page))
    for (const page of cases.refused) assert.equal(parsePage(String(page), cases.pages), null, String(page))
  })

  it('words the range message as the server does', () => {
    for (const [pages, message] of Object.entries(cases.messages)) {
      assert.equal(pageRangeMessage(Number(pages)), message, pages)
    }
  })
})
