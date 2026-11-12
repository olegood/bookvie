import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router'
import { useCatalogView, type LibraryMeter, type ShelfBook } from '../api/index.ts'
import Button from '../components/Button.tsx'
import FailureMessage from '../components/FailureMessage.tsx'
import FilterChips from '../components/FilterChips.tsx'
import PageHeading from '../components/PageHeading.tsx'
import PaceCalculator from '../components/PaceCalculator.tsx'
import SortSelect from '../components/SortSelect.tsx'
import ViewToggle from '../components/ViewToggle.tsx'
import { announce, clearAnnouncements } from '../lib/announce.ts'
import { deleteHandled, deletedTitle, markDeleteHandled } from '../lib/bookDetail.ts'
import { matchCountCopy, matchesTitle, noMatchCopy, sortBooks } from '../lib/catalog.ts'
import {
  filterValues,
  filtersOn,
  liveFilters,
  matchesFilters,
  NO_FILTERS,
  type CatalogFilters,
} from '../lib/catalogFilter.ts'
import { readCatalogSort, writeCatalogSort, type CatalogSortKey } from '../lib/catalogSort.ts'
import { readCatalogView, writeCatalogView, type CatalogViewChoice } from '../lib/catalogView.ts'
import { COULDNT_LOAD } from '../lib/copy.ts'
import { usePageTitle } from '../lib/page.ts'
// The count is announced once typing pauses, after the same pause as Search card notes.
import { SEARCH_PAUSE_MS } from '../lib/useSearchCount.ts'
import Bookcase, { MeterBar } from './Bookcase.tsx'
import shelf from './Bookcase.module.css'
import CatalogList from './CatalogList.tsx'
import NewBookPanel from './NewBookPanel.tsx'
import SearchTitles from './SearchTitles.tsx'
import styles from './CatalogPage.module.css'

export const EMPTY_SHELF = 'Your shelf is empty. Add your first book.'
const NO_FILTER_MATCH = 'No books match these filters.'
const EMPTY_PLANKS = 3
// DESIGN.md → Highlight ring: how long the new spine or row keeps it.
const HIGHLIGHT_MS = 2000

const NO_BOOKS: readonly ShelfBook[] = []

/** Router state that opens the New book panel on arrival (Home's empty state sends it). */
export type NewBookState = { newBook: true }

function wantsNewBook(state: unknown): boolean {
  return typeof state === 'object' && state !== null && (state as Partial<NewBookState>).newBook === true
}

/**
 * Drops `newBook` from this history entry without a navigation (which would
 * move focus to the `h1`), so Back, Forward or a reload don't reopen the panel.
 * React Router keeps its state under `usr`.
 */
function clearNewBookState(): void {
  const entry: unknown = window.history.state
  if (typeof entry !== 'object' || entry === null) return
  const { usr, ...rest } = entry as { usr?: unknown }
  if (!wantsNewBook(usr)) return
  window.history.replaceState({ ...rest, usr: null }, '')
}

/** The bare planks and "Your shelf is empty. Add your first book." (Catalog and Home). */
export function EmptyShelf() {
  return (
    <section className={shelf.card} aria-label="Bookcase">
      <div className={shelf.emptyRows}>
        {Array.from({ length: EMPTY_PLANKS }, (_, row) => (
          <div key={row} className={shelf.row}>
            {row === 0 && <p className={shelf.empty}>{EMPTY_SHELF}</p>}
            <div className={shelf.plank} />
          </div>
        ))}
      </div>
    </section>
  )
}

/** The ids of the Books that pass Search titles and the filters, in `books`' order. */
function shownIds(books: readonly ShelfBook[], query: string, filters: CatalogFilters): Set<string> {
  return new Set(
    books.filter((book) => matchesTitle(book.title, query) && matchesFilters(book, filters)).map((book) => book.id),
  )
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * The library meter and the collapsed "How long until…?" link on one row
 * (DESIGN.md → Catalog, EXPERIENCE.md → Pace calculator), above the bookcase
 * or list in both views. Activating the link expands Story 6.1's calculator
 * inline below the row, counting down the whole library's pages left (FR-15
 * library scope). It starts collapsed on every visit.
 */
