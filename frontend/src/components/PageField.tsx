import {
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type Ref,
} from 'react'
import { useUpdatePage } from '../api/index.ts'
import { adoptRegions, announce, clearAnnouncements, releaseRegions } from '../lib/announce.ts'
import { pageRangeMessage, pageSavedCopy, parsePage } from '../lib/pageField.ts'
import Button from './Button.tsx'
import styles from './PageField.module.css'

const SAVING = 'Saving the page.'
const PAGE_FIELD = 'page'

type Props = {
  bookId: string
  /** The last saved page, from the home view. */
  currentPage: number
  pages: number
  /** The server's percentage for `currentPage` (AD-6). */
  percent: number
  /**
   * A save answered `reachedLastPage`: the owner (Home) opens the Finish
   * dialog, passing on the saved-page line the dialog's opening would silence.
   */
  onReachedLastPage?: (savedLine: string) => void
  /** The page input, which the owner focuses when the Finish dialog is cancelled. */
  fieldRef?: Ref<HTMLInputElement>
}

/**
 * The Main book card's page field (EXPERIENCE.md → Page field, DESIGN.md →
 * Page field): the label "Page", a whole-number input prefilled with the
 * last saved page, "of M" as its description, and **Update** pushed right;
 * Enter also saves. Never auto-focused.
 *
 * A value that isn't a whole number from 0 to M isn't sent: the field keeps
 * it with `aria-invalid`, and "Page must be between 0 and M." shows under it
 * and in `alert`, as a server 422 on `page` does. On success (after the views
 * have refetched) the field shows the saved page and `status` reads "Page N
 * of M, P%.", P from the refetched view. A couldn't-save keeps the typed
 * value; a stale tab's refusal resets the field to the current view's page
 * (the new Main book's). Either shows its message as one line directly below
 * the field and in `alert`. **Update** is `aria-disabled`
 * while the request is out, and further presses send nothing. No optimistic
 * update: the gauge moves only with the refetched view.
 *
 * When the view's Book or page changes (a save, a refetch after another tab
 * changed it), the field resets to the view's page.
 *
 * A save that answers `reachedLastPage` calls `onReachedLastPage` with the
 * "Page M of M, 100%." line, which the dialog keeps as its description (its
 * opening empties the live regions, so `status` can't carry it); Home
 * hosts the Finish dialog, so it outlives this field when a refetch empties
 * the card. Each such save calls it again, so the same page reopens it.
 */
export default function PageField({ bookId, currentPage, pages, percent, onReachedLastPage, fieldRef }: Props) {
  const fieldId = useId()
  const ofId = useId()
  const messageId = useId()
  const sendPage = useUpdatePage()
  const [value, setValue] = useState(String(currentPage))
  const [invalid, setInvalid] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  // Bumped on each save, so the same page saved twice announces twice.
  const [saves, setSaves] = useState(0)
  const [seen, setSeen] = useState({ bookId, currentPage })
  const inFlight = useRef(false)
  // The page just saved, waiting for the refetched view to show it.
  const savedPage = useRef<number | null>(null)
  const mounted = useRef(true)
  const field = useRef<HTMLInputElement>(null)
  const regionSlot = useRef<HTMLDivElement>(null)
  // Mounted with the input, so the handle is the element itself.
  useImperativeHandle(fieldRef, () => field.current as HTMLInputElement, [])

  // The view moved on: show its page.
  if (seen.bookId !== bookId || seen.currentPage !== currentPage) {
    setSeen({ bookId, currentPage })
    setValue(String(currentPage))
    setInvalid(null)
  }

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  // Announced once the refetched view has rendered the saved page.
  useEffect(() => {
    if (savedPage.current === null || savedPage.current !== currentPage) return
    savedPage.current = null
    announce('status', pageSavedCopy(currentPage, pages, percent))
  }, [saves, currentPage, pages, percent])

  // After a failure the live regions sit in the slot below the field, so the
  // alert line shows there; they go back on the next save or when the field
  // goes. The text stays in `alert` if the field goes (a stale tab's card).
  useLayoutEffect(() => {
    const slot = regionSlot.current
    if (!failed || !slot) return
    adoptRegions(slot)
    return () => releaseRegions(slot)
  }, [failed])

  const showInvalid = (message: string) => {
    setInvalid(message)
    announce('alert', message)
  }

  const save = async () => {
    if (inFlight.current) return
    clearAnnouncements()
    setFailed(false)
    savedPage.current = null
    const page = parsePage(value, pages)
    if (page === null) {
      showInvalid(pageRangeMessage(pages))
      return
    }
    inFlight.current = true
    setBusy(true)
    const result = await sendPage(bookId, page)
    inFlight.current = false
    if (!mounted.current) {
      // The card went (the Main book was cleared elsewhere): say why in `alert`.
      if (result.kind !== 'ok') announce('alert', result.message)
      return
    }
    setBusy(false)
    if (result.kind === 'ok') {
      // The value comes from the refetched view (the render-phase reset).
      setInvalid(null)
      savedPage.current = page
      setSaves((count) => count + 1)
      // The last page is 100% (AD-6: `percent` is 100 only at page = pages, and
      // `reachedLastPage` is exactly that), so the line needs no refetched number.
      if (result.reachedLastPage) onReachedLastPage?.(pageSavedCopy(page, pages, 100))
      return
    }
    const pageError = result.kind === 'refusal' ? result.fields.find((f) => f.field === PAGE_FIELD) : undefined
    if (pageError) {
      showInvalid(pageError.message)
      return
    }
    setInvalid(null)
    setFailed(true)
    announce('alert', result.message)
    if (result.kind === 'refusal') field.current?.focus()
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void save()
  }

  const describedBy = invalid ? `${ofId} ${messageId}` : ofId
  return (
    <form className={styles.form} noValidate onSubmit={submit}>
      <div className={styles.row}>
        <label htmlFor={fieldId} className={styles.label}>
          Page
        </label>
        <input
          ref={field}
          id={fieldId}
          className={styles.input}
          type="number"
          inputMode="numeric"
          step={1}
          min={0}
          max={pages}
          value={value}
          autoComplete="off"
          aria-invalid={invalid ? 'true' : undefined}
          aria-describedby={describedBy}
          onChange={(event) => setValue(event.target.value)}
        />
        <span id={ofId} className={styles.of}>
          {`of ${pages}`}
        </span>
        <Button type="submit" variant="primary" className={styles.update} disabledReason={busy ? SAVING : undefined}>
          Update
        </Button>
      </div>
      {invalid && (
        <p id={messageId} className={styles.message}>
          {invalid}
        </p>
      )}
      <div ref={regionSlot} className={styles.regions} data-show-alert={failed ? 'true' : undefined} />
    </form>
  )
}
