import { useCallback, useEffect, useId, useRef, useState, type ReactNode, type RefCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import {
  useCachedCardNotesView,
  useCardNotesView,
  useOptionalBookView,
  type BookCardNote,
  type CardNotesGroup,
} from '../api/index.ts'
import Button from '../components/Button.tsx'
import FailureMessage from '../components/FailureMessage.tsx'
import MarkedText from '../components/MarkedText.tsx'
import PageHeading from '../components/PageHeading.tsx'
import { announce, clearAnnouncements } from '../lib/announce.ts'
import {
  cardNotesPath,
  editNoteName,
  NO_CARD_NOTES,
  noNotesMatchCopy,
  noteMatches,
  notePrefill,
  notesMatchCopy,
  pageRef,
  scopeChipRemoveName,
  SEARCH_CARD_NOTES,
} from '../lib/cardNotes.ts'
import { COULDNT_LOAD } from '../lib/copy.ts'
import { usePageTitle } from '../lib/page.ts'
import { useCardNoteEditFlow, useCardNoteFlow } from '../lib/useCardNoteFlow.tsx'
import { useSearchCount } from '../lib/useSearchCount.ts'
import NotFoundPage from './NotFoundPage.tsx'
import SearchTitles from './SearchTitles.tsx'
import styles from './CardNotesPage.module.css'

const NO_GROUPS: readonly CardNotesGroup[] = []

/** The groups with only the notes matching `query`; a group without a match is left out. */
function visibleGroups(groups: readonly CardNotesGroup[], query: string): readonly CardNotesGroup[] {
  if (query.trim() === '') return groups
  return groups
    .map((group) => ({ ...group, notes: group.notes.filter((note) => noteMatches(note.text, query)) }))
    .filter((group) => group.notes.length > 0)
}

function countNotes(groups: readonly CardNotesGroup[]): number {
  return groups.reduce((total, group) => total + group.notes.length, 0)
}

/** One Book's notes under its serif title: an `h2` (focusable by script), then the notes as list items. */
function Group({
  group,
  query,
  headingRef,
  editButton,
  onEdit,
}: {
  group: CardNotesGroup
  query: string
  headingRef: RefCallback<HTMLHeadingElement>
  editButton: (noteId: string) => RefCallback<HTMLButtonElement>
  onEdit: (note: BookCardNote, bookId: string) => void
}) {
  const headingId = useId()
  return (
    <section className={styles.group} aria-labelledby={headingId}>
      <h2 ref={headingRef} id={headingId} className={styles.groupTitle} tabIndex={-1}>
        {group.title}
      </h2>
      <ul className={styles.notes} role="list">
        {group.notes.map((note) => (
          <li key={note.id} className={styles.note}>
            <p className={styles.noteText}>
              <MarkedText text={note.text} query={query} />
            </p>
            <p className={styles.pageRef}>{pageRef(note.pageStart, note.pageEnd)}</p>
            <Button
              ref={editButton(note.id)}
              className={styles.noteEdit}
              aria-label={editNoteName(note.pageStart, note.pageEnd)}
              onClick={() => onEdit(note, group.bookId)}
            >
              Edit
            </Button>
          </li>
        ))}
      </ul>
    </section>
  )
}

/**
 * The Card notes page (EXPERIENCE.md → Card notes list; Story 5.3) at
 * `/card-notes`, scoped to one Book with `?book=<id>`. The `card-notes` view
 * groups the notes by Book (title A→Z) in page order; the page renders the
 * groups in that order, each an `h2` with the Book's serif title, then its
 * notes: the text, the page ref as plain text and an **Edit** ("Edit p.42")
 * that opens the Card note panel in edit mode (`useCardNoteEditFlow`).
 *
 * Search card notes (visible label, no placeholder, Esc clears) keeps only
 * the notes whose text contains the query, ignoring case, matches in
 * `<mark>`, and hides groups without a match; about 500 ms after typing
 * pauses `status` reads "N notes match.". No match reads "No card notes
 * contain “…”.". The search lives in this page's state, never in the URL.
 *
 * Scoped, the "In *X*" chip sits under the `h1`; its remove button ("Remove
 * In *X*") pushes `/card-notes`, and the `h1` takes focus as after any
 * navigation. With no notes the page reads "No card notes yet." with no
 * field; scoped, it adds **Add card note** (`useCardNoteFlow`, Page
 * prefilled from the Book's current page). An unknown or deleted Book in
 * `?book=` shows the not-found page.
 */
export default function CardNotesPage() {
  const [params] = useSearchParams()
  // An empty `?book=` is unscoped.
  const bookId = params.get('book') || undefined
  // A new scope (Remove In X, Back, Forward, a link) starts with an empty search and no pending count.
  return <CardNotesBody key={bookId ?? ''} bookId={bookId} />
}

function CardNotesBody({ bookId }: { bookId: string | undefined }) {
  const view = useCardNotesView(bookId)
  const navigate = useNavigate()
  const failed = view.status === 'failed'
  const data = view.status === 'ready' ? view.data : undefined
  const groups = data?.groups ?? NO_GROUPS
  const scope = data?.scope ?? null

  const [query, setQuery] = useState('')
  // No field without notes, so no filter either.
  const shownQuery = groups.length === 0 ? '' : query
  const shown = visibleGroups(groups, shownQuery)

  const count = useSearchCount((text) => notesMatchCopy(countNotes(visibleGroups(groups, text))))
  const search = (value: string) => {
    setQuery(value)
    count.typed(value)
  }

  // The scoped empty view's Add card note: Page prefilled from the Book's current page.
  const scopedEmpty = scope !== null && groups.length === 0
  const scopedBook = useOptionalBookView(scopedEmpty ? scope.bookId : undefined)
  const {
    button: addButton,
    open: openAdd,
    panel: addPanel,
  } = useCardNoteFlow({
    bookId: scope?.bookId ?? null,
    initialPage: notePrefill(scopedBook?.currentReading?.currentPage ?? null),
  })

  const groupHeadings = useRef(new Map<string, HTMLHeadingElement>())
  const groupHeading = useCallback(
    (id: string): RefCallback<HTMLHeadingElement> =>
      (element) => {
        if (element) groupHeadings.current.set(id, element)
        else groupHeadings.current.delete(id)
      },
    [],
  )
  const cachedView = useCachedCardNotesView()
  const {
    editButton,
    open: openEditFor,
    panel: editPanel,
  } = useCardNoteEditFlow({
    shownIds: (id) => shown.find((group) => group.bookId === id)?.notes.map((note) => note.id) ?? [],
    // The view object as cached, so focus waits for the refetch to render.
    source: data,
    cached: () => cachedView(bookId),
    fallback: (id) => groupHeadings.current.get(id) ?? null,
  })
  const openEdit = (note: BookCardNote, id: string) => {
    // A count still waiting would empty the panel's regions.
    count.cancel()
    openEditFor(note, id)
  }

  // The couldn't-load line is shown in `main` and set in the shell's alert; it clears once the view loads.
  useEffect(() => {
    if (!failed) return
    announce('alert', COULDNT_LOAD)
    return clearAnnouncements
  }, [failed])

  if (view.status === 'missing') return <NotFoundPage />

  return <CardNotesFrame>{content()}</CardNotesFrame>

  function content() {
    if (view.status === 'loading') return null
    if (view.status === 'failed') {
      const { retry } = view
      // Retrying shows the loading state, which unmounts this button; park focus on `main` first.
      const tryAgain = () => {
        document.getElementById('main')?.focus()
        retry()
      }
      return (
        <div className={styles.failure}>
          <FailureMessage>{COULDNT_LOAD}</FailureMessage>
          <Button onClick={tryAgain}>Try again</Button>
        </div>
      )
    }
    return (
      <>
        {scope !== null && (
          <div className={styles.chip}>
            <span>
              In <em className={styles.chipTitle}>{scope.title}</em>
            </span>
            <button
              type="button"
              className={styles.chipRemove}
              aria-label={scopeChipRemoveName(scope.title)}
              onClick={() => {
                count.cancel()
                void navigate(cardNotesPath())
              }}
            >
              <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        )}
        {groups.length === 0 ? (
          <div className={styles.empty}>
            <p className={styles.none}>{NO_CARD_NOTES}</p>
            {scope !== null && (
              <Button
                ref={addButton}
                onClick={() => {
                  count.cancel()
                  openAdd()
                }}
              >
                Add card note
              </Button>
            )}
          </div>
        ) : (
          <>
            <SearchTitles label={SEARCH_CARD_NOTES} value={query} onChange={search} />
            {shown.length === 0 ? (
              <p className={styles.none}>{noNotesMatchCopy(query)}</p>
            ) : (
              shown.map((group) => (
                <Group
                  key={group.bookId}
                  group={group}
                  query={shownQuery}
                  headingRef={groupHeading(group.bookId)}
                  editButton={editButton}
                  onEdit={openEdit}
                />
              ))
            )}
          </>
        )}
        {addPanel}
        {editPanel}
      </>
    )
  }
}

/** The page frame: the title and the `h1`, whatever the view's state. */
function CardNotesFrame({ children }: { children: ReactNode }) {
  usePageTitle('Card notes')
  return (
    <div className={styles.page}>
      <PageHeading className={styles.title}>Card notes</PageHeading>
      {children}
    </div>
  )
}
