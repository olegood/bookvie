import { useRef, type MouseEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { NavLink, Outlet } from 'react-router'
import { regionHost, registerRegion } from '../lib/announce.ts'
import ThemeToggle from './ThemeToggle.tsx'
import styles from './AppShell.module.css'

/**
 * The frame every page renders in: header (skip link, wordmark, nav, theme
 * toggle), `main`, and the page's two live regions. The regions are portalled
 * into one host element outside React's tree (see `regionHost`), so an open
 * modal side panel or dialog can move them inside itself, where they are not
 * inert, and back to the body when it closes.
 */
export default function AppShell({ children }: { children?: ReactNode }) {
  const main = useRef<HTMLElement>(null)
  const skipToContent = (event: MouseEvent<HTMLAnchorElement>) => {
    // Focus directly: a hash change would count as a navigation.
    event.preventDefault()
    main.current?.focus()
  }
  return (
    <>
      <header className={styles.header}>
        <a href="#main" className={styles.skip} onClick={skipToContent}>
          Skip to content
        </a>
        <span className={styles.wordmark}>
          <span className={styles.mark} aria-hidden="true" />
          bookvie
        </span>
        <nav className={styles.nav} aria-label="Main">
          <ul className={styles.items}>
            <li className={styles.item}>
              <NavLink to="/" end className={styles.link}>
                Catalog
              </NavLink>
            </li>
          </ul>
        </nav>
        <div className={styles.end}>
          <ThemeToggle />
        </div>
      </header>
      <main id="main" ref={main} tabIndex={-1} className={styles.main}>
        {children ?? <Outlet />}
      </main>
      {createPortal(
        <>
          <div
            role="status"
            aria-live="polite"
            className="visuallyHidden"
            ref={(element) => registerRegion('status', element)}
          />
          <div role="alert" className="visuallyHidden" ref={(element) => registerRegion('alert', element)} />
        </>,
        regionHost(),
      )}
    </>
  )
}
