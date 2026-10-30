import { useId, type SelectHTMLAttributes } from 'react'
import styles from './TextField.module.css'

type Props = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'disabled' | 'id'> & {
  /** Visible label, which is exactly the field's accessible name. */
  label: string
  /** One-line message shown below an invalid field. */
  error?: string
  /** `[value, label]` pairs, after an empty first option. */
  options: readonly (readonly [string, string])[]
}

/** A labelled native `select` with the Text field's layout and states. */
export default function SelectField({ label, error, required, options, className, ...rest }: Props) {
  const id = useId()
  const messageId = `${id}-message`
  return (
    <div className={[styles.field, className].filter(Boolean).join(' ')}>
      <div className={styles.labelRow}>
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
        {required && <span className={styles.required}>(required)</span>}
      </div>
      <select
        {...rest}
        id={id}
        required={required}
        className={styles.input}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? messageId : undefined}
      >
        <option value="" />
        {options.map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
      {error && (
        <p id={messageId} className={styles.message}>
          {error}
        </p>
      )}
    </div>
  )
}
