import {
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type Ref,
} from 'react'
import { flushSync } from 'react-dom'
import { FOCUSABLE } from '../lib/useSpinePopover.ts'
import Button from './Button.tsx'
import styles from './MoreActionsMenu.module.css'

export type MenuItem = { label: string; onSelect: () => void }

const NAME = 'More actions'

type Props = {
  items: readonly MenuItem[]
  /** The "⋯" button, which the owner focuses (Cancel, a failure). */
  buttonRef?: Ref<HTMLButtonElement>
}

/**
 * The "⋯" menu (EXPERIENCE.md → Main book card, Pause): a `button-secondary`
 * 32×32 icon button named "More actions" (`aria-haspopup="menu"`,
 * `aria-expanded`) and a `role="menu"` list of the same name. Opening it
 * focuses the first item; ArrowDown and ArrowUp move with wrap, Home and End
 * jump to the first and last item. Esc, or a press outside the menu, closes
 * it and returns focus to "⋯" (a press on another control keeps the focus
 * there, as the spine popover does); Tab, or Shift+Tab back onto "⋯", closes
 * it as focus moves on.
 * Choosing an item closes the menu, focus back on "⋯", before its `onSelect`
 * runs, so a dialog it opens is the only overlay.
 */
export default function MoreActionsMenu({ items, buttonRef }: Props) {
  const menuId = useId()
  const [open, setOpen] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLUListElement>(null)
  const itemButtons = useRef<(HTMLButtonElement | null)[]>([])
  useImperativeHandle(buttonRef, () => button.current as HTMLButtonElement, [])

  useEffect(() => {
    if (open) itemButtons.current[0]?.focus()
  }, [open])

  // A press outside closes the menu. A press on an item or on "⋯" is left to
  // its click (choose, or the toggle): `pressing` holds the blur off until
  // then, since Safari and Firefox don't focus a pressed button, so the blur
  // they fire has no `relatedTarget`.
  const pressing = useRef(false)
  useEffect(() => {
    if (!open) return
    pressing.current = false
    const down = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      if (button.current?.contains(target) || (menu.current?.contains(target) && target.closest('[role="menuitem"]'))) {
        pressing.current = true
        return
      }
      if (menu.current?.contains(target)) return
      setOpen(false)
      if (target.closest(FOCUSABLE)) return
      setTimeout(() => button.current?.focus(), 0)
    }
    const up = () => {
      pressing.current = false
    }
    document.addEventListener('pointerdown', down, true)
    document.addEventListener('pointerup', up, true)
    document.addEventListener('pointercancel', up, true)
    return () => {
      document.removeEventListener('pointerdown', down, true)
      document.removeEventListener('pointerup', up, true)
      document.removeEventListener('pointercancel', up, true)
    }
  }, [open])

  const close = () => {
    flushSync(() => setOpen(false))
    button.current?.focus()
  }

  const choose = (item: MenuItem) => {
    close()
    item.onSelect()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    const buttons = itemButtons.current.filter((element) => element !== null)
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
    let next: number | null = null
    switch (event.key) {
      case 'ArrowDown':
        next = (index + 1) % buttons.length
        break
      case 'ArrowUp':
        next = (index - 1 + buttons.length) % buttons.length
        break
      case 'Home':
        next = 0
        break
      case 'End':
        next = buttons.length - 1
        break
      case 'Escape':
        event.preventDefault()
        event.stopPropagation()
        close()
        return
      default:
        return
    }
    event.preventDefault()
    buttons[next]?.focus()
  }

  // Tab, Shift+Tab (onto "⋯") or any other focus move out of the menu closes
  // it, wherever focus went. A pointer press on an item or "⋯" is left to its click.
  const onBlur = (event: FocusEvent<HTMLUListElement>) => {
    if (pressing.current) return
    const to = event.relatedTarget
    if (to instanceof Node && menu.current?.contains(to)) return
    setOpen(false)
  }

  return (
    <div className={styles.wrap}>
      <Button
        ref={button}
        className={styles.more}
        aria-label={NAME}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((was) => !was)}
      >
        <span aria-hidden="true">⋯</span>
      </Button>
      {open && (
        <ul
          ref={menu}
          id={menuId}
          role="menu"
          aria-label={NAME}
          className={styles.menu}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
        >
          {items.map((item, index) => (
            <li key={item.label} role="none">
              <button
                ref={(element) => {
                  itemButtons.current[index] = element
                }}
                type="button"
                role="menuitem"
                tabIndex={-1}
                className={styles.item}
                onClick={() => choose(item)}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
