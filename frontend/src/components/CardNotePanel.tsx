import { useId, useRef, useState, type FormEvent } from 'react'
import { useAddCardNote } from '../api/index.ts'
import { announce, clearAnnouncements } from '../lib/announce.ts'
import { SAVING_CARD_NOTE } from '../lib/cardNotes.ts'
import { useAlertDialog } from '../lib/useAlertDialog.ts'
import Button from './Button.tsx'
import TextField from './TextField.tsx'
import fieldStyles from './TextField.module.css'
import styles from './CardNotePanel.module.css'

type Props = {
  /** The Book the note is for. */
  bookId: string
  /** The Page field's prefill, as `lib/cardNotes.notePrefill` gives it. */
  initialPage: string
  /** Cancel or Esc: the opener unmounts the panel and takes focus back. */
  onCancel: () => void
  /** The note is stored and the views have refetched: the opener closes, focuses, then announces. */
  onSaved: () => void
}

type FieldKey = 'text' | 'page'
type FieldErrors = Partial<Record<FieldKey, string>>

/**
 * The Card note panel (DESIGN.md / EXPERIENCE.md → Card note panel): a modal
 * `dialog` "Card note" styled as a 360px index card, with Note (a required
 * `textarea`, focused on open) and Page (prefilled by the opener), then
 * **Save note** and **Cancel**.
 *
 * Nothing is checked here: Save note sends `add-card-note` with both values
 * as typed, and only the server parses Page. A 422 shows each field's
 * message under it with `aria-invalid` and `aria-describedby`, the summary
 * goes in `alert`, and focus moves to the first invalid field (Note, then
 * Page). Any other failure shows its `alert` line inside the panel, above
 * the buttons, with both values kept. **Save note** is `aria-disabled` while
 * the request is out, and Esc is ignored then. Cancel and Esc send nothing.
 */
export default function CardNotePanel({ bookId, initialPage, onCancel, onSaved }: Props) {
  const headingId = useId()
  const noteId = useId()
  const noteMessageId = `${noteId}-message`
  const sendNote = useAddCardNote()
  const [text, setText] = useState('')
  const [page, setPage] = useState(initialPage)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [busy, setBusy] = useState(false)
  const [showAlert, setShowAlert] = useState(false)
  // A press while one is in flight is ignored even before `busy` renders.
  const inFlight = useRef(false)
  const noteField = useRef<HTMLTextAreaElement>(null)
  const pageField = useRef<HTMLInputElement>(null)

  const dismiss = () => {
    if (inFlight.current) {
      // Esc is ignored in flight; a native close that slipped past `cancel` is undone.
      const element = dialog.current
      if (element && !element.open) {
        element.showModal()
        noteField.current?.focus()
      }
      return
    }
    // A couldn't-save line must not outlive the panel.
    clearAnnouncements()
    onCancel()
  }
  const { dialog, regionSlot, dialogProps } = useAlertDialog({
    onDismiss: dismiss,
    initialFocus: noteField,
    role: 'dialog',
  })

  const save = async () => {
    if (inFlight.current) return
    clearAnnouncements()
    setShowAlert(false)
    inFlight.current = true
    setBusy(true)
    const result = await sendNote(bookId, text, page)
    inFlight.current = false
    if (result.kind === 'ok') {
      onSaved()
      return
    }
    setBusy(false)
    const fieldErrors: FieldErrors = {}
    if (result.kind === 'refusal') {
      for (const { field, message } of result.fields) {
        if ((field === 'text' || field === 'page') && fieldErrors[field] === undefined) fieldErrors[field] = message
      }
    }
    setErrors(fieldErrors)
    if (fieldErrors.text !== undefined) noteField.current?.focus()
    else if (fieldErrors.page !== undefined) pageField.current?.focus()
    // Couldn't save, a gone Book, or anything else: the line shows above the buttons.
    else setShowAlert(true)
    announce('alert', result.message)
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void save()
  }

  const reason = busy ? SAVING_CARD_NOTE : undefined

  return (
    <dialog ref={dialog} {...dialogProps} className={styles.panel} aria-labelledby={headingId}>
      <form onSubmit={submit} noValidate>
        <h2 id={headingId} className={styles.heading}>
          Card note
        </h2>
        <div className={`${fieldStyles.field} ${styles.field}`}>
          <div className={fieldStyles.labelRow}>
            <label htmlFor={noteId} className={fieldStyles.label}>
              Note
            </label>
            <span className={fieldStyles.required}>(required)</span>
          </div>
          <textarea
            ref={noteField}
            id={noteId}
            required
            rows={5}
            className={`${fieldStyles.input} ${styles.note}`}
            value={text}
            aria-invalid={errors.text ? 'true' : undefined}
            aria-describedby={errors.text ? noteMessageId : undefined}
            onChange={(event) => setText(event.target.value)}
          />
          {errors.text && (
            <p id={noteMessageId} className={fieldStyles.message}>
              {errors.text}
            </p>
          )}
        </div>
        <TextField
          ref={pageField}
          className={`${styles.field} ${styles.pageField}`}
          label="Page"
          required
          value={page}
          autoComplete="off"
          error={errors.page}
          onChange={(event) => setPage(event.target.value)}
        />
        <div ref={regionSlot} className={styles.regions} data-show-alert={showAlert ? 'true' : undefined} />
        <div className={styles.actions}>
          <Button type="submit" variant="primary" disabledReason={reason}>
            Save note
          </Button>
          <Button onClick={dismiss}>Cancel</Button>
        </div>
      </form>
    </dialog>
  )
}
