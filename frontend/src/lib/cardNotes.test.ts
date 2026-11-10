import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  BLOCK_NOTES,
  CARD_NOTE_SAVED,
  cardNotesHeading,
  editNoteName,
  NO_CARD_NOTES,
  noteAfterDelete,
  notePrefill,
  pageField,
  pageRef,
} from './cardNotes.ts'

describe('pageRef', () => {
  it('shows one page as p.N', () => {
    assert.equal(pageRef(42, null), 'p.42')
  })

  it('shows a range as pp.N–M with an en dash', () => {
    assert.equal(pageRef(42, 45), 'pp.42–45')
  })
})

describe('notePrefill', () => {
  it('prefills the current page', () => {
    assert.equal(notePrefill(212), '212')
  })

  it('prefills at least 1', () => {
    assert.equal(notePrefill(0), '1')
  })

  it('is empty without a current Reading', () => {
    assert.equal(notePrefill(null), '')
  })
})

describe('cardNotesHeading', () => {
  it('counts the notes', () => {
    assert.equal(cardNotesHeading(4), 'Card notes (4)')
    assert.equal(cardNotesHeading(1), 'Card notes (1)')
  })

  it('has no count with none', () => {
    assert.equal(cardNotesHeading(0), 'Card notes')
  })
})

describe('copy', () => {
  it('pins the lines', () => {
    assert.equal(CARD_NOTE_SAVED, 'Card note saved.')
    assert.equal(NO_CARD_NOTES, 'No card notes yet.')
    assert.equal(BLOCK_NOTES, 3)
  })
})

describe('pageField', () => {
  it('prefills one page as its number', () => {
    assert.equal(pageField(96, null), '96')
  })

  it('prefills a range with an en dash and no prefix', () => {
    assert.equal(pageField(42, 45), '42–45')
  })
})

describe('editNoteName', () => {
  it('names the Edit by its page ref', () => {
    assert.equal(editNoteName(96, null), 'Edit p.96')
    assert.equal(editNoteName(42, 45), 'Edit pp.42–45')
  })
})

describe('noteAfterDelete', () => {
  it('takes the note now shown where the deleted one was', () => {
    assert.equal(noteAfterDelete(['a', 'c', 'd'], 1), 'c')
  })

  it('is null when no note comes after the deleted one', () => {
    assert.equal(noteAfterDelete(['a', 'b'], 2), null)
  })

  it('is null when no note is left', () => {
    assert.equal(noteAfterDelete([], 0), null)
  })
})
