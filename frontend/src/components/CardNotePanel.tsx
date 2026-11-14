import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useAddCardNote, useDeleteCardNote, useEditCardNote } from '../api/index.ts'
import { announce, clearAnnouncements } from '../lib/announce.ts'
import {
  DELETE_CARD_NOTE,
  DELETE_CARD_NOTE_HEADING,
  DELETING_CARD_NOTE,
  pageField as pageFieldValue,
  SAVING_CARD_NOTE,
} from '../lib/cardNotes.ts'
import { useAlertDialog } from '../lib/useAlertDialog.ts'
import Button from './Button.tsx'
import ConfirmDialog from './ConfirmDialog.tsx'
import TextField from './TextField.tsx'
import fieldStyles from './TextField.module.css'
import styles from './CardNotePanel.module.css'

/** The note an Edit opened the panel for (edit mode). */
export type EditedNote = { id: string; text: string; pageStart: number; pageEnd: number | null }

type Props = {
  /** The Book the note is for. */
  bookId: string
  /** Add mode: the Page field's prefill, as `lib/cardNotes.notePrefill` gives it. Ignored in edit mode. */
  initialPage?: string
  /** Edit mode: the note to change, which prefills Note and Page. */
  note?: EditedNote
  /** Cancel or Esc: the opener unmounts the panel and takes focus back. */
  onCancel: () => void
  /** The note is stored and the views have refetched: the opener closes, focuses, then announces. */
  onSaved: () => void
  /** Edit mode: the note is deleted and the views have refetched; the opener closes the panel and the dialog. */
  onDeleted?: () => void
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
 * Cmd+Enter or Ctrl+Enter in Note or Page (Story 9.1) submits the form
 * through `requestSubmit()`, so it takes exactly Save note's path, in-flight
 * guard included; Save note names both keys in `aria-keyshortcuts`.
 *
 * Edit mode (`note`, Story 5.2): headed "Edit card note", Note and Page
 * prefilled from the note ("96" or "42–45"), Save note sends
 * `edit-card-note`, and **Delete** sits at the left of the buttons. Delete
 * stacks the "Delete this card note?" Confirm dialog over the panel, which
 * stays open beneath it. The dialog is the panel's sibling, not its child,
 * so its Tab cycle and Esc stay its own. Cancel or Esc close only the
 * dialog, and focus returns to **Delete** once it has unmounted; **Delete
 * card note** sends `delete-card-note`, and a failure (`card_note_not_found`
 * included) shows its line inside the dialog.
 */
export default function CardNotePanel({ bookId, initialPage = '', note, onCancel, onSaved, onDeleted }: Props) {
  const headingId = useId()
  const noteId = useId()
  const noteMessageId = `${noteId}-message`
  const addNote = useAddCardNote()
  const editNote = useEditCardNote()
  const sendDelete = useDeleteCardNote()
  const [text, setText] = useState(note?.text ?? '')
  const [page, setPage] = useState(note ? pageFieldValue(note.pageStart, note.pageEnd) : initialPage)
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
    const result = note ? await editNote(bookId, note.id, text, page) : await addNote(bookId, text, page)
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

  // Cmd+Enter or Ctrl+Enter in Note or Page: the same submit as Save note.
  const saveFromKeys = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key !== 'Enter' || !(event.metaKey || event.ctrlKey) || event.nativeEvent.isComposing) return
    if (event.target !== noteField.current && event.target !== pageField.current) return
    event.preventDefault()
    event.currentTarget.requestSubmit()
  }

  // The Delete card note Confirm dialog, stacked over the panel (edit mode).
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showConfirmAlert, setShowConfirmAlert] = useState(false)
  const deleteInFlight = useRef(false)
  const deleteButton = useRef<HTMLButtonElement>(null)
  // Bumped when the dialog closes, so focus returns to Delete once it has unmounted.
  const [refocusDelete, setRefocusDelete] = useState(0)

  useEffect(() => {
    if (refocusDelete > 0) deleteButton.current?.focus()
  }, [refocusDelete])

  const openConfirm = () => {
    if (inFlight.current) return
    setShowAlert(false)
    setShowConfirmAlert(false)
    setConfirming(true)
  }

  const cancelConfirm = () => {
    if (deleteInFlight.current) return
    // A couldn't-save line must not outlive the dialog.
    clearAnnouncements()
    setConfirming(false)
    setRefocusDelete((count) => count + 1)
  }

  const confirmDelete = async () => {
    if (deleteInFlight.current || !note) return
    deleteInFlight.current = true
    clearAnnouncements()
    setShowConfirmAlert(false)
    setDeleting(true)
    const result = await sendDelete(bookId, note.id)
    deleteInFlight.current = false
    if (result.kind === 'ok') {
      onDeleted?.()
      return
    }
    setDeleting(false)
    // Couldn't save, or the note or Book is gone: the line shows inside the dialog.
    setShowConfirmAlert(true)
    announce('alert', result.message)
  }

  const reason = busy ? SAVING_CARD_NOTE : undefined

  return (
    <>
      <dialog ref={dialog} {...dialogProps} className={styles.panel} aria-labelledby={headingId}>
        <form onSubmit={submit} onKeyDown={saveFromKeys} noValidate>
          <h2 id={headingId} className={styles.heading}>
            {note ? 'Edit card note' : 'Card note'}
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
            {note && (
              <Button ref={deleteButton} className={styles.delete} disabledReason={reason} onClick={openConfirm}>
                Delete
              </Button>
            )}
            <Button
              type="submit"
              variant="primary"
              disabledReason={reason}
              aria-keyshortcuts="Meta+Enter Control+Enter"
            >
              Save note
            </Button>
            <Button onClick={dismiss}>Cancel</Button>
          </div>
        </form>
      </dialog>
      {confirming && (
        <ConfirmDialog
          heading={DELETE_CARD_NOTE_HEADING}
          lines={[]}
          confirmLabel={DELETE_CARD_NOTE}
          busy={deleting}
          busyReason={DELETING_CARD_NOTE}
          showAlert={showConfirmAlert}
          onConfirm={() => void confirmDelete()}
          onCancel={cancelConfirm}
        />
      )}
    </>
  )
}
