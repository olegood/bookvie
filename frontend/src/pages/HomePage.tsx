import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { useHomeView } from '../api/index.ts'
import Button from '../components/Button.tsx'
import FailureMessage from '../components/FailureMessage.tsx'
import MainBookCard from '../components/MainBookCard.tsx'
import PageHeading from '../components/PageHeading.tsx'
import { announce, clearAnnouncements } from '../lib/announce.ts'
import { COULDNT_LOAD } from '../lib/copy.ts'
import { usePageTitle } from '../lib/page.ts'
import { lastExportLine, useNow } from '../lib/relativeDay.ts'
import { formatToday } from '../lib/today.ts'
import { EmptyShelf, type NewBookState } from './CatalogPage.tsx'
import styles from './HomePage.module.css'

/**
 * Home, the launch page at `/` (EXPERIENCE.md → Home): a visually hidden
 * `h1` "Home", the date header (the browser's local date, recomputed on
 * focus and visibility), then either the empty shelf (no Books) or a grid of
 * the Main book card beside the 320px side column (empty until Epic 4), with
 * room for the bookcase slice below (Story 3.5). "Last export" sits at the
 * right end of the header line only while there is no Main book.
 */
export default function HomePage() {
  usePageTitle('Home')
  const view = useHomeView()
  const now = useNow()
  const navigate = useNavigate()
  const failed = view.status === 'failed'

  // The couldn't-load line is shown in `main` and set in the shell's alert.
  useEffect(() => {
    if (!failed) return
    announce('alert', COULDNT_LOAD)
    return clearAnnouncements
  }, [failed])

  if (view.status === 'loading') return null

  if (view.status === 'failed') {
    const { retry } = view
    // Retrying unmounts this button; park focus on `main` first.
    const tryAgain = () => {
      document.getElementById('main')?.focus()
      retry()
    }
    return (
      <div className={styles.page}>
        <PageHeading className="visuallyHidden">Home</PageHeading>
        <div className={styles.failure}>
          <FailureMessage>{COULDNT_LOAD}</FailureMessage>
          <Button onClick={tryAgain}>Try again</Button>
        </div>
      </div>
    )
  }

  const { mainBook, lastExportAt, meter } = view.data
  const empty = meter.total === 0
  const newBook = () => {
    const state: NewBookState = { newBook: true }
    void navigate('/catalog', { state })
  }

  return (
    <div className={styles.page}>
      <PageHeading className="visuallyHidden">Home</PageHeading>
      <div className={styles.header}>
        <p className={styles.date}>{formatToday(now)}</p>
        {mainBook === null && <p className={styles.lastExport}>{lastExportLine(lastExportAt, now)}</p>}
      </div>
      {empty ? (
        <div className={styles.emptyShelf}>
          <EmptyShelf />
          <Button variant="primary" className={styles.newBook} onClick={newBook}>
            New book
          </Button>
        </div>
      ) : (
        <div className={styles.grid}>
          <MainBookCard book={mainBook} />
          <div className={styles.side} />
        </div>
      )}
    </div>
  )
}
