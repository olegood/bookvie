import { useEffect, useRef, useState } from 'react'
import {
  BOOK_FIELD_KEYS,
  useAddBook,
  useEditBook,
  type BookFieldKey,
  type BookFields,
  type BookSaveOptions,
  type DuplicateMatch,
} from '../api/index.ts'
import Button from '../components/Button.tsx'
import DuplicateDialog from '../components/DuplicateDialog.tsx'
import SelectField from '../components/SelectField.tsx'
import SidePanel from '../components/SidePanel.tsx'
import SwatchRow from '../components/SwatchRow.tsx'
import TagsCombobox from '../components/TagsCombobox.tsx'
import TextField from '../components/TextField.tsx'
import { announce, clearAnnouncements } from '../lib/announce.ts'
import styles from './NewBookPanel.module.css'

const TYPES = [
  ['paperback', 'Paperback'],
  ['hardcover', 'Hardcover'],
  ['ebook', 'Ebook'],
] as const

const SAVING = 'Saving the book.'

function emptyFields(): BookFields {
  const fields = Object.fromEntries(BOOK_FIELD_KEYS.map((key) => [key, ''])) as BookFields
  fields.edition = '1'
  return fields
}

// Everything that differs between New book and Edit book (EXPERIENCE.md →
// New book panel, Duplicate dialog, Focus after close).
const MODES = {
  new: {
    title: 'New book',
    submit: 'Add book',
    // After Don't add, focus returns to Title.
    afterDismiss: 'title',
  },
  edit: {
    title: 'Edit book',
    submit: 'Save changes',
    // After Don't save, focus returns to Save changes.
    afterDismiss: 'submit',
  },
} as const

type Props = {
  /** The library's existing tags, for the Tags suggestions. */
  tags: readonly string[]
  /** The Book to edit, with its fields as the panel prefills them; omitted for New book. */
  book?: { id: string; fields: BookFields }
  onClose: () => void
  /** Called after the save and the views' refetch; the page closes the panel. */
  onSaved: (bookId: string, title: string) => void
}

/**
 * The New book panel (EXPERIENCE.md → New book panel), and the Edit book panel
 * when `book` is given: prefilled, **Save changes**, `edit-book`. Every field
 * follows the Agent Label Contract, in its order. The server validates (`noValidate`) and
 * owns every message: field messages are its `fields[].message`, the alert is
 * its top-level `message`. Values are kept on every outcome but success.
 * A `duplicate_book` refusal opens the Duplicate dialog over the panel:
 * **Don't add** returns to Title (**Don't save** to Save changes), **Add
 * anyway** / **Save anyway** resends with `confirmDuplicate: true` through the
 * same guard and outcome handling. Any refusal with `fields` (a 422, or a 409
 * such as `pages_below_current_page`) marks those fields.
 */