function LibraryPace({
  meter,
  pagesLeft,
  measuredPace,
}: {
  meter: LibraryMeter
  pagesLeft: number
  measuredPace: number | null
}) {
  const [expanded, setExpanded] = useState(false)
  const calculatorId = useId()
  return (
    <div className={styles.pace}>
      <div className={styles.paceRow}>
        <MeterBar meter={meter} />
        <button
          type="button"
          className={`linkButton ${styles.paceToggle}`}
          aria-expanded={expanded}
          aria-controls={expanded ? calculatorId : undefined}
          onClick={() => setExpanded((open) => !open)}
        >
          How long until…?
        </button>
      </div>
      {expanded && (
        <div id={calculatorId}>
          <PaceCalculator pagesLeft={pagesLeft} measuredPace={measuredPace} />
        </div>
      )}
    </div>
  )
}

export default function CatalogPage() {
  usePageTitle('Catalog')
  const view = useCatalogView()
  const failed = view.status === 'failed'
  const books = view.status === 'ready' ? view.data.books : NO_BOOKS
  const [sortKey, setSortKey] = useState<CatalogSortKey>(readCatalogSort)
  // Re-applied to every refetch, never stored as a derived copy.
  const sorted = useMemo(() => sortBooks(books, sortKey), [books, sortKey])

  const location = useLocation()
  // Read once: arriving from Home's empty state opens the panel.
  const [panelOpen, setPanelOpen] = useState(() => wantsNewBook(location.state))
  const [query, setQuery] = useState('')
  // Not remembered: plain page state, so leaving Catalog or reloading turns them off.
  const [rawFilters, setFilters] = useState<CatalogFilters>(NO_FILTERS)
  // The values in this view, each once ignoring case, in collator order.
  const languages = useMemo(() => filterValues(books.map((book) => book.language)), [books])
  const tags = useMemo(() => filterValues(books.flatMap((book) => book.tags)), [books])
  // A checked value no Book has any more is ignored by matching and the chip count.
  const filters = useMemo(() => liveFilters(rawFilters, languages, tags), [rawFilters, languages, tags])
  const shown = useMemo(() => shownIds(sorted, query, filters), [sorted, query, filters])
  const [catalogView, setCatalogView] = useState<CatalogViewChoice>(readCatalogView)
  const [added, setAdded] = useState<{ id: string; title: string } | null>(null)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  // The new Book's spine or title cell, whichever view is showing.
  const focusTargets = useRef(new Map<string, HTMLElement>())
  const searchRef = useRef<HTMLInputElement | null>(null)
  const newBookRef = useRef<HTMLButtonElement | null>(null)
  const readChipRef = useRef<HTMLButtonElement | null>(null)
  const deleted = deletedTitle(location.state)
  // The location key whose delete hand-off this mount has handled; across
  // remounts and reloads, sessionStorage remembers (deleteHandled).
  const handledDelete = useRef<string | null>(null)
  const countTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  // What the pending count reads when it fires.
  const latest = useRef({ sorted, query, filters })
  useEffect(() => {
    latest.current = { sorted, query, filters }
  })

  const cancelCount = () => {
    clearTimeout(countTimer.current)
    countTimer.current = undefined
  }

  // The couldn't-load line is shown in `main` and set in the shell's alert;
  // it clears once the view loads.
  useEffect(() => {
    if (!failed) return
    announce('alert', COULDNT_LOAD)
    return clearAnnouncements
  }, [failed])

  useEffect(() => cancelCount, [])

  useEffect(clearNewBookState, [])

  // After an add: the refetched view has rendered, so scroll the new spine
  // or row into view, focus it, ring it, and only then announce.
  useEffect(() => {
    if (!added) return
    const target = focusTargets.current.get(added.id)
    if (!target) return
    setAdded(null)
    // Scroll the slot, not the spine: a list item is one full row high, so
    // a spine whose measured height hasn't committed yet still lands in view.
    const slot = target.closest('li') ?? target
    slot.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
    target.focus({ preventScroll: true })
    setHighlightId(added.id)
    announce('status', `Added ${added.title}.`)
  }, [added, sorted])

  // After a delete on Book detail: focus Search titles (the empty state's New
  // book when no Book is left), then announce. This runs after PageHeading's
  // own focus effect, so it wins over the `h1`.
  const ready = view.status === 'ready'
  useEffect(() => {
    if (deleted === null || !ready || handledDelete.current === location.key) return
    handledDelete.current = location.key
    // Back to this entry, or a reload of it, keeps focus and stays quiet.
    if (deleteHandled(location.key)) return
    markDeleteHandled(location.key)
    const target = searchRef.current ?? newBookRef.current
    target?.focus()
    announce('status', `Deleted ${deleted}.`)
  }, [deleted, ready, location.key])

  useEffect(() => {
    if (highlightId === null) return
    const timer = setTimeout(() => setHighlightId(null), HIGHLIGHT_MS)
    return () => clearTimeout(timer)
  }, [highlightId])

  if (view.status === 'loading') return null

  if (view.status === 'failed') {
    const { retry } = view
    // Retrying shows the loading state, which unmounts this button; park
    // focus on `main` first so it doesn't fall to `body`.
    const tryAgain = () => {
      document.getElementById('main')?.focus()
      retry()
    }
    return (
      <div className={styles.page}>
        <PageHeading className={styles.title}>Catalog</PageHeading>
        <div className={styles.failure}>
          <FailureMessage>{COULDNT_LOAD}</FailureMessage>
          <Button onClick={tryAgain}>Try again</Button>
        </div>
      </div>
    )
  }

  const search = (value: string) => {
    setQuery(value)
    cancelCount()
    if (value.trim() === '') return
    countTimer.current = setTimeout(() => {
      countTimer.current = undefined
      const { sorted: current, query: text, filters: on } = latest.current
      announce('status', matchCountCopy(shownIds(current, text, on).size))
    }, SEARCH_PAUSE_MS)
  }

  // A filter change announces the count at once (search AND filters).
  const changeFilters = (next: CatalogFilters) => {
    cancelCount()
    setFilters(next)
    announce('status', matchCountCopy(shownIds(sorted, query, liveFilters(next, languages, tags)).size))
  }

  // Either Clear filters: every chip off, the search kept, focus to Read (the link goes away).
  const clearFilters = () => {
    changeFilters(NO_FILTERS)
    readChipRef.current?.focus()
  }

  const openPanel = () => {
    // A count still waiting would empty the panel's regions.
    cancelCount()
    setPanelOpen(true)
  }

  const onSaved = (id: string, title: string) => {
    // Clear a search or filters that could hide the new Book, then close the panel.
    cancelCount()
    setQuery('')
    setFilters(NO_FILTERS)
    setPanelOpen(false)
    setAdded({ id, title })
  }

  const chooseView = (next: CatalogViewChoice) => {
    setCatalogView(next)
    writeCatalogView(next)
  }

  // A failed write still re-sorts for this visit.
  const chooseSort = (next: CatalogSortKey) => {
    setSortKey(next)
    writeCatalogSort(next)
  }

  const empty = view.data.books.length === 0
  const filtering = filtersOn(filters)
  // The search alone matching nothing keeps its own line; otherwise the filters' line and link.
  const searchMatches = sorted.some((book) => matchesTitle(book.title, query))
  const noMatch = searchMatches ? (
    <>
      <span>{NO_FILTER_MATCH}</span>{' '}
      <button type="button" className="linkButton" onClick={clearFilters}>
        Clear filters
      </button>
    </>
  ) : (
    noMatchCopy(query)
  )
  return (
    <div className={styles.page}>
      <PageHeading className={styles.title}>Catalog</PageHeading>
      <div className={styles.toolbar}>
        {!empty && <SearchTitles value={query} onChange={search} inputRef={searchRef} />}
        {!empty && <SortSelect value={sortKey} onChange={chooseSort} />}
        {!empty && <ViewToggle value={catalogView} onChange={chooseView} />}
        <Button ref={newBookRef} variant="primary" className={styles.newBook} onClick={openPanel}>
          New book
        </Button>
      </div>
      {!empty && (
        <FilterChips
          filters={filters}
          languages={languages}
          tags={tags}
          onChange={changeFilters}
          onClear={clearFilters}
          on={filtering}
          readRef={readChipRef}
        />
      )}
      {!empty && (
        <LibraryPace meter={view.data.meter} pagesLeft={view.data.pagesLeft} measuredPace={view.data.measuredPace} />
      )}
      {empty ? (
        <EmptyShelf />
      ) : catalogView === 'bookcase' ? (
        <Bookcase
          books={sorted}
          shown={shown}
          noMatch={noMatch}
          highlightId={highlightId}
          focusTargets={focusTargets}
          searchRef={searchRef}
        />
      ) : (
        <CatalogList
          books={sorted}
          shown={shown}
          noMatch={noMatch}
          highlightId={highlightId}
          focusTargets={focusTargets}
        />
      )}
      {panelOpen && <NewBookPanel tags={view.data.tags} onClose={() => setPanelOpen(false)} onSaved={onSaved} />}
    </div>
  )
}
