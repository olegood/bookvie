import { useId, type ButtonHTMLAttributes, type MouseEvent, type Ref } from 'react'
import styles from './Button.module.css'

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'disabled'> & {
  variant?: 'primary' | 'secondary'
  /**
   * Why the button can't act right now. When set, the button stays focusable
   * with `aria-disabled="true"`, the reason as its description, and clicks
   * are ignored. Native `disabled` is never used for this.
   */
  disabledReason?: string
  /**
   * Busy: Export or Restore is running (DESIGN.md → Busy button). The button
   * is natively `disabled` at 60% opacity, with no spinner; the caller sets
   * the busy label ("Exporting…") and turns this on only after about 300 ms.
   * The app's only native-disabled case.
   */
  busy?: boolean
  ref?: Ref<HTMLButtonElement>
}

export default function Button({
  variant = 'secondary',
  disabledReason,
  busy = false,
  className,
  type = 'button',
  onClick,
  children,
  ref,
  ...rest
}: Props) {
  const reasonId = useId()
  const unavailable = disabledReason !== undefined
  const describedBy = [rest['aria-describedby'], unavailable ? reasonId : undefined].filter(Boolean).join(' ')
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (unavailable) {
      event.preventDefault()
      return
    }
    onClick?.(event)
  }
  return (
    <>
      <button
        {...rest}
        ref={ref}
        type={type}
        className={[styles.button, styles[variant], busy && styles.busy, className].filter(Boolean).join(' ')}
        disabled={busy || undefined}
        aria-disabled={unavailable ? 'true' : undefined}
        aria-describedby={describedBy || undefined}
        onClick={handleClick}
      >
        {children}
      </button>
      {unavailable && (
        <span id={reasonId} className="visuallyHidden">
          {disabledReason}
        </span>
      )}
    </>
  )
}
