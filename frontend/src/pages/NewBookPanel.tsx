import { useEffect, useRef, useState } from 'react'
import { BOOK_FIELD_KEYS, useAddBook, type BookFieldKey, type BookFields } from '../api/index.ts'
import Button from '../components/Button.tsx'
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

type Props = {
  /** The library's existing tags, for the Tags suggestions. */
  tags: readonly string[]
  onClose: () => void
  /** Called after the save and the views' refetch; the page closes the panel. */
  onAdded: (bookId: string, title: string) => void
}

/**
 * The New book panel (EXPERIENCE.md → New book panel). Every field follows the
 * Agent Label Contract, in its order. The server validates (`noValidate`) and
 * owns every message: field messages are its `fields[].message`, the alert is
 * its top-level `message`. Values are kept on every outcome but success.
 */
export default function NewBookPanel({ tags, onClose, onAdded }: Props) {
  const addBook = useAddBook()
  const [fields, setFields] = useState(emptyFields)
  const [errors, setErrors] = useState<Partial<Record<BookFieldKey, string>>>({})
  // The alert shows as a line in the panel when no field carries the outcome.
  const [showAlert, setShowAlert] = useState(false)
  const [busy, setBusy] = useState(false)
  // A press while one is in flight is ignored even before `busy` renders.
  const inFlight = useRef(false)
  const [focusInvalid, setFocusInvalid] = useState(0)
  const title = useRef<HTMLInputElement>(null)
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

  const set = (key: BookFieldKey) => (value: string) => setFields((current) => ({ ...current, [key]: value }))
  const text = (key: BookFieldKey) => ({
    value: fields[key],
    error: errors[key],
    onChange: (event: { target: { value: string } }) => set(key)(event.target.value),
  })

  const submit = async () => {
    if (inFlight.current) return
    inFlight.current = true
    clearAnnouncements()
    setShowAlert(false)
    setBusy(true)
    const result = await addBook(fields)
    inFlight.current = false
    setBusy(false)
    if (result.kind === 'ok') {
      onAdded(result.ids.bookId ?? '', fields.title.trim())
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

  return (
    <SidePanel
      title="New book"
      onClose={onClose}
      onSubmit={() => void submit()}
      initialFocus={title}
      showAlert={showAlert}
      footer={
        <>
          <Button type="submit" variant="primary" disabledReason={busy ? SAVING : undefined}>
            Add book
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
  )
}
