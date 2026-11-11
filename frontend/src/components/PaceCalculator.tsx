import { useId, useState } from 'react'
import { pacePrefill, paceResult } from '../lib/pace.ts'
import { useNow } from '../lib/relativeDay.ts'
import styles from './PaceCalculator.module.css'

/**
 * The pace calculator (EXPERIENCE.md → Pace calculator, DESIGN.md → Pace
 * calculator): a "pages/day" field prefilled with Measured pace to one
 * decimal (empty without one), and an `output` with "About N days · D Month"
 * for the typed pace, recomputed on every keystroke with no request. Any text
 * that isn't a positive number shows no result, no message and no error
 * styling. With nothing left to read it shows only "Nothing left to read.".
 *
 * The server supplies `pagesLeft` and `measuredPace`; the arithmetic, the
 * browser's today (`useNow`, AD-20) and the copy are the client's (AD-6).
 * The `output` has `role="none"`: its implicit `status` role would add a
 * second live region to the page, and a line that changes on every keystroke
 * shouldn't be announced. The field is described by it instead.
 *
 * The typed text is the state, so a view refetch keeps it; key the component
 * by the Book's id to reset it when another Book opens.
 */
export default function PaceCalculator({
  pagesLeft,
  measuredPace,
}: {
  pagesLeft: number
  measuredPace: number | null
}) {
  const [typed, setTyped] = useState(() => pacePrefill(measuredPace))
  const now = useNow()
  const fieldId = useId()
  const outputId = useId()
  if (pagesLeft <= 0) return <p className={styles.nothing}>Nothing left to read.</p>
  return (
    <div className={styles.row}>
      <input
        id={fieldId}
        className={styles.input}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={typed}
        onChange={(event) => setTyped(event.target.value)}
        aria-describedby={outputId}
      />
      <label htmlFor={fieldId} className={styles.label}>
        pages/day
      </label>
      <output htmlFor={fieldId} id={outputId} role="none" className={styles.result}>
        {paceResult(pagesLeft, typed, now) ?? ''}
      </output>
    </div>
  )
}
