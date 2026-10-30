import { useEffect, useRef, type HTMLAttributes } from 'react'
import { useNavigatedHere } from '../lib/page.ts'

/**
 * The page's one `h1`. It takes focus when it mounts after a client-side
 * navigation, including when it arrives with late data; not on first load.
 */
export default function PageHeading(props: HTMLAttributes<HTMLHeadingElement>) {
  const ref = useRef<HTMLHeadingElement>(null)
  const { key, navigated } = useNavigatedHere()
  useEffect(() => {
    if (navigated) ref.current?.focus()
  }, [key, navigated])
  return <h1 {...props} ref={ref} tabIndex={-1} />
}
