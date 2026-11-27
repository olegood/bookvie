import { useRef, type MouseEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { NavLink, Outlet, useLocation } from 'react-router'
import { useAppInfo } from '../api/views.ts'
import { regionHost, registerRegion } from '../lib/announce.ts'
import ThemeToggle from './ThemeToggle.tsx'
import UpdateNotice from './UpdateNotice.tsx'
import styles from './AppShell.module.css'

// Stable ref callbacks: an inline one is detached and attached again on every render of the shell, and
// while it is detached a page's mount effect can't clear the region (`clearAnnouncements`).
const statusRef = (element: HTMLDivElement | null) => registerRegion('status', element)
const alertRef = (element: HTMLDivElement | null) => registerRegion('alert', element)

/**
 * The nav's Stats link. On Stats it resets to a plain /stats in place of the entry: a route change (no
 * marker), with no history entry added (AD-7). Its own component, so only it re-renders on a location
 * change, not the shell.
 */
function StatsNavLink() {
  const onStats = useLocation().pathname === '/stats'
  return (
    <NavLink to="/stats" replace={onStats} className={styles.link}>
      Stats
    </NavLink>
  )
}

/**
 * The frame every page renders in: header (the top bar with skip link,
 * wordmark, nav and theme toggle, then the update notice when this tab's
 * bundle is not the server's version), `main`, and the page's two live
 * regions. The regions are portalled into one host element outside React's
 * tree (see `regionHost`), so an open modal side panel or dialog can move
 * them inside itself, where they are not inert, and back to the body when it
 * closes.
 *
 * On a server started with `--dev` (app-info says so), the wordmark reads
 * "bookvie DEV". Until app-info loads, or if it never does, the shell looks
 * like production.
 */
export default function AppShell({ children }: { children?: ReactNode }) {
  const main = useRef<HTMLElement>(null)
  const dev = useAppInfo()?.mode === 'dev'
  const skipToContent = (event: MouseEvent<HTMLAnchorElement>) => {
    // Focus directly: a hash change would count as a navigation.
    event.preventDefault()
    main.current?.focus()
  }
  return (
    <>
      <header>
        <div className={styles.bar}>
          <a href="#main" className={styles.skip} onClick={skipToContent}>
            Skip to content
          </a>
          <span className={styles.wordmark}>
            <span className={styles.mark} aria-hidden="true" />
            bookvie
            {dev && (
              <>
                {' '}
                <span className={styles.devPill}>DEV</span>
              </>
            )}
          </span>
          <nav className={styles.nav} aria-label="Main">
            <ul className={styles.items}>
              <li className={styles.item}>
                <NavLink to="/" end className={styles.link}>
                  Home
                </NavLink>
              </li>
              <li className={styles.item}>
                <NavLink to="/catalog" className={styles.link}>
                  Catalog
                </NavLink>
              </li>
              <li className={styles.item}>
                <StatsNavLink />
              </li>
              <li className={styles.item}>
                <NavLink to="/card-notes" className={styles.link}>
                  Card notes
                </NavLink>
              </li>
              <li className={styles.item}>
                <NavLink to="/backup" className={styles.link}>
                  Backup
                </NavLink>
              </li>
            </ul>
          </nav>
          <div className={styles.end}>
            <ThemeToggle />
          </div>
        </div>
        <UpdateNotice />
      </header>
      <main id="main" ref={main} tabIndex={-1} className={styles.main}>
        {children ?? <Outlet />}
      </main>
      {createPortal(
        <>
          <div role="status" aria-live="polite" className="visuallyHidden" ref={statusRef} />
          <div role="alert" className="visuallyHidden" ref={alertRef} />
        </>,
        regionHost(),
      )}
    </>
  )
}
