import { useEffect, useId, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useEditPurpose } from '../api/index.ts'
import { adoptRegions, announce, clearAnnouncements, releaseRegions } from '../lib/announce.ts'
import Button from './Button.tsx'
import styles from './EditPurpose.module.css'

const SAVING = 'Saving the Purpose.'

type Props = {
  bookId: string
  /** The current Reading's Purpose; `null` hides the line, not the button. */
  purpose: string | null
}

/**
 * The Purpose line of Book detail's Current reading block, with **Edit
 * Purpose** (UX-DR44): a link-styled button, shown with or without a
 * Purpose. It turns the line into a one-line field labelled "Purpose",
 * prefilled, with **Save** and **Cancel**; Enter saves and Esc cancels.
 * Saving sends `edit-purpose` (Save is `aria-disabled` in flight); an empty
 * Purpose clears the line. After Save or Cancel, focus returns to **Edit
 * Purpose**. On couldn't save the field stays open with the typed value, and
 * the `alert` region shows as one line directly below it.
 */
export default function EditPurpose({ bookId, purpose }: Props) {
  const fieldId = useId()
  const sendPurpose = useEditPurpose()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const inFlight = useRef(false)
  const mounted = useRef(true)
  const editButton = useRef<HTMLButtonElement>(null)
  const field = useRef<HTMLInputElement>(null)
  const regionSlot = useRef<HTMLDivElement>(null)
  // Set when the field closes, so focus returns to Edit Purpose once it is back.
  const [refocus, setRefocus] = useState(0)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  useEffect(() => {
    if (refocus > 0) editButton.current?.focus()
  }, [refocus])

  useEffect(() => {
    if (editing) field.current?.focus()
  }, [editing])

  // After a failure the live regions sit in the slot below the field, so the
  // alert line shows there; they go back when it closes or saves again.
  useLayoutEffect(() => {
    const slot = regionSlot.current
    if (!failed || !slot) return
    adoptRegions(slot)
    return () => {
      // The line must not outlive the field.
      clearAnnouncements()
      releaseRegions(slot)
    }
  }, [failed])

  const open = () => {
    setValue(purpose ?? '')
    setFailed(false)
    setEditing(true)
  }

  const close = () => {
    setFailed(false)
    setEditing(false)
    setRefocus((count) => count + 1)
  }

  const cancel = () => {
    if (inFlight.current) return
    close()
  }

  const save = async () => {
    if (inFlight.current) return
    inFlight.current = true
    setFailed(false)
    setBusy(true)
    // Sent as typed: the server trims it, and stores null when nothing is left.
    const result = await sendPurpose(bookId, value)
    inFlight.current = false
    if (!mounted.current) {
      // The block went (the Reading was finished or the Book deleted elsewhere): say why in `alert`.
      if (result.kind !== 'ok') announce('alert', result.message)
      return
    }
    setBusy(false)
    if (result.kind === 'ok') {
      close()
      return
    }
    setFailed(true)
    announce('alert', result.message)
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void save()
  }

  // On the form, so Esc cancels from the field, Save or Cancel.
  const keyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key !== 'Escape') return
    event.preventDefault()
    event.stopPropagation()
    cancel()
  }

  if (editing) {
    const reason = busy ? SAVING : undefined
    return (
      <form className={styles.form} onSubmit={submit} onKeyDown={keyDown}>
        <div className={styles.row}>
          <label htmlFor={fieldId} className={styles.label}>
            Purpose
          </label>
          <input
            ref={field}
            id={fieldId}
            className={styles.input}
            value={value}
            autoComplete="off"
            onChange={(event) => setValue(event.target.value)}
          />
          <Button type="submit" variant="primary" disabledReason={reason}>
            Save
          </Button>
          <Button disabledReason={reason} onClick={cancel}>
            Cancel
          </Button>
        </div>
        <div ref={regionSlot} className={styles.regions} data-show-alert={failed ? 'true' : undefined} />
      </form>
    )
  }

  return (
    <div className={styles.line}>
      {purpose !== null && (
        <p className={styles.purpose}>
          <span className={styles.label}>Purpose</span>
          <span className={styles.value}>{purpose}</span>
        </p>
      )}
      <button ref={editButton} type="button" className={`linkButton ${styles.edit}`} onClick={open}>
        Edit Purpose
      </button>
    </div>
  )
}
