import { Link } from 'react-router'
import styles from './NotFoundPage.module.css'

export default function NotFoundPage() {
  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Page not found</h1>
      <p>
        <Link to="/">Back to the catalog</Link>
      </p>
    </main>
  )
}
