import { useId, type Ref } from 'react'
import { Link, useNavigate } from 'react-router'
import type { HomeMainBook, HomeUpNext } from '../api/index.ts'
import { notePrefill } from '../lib/cardNotes.ts'
import { CHOOSE_A_BOOK } from '../lib/copy.ts'
import { upNextStart } from '../lib/startReading.ts'
import { useCardNoteFlow } from '../lib/useCardNoteFlow.tsx'
import Button from './Button.tsx'
import Cover from './Cover.tsx'
import Gauge from './Gauge.tsx'
import MoreActionsMenu from './MoreActionsMenu.tsx'
import PageField from './PageField.tsx'
import ReentryLine from './ReentryLine.tsx'
import styles from './MainBookCard.module.css'

const NO_MAIN_BOOK = 'No Main book.'

/**
 * Home's Main book card (EXPERIENCE.md → Main book card): a `region` "Main
 * book", named by its eyebrow. The 200×300 cover or the no-cover placeholder,
 * the "MAIN BOOK" eyebrow, the serif title (3-line clamp) linking to Book
 * detail, the author, "Edition N" only when it isn't 1, then the gauge, the
 * page field and, last, the re-entry line ("Last updated …" · "~N days left"
 * · "Last export …"), fed by Home's `lastExportAt` and `now` so it recomputes
 * with the date header on focus and visibility.
 * Without a Main book the same frame and name hold "No Main book." and,
 * below it, the Up next suggestion when there is an Up next (EXPERIENCE.md →
 * State Patterns): the 44×64 thumbnail, the serif title (text, not a link),
 * the author and a `button-primary` **Start reading** or **Resume**
 * (`lib/startReading.ts`) named with the title, which calls `onStartUpNext`
 * (Home hosts the Start dialog); else a link to the Catalog. `titleRef` is
 * the title link, which Home focuses after a confirmed start;
 * `emptyHeadingRef` is the "No Main book." heading (focusable by script only)
 * and `suggestRef` the suggestion's button: after a finish Home focuses the
 * button, else the heading.
 * `onReachedLastPage` and `pageFieldRef` pass through to the page field, so
 * Home can host the Finish dialog and return focus to the field.
 *
 * The eyebrow shares its row with the "⋯" menu ("More actions": **Pause**,
 * which calls `onPause`, and **Open book**, which goes to Book detail).
 * `moreRef` is the "⋯" button, where focus stays after a Cancel or a failed
 * pause. Below the row, `pauseSlot` takes the live regions while
 * `pauseFailed`, so a couldn't-save line shows directly below "⋯". The empty
 * card renders the slot last, below its suggestion, for a stale tab's
 * refusal that emptied the card.
 *
 * Under the cover, a stack of `button-secondary` actions: **Add card note**
 * opens the Card note panel (`lib/useCardNoteFlow.tsx`) with Page prefilled
 * at the current page (at least 1); after a save focus returns to it, then
 * `status` reads "Card note saved.".
 */
export default function MainBookCard({
  book,
  lastExportAt,
  now,
  titleRef,
  emptyHeadingRef,
  upNext = null,
  onStartUpNext,
  suggestRef,
  onReachedLastPage,
  pageFieldRef,
  onPause,
  moreRef,
  pauseSlot,
  pauseFailed = false,
}: {
  book: HomeMainBook | null
  upNext?: HomeUpNext | null
  onStartUpNext?: (bookId: string) => void
  suggestRef?: Ref<HTMLButtonElement>
  lastExportAt: string | null
  now: Date
  titleRef?: Ref<HTMLAnchorElement>
  emptyHeadingRef?: Ref<HTMLHeadingElement>
  onReachedLastPage?: (savedLine: string) => void
  pageFieldRef?: Ref<HTMLInputElement>
  onPause?: () => void
  moreRef?: Ref<HTMLButtonElement>
  pauseSlot?: Ref<HTMLDivElement>
  pauseFailed?: boolean
}) {
  const eyebrowId = useId()
  const navigate = useNavigate()
  const {
    button: cardNoteButton,
    open: openCardNote,
    panel: cardNotePanel,
  } = useCardNoteFlow({
    bookId: book?.id ?? null,
    initialPage: notePrefill(book?.currentPage ?? null),
  })
  if (book === null) {
    return (
      <>
        <section className={`${styles.card} ${styles.empty}`} aria-label="Main book">
          <h2 ref={emptyHeadingRef} className={styles.emptyHeading} tabIndex={-1}>
            {NO_MAIN_BOOK}
          </h2>
          {upNext !== null ? (
            <div className={styles.suggestion}>
              <Cover coverFile={upNext.coverFile} title={upNext.title} size="thumb" />
              <div className={styles.suggestionInfo}>
                <p className={styles.suggestionTitle}>{upNext.title}</p>
                <p className={styles.suggestionAuthors}>{upNext.authors.join('; ')}</p>
                <Button
                  ref={suggestRef}
                  variant="primary"
                  className={styles.suggestionButton}
                  aria-label={`${upNextStart(upNext)} ${upNext.title}`}
                  onClick={() => onStartUpNext?.(upNext.id)}
                >
                  {upNextStart(upNext)}
                </Button>
              </div>
            </div>
          ) : (
            <p className={styles.emptyBody}>
              <Link to="/catalog">{CHOOSE_A_BOOK}</Link>
            </p>
          )}
          <div
            ref={pauseSlot}
            className={`${styles.regions} ${styles.regionsStart}`}
            data-show-alert={pauseFailed ? 'true' : undefined}
          />
        </section>
        {cardNotePanel}
      </>
    )
  }
  // The panel sits beside the card, at the same place in both branches, so a
  // refetch that empties the card (a stale tab) keeps it mounted with its values.
  return (
    <>
      <section className={`${styles.card} ${styles.main}`} aria-labelledby={eyebrowId}>
        <div className={styles.side}>
          <Cover coverFile={book.coverFile} title={book.title} />
          <div className={styles.actions}>
            <Button ref={cardNoteButton} onClick={openCardNote}>
              Add card note
            </Button>
          </div>
        </div>
        <div className={styles.info}>
          <div className={styles.eyebrowRow}>
            <p id={eyebrowId} className={styles.eyebrow}>
              Main book
            </p>
            <MoreActionsMenu
              buttonRef={moreRef}
              items={[
                { label: 'Pause', onSelect: () => onPause?.() },
                { label: 'Open book', onSelect: () => void navigate(`/book/${book.id}`) },
              ]}
            />
          </div>
          <div ref={pauseSlot} className={styles.regions} data-show-alert={pauseFailed ? 'true' : undefined} />
          <h2 className={styles.titleHeading}>
            <Link ref={titleRef} to={`/book/${book.id}`} className={styles.title}>
              {book.title}
            </Link>
          </h2>
          <p className={styles.authors}>{book.authors.join('; ')}</p>
          {book.edition !== 1 && <p className={styles.edition}>Edition {book.edition}</p>}
          <Gauge title={book.title} page={book.currentPage} pages={book.pages} percent={book.percent} />
          <PageField
            bookId={book.id}
            currentPage={book.currentPage}
            pages={book.pages}
            percent={book.percent}
            onReachedLastPage={onReachedLastPage}
            fieldRef={pageFieldRef}
          />
          <ReentryLine
            lastProgressUpdate={book.lastProgressUpdate}
            daysLeft={book.daysLeft}
            lastExportAt={lastExportAt}
            now={now}
          />
        </div>
      </section>
      {cardNotePanel}
    </>
  )
}
