import { useId, type ChangeEvent, type ReactNode, type Ref } from 'react'
import styles from './FileField.module.css'

type Props = {
  /** Visible label, which is exactly the field's accessible name. */
  label: string
  /** The file types the picker offers; the server still checks every file. */
  accept?: string
  /** One-line message shown below an invalid field. */
  error?: string
  /** A line below the field that describes it (e.g. a pending removal). */
  note?: string
  /** A control shown beside the field (e.g. Remove cover). */
  action?: ReactNode
  /** The chosen file, or `null` when the choice was cleared. */
  onChoose: (file: File | null) => void
  ref?: Ref<HTMLInputElement>
}

/**
 * A labelled file field (`input type=file`), laid out like a Text field: the
 * label is exactly its accessible name, and the note and the error message
 * are its description. The file is sent as is; nothing is checked here.
 */
export default function FileField({ label, accept, error, note, action, onChoose, ref }: Props) {
  const id = useId()
  const noteId = `${id}-note`
  const messageId = `${id}-message`
  const describedBy = [note ? noteId : undefined, error ? messageId : undefined].filter(Boolean).join(' ')
  const choose = (event: ChangeEvent<HTMLInputElement>) => onChoose(event.target.files?.[0] ?? null)
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <div className={styles.row}>
        <input
          ref={ref}
          id={id}
          type="file"
          accept={accept}
          className={styles.input}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy || undefined}
          onChange={choose}
        />
        {action}
      </div>
      {note && (
        <p id={noteId} className={styles.note}>
          {note}
        </p>
      )}
      {error && (
        <p id={messageId} className={styles.message}>
          {error}
        </p>
      )}
    </div>
  )
}
