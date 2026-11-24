import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefCallback,
} from 'react'
import { useLocation, useNavigate, useNavigationType, useSearchParams } from 'react-router'
import {
  useCachedCardNotesView,
  useCardNotesView,
  useOptionalBookView,
  type BookCardNote,
  type CardNotesGroup,
} from '../api/index.ts'
import BackToTop from '../components/BackToTop.tsx'
import Button from '../components/Button.tsx'
import CardNoteBox from '../components/CardNoteBox.tsx'
import CardNoteItem from '../components/CardNoteItem.tsx'
import FailureMessage from '../components/FailureMessage.tsx'
import PageHeading from '../components/PageHeading.tsx'
import ViewToggle from '../components/ViewToggle.tsx'
import { announce, clearAnnouncements } from '../lib/announce.ts'
import { carryState, useCarriedSearch } from '../lib/carriedSearch.ts'
import {
  boxMatches,
  cardNotesPath,
  NO_CARD_NOTES,
  noNotesMatchCopy,
  noteMatches,
  notePrefill,
  notesMatchCopy,
  scopeChipRemoveName,
  SEARCH_CARD_NOTES,
  shelfCountLine,
} from '../lib/cardNotes.ts'
import {
  CARD_NOTES_VIEWS,
  readCardNotesView,
  writeCardNotesView,
  type CardNotesViewChoice,
} from '../lib/cardNotesView.ts'
import { COULDNT_LOAD } from '../lib/copy.ts'
import { useNavigatedHere, usePageTitle } from '../lib/page.ts'
import { useCardNoteEditFlow, useCardNoteFlow } from '../lib/useCardNoteFlow.tsx'
import { usePileFlow } from '../lib/usePileFlow.tsx'
import { useSearchCount } from '../lib/useSearchCount.ts'
import NotFoundPage from './NotFoundPage.tsx'
import SearchTitles from './SearchTitles.tsx'
import styles from './CardNotesPage.module.css'

const NO_GROUPS: readonly CardNotesGroup[] = []

/** The Card notes view toggle's options: Boxes · List. */
const CARD_NOTES_VIEW_LABELS: Record<CardNotesViewChoice, string> = { boxes: 'Boxes', list: 'List' }
const CARD_NOTES_VIEW_OPTIONS = CARD_NOTES_VIEWS.map((value) => ({ value, label: CARD_NOTES_VIEW_LABELS[value] }))

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

/**
 * One Book's notes under its serif title: an `h2` (focusable by script), then
 * the notes as list items (each its text, its page-ref chip and its Edit),
 * then "Go through as a pile".
 */
function Group({
  group,
  query,
  headingRef,
  editButton,
  onEdit,
  pileOpenerRef,
  onOpenPile,
}: {
  group: CardNotesGroup
  query: string
  headingRef: RefCallback<HTMLHeadingElement>
  editButton: (noteId: string) => RefCallback<HTMLButtonElement>
  onEdit: (note: BookCardNote, bookId: string) => void
  pileOpenerRef: RefCallback<HTMLButtonElement>
  /** Opens the Book's pile at that note, else at the first. */
  onOpenPile: (noteId?: string) => void
}) {
  return (
    // Not a named region: a landmark per Book would bury main and the nav; the h2 heads the group.
    <section className={styles.group}>
      <h2 ref={headingRef} className={styles.groupTitle} tabIndex={-1}>
        {group.title}
      </h2>
      <ul className={styles.notes} role="list">
        {group.notes.map((note) => (
          <CardNoteItem
            key={note.id}
            note={note}
            query={query}
            editRef={editButton(note.id)}
            onEdit={() => onEdit(note, group.bookId)}
            onOpenPile={() => onOpenPile(note.id)}
          />
        ))}
      </ul>
      <p className={styles.pileLink}>
        <button ref={pileOpenerRef} type="button" className="linkButton" onClick={() => onOpenPile()}>
          Go through as a pile
        </button>
      </p>
    </section>
  )
}

