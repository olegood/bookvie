import { useId, type ButtonHTMLAttributes, type MouseEvent } from 'react'
import styles from './Button.module.css'

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'disabled'> & {
  variant?: 'primary' | 'secondary'
  /**
   * Why the button can't act right now. When set, the button stays focusable
   * with `aria-disabled="true"`, the reason as its description, and clicks
   * are ignored. Native `disabled` is never used.
   */
  disabledReason?: string
}

export default function Button({
  variant = 'secondary',
  disabledReason,
  className,
  type = 'button',
  onClick,
  children,
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
        type={type}
        className={[styles.button, styles[variant], className].filter(Boolean).join(' ')}
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
