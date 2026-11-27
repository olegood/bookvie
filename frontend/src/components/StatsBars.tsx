import { useImperativeHandle, useLayoutEffect, useRef, useState, type KeyboardEvent, type Ref } from 'react'
import type { StatsBucket } from '../api/index.ts'
import { barLines, barName, barShare, formatCount, periodName } from '../lib/stats.ts'
import styles from './StatsBars.module.css'

/** What the page can do with the chart: focus its Tab stop, or one bar. */
export type StatsBarsHandle = {
  /** Focuses the chart's Tab stop; false when no bar has finishes. */
  focusStop: () => boolean
  /** Focuses the bar for `period`; false when it isn't a bar with finishes. */
  focusBar: (period: string) => boolean
}

type Props = {
  bucket: 'month' | 'year'
  buckets: StatsBucket[]
  /** The selected bar's period, or `null`. The page passes only a bar with finishes in these buckets. */
  selected: string | null
  /** False while `keepPreviousData` shows the previous range's view: then no bar is a button. */
  interactive: boolean
  /** A press on the bar for `period`; the page decides what it means. */
  onToggle: (period: string) => void
  /** Called while a focused bar's button is being removed, so the page can move focus on. */
  onFocusLost?: (period: string) => void
  /** A change forgets the last focused bar: the person's range (`selectionKey`). */
  resetKey: string
  ref?: Ref<StatsBarsHandle>
}

/**
 * DESIGN.md → Monthly bars: one bar per bucket, the pages above and the period
 * below. The chart is a `group` (Story 17.2): each bucket with finishes is a
 * toggle button named from it, and the chart is one roving Tab stop; an empty
 * bucket's column stays plain and `aria-hidden`. The same buckets are a visually
 * hidden table for assistive tech. The server sends the numbers; this only draws
 * them, and never announces.
 */
export default function StatsBars({
  bucket,
  buckets,
  selected,
  interactive,
  onToggle,
  onFocusLost,
  resetKey,
  ref,
}: Props) {
  // The last focused bar, forgotten when the range changes. Adjusted during render.
  const [lastFocused, setLastFocused] = useState<string | null>(null)
  const [seenKey, setSeenKey] = useState(resetKey)
  if (seenKey !== resetKey) {
    setSeenKey(resetKey)
    setLastFocused(null)
  }

  const buttons = useRef(new Map<string, HTMLButtonElement>())
  const focusLost = useRef(onFocusLost)
  useLayoutEffect(() => {
    focusLost.current = onFocusLost
  })
  // One stable ref callback per period, so a re-render doesn't detach and re-attach the buttons.
  const [refFor] = useState(() => {
    const callbacks = new Map<string, (node: HTMLButtonElement | null) => (() => void) | undefined>()
    return (period: string) => {
      let callback = callbacks.get(period)
      if (callback === undefined) {
        callback = (node) => {
          if (node === null) return
          buttons.current.set(period, node)
          return () => {
            // Runs before the node leaves the document, so it still holds focus here.
            if (document.activeElement === node) focusLost.current?.(period)
            if (buttons.current.get(period) === node) buttons.current.delete(period)
          }
        }
        callbacks.set(period, callback)
      }
      return callback
    }
  })

  const bars = interactive ? buckets.filter((b) => b.books > 0).map((b) => b.period) : []
  const stop =
    lastFocused !== null && bars.includes(lastFocused)
      ? lastFocused
      : selected !== null && bars.includes(selected)
        ? selected
        : (bars.at(-1) ?? null)

  const focusBar = (period: string): boolean => {
    const button = buttons.current.get(period)
    if (button === undefined) return false
    button.focus()
    return true
  }
  useImperativeHandle(ref, () => ({ focusStop: () => stop !== null && focusBar(stop), focusBar }))

  // Bar keys, by name, on the chart. Enter and Space are the buttons' own.
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    // Modified keys (Cmd+Left for Back, and the like) are the browser's.
    if (event.altKey || event.metaKey || event.ctrlKey || event.shiftKey) return
    const index = bars.findIndex((period) => buttons.current.get(period) === event.target)
    if (index < 0) return
    let next: number
    switch (event.key) {
      case 'ArrowLeft':
        next = Math.max(0, index - 1)
        break
      case 'ArrowRight':
        next = Math.min(bars.length - 1, index + 1)
        break
      case 'Home':
        next = 0
        break
      case 'End':
        next = bars.length - 1
        break
      case 'ArrowUp':
      case 'ArrowDown':
        // Up and Down do nothing, not even scroll the page.
        event.preventDefault()
        return
      default:
        return
    }
    event.preventDefault()
    focusBar(bars[next])
  }

  if (buckets.length === 0) return null
  const max = Math.max(...buckets.map((b) => b.pages))
  // With no finishes at all, the chart is decoration, as before Epic 17: the table says it all.
  const chartRole = buckets.some((b) => b.books > 0)
    ? { role: 'group', 'aria-label': `Finished by ${bucket}`, onKeyDown }
    : { 'aria-hidden': true }
  return (
    <>
      <div className={styles.chart} {...chartRole}>
        {buckets.map((b, index) => {
          const content = (
            <>
              <span className={styles.value}>{formatCount(b.pages)}</span>
              <span className={styles.track}>
                {b.pages > 0 && <span className={styles.fill} style={{ height: `${barShare(b.pages, max) * 100}%` }} />}
              </span>
              <span className={styles.period}>
                {barLines(b.period, index === 0).map((line) => (
                  <span key={line} className={styles.line}>
                    {line}
                  </span>
                ))}
              </span>
            </>
          )
          if (!bars.includes(b.period)) {
            return (
              <div key={b.period} className={styles.column} aria-hidden="true">
                {content}
              </div>
            )
          }
          const look = b.period === selected ? styles.selected : selected !== null ? styles.dimmed : ''
          return (
            <button
              key={b.period}
              ref={refFor(b.period)}
              type="button"
              className={`${styles.column} ${styles.bar} ${look}`}
              aria-pressed={b.period === selected}
              aria-label={barName(b)}
              tabIndex={b.period === stop ? 0 : -1}
              onFocus={() => setLastFocused(b.period)}
              onClick={() => onToggle(b.period)}
            >
              {content}
            </button>
          )
        })}
      </div>
      <table className="visuallyHidden">
        <caption>Books and pages finished by {bucket}</caption>
        <thead>
          <tr>
            <th scope="col">Period</th>
            <th scope="col">Books</th>
            <th scope="col">Pages</th>
          </tr>
        </thead>
        <tbody>
          {buckets.map((b) => (
            <tr key={b.period}>
              <th scope="row">{periodName(b.period)}</th>
              <td>{formatCount(b.books)}</td>
              <td>{formatCount(b.pages)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
