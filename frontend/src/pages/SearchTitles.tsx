import { useId, type KeyboardEvent, type Ref } from 'react'
import styles from './SearchTitles.module.css'

type Props = {
  value: string
  onChange: (value: string) => void
  /** The input, so the page can focus it (when no spine remains). */
  inputRef?: Ref<HTMLInputElement>
}

/**
 * Search titles (EXPERIENCE.md → Search field): a visible label, no
 * placeholder. Esc in a non-empty field clears it.
 */
export default function SearchTitles({ value, onChange, inputRef }: Props) {
  const id = useId()
  const keyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape' && value !== '') {
      event.preventDefault()
      onChange('')
    }
  }
  return (
    <div className={styles.search}>
      <label htmlFor={id} className={styles.label}>
        Search titles
      </label>
      <div className={styles.box}>
        <svg className={styles.glyph} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M10.5 10.5 14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          id={id}
          ref={inputRef}
          type="search"
          className={styles.input}
          value={value}
          autoComplete="off"
          spellCheck={false}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={keyDown}
        />
      </div>
    </div>
  )
}
