import { useId, type InputHTMLAttributes } from 'react'
import styles from './TextField.module.css'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'disabled' | 'id'> & {
  /** Visible label, which is exactly the field's accessible name. */
  label: string
  /** One-line message shown below an invalid field. */
  error?: string
}

/**
 * A labelled text field (DESIGN.md → Text field). "(required)" sits after the
 * label element, so it isn't part of the name; requiredness is `required`.
 */
export default function TextField({ label, error, required, className, ...rest }: Props) {
  const id = useId()
  const messageId = `${id}-message`
  const describedBy = [rest['aria-describedby'], error ? messageId : undefined].filter(Boolean).join(' ')
  return (
    <div className={[styles.field, className].filter(Boolean).join(' ')}>
      <div className={styles.labelRow}>
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
        {required && <span className={styles.required}>(required)</span>}
      </div>
      <input
        {...rest}
        id={id}
        required={required}
        className={styles.input}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy || undefined}
      />
      {error && (
        <p id={messageId} className={styles.message}>
          {error}
        </p>
      )}
    </div>
  )
}