/**
 * The Card notes page (EXPERIENCE.md → Card notes list; Story 5.3) at
 * `/card-notes`, scoped to one Book with `?book=<id>`. The `card-notes` view
 * groups the notes by Book (title A→Z) in page order; the page renders the
 * groups in that order, each an `h2` with the Book's serif title, then its
 * notes: the text, the page ref as a chip `button` ("Open p.42 in the
 * pile") and an **Edit** ("Edit p.42") that opens the Card note panel in
 * edit mode (`useCardNoteEditFlow`); then the group's "Go through as a pile".
 *
 * The pile (Story 5.4; `usePileFlow`) holds every note of the Book, in page
 * order, whatever the search shows: "Go through as a pile" opens it at "1 of
 * M", a page-ref chip at that note. Close or Esc returns focus to the last
 * viewed note's Edit if it is shown, else that group's "Go through as a
 * pile", else the `h1`. Scoped, the Book's "Go through as a pile" stays
 * under "No card notes contain “…”." while the search matches nothing.
 *
 * Search card notes (visible label, no placeholder, Esc clears) keeps only
 * the notes whose text contains the query, ignoring case, matches in
 * `<mark>`, and hides groups without a match; about 500 ms after typing
 * pauses `status` reads "N notes match.". No match reads "No card notes
 * contain “…”.".
 *
 * The carried search (Story 14.5; AD-7, `lib/carriedSearch.ts`): the text
 * lives in this route component's state, never in the URL, router state or
 * storage, and the body is keyed by `location.key`. A box link's push (with
 * `openedFrom`, the shelf entry's key) and the chip's push carry the text
 * along; Back from a box lands on its `openedFrom` and brings the box's
 * latest text out. Every other way in (the nav link, another link, Forward,
 * a reload, a typed URL, Back from another page) starts empty, and the text
 * is dropped while the view is settled (ready and not fetching) with no
 * groups. Each entry scrolls to the top, then the `h1` takes focus; a body
 * that mounts with text announces its count once, as the typed path would,
 * once the view is settled, so the count is the notes as they are now, not a
 * stale cached copy. Typing before then drops the carried announcement.
 *
 * Scoped, the "In *X*" chip sits under the `h1`; its remove button ("Remove
 * In *X*") pushes `/card-notes` with the search, and the `h1` takes focus as
 * after any navigation. With no notes the page reads "No card notes yet."
 * with no field; scoped, it adds **Add card note** (`useCardNoteFlow`, Page
 * prefilled from the Book's current page). An unknown or deleted Book in
 * `?book=` shows the not-found page.
 *
 * Unscoped with notes (Story 14.2; EXPERIENCE.md → Card notes shelf), the
 * toolbar adds the remembered Boxes · List toggle (`lib/cardNotesView.ts`,
 * Boxes by default) and, in Boxes view, the count line. Boxes view shows one
 * `CardNoteBox` per group, in the groups' order; List view is the page above.
 *
 * Search on the shelf (Story 14.4): in Boxes view, text in the field keeps
 * every box. A box with matches lifts and shows "3 of 12" in place of its
 * count, a box without one fades, and each box's name carries its match. The
 * count line becomes the shelf sentence ("17 card notes in 4 Books contain
 * “habit”.", or "No card notes contain “…”."), which `status` reads once
 * after the pause in place of "N notes match.". All of it comes from
 * `lib/cardNotes.ts` through `noteMatches`, the List's own matcher.
 *
 * Scoped, the open box (Story 14.3; DESIGN.md → Open box strip) adds an 8px,
 * full-width, `aria-hidden` strip in `scope.spineColor` directly under the
 * app shell, once the view is ready (notes or none); never while loading or
 * under "Couldn't load".
 */
export default function CardNotesPage() {
  const [params] = useSearchParams()
  // An empty `?book=` is unscoped.
  const bookId = params.get('book') || undefined
  const location = useLocation()
  // The same cached query the body reads: the text is dropped while the view is settled with no groups. A
  // stale cached empty view still refetching may be older than the Book's notes, so it doesn't count.
  const view = useCardNotesView(bookId)
  const noGroups = view.status === 'ready' && !view.fetching && view.data.groups.length === 0
  const [query, setQuery] = useCarriedSearch({ noGroups })
  // Each history entry gets a fresh body: a fresh view query, pile, panels, pending count and focus maps.
  return <CardNotesBody key={location.key} bookId={bookId} query={query} onQueryChange={setQuery} />
}

