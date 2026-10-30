import { isRouteErrorResponse, useRouteError } from 'react-router'
import { usePageTitle } from '../lib/page.ts'
import AppShell from '../components/AppShell.tsx'
import PageHeading from '../components/PageHeading.tsx'
import NotFoundPage from './NotFoundPage.tsx'
import styles from './NotFoundPage.module.css'

const TITLE = 'Something went wrong'

// A full page load, not a client-side Link: the page that crashed may be the catalog itself.
function Body() {
  return (
    <p className={styles.body}>
      Reload the page to try again. <a href="/">Back to the catalog</a>
    </p>
  )
}

function ErrorPage() {
  usePageTitle(TITLE)
  return (
    <div className={styles.page}>
      <PageHeading className={styles.title}>{TITLE}</PageHeading>
      <Body />
    </div>
  )
}

/** The layout route's error element: a 404 stays "Page not found"; anything else is a crash. */
export function RouteErrorPage() {
  const error = useRouteError()
  return <AppShell>{isRouteErrorResponse(error) && error.status === 404 ? <NotFoundPage /> : <ErrorPage />}</AppShell>
}

/**
 * The root route's error element, reached when the shell itself throws. It
 * renders nothing from the shell, so it can't fail the same way again.
 */
export function BareErrorPage() {
  usePageTitle(TITLE)
  return (
    <main className={styles.page}>
      <h1 className={styles.title}>{TITLE}</h1>
      <Body />
    </main>
  )
}
