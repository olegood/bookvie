import type { StatsBucket } from '../api/index.ts'
import { barLines, barShare, formatCount, periodName } from '../lib/stats.ts'
import styles from './StatsBars.module.css'

type Props = {
  bucket: 'month' | 'year'
  buckets: StatsBucket[]
}

/**
 * DESIGN.md → Monthly bars: one bar per bucket, the pages above and the period
 * below. The chart is decorative (`aria-hidden`); the same buckets are a visually
 * hidden table for assistive tech. The server sends the numbers; this only draws them.
 */
export default function StatsBars({ bucket, buckets }: Props) {
  if (buckets.length === 0) return null
  const max = Math.max(...buckets.map((b) => b.pages))
  return (
    <>
      <div className={styles.chart} aria-hidden="true">
        {buckets.map((b, index) => (
          <div key={b.period} className={styles.column}>
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
          </div>
        ))}
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
