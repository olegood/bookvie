import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  BLOCK_NOTES,
  blockNotes,
  CARD_NOTE_SAVED,
  cardNotesHeading,
  cardNotesPath,
  highlightParts,
  noNotesMatchCopy,
  noteMatches,
  notesMatchCopy,
  scopeChipRemoveName,
  seeCardNotesLabel,
  seeCardNotesName,
  editNoteName,
  NO_CARD_NOTES,
  noteAfterDelete,
  notePrefill,
  pageField,
  pageRef,
  openInPileName,
  pileAnnouncement,
  pilePosition,
  pileStart,
  shuffled,
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

describe('blockNotes', () => {
  const notes = [{ text: 'Alpha' }, { text: 'beta' }, { text: 'Gamma' }, { text: 'alphabet' }, { text: 'Delta' }]

  it('shows the first three with an empty or whitespace query', () => {
    assert.deepEqual(blockNotes(notes, ''), notes.slice(0, 3))
    assert.deepEqual(blockNotes(notes, '   '), notes.slice(0, 3))
  })

  it('shows every match with a query, ignoring case', () => {
    assert.deepEqual(blockNotes(notes, 'ALPHA'), [notes[0], notes[3]])
    assert.deepEqual(blockNotes(notes, 'a'), notes)
  })

  it('shows nothing when no note matches', () => {
    assert.deepEqual(blockNotes(notes, 'zeta'), [])
  })

  it('trims the query and keeps page order', () => {
    assert.deepEqual(blockNotes(notes, '  alpha '), [notes[0], notes[3]])
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

describe('noteMatches', () => {
  it('matches a substring ignoring case', () => {
    assert.equal(noteMatches('On the Ice, alone.', 'ICE'), true)
    assert.equal(noteMatches('Fear is the mind-killer.', 'ice'), false)
  })

  it('matches regex characters literally', () => {
    assert.equal(noteMatches('See p.4(2) here', 'p.4('), true)
    assert.equal(noteMatches('See p442 here', 'p.4'), false)
  })

  it('filters nothing on a blank query, and trims the query', () => {
    assert.equal(noteMatches('Anything', '   '), true)
    assert.equal(noteMatches('Anything', ''), true)
    assert.equal(noteMatches('The spice', '  spice '), true)
  })
})

describe('highlightParts', () => {
  it('marks each match in the note’s own casing', () => {
    assert.deepEqual(highlightParts('Ice and ice', 'ICE'), [
      { text: 'Ice', mark: true },
      { text: ' and ', mark: false },
      { text: 'ice', mark: true },
    ])
  })

  it('keeps the text around a match', () => {
    assert.deepEqual(highlightParts('On the Ice, alone.', 'ice'), [
      { text: 'On the ', mark: false },
      { text: 'Ice', mark: true },
      { text: ', alone.', mark: false },
    ])
  })

  it('matches regex characters literally', () => {
    assert.deepEqual(highlightParts('a.b(c) a*b', '.b('), [
      { text: 'a', mark: false },
      { text: '.b(', mark: true },
      { text: 'c) a*b', mark: false },
    ])
  })

  it('gives the whole text unmarked on a blank query or no match', () => {
    assert.deepEqual(highlightParts('Fear', '  '), [{ text: 'Fear', mark: false }])
    assert.deepEqual(highlightParts('Fear', 'zzz'), [{ text: 'Fear', mark: false }])
  })

  it('marks a match that is the whole text', () => {
    assert.deepEqual(highlightParts('spice', 'SPICE'), [{ text: 'spice', mark: true }])
  })

  it('marks nothing rather than the wrong letters when lower-casing changes the length', () => {
    // 'İ'.toLowerCase() is two code units, so an index into the lower-cased text would land one letter late.
    assert.deepEqual(highlightParts('İstanbul', 'stan'), [{ text: 'İstanbul', mark: false }])
  })
})

describe('search copy', () => {
  it('counts notes, singular for one', () => {
    assert.equal(notesMatchCopy(2), '2 notes match.')
    assert.equal(notesMatchCopy(1), '1 note matches.')
    assert.equal(notesMatchCopy(0), '0 notes match.')
  })

  it('quotes the trimmed query with curly quotes when nothing matches', () => {
    assert.equal(noNotesMatchCopy('  zzz '), 'No card notes contain “zzz”.')
  })
})

describe('the links into the Card notes page', () => {
  it('labels and names the Main book card’s count link', () => {
    assert.equal(seeCardNotesLabel(7), 'See card notes · 7')
    assert.equal(seeCardNotesName(7), 'See card notes, 7 notes')
    assert.equal(seeCardNotesName(1), 'See card notes, 1 note')
    assert.equal(seeCardNotesLabel(0), 'See card notes')
    assert.equal(seeCardNotesName(0), 'See card notes')
  })

  it('routes to the scoped or unscoped page', () => {
    assert.equal(cardNotesPath(), '/card-notes')
    assert.equal(cardNotesPath('abc-1'), '/card-notes?book=abc-1')
  })

  it('names the scope chip’s remove button', () => {
    assert.equal(scopeChipRemoveName('Dune'), 'Remove In Dune')
  })
})

describe('the pile', () => {
  const notes = [
    { id: 'a', text: 'Fear is the mind-killer.', pageStart: 12, pageEnd: null },
    { id: 'b', text: 'A beginning is the time.', pageStart: 42, pageEnd: 45 },
    { id: 'c', text: 'The spice must flow.', pageStart: 96, pageEnd: null },
    { id: 'd', text: 'The mystery of life.', pageStart: 300, pageEnd: null },
  ]

  it('names a page-ref chip for one page or a range', () => {
    assert.equal(openInPileName(42, null), 'Open p.42 in the pile')
    assert.equal(openInPileName(42, 45), 'Open pp.42–45 in the pile')
  })

  it("reads the pile's place", () => {
    assert.equal(pilePosition(2, 4), '2 of 4')
  })

  it('announces a move with the page ref and the text, adding no period', () => {
    assert.equal(pileAnnouncement(1, 4, notes[0]!), 'Note 1 of 4, p.12: Fear is the mind-killer.')
    assert.equal(pileAnnouncement(2, 4, notes[1]!), 'Note 2 of 4, pp.42–45: A beginning is the time.')
    assert.equal(pileAnnouncement(1, 1, { ...notes[0]!, text: 'no period' }), 'Note 1 of 1, p.12: no period')
  })

  it('starts at the note’s index among all of them, else 0', () => {
    assert.equal(pileStart(notes), 0)
    assert.equal(pileStart(notes, 'c'), 2)
    assert.equal(pileStart(notes, 'd'), 3)
    assert.equal(pileStart(notes, 'gone'), 0)
    assert.equal(pileStart([], 'a'), 0)
  })

  it('shuffles into a permutation of a copy, leaving the input untouched', () => {
    const before = [...notes]
    const result = shuffled(notes)
    assert.deepEqual(notes, before)
    assert.notEqual(result, notes)
    assert.deepEqual(
      result.map((note) => note.id).sort(),
      notes.map((note) => note.id),
    )
  })

  it('is deterministic with an injected source', () => {
    const source = () => {
      let calls = 0
      return () => [0.1, 0.7, 0.3][calls++ % 3]!
    }
    const first = shuffled(notes, source()).map((note) => note.id)
    const second = shuffled(notes, source()).map((note) => note.id)
    assert.deepEqual(first, second)
    // i=3: j=floor(0.1*4)=0 → d b c a; i=2: j=floor(0.7*3)=2 → same; i=1: j=floor(0.3*2)=0 → b d c a
    assert.deepEqual(first, ['b', 'd', 'c', 'a'])
  })

  it('keeps an empty or one-note pile as it is', () => {
    assert.deepEqual(shuffled([]), [])
    assert.deepEqual(
      shuffled([notes[0]!], () => 0.99),
      [notes[0]],
    )
  })
})
