import { useState } from 'react'
import { applyTheme, readTheme, THEMES, writeTheme, type Theme } from '../lib/theme.ts'
import styles from './ThemeToggle.module.css'

const LABELS: Record<Theme, string> = { light: 'Light', dark: 'Dark', system: 'System' }

function Glyph({ theme }: { theme: Theme }) {
  return (
    <svg className={styles.glyph} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      {theme === 'light' && (
        <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <circle cx="8" cy="8" r="3" />
          <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3 3l1 1M12 12l1 1M3 13l1-1M12 4l1-1" />
        </g>
      )}
      {theme === 'dark' && <path fill="currentColor" d="M10.5 2a6 6 0 1 0 3.5 10.9A6.5 6.5 0 0 1 10.5 2Z" />}
      {theme === 'system' && (
        <g>
          <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path fill="currentColor" d="M8 2a6 6 0 0 0 0 12Z" />
        </g>
      )}
    </svg>
  )
}

/** Light / Dark / System segmented control; the switch is instant. */
export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(readTheme)
  const choose = (next: Theme) => {
    setTheme(next)
    applyTheme(next)
    writeTheme(next)
  }
  return (
    <div role="group" aria-label="Theme" className={styles.group}>
      {THEMES.map((option) => (
        <button
          key={option}
          type="button"
          className={styles.option}
          aria-pressed={theme === option}
          onClick={() => choose(option)}
        >
          <Glyph theme={option} />
          {LABELS[option]}
        </button>
      ))}
    </div>
  )
}
