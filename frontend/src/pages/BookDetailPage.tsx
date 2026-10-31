import { useEffect, useId, useState } from 'react'
import { useParams } from 'react-router'
import { useBookView, useCatalogView, type BookDetailView } from '../api/index.ts'
import Button from '../components/Button.tsx'
import FailureMessage from '../components/FailureMessage.tsx'
import PageHeading from '../components/PageHeading.tsx'
import { announce, clearAnnouncements } from '../lib/announce.ts'
import { metadata, readingLines, toPanelFields } from '../lib/bookDetail.ts'
import { COULDNT_LOAD } from '../lib/copy.ts'
import { usePageTitle } from '../lib/page.ts'
import NewBookPanel from './NewBookPanel.tsx'
import NotFoundPage from './NotFoundPage.tsx'
import styles from './BookDetailPage.module.css'

const NO_TAGS: readonly string[] = []

function FailedBook({ retry }: { retry: () => void }) {
  usePageTitle('Book')
  useEffect(() => {
    announce('alert', COULDNT_LOAD)
    return clearAnnouncements
  }, [])
  // Retrying shows the loading state, which unmounts this button; park
  // focus on `main` first so it doesn't fall to `body`.
  const tryAgain = () => {
    document.getElementById('main')?.focus()
    retry()
  }
  return (
    <div className={styles.page}>
      <PageHeading className={styles.pageTitle}>Book</PageHeading>
      <div className={styles.failure}>
        <FailureMessage>{COULDNT_LOAD}</FailureMessage>
        <Button onClick={tryAgain}>Try again</Button>
      </div>
    </div>
  )
}

function BookDetail({ book }: { book: BookDetailView }) {
  usePageTitle(book.title)
  const catalog = useCatalogView()
  const tags = catalog.status === 'ready' ? catalog.data.tags : NO_TAGS
  const [editing, setEditing] = useState(false)
  const readings = readingLines(book.readings)
  const readingsId = useId()

  const onSaved = (_id: string, title: string) => {
    // SidePanel returns focus to Edit as it unmounts.
    setEditing(false)
    announce('status', `Saved ${title}.`)
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.actions}>
          <Button onClick={() => setEditing(true)}>Edit</Button>
        </div>
        <div className={styles.info}>
          <PageHeading className={styles.title}>{book.title}</PageHeading>
          {book.subtitle && <p className={styles.subtitle}>{book.subtitle}</p>}
          <p className={styles.authors}>{book.authors.join('; ')}</p>
          <dl className={styles.metadata}>
            {metadata(book).map(([term, value]) => (
              <div key={term}>
                <dt>{term}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          {book.tags.length > 0 && (
            <ul className={styles.tags} aria-label="Tags">
              {book.tags.map((tag) => (
                <li key={tag} className={styles.tag}>
                  {tag}
                </li>
              ))}
            </ul>
          )}
          <section className={styles.block} aria-labelledby={readingsId}>
            <h2 id={readingsId} className={styles.blockLabel}>
              Readings
            </h2>
            {readings.length === 0 ? (
              <p className={styles.none}>Not read yet.</p>
            ) : (
              <ul className={styles.readings}>
                {readings.map((reading) => (
                  <li key={reading.id}>{reading.text}</li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
      {editing && (
        <NewBookPanel
          tags={tags}
          book={{ id: book.id, fields: toPanelFields(book) }}
          onClose={() => setEditing(false)}
          onSaved={onSaved}
        />
      )}
    </div>
  )
}

/**
 * Book detail (EXPERIENCE.md → Book detail) at `/book/:bookId`: one surface
 * card, the action stack on the left (only **Edit** so far) and the Book on
 * the right. An unknown id shows the not-found page. The title is set by the
 * child that renders, never here: child effects run first, so a title set
 * here would overwrite the not-found page's.
 */
export default function BookDetailPage() {
  const { bookId = '' } = useParams()
  const view = useBookView(bookId)
  if (view.status === 'loading') return null
  if (view.status === 'missing') return <NotFoundPage />
  if (view.status === 'failed') return <FailedBook retry={view.retry} />
  return <BookDetail key={view.data.id} book={view.data} />
}
