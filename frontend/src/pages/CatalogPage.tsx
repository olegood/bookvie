import { useEffect, useMemo, useRef, useState } from 'react'
import { useCatalogView, type ShelfBook } from '../api/index.ts'
import Button from '../components/Button.tsx'
import FailureMessage from '../components/FailureMessage.tsx'
import PageHeading from '../components/PageHeading.tsx'
import { announce, clearAnnouncements } from '../lib/announce.ts'
import { matchCountCopy, matchesTitle, sortBooks } from '../lib/catalog.ts'
import { COULDNT_LOAD } from '../lib/copy.ts'
import { usePageTitle } from '../lib/page.ts'
import CatalogList from './CatalogList.tsx'
import NewBookPanel from './NewBookPanel.tsx'
import SearchTitles from './SearchTitles.tsx'
import styles from './CatalogPage.module.css'

const EMPTY_SHELF = 'Your shelf is empty. Add your first book.'
const EMPTY_PLANKS = 3
// The count is announced once typing pauses.
const SEARCH_PAUSE_MS = 500
// DESIGN.md → Highlight ring: how long the new row keeps it.
const HIGHLIGHT_MS = 2000

const NO_BOOKS: readonly ShelfBook[] = []

function EmptyShelf() {
  return (
    <section className={styles.bookcase} aria-label="Bookcase">
      {Array.from({ length: EMPTY_PLANKS }, (_, row) => (
        <div key={row} className={styles.row}>
          {row === 0 && <p className={styles.empty}>{EMPTY_SHELF}</p>}
          <div className={styles.plank} />
        </div>
      ))}
    </section>
  )
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export default function CatalogPage() {
  usePageTitle('Catalog')
  const view = useCatalogView()
  const failed = view.status === 'failed'
  const books = view.status === 'ready' ? view.data.books : NO_BOOKS
  const sorted = useMemo(() => sortBooks(books), [books])

  const [panelOpen, setPanelOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [added, setAdded] = useState<{ id: string; title: string } | null>(null)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const titleCells = useRef(new Map<string, HTMLElement>())
  const countTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  // What the pending count reads when it fires.
  const latest = useRef({ sorted, query })
  useEffect(() => {
    latest.current = { sorted, query }
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

  // After an add: the refetched list has rendered, so scroll the new row into
  // view, focus its title, ring it, and only then announce.
  useEffect(() => {
    if (!added) return
    const cell = titleCells.current.get(added.id)
    if (!cell) return
    setAdded(null)
    cell.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
    cell.focus({ preventScroll: true })
    setHighlightId(added.id)
    announce('status', `Added ${added.title}.`)
  }, [added, sorted])

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
      const { sorted: current, query: text } = latest.current
      announce('status', matchCountCopy(current.filter((book) => matchesTitle(book.title, text)).length))
    }, SEARCH_PAUSE_MS)
  }

  const openPanel = () => {
    // A count still waiting would empty the panel's regions.
    cancelCount()
    setPanelOpen(true)
  }

  const onAdded = (id: string, title: string) => {
    // Clear a search that could hide the new Book, then close the panel.
    cancelCount()
    setQuery('')
    setPanelOpen(false)
    setAdded({ id, title })
  }

  const empty = view.data.books.length === 0
  return (
    <div className={styles.page}>
      <PageHeading className={styles.title}>Catalog</PageHeading>
      <div className={styles.toolbar}>
        {!empty && <SearchTitles value={query} onChange={search} />}
        <Button variant="primary" className={styles.newBook} onClick={openPanel}>
          New book
        </Button>
      </div>
      {empty ? (
        <EmptyShelf />
      ) : (
        <CatalogList books={sorted} query={query} highlightId={highlightId} titleCells={titleCells} />
      )}
      {panelOpen && (
        <NewBookPanel tags={view.data.tags} onClose={() => setPanelOpen(false)} onAdded={onAdded} />
      )}
    </div>
  )
}
