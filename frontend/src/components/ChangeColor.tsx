import { useEffect, useId, useRef, useState } from 'react'
import { useSetSpineColor } from '../api/index.ts'
import { announce, clearAnnouncements } from '../lib/announce.ts'
import { colorLine, colorSetCopy, isPressed, pressedValue, type ColoredBook } from '../lib/spineColor.ts'
import FailureMessage from './FailureMessage.tsx'
import SwatchRow from './SwatchRow.tsx'
import styles from './ChangeColor.module.css'

type Props = {
  book: ColoredBook & { id: string; finished: boolean }
  /** `h2` on Book detail (a page block); `h3` in the Spine popover. */
  level: 2 | 3
  /** The heading's id, for a `section` that `aria-labelledby` it. */
  headingId?: string
}

/**
 * The Change color block (EXPERIENCE.md → Spine popover, Book detail → Change
 * color): heading, the color line with a dot in the current color, then
 * "From cover" (with a cover) and the eight curated swatches as toggle
 * buttons. A pick saves at once through `set-spine-color`; nothing changes on
 * screen until the refetched views render. Pressing the pressed swatch sends
 * nothing.
 */
export default function ChangeColor({ book, level, headingId }: Props) {
  const ownId = useId()
  const sendColor = useSetSpineColor()
  const [failure, setFailure] = useState<string | null>(null)
  // A pick while one is in flight is ignored even before anything renders.
  const inFlight = useRef(false)
  const mounted = useRef(true)
  const failed = useRef(false)
  // The saved pick, announced once the refetched view shows it pressed.
  const awaiting = useRef<string | null>(null)
  const [saved, setSaved] = useState(0)
  const spineColor = book.spineColor
  const pressed = pressedValue(book)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      // A couldn't-save line must not outlive the block (the popover closing).
      if (failed.current) clearAnnouncements()
    }
  }, [])

  useEffect(() => {
    if (awaiting.current === null || awaiting.current.toLowerCase() !== pressed.toLowerCase()) return
    awaiting.current = null
    announce('status', colorSetCopy(spineColor))
  }, [saved, pressed, spineColor])

  const pick = async (value: string) => {
    if (inFlight.current || isPressed(book, value)) return
    inFlight.current = true
    // A pick whose refetch never showed it is not announced later.
    awaiting.current = null
    failed.current = false
    clearAnnouncements()
    setFailure(null)
    const result = await sendColor(book.id, value === '' ? null : value)
    inFlight.current = false
    if (!mounted.current) return
    if (result.kind === 'ok') {
      awaiting.current = value
      setSaved((count) => count + 1)
      return
    }
    failed.current = true
    setFailure(result.message)
    announce('alert', result.message)
  }

  const Heading = level === 2 ? 'h2' : 'h3'
  return (
    <div className={styles.block}>
      <Heading id={headingId ?? ownId} className={styles.heading}>
        Change color
        {!book.finished && <small className={styles.later}> · shown once read</small>}
      </Heading>
      <p className={styles.line}>
        <span className={styles.dot} style={{ backgroundColor: spineColor }} aria-hidden="true" />
        {colorLine(book)}
      </p>
      <SwatchRow
        value={pressed}
        onPick={(value) => void pick(value)}
        fromCover={book.hasCover ? { color: book.spineColorFromCover } : undefined}
      />
      {failure !== null && (
        <div className={styles.failure}>
          <FailureMessage>{failure}</FailureMessage>
        </div>
      )}
    </div>
  )
}