function CardNotesBody({
  bookId,
  query,
  onQueryChange,
}: {
  bookId: string | undefined
  /** The search text, held by the route component so it can be carried between entries. */
  query: string
  onQueryChange: (text: string) => void
}) {
  const view = useCardNotesView(bookId)
  const navigate = useNavigate()
  const location = useLocation()
  const failed = view.status === 'failed'
  const data = view.status === 'ready' ? view.data : undefined
  const groups = data?.groups ?? NO_GROUPS
  const scope = data?.scope ?? null

  const searchRef = useRef<HTMLInputElement | null>(null)
  // No field without notes, so no filter either.
  const shownQuery = groups.length === 0 ? '' : query
  const shown = visibleGroups(groups, shownQuery)

  // The remembered Boxes · List choice (unscoped only). A press switches in place and stays silent.
  const unscoped = bookId === undefined
  const [shelfView, setShelfView] = useState<CardNotesViewChoice>(readCardNotesView)
  const chooseView = (next: CardNotesViewChoice) => {
    setShelfView(next)
    writeCardNotesView(next)
  }
  const boxesShown = unscoped && shelfView === 'boxes'
  // The count line for the view shown: the shelf sentence in Boxes, else "N notes match.".
  const countLine = (text: string) =>
    boxesShown ? shelfCountLine(groups, text) : notesMatchCopy(countNotes(visibleGroups(groups, text)))
  // Read when the pause ends, so it announces the view shown then.
  const count = useSearchCount(countLine)
  // Set once a carried search is announced, or dropped because the user typed first.
  const carriedAnnounced = useRef(false)
  const search = (value: string) => {
    // The typed path speaks after its own pause; a late carried line would speak a second count.
    carriedAnnounced.current = true
    onQueryChange(value)
    count.typed(value)
  }

  // Each entry starts at the top, before `PageHeading`'s passive effect focuses the `h1`.
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [])
  // On a client-side Back or Forward, the browser restores the entry's old scroll position right after the
  // router has rendered it (once the popstate handlers have run), so scroll again when the view is ready and
  // once more on the next frame, before it paints. Only then: on a first load a queued frame could undo a
  // scroll made after the content is shown.
  const navigationType = useNavigationType()
  const { navigated } = useNavigatedHere()
  const [restored] = useState(() => navigated && navigationType === 'POP')
  const ready = view.status === 'ready'
  const scrolledReady = useRef(false)
  useLayoutEffect(() => {
    if (!restored || !ready || scrolledReady.current) return
    window.scrollTo({ top: 0, behavior: 'auto' })
    // Marked done only when the frame runs, so a StrictMode re-run schedules it again.
    const frame = requestAnimationFrame(() => {
      scrolledReady.current = true
      window.scrollTo({ top: 0, behavior: 'auto' })
    })
    return () => cancelAnimationFrame(frame)
  }, [restored, ready])

  // A search carried into this entry is announced once, as the typed path reads it, once the view is
  // settled (ready and not fetching) with groups, so a stale cached copy never speaks; the `h1` has focus
  // by then (child effects run first). The guard is set only when the timer fires, and cleanup cancels
  // the timer, so a StrictMode re-run announces once and an unmount before it fires announces nothing.
  // A panel, the pile or the chip's push cancels a count still waiting, the carried line included.
  const silence = () => {
    count.cancel()
    carriedAnnounced.current = true
  }
  const [carried] = useState(() => query.trim() !== '')
  const settled = ready && !view.fetching
  const carriedLine = carried && settled && groups.length > 0 ? countLine(query) : null
  useEffect(() => {
    if (carriedLine === null || carriedAnnounced.current) return
    const timer = setTimeout(() => {
      if (carriedAnnounced.current) return
      carriedAnnounced.current = true
      announce('status', carriedLine)
    }, 0)
    return () => clearTimeout(timer)
  }, [carriedLine])

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
    find: findEdit,
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
    silence()
    openEditFor(note, id)
  }

  // The pile: every note of the Book (the unfiltered view), whatever the search shows.
  const pileOpeners = useRef(new Map<string, HTMLButtonElement>())
  const pileOpener = useCallback(
    (id: string): RefCallback<HTMLButtonElement> =>
      (element) => {
        if (element) pileOpeners.current.set(id, element)
        else pileOpeners.current.delete(id)
      },
    [],
  )
  const { open: openPileFor, pile } = usePileFlow({
    editButton: findEdit,
    fallback: (id) => pileOpeners.current.get(id) ?? null,
  })
  const openPile = (id: string, noteId?: string) => {
    const full = groups.find((group) => group.bookId === id)
    if (!full) return
    // A count still waiting would speak over the pile.
    silence()
    openPileFor({ bookId: full.bookId, title: full.title, notes: full.notes }, noteId)
  }

  // The couldn't-load line is shown in `main` and set in the shell's alert; it clears once the view loads.
  useEffect(() => {
    if (!failed) return
    announce('alert', COULDNT_LOAD)
    return clearAnnouncements
  }, [failed])

  if (view.status === 'missing') return <NotFoundPage />

  return (
    <CardNotesFrame stripColor={view.status === 'ready' && scope !== null ? scope.spineColor : null}>
      {content()}
    </CardNotesFrame>
  )

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
                silence()
                // The search goes along to the wider view (Story 14.5).
                void navigate(cardNotesPath(), { state: carryState() })
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
                  silence()
                  openAdd()
                }}
              >
                Add card note
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className={styles.toolbar}>
              <SearchTitles label={SEARCH_CARD_NOTES} value={query} onChange={search} inputRef={searchRef} />
              {unscoped && (
                <ViewToggle
                  label="Card notes view"
                  options={CARD_NOTES_VIEW_OPTIONS}
                  value={shelfView}
                  onChange={chooseView}
                />
              )}
              {boxesShown && <p className={styles.countLine}>{shelfCountLine(groups, shownQuery)}</p>}
            </div>
            {boxesShown ? (
              <ul className={styles.shelf} role="list">
                {groups.map((group) => (
                  <li key={group.bookId}>
                    <CardNoteBox
                      bookId={group.bookId}
                      title={group.title}
                      spineColor={group.spineColor}
                      count={group.notes.length}
                      matches={boxMatches(group.notes, shownQuery)}
                      linkState={carryState(location.key)}
                    />
                  </li>
                ))}
              </ul>
            ) : shown.length === 0 ? (
              <>
                <p className={styles.none}>{noNotesMatchCopy(query)}</p>
                {/* Scoped to one Book with notes: its pile stays reachable while the search matches nothing. */}
                {scope !== null && (
                  <p className={styles.pileLink}>
                    <button
                      ref={pileOpener(scope.bookId)}
                      type="button"
                      className="linkButton"
                      onClick={() => openPile(scope.bookId)}
                    >
                      Go through as a pile
                    </button>
                  </p>
                )}
              </>
            ) : (
              shown.map((group) => (
                <Group
                  key={group.bookId}
                  group={group}
                  query={shownQuery}
                  headingRef={groupHeading(group.bookId)}
                  editButton={editButton}
                  onEdit={openEdit}
                  pileOpenerRef={pileOpener(group.bookId)}
                  onOpenPile={(noteId) => openPile(group.bookId, noteId)}
                />
              ))
            )}
          </>
        )}
        {addPanel}
        {editPanel}
        {pile}
        {groups.length > 0 && <BackToTop targetRef={searchRef} />}
      </>
    )
  }
}

/**
 * The page frame: the title and the `h1`, whatever the view's state. With a
 * `stripColor` (the open box once its view is ready), the open box strip comes
 * first, above `.page`'s padding and outside its `page-x` inset.
 */
function CardNotesFrame({ children, stripColor }: { children: ReactNode; stripColor: string | null }) {
  usePageTitle('Card notes')
  const stripStyle: (CSSProperties & Record<'--strip-color', string>) | null =
    stripColor === null ? null : { '--strip-color': stripColor }
  return (
    <>
      {stripStyle !== null && <div className={styles.strip} aria-hidden="true" style={stripStyle} />}
      <div className={styles.page}>
        <PageHeading className={styles.title}>Card notes</PageHeading>
        {children}
      </div>
    </>
  )
}
