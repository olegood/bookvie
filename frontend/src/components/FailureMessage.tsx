import type { ReactNode } from 'react'
import styles from './FailureMessage.module.css'

/** One calm line below the action that failed: no icon, no colour, no box. */
export default function FailureMessage({ children }: { children: ReactNode }) {
  return <p className={styles.message}>{children}</p>
}
