import { Link } from 'react-router'
import { usePageTitle } from '../lib/page.ts'
import PageHeading from '../components/PageHeading.tsx'
import styles from './NotFoundPage.module.css'

export default function NotFoundPage() {
  usePageTitle('Page not found')
  return (
    <div className={styles.page}>
      <PageHeading className={styles.title}>Page not found</PageHeading>
      <p className={styles.body}>
        <Link to="/">Back to the catalog</Link>
      </p>
    </div>
  )
}
