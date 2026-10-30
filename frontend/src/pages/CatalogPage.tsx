import { useEffect } from 'react'
import { useCatalogView } from '../api/index.ts'
import Button from '../components/Button.tsx'
import FailureMessage from '../components/FailureMessage.tsx'
import PageHeading from '../components/PageHeading.tsx'
import { announce, clearAnnouncements } from '../lib/announce.ts'
import { COULDNT_LOAD } from '../lib/copy.ts'
import { usePageTitle } from '../lib/page.ts'
import styles from './CatalogPage.module.css'

const EMPTY_SHELF = 'Your shelf is empty. Add your first book.'
const EMPTY_PLANKS = 3

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

export default function CatalogPage() {
  usePageTitle('Catalog')
  const view = useCatalogView()
  const failed = view.status === 'failed'

  // The couldn't-load line is shown in `main` and set in the shell's alert;
  // it clears once the view loads.
  useEffect(() => {
    if (!failed) return
    announce('alert', COULDNT_LOAD)
    return clearAnnouncements
  }, [failed])

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

  return (
    <div className={styles.page}>
      <PageHeading className={styles.title}>Catalog</PageHeading>
      <div className={styles.toolbar}>
        {/* Story 1.8 opens the New book panel from here. */}
        <Button variant="primary" className={styles.newBook}>
          New book
        </Button>
      </div>
      {view.data.books.length === 0 && <EmptyShelf />}
    </div>
  )
}
