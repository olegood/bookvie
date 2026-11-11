import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useStatsView, type StatsRange } from '../api/index.ts'
import Button from '../components/Button.tsx'
import FailureMessage from '../components/FailureMessage.tsx'
import PageHeading from '../components/PageHeading.tsx'
import RangePicker from '../components/RangePicker.tsx'
import TextField from '../components/TextField.tsx'
import { announce, clearAnnouncements } from '../lib/announce.ts'
import { COULDNT_LOAD } from '../lib/copy.ts'
import { usePageTitle } from '../lib/page.ts'
import { useNow } from '../lib/relativeDay.ts'
import {
  DEFAULT_PRESET,
  formatCount,
  isIsoDate,
  NO_BOOKS_IN_RANGE,
  NO_BOOKS_YET,
  orderedRange,
  presetRange,
  statsLine,
  type RangePreset,
} from '../lib/stats.ts'
import styles from './StatsPage.module.css'

/**
 * What the user chose, independent of today: a preset, or Custom's ordered
 * range. The announcement follows a change of this, never a refetch or a new day.
 */
function selectionKey(preset: RangePreset, range: StatsRange | null): string {
  if (preset !== 'custom') return preset
  return range === null || range === 'all' ? 'custom' : `custom:${range.from}:${range.to}`
}

export default function StatsPage() {
  usePageTitle('Stats')
  const now = useNow()
  // Not persisted: every visit starts on This year.
  const [preset, setPreset] = useState<RangePreset>(DEFAULT_PRESET)
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  const range: StatsRange | null = preset === 'custom' ? orderedRange(customFrom, customTo) : presetRange(preset, now)
  const stats = useStatsView(range)
  const selection = selectionKey(preset, range)
  const failed = stats.status === 'failed'

  // The selection whose result was last announced; the default's own result never is.
  const announced = useRef(selection)
  const ready = stats.status === 'ready' && stats.current
  const view = stats.status === 'ready' ? stats.data.view : null
  useEffect(() => {
    if (!ready || view === null) return
    if (announced.current === selection) return
    announced.current = selection
    announce('status', statsLine(view.books, view.pages))
  }, [ready, selection, view])

  // The couldn't-load line is shown in `main` and set in the shell's alert.
  useEffect(() => {
    if (!failed) return
    announce('alert', COULDNT_LOAD)
    return clearAnnouncements
  }, [failed])

  const choose = (next: RangePreset) => {
    if (next === preset) return
    if (next === 'custom') {
      // Custom starts at the range of the preset pressed before it; empty after All time.
      const start = presetRange(preset === 'custom' ? DEFAULT_PRESET : preset, now)
      setCustomFrom(start === 'all' ? '' : start.from)
      setCustomTo(start === 'all' ? '' : start.to)
    }
    setPreset(next)
  }

  // To before From: the two swap silently once focus leaves either field. Chromium
  // keeps focus inside a date input on Tab (it moves to the next segment), so a Tab
  // counts as leaving too; a change alone doesn't, since it fires per segment.
  const swapOnTab = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Tab') swapIfReversed()
  }
  const swapIfReversed = () => {
    if (isIsoDate(customFrom) && isIsoDate(customTo) && customTo < customFrom) {
      setCustomFrom(customTo)
      setCustomTo(customFrom)
    }
  }

  const tryAgain = () => {
    if (stats.status !== 'failed') return
    document.getElementById('main')?.focus()
    stats.retry()
  }

  const shown = stats.status === 'ready' ? stats.data : null

  return (
    <div className={styles.page}>
      <PageHeading className={styles.title}>Stats</PageHeading>
      <RangePicker value={preset} onChange={choose} />
      {preset === 'custom' && (
        <div className={styles.custom}>
          <TextField
            label="From"
            type="date"
            value={customFrom}
            onChange={(event) => setCustomFrom(event.target.value)}
            onBlur={swapIfReversed}
            onKeyDown={swapOnTab}
          />
          <TextField
            label="To"
            type="date"
            value={customTo}
            onChange={(event) => setCustomTo(event.target.value)}
            onBlur={swapIfReversed}
            onKeyDown={swapOnTab}
          />
        </div>
      )}
      {stats.status === 'failed' && (
        <div className={styles.failure}>
          <FailureMessage>{COULDNT_LOAD}</FailureMessage>
          <Button onClick={tryAgain}>Try again</Button>
        </div>
      )}
      {shown !== null && (
        <>
          <div className={styles.totals}>
            <div className={styles.total}>
              <p className={styles.figure}>{formatCount(shown.view.books)}</p>
              <p className={styles.caption}>books finished</p>
            </div>
            <div className={styles.total}>
              <p className={styles.figure}>{formatCount(shown.view.pages)}</p>
              <p className={styles.caption}>pages finished</p>
            </div>
          </div>
          {shown.view.books === 0 && (
            <p className={styles.empty}>{shown.range === 'all' ? NO_BOOKS_YET : NO_BOOKS_IN_RANGE}</p>
          )}
        </>
      )}
    </div>
  )
}
