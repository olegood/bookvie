import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useLocation, useNavigate, useNavigationType, useSearchParams } from 'react-router'
import { useStatsView } from '../api/index.ts'
import Button from '../components/Button.tsx'
import FailureMessage from '../components/FailureMessage.tsx'
import PageHeading from '../components/PageHeading.tsx'
import RangePicker from '../components/RangePicker.tsx'
import StatsBars, { type StatsBarsHandle } from '../components/StatsBars.tsx'
import StatsFinishedList from '../components/StatsFinishedList.tsx'
import TextField from '../components/TextField.tsx'
import { announce, clearAnnouncements, clearStatus } from '../lib/announce.ts'
import { COULDNT_LOAD } from '../lib/copy.ts'
import { samePageState, useNavigatedHere, usePageTitle } from '../lib/page.ts'
import { useNow } from '../lib/relativeDay.ts'
import {
  arrivalSearch,
  DEFAULT_PRESET,
  finishedHeading,
  formatCount,
  isIsoDate,
  NO_BOOKS_IN_RANGE,
  NO_BOOKS_YET,
  orderedRange,
  parsePeriod,
  parseStatsAddress,
  periodHeading,
  periodLine,
  selectionKey,
  selectionRange,
  statsLine,
  statsSearch,
  validPeriod,
  type RangePreset,
  type StatsSelection,
} from '../lib/stats.ts'
import styles from './StatsPage.module.css'

/**
 * Stats (FR-16, AD-6, Stories 17.1 and 17.2). The range lives in the address
 * (`?range=…`, Custom with `from` and `to`): a plain `/stats` is This year. A
 * selected bar adds `period` last; it is checked only against a settled view,
 * and never sent to the server.
 * Each route change (the nav link, a link, Back, Forward) gets a fresh body,
 * keyed by `lib/page`'s page key, which re-reads the address; the person's own
 * range changes replace the address with the same-page marker, so the body,
 * focus and scroll stay.
 */
export default function StatsPage() {
  usePageTitle('Stats')
  const { key } = useNavigatedHere()
  return <StatsBody key={key} />
}

