import { useId, useState, type KeyboardEvent } from 'react'
import { pickTag, tagSuggestions } from '../lib/catalog.ts'
import fieldStyles from './TextField.module.css'
import styles from './TagsCombobox.module.css'

type Props = {
  label: string
  value: string
  onChange: (value: string) => void
  /** The library's existing tags. */
  tags: readonly string[]
  error?: string
}

/**
 * Tags (EXPERIENCE.md → Tags): free comma-separated text with a `combobox`
 * whose `listbox` suggests existing tags that start with the segment being
 * typed. Up and Down move through the suggestions, Enter picks the active one
 * (without submitting the form), Esc closes the list. Any other text is always allowed.
 */
export default function TagsCombobox({ label, value, onChange, tags, error }: Props) {
  const id = useId()
  const listId = `${id}-list`
  const messageId = `${id}-message`
  const [active, setActive] = useState(-1)
  const [dismissed, setDismissed] = useState(false)
  const suggestions = tagSuggestions(tags, value)
  const open = !dismissed && suggestions.length > 0
  const activeIndex = open && active < suggestions.length ? active : -1

  const change = (next: string) => {
    onChange(next)
    setActive(-1)
    setDismissed(false)
  }
  const pick = (tag: string) => {
    onChange(pickTag(value, tag))
    setActive(-1)
  }

  const keyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        if (!open) {
          if (suggestions.length > 0) setDismissed(false)
          return
        }
        event.preventDefault()
        const last = suggestions.length - 1
        if (event.key === 'ArrowDown') setActive(activeIndex >= last ? 0 : activeIndex + 1)
        else setActive(activeIndex <= 0 ? last : activeIndex - 1)
        return
      }
      case 'Enter':
        // Enter picks the active suggestion; with none active it submits.
        if (activeIndex >= 0) {
          event.preventDefault()
          pick(suggestions[activeIndex])
        }
        return
      case 'Escape':
        if (open) {
          // Close the list, not the panel.
          event.preventDefault()
          event.stopPropagation()
          setDismissed(true)
          setActive(-1)
        }
        return
    }
  }

  const describedBy = error ? messageId : undefined
  return (
    <div className={fieldStyles.field}>
      <div className={fieldStyles.labelRow}>
        <label htmlFor={id} className={fieldStyles.label}>
          {label}
        </label>
      </div>
      <div className={styles.wrap}>
        <input
          id={id}
          type="text"
          role="combobox"
          autoComplete="off"
          className={fieldStyles.input}
          value={value}
          aria-autocomplete="list"
          aria-expanded={open ? 'true' : 'false'}
          aria-controls={listId}
          aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          onChange={(event) => change(event.target.value)}
          onKeyDown={keyDown}
          onBlur={() => setDismissed(true)}
          onFocus={() => setDismissed(false)}
        />
        <ul id={listId} role="listbox" aria-label="Tag suggestions" className={styles.list} hidden={!open}>
          {open &&
            suggestions.map((tag, index) => (
              <li
                key={tag}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === activeIndex ? 'true' : 'false'}
                className={styles.option}
                // Keep focus in the field while a suggestion is clicked.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => pick(tag)}
              >
                {tag}
              </li>
            ))}
        </ul>
      </div>
      {error && (
        <p id={messageId} className={fieldStyles.message}>
          {error}
        </p>
      )}
    </div>
  )
}
