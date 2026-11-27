import { starsLabel } from '../lib/bookDetail.ts'
import styles from './RatingStars.module.css'

/**
 * A Reading's rating as five 14px stars, filled up to it: one image named
 * "4 stars" ("1 star"). Filled `accent`, the rest outlined `input-border`,
 * never gold (DESIGN.md → Book detail Readings, Stats finished list).
 */
export default function RatingStars({ rating }: { rating: number }) {
  return (
    <span role="img" aria-label={starsLabel(rating)} className={styles.stars}>
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={styles.star}
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
          data-filled={star <= rating ? 'true' : undefined}
        >
          <path
            d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z"
            fill={star <= rating ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </span>
  )
}