function StatsBody() {
  const now = useNow()
  const [params] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  // The committed selection: what the address names, every render. It alone drives the view.
  const committed = parseStatsAddress(params)
  const committedKey = selectionKey(committed)
  // The address's bar: well formed or `null`. Whether it is a bar with finishes is the shown view's to say.
  const period = parsePeriod(params)
  const hasPeriod = params.has('period')
  const stats = useStatsView(selectionRange(committed, now))
  const failed = stats.status === 'failed'

  // The picker and Custom's fields are page state, seeded from the address on mount.
  const [preset, setPreset] = useState<RangePreset>(committed.preset)
  const [customFrom, setCustomFrom] = useState(committed.preset === 'custom' ? committed.range.from : '')
  const [customTo, setCustomTo] = useState(committed.preset === 'custom' ? committed.range.to : '')

  // The selection whose view is shown: while `keepPreviousData` holds the previous range's view, the
  // heading and the list stay that view's, like its numbers and bars.
  // Adjusted during render, React's pattern for state derived from a change.
  const [shownSelection, setShownSelection] = useState<StatsSelection>(committed)
  if (stats.current && selectionKey(shownSelection) !== committedKey) setShownSelection(committed)

  /** Replaces the whole search with `selection`'s (and the bar's `period`), carrying the same-page marker. */
  const write = (selection: StatsSelection, bar: string | null = null) => {
    const search = `?${statsSearch(selection, bar)}`
    if (search === location.search) return
    void navigate({ pathname: location.pathname, search }, { replace: true, state: samePageState() })
  }

  // Arrival: a bad, reversed or half address is replaced, quietly, with what the page shows (`arrivalSearch`).
  const [arrival] = useState(() => arrivalSearch(params))
  useEffect(() => {
    if (arrival === null) return
    void navigate({ pathname: location.pathname, search: `?${arrival}` }, { replace: true, state: samePageState() })
    // `arrival` and the path are fixed for the body: a route change remounts it.
  }, [arrival, location.pathname, navigate])

  // Each entry starts at the top, before `PageHeading`'s passive effect focuses the `h1`, with nothing
  // left in the regions from the page before.
  const { navigated } = useNavigatedHere()
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
    if (navigated) clearAnnouncements()
    // `navigated` is fixed for the body: it changes only with a route change, which remounts it.
  }, [navigated])
  // On a client-side Back or Forward, the browser restores the entry's old scroll position right after the
  // router has rendered it, so scroll again when the view is ready and once more on the next frame, before
  // it paints (as Card notes does). Only then: on a first load a queued frame could undo a later scroll.
  const navigationType = useNavigationType()
  const [restored] = useState(() => navigated && navigationType === 'POP')
  const ready = stats.status === 'ready'
  const scrolledReady = useRef(false)
  useLayoutEffect(() => {
    if (!restored || !ready || scrolledReady.current) return
    window.scrollTo({ top: 0, behavior: 'auto' })
    // Marked done only when the frame runs, so a StrictMode re-run schedules it again.
    const frame = requestAnimationFrame(() => {
      scrolledReady.current = true
      window.scrollTo({ top: 0, behavior: 'auto' })
    })
    return () => cancelAnimationFrame(frame)
  }, [restored, ready])

  // The selection whose result was last announced: the mounted one never is, so arrival (the nav, a
  // reload, Back, a link with a range) and the fallback say nothing; only the person's change speaks.
  const announced = useRef(committedKey)
  const view = stats.status === 'ready' ? stats.data.view : null
  const currentView = stats.current ? view : null
  useEffect(() => {
    if (currentView === null) return
    if (announced.current === committedKey) return
    announced.current = committedKey
    announce('status', statsLine(currentView.books, currentView.pages))
  }, [currentView, committedKey])

  // The couldn't-load line is shown in `main` and set in the shell's alert.
  useEffect(() => {
    if (!failed) return
    announce('alert', COULDNT_LOAD)
    return clearAnnouncements
  }, [failed])

  /** Writes Custom's range once both fields hold a complete, valid range, in order, and it is a new range. */
  const commitCustom = (from: string, to: string) => {
    const range = orderedRange(from, to)
    if (range === null) return
    const next: StatsSelection = { preset: 'custom', range }
    if (selectionKey(next) !== committedKey) write(next)
  }

  const choose = (next: RangePreset) => {
    if (next === preset) return
    setPreset(next)
    if (next !== 'custom') {
      write({ preset: next })
      return
    }
    // Custom starts at the range of the preset pressed before it; empty after All time.
    const start = selectionRange({ preset: preset === 'custom' ? DEFAULT_PRESET : preset }, now)
    const from = start === 'all' ? '' : start.from
    const to = start === 'all' ? '' : start.to
    setCustomFrom(from)
    setCustomTo(to)
    commitCustom(from, to)
  }

  const changeFrom = (value: string) => {
    setCustomFrom(value)
    commitCustom(value, customTo)
  }
  const changeTo = (value: string) => {
    setCustomTo(value)
    commitCustom(customFrom, value)
  }

  // To before From: the two swap silently once focus leaves either field. Chromium
  // keeps focus inside a date input on Tab (it moves to the next segment), so a Tab
  // counts as leaving too; a change alone doesn't, since it fires per segment. The
  // address already holds the range in order.
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

  // Story 17.2. While `keepPreviousData` holds another range's view, no bar is a button and the list isn't
  // narrowed. A held view of the same selection (a preset's dates moving to a new day) stays interactive.
  // Otherwise the address's period is the selected bar when the shown view has it as a bar with finishes,
  // even while a refetch runs (so Back shows it at once).
  const interactive = shown !== null && (stats.current || selectionKey(shownSelection) === committedKey)
  const selected = interactive && validPeriod(period, shown.view) ? period : null
  // Settled: the committed range's own view, with no fetch running; a failed refetch's kept copy counts.
  const settled = shown !== null && stats.current && !stats.fetching
  const chart = useRef<StatsBarsHandle>(null)
  const page = useRef<HTMLDivElement>(null)
  // Whether a control held focus when it left the document (a bar's button, Show the whole range or a row's
  // link that a refetch removed), until the focus move below.
  const lostFocus = useRef(false)
  const loseFocus = useCallback(() => {
    lostFocus.current = true
  }, [])
  // Whether this body has shown a selected bar: only then does a drop empty the status line it spoke.
  const shownPeriod = useRef(false)

  // A `period` that isn't a bar with finishes in the settled view is dropped, quietly: on arrival, or when
  // a refetch empties the selected bar. After a shown period, its status line goes with it; the alert stays.
  const dropPeriod = settled && hasPeriod && selected === null
  const rangeSearch = statsSearch(committed)
  useEffect(() => {
    if (!dropPeriod) return
    if (shownPeriod.current) clearStatus()
    void navigate({ pathname: location.pathname, search: `?${rangeSearch}` }, { replace: true, state: samePageState() })
  }, [dropPeriod, rangeSearch, location.pathname, navigate])
  useEffect(() => {
    if (selected !== null) shownPeriod.current = true
  }, [selected])

  // Focus that a removed control held moves to the chart's Tab stop, else the h1: once the view settles, or
  // at once when the fetch failed, so a later recovery never moves it. Checked after every render:
  // `lostFocus` is a ref. Never off a control the person is on.
  useEffect(() => {
    if (!lostFocus.current || !(settled || failed)) return
    lostFocus.current = false
    const active = document.activeElement
    if (active !== null && active !== document.body) return
    if (!chart.current?.focusStop()) page.current?.querySelector<HTMLElement>('h1')?.focus()
  })

  /** A press on a bar: select it and announce its books, or, when it is the selected one, widen the list. */
  const toggle = (bar: string) => {
    if (shown === null || !interactive) return
    if (bar === selected) {
      write(committed)
      announce('status', statsLine(shown.view.books, shown.view.pages))
      return
    }
    const bucket = shown.view.buckets.find((b) => b.period === bar)
    if (bucket === undefined || bucket.books === 0) return
    write(committed, bar)
    announce('status', periodLine(bucket))
  }

  /** Show the whole range: widen the list, and focus the bar that was selected, now the chart's Tab stop. */
  const showWholeRange = () => {
    if (shown === null || selected === null) return
    write(committed)
    announce('status', statsLine(shown.view.books, shown.view.pages))
    chart.current?.focusBar(selected)
  }

  const finishes =
    shown === null
      ? []
      : selected === null
        ? shown.view.finishes
        : shown.view.finishes.filter((finish) => finish.finishDate.startsWith(selected))

  return (
    <div ref={page} className={styles.page}>
      <PageHeading className={styles.title}>Stats</PageHeading>
      <RangePicker value={preset} onChange={choose} />
      {preset === 'custom' && (
        <div className={styles.custom}>
          <TextField
            label="From"
            type="date"
            value={customFrom}
            onChange={(event) => changeFrom(event.target.value)}
            onBlur={swapIfReversed}
            onKeyDown={swapOnTab}
          />
          <TextField
            label="To"
            type="date"
            value={customTo}
            onChange={(event) => changeTo(event.target.value)}
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
          <div className={styles.totals} role="group" aria-label="Totals">
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
          <StatsBars
            ref={chart}
            bucket={shown.view.bucket}
            buckets={shown.view.buckets}
            selected={selected}
            interactive={interactive}
            onToggle={toggle}
            onFocusLost={loseFocus}
            resetKey={committedKey}
          />
          <StatsFinishedList
            heading={selected === null ? finishedHeading(shownSelection) : periodHeading(selected)}
            finishes={finishes}
            onShowWholeRange={selected === null ? undefined : showWholeRange}
            onFocusLost={loseFocus}
          />
        </>
      )}
    </div>
  )
}