export default function NewBookPanel({ tags, book, onClose, onSaved }: Props) {
  const modeKey = book ? 'edit' : 'new'
  const mode = MODES[modeKey]
  const addBook = useAddBook()
  const editBook = useEditBook()
  const [fields, setFields] = useState(() => (book ? { ...book.fields } : emptyFields()))
  const [errors, setErrors] = useState<Partial<Record<BookFieldKey, string>>>({})
  // The alert shows as a line in the panel when no field carries the outcome.
  const [showAlert, setShowAlert] = useState(false)
  const [busy, setBusy] = useState(false)
  // A press while one is in flight is ignored even before `busy` renders.
  const inFlight = useRef(false)
  const [focusInvalid, setFocusInvalid] = useState(0)
  // The open Duplicate dialog's refusal, or null when it is closed.
  const [duplicate, setDuplicate] = useState<{ duplicates: DuplicateMatch[]; message: string } | null>(null)
  const [refocus, setRefocus] = useState(0)
  const title = useRef<HTMLInputElement>(null)
  const submitButton = useRef<HTMLButtonElement>(null)
  const fieldsBox = useRef<HTMLDivElement>(null)

  // Opening empties both live regions.
  useEffect(() => {
    clearAnnouncements()
  }, [])

  // After a refusal renders, focus goes to the first invalid field in form order.
  useEffect(() => {
    if (focusInvalid === 0) return
    fieldsBox.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [focusInvalid])

  // After Don't add / Don't save closes the dialog, focus returns to Title / Save changes.
  const afterDismiss = mode.afterDismiss
  useEffect(() => {
    if (refocus === 0) return
    const target = afterDismiss === 'title' ? title.current : submitButton.current
    target?.focus()
  }, [refocus, afterDismiss])

  const set = (key: BookFieldKey) => (value: string) => setFields((current) => ({ ...current, [key]: value }))
  const text = (key: BookFieldKey) => ({
    value: fields[key],
    error: errors[key],
    onChange: (event: { target: { value: string } }) => set(key)(event.target.value),
  })

  const submit = async (options?: BookSaveOptions) => {
    if (inFlight.current) return
    inFlight.current = true
    clearAnnouncements()
    setShowAlert(false)
    setBusy(true)
    const result = book ? await editBook(book.id, fields, options) : await addBook(fields, options)
    inFlight.current = false
    setBusy(false)
    if (result.kind === 'ok') {
      onSaved(book ? book.id : (result.ids.bookId ?? ''), fields.title.trim())
      return
    }
    // The warning is the dialog alone: no alert line and no field errors.
    if (result.kind === 'refusal' && result.code === 'duplicate_book' && !options?.confirmDuplicate) {
      setErrors({})
      setDuplicate({ duplicates: result.duplicates, message: result.message })
      return
    }
    const known = new Set<string>(BOOK_FIELD_KEYS)
    const mapped =
      result.kind === 'refusal'
        ? result.fields.filter((failure) => known.has(failure.field)).map((failure) => [failure.field, failure.message])
        : []
    setErrors(Object.fromEntries(mapped))
    if (mapped.length > 0) setFocusInvalid((count) => count + 1)
    else setShowAlert(true)
    announce('alert', result.message)
  }

  const dismissDuplicate = () => {
    setDuplicate(null)
    setRefocus((count) => count + 1)
  }

  const confirmDuplicate = () => {
    setDuplicate(null)
    void submit({ confirmDuplicate: true })
  }

  return (
    <>
      <SidePanel
        title={mode.title}
        onClose={onClose}
        onSubmit={() => void submit()}
        initialFocus={title}
        showAlert={showAlert}
        footer={
          <>
            <Button ref={submitButton} type="submit" variant="primary" disabledReason={busy ? SAVING : undefined}>
              {mode.submit}
            </Button>
            <Button onClick={onClose}>Cancel</Button>
          </>
        }
      >
        <div ref={fieldsBox} className={styles.fields}>
          <TextField label="Title" required ref={title} {...text('title')} />
          <TextField label="Subtitle" {...text('subtitle')} />
          <TextField label="Pages" type="number" inputMode="numeric" required {...text('pages')} />
          <TextField label="Author(s)" required {...text('authors')} />
          <TextField label="Edition" type="number" inputMode="numeric" required {...text('edition')} />
          <TextField label="Language" required {...text('language')} />
          <TextField label="Publisher" required {...text('publisher')} />
          <SelectField label="Type" required options={TYPES} {...text('type')} />
          <TextField label="ISBN" {...text('isbn')} />
          <TextField label="Year" type="number" inputMode="numeric" {...text('year')} />
          <TextField label="Finished on" type="date" {...text('finishedOn')} />
          <TagsCombobox label="Tags" tags={tags} value={fields.tags} onChange={set('tags')} error={errors.tags} />
          <div className={styles.spineColor}>
            <TextField label="Spine color" autoComplete="off" spellCheck={false} {...text('spineColor')} />
            <SwatchRow value={fields.spineColor} onPick={set('spineColor')} />
          </div>
        </div>
      </SidePanel>
      {duplicate && (
        <DuplicateDialog
          mode={modeKey}
          duplicates={duplicate.duplicates}
          message={duplicate.message}
          onDismiss={dismissDuplicate}
          onConfirm={confirmDuplicate}
        />
      )}
    </>
  )
}
