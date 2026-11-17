import { useEffect, useId } from 'react'
import { useAppInfo } from '../api/views.ts'
import { announce, isAnnouncing } from '../lib/announce.ts'
import { noticeText, noticeVersion } from '../lib/updateNotice.ts'
import Button from './Button.tsx'
import styles from './UpdateNotice.module.css'

/**
 * The update notice (Story 11.4, DESIGN.md → components.update-notice): a
 * band under the top bar while the server's last loaded version differs from
 * the version this bundle was built with. It is not a dialog, an alert or a
 * live region; the shell's polite `status` region announces it once for each
 * new server version, unless another message is still waiting for its tick
 * (that message wins). A failed refetch keeps the last version, so it changes
 * nothing. Reload reloads at once.
 */
export default function UpdateNotice() {
  const sentenceId = useId()
  const shown = noticeVersion(__BOOKVIE_VERSION__, useAppInfo()?.version)
  useEffect(() => {
    if (shown !== undefined && !isAnnouncing()) announce('status', noticeText(shown))
  }, [shown])
  if (shown === undefined) return null
  return (
    <div className={styles.band}>
      <p id={sentenceId} className={styles.sentence}>
        {noticeText(shown)}
      </p>
      <Button
        variant="secondary"
        className={styles.reload}
        aria-describedby={sentenceId}
        onClick={() => window.location.reload()}
      >
        Reload
      </Button>
    </div>
  )
}
