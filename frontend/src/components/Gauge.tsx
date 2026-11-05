import { gaugePageLine, gaugeTicks, gaugeValueText } from '../lib/gauge.ts'
import styles from './Gauge.module.css'

type Props = {
  /** The Book's title, for the progressbar's name ("*Title* progress"). */
  title: string
  page: number
  pages: number
  /** The server's `floor(page × 100 ÷ pages)` (AD-6); never computed here. */
  percent: number
}

/**
 * The gauge (EXPERIENCE.md → Gauge): the percentage figure and "p.N of M",
 * a progressbar track whose `aria-valuetext` reads "64%, page 212 of 330",
 * and the ticks 0 · half · total (the half dropped under 4 pages).
 */
export default function Gauge({ title, page, pages, percent }: Props) {
  return (
    <div className={styles.gauge}>
      <div className={styles.head}>
        <p className={styles.figure}>
          {percent}
          <small className={styles.unit}>%</small>
        </p>
        <p className={styles.page}>{gaugePageLine(page, pages)}</p>
      </div>
      <div
        className={styles.track}
        role="progressbar"
        aria-label={`${title} progress`}
        aria-valuemin={0}
        aria-valuenow={page}
        aria-valuemax={pages}
        aria-valuetext={gaugeValueText(percent, page, pages)}
      >
        <span className={styles.fill} style={{ width: `${percent}%` }} />
      </div>
      <div className={styles.ticks} aria-hidden="true">
        {gaugeTicks(pages).map((tick) => (
          <span key={tick}>{tick}</span>
        ))}
      </div>
    </div>
  )
}
