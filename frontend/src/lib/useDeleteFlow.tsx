// Delete, from Book detail (EXPERIENCE.md → Delete): **Delete** opens the
// Confirm dialog, which names what goes with the Book and the role it holds.
// Cancel or Esc returns focus to **Delete** once the dialog has unmounted.
// The owner sends `delete-book` (`onDelete`); on success the page has
// already moved to Catalog, so the request stays in flight. A failure says
// its line in the dialog above its buttons.
//
// It keeps its own in-flight flag rather than `useIntentRequest`'s: that one
// clears when the request resolves, and this one must stay set after a
// successful delete while the page navigates away.

import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import type { BookDetailView } from '../api/index.ts'
import ConfirmDialog from '../components/ConfirmDialog.tsx'
import { announce, clearAnnouncements } from './announce.ts'
import { roleLine } from './bookDetail.ts'

const CONSEQUENCE = 'Its readings and card notes are deleted too.'
const DELETING = 'Deleting the book.'

/** Sends `delete-book`; resolves `ok` once the Book is gone and Catalog is on its way. */
export type DeleteBook = (bookId: string, title: string) => Promise<{ ok: true } | { ok: false; message: string }>

type Options = {
  /** The Book on the page. */
  book: BookDetailView
  /** Sends the delete for the Book; the page hosts it. */
  onDelete: DeleteBook
}

type DeleteFlow = {
  /** The **Delete** button: Cancel and Esc return focus there. */
  button: RefObject<HTMLButtonElement | null>
  /** **Delete**'s press: opens the Confirm dialog. */
  open: () => void
  /** The Confirm dialog while it is open, else nothing. */
  dialog: ReactNode
}

export function useDeleteFlow({ book, onDelete }: Options): DeleteFlow {
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [showAlert, setShowAlert] = useState(false)
  // A press while one is in flight is ignored even before `busy` renders.
  const inFlight = useRef(false)
  const deleteButton = useRef<HTMLButtonElement>(null)
  // Set when the dialog closes, so focus returns to Delete once it has unmounted.
  const [refocus, setRefocus] = useState(0)

  useEffect(() => {
    if (refocus > 0) deleteButton.current?.focus()
  }, [refocus])

  const openConfirm = () => {
    setShowAlert(false)
    setConfirming(true)
  }

  const cancelConfirm = () => {
    if (inFlight.current) return
    // A couldn't-save line (or one still pending) must not outlive the dialog.
    clearAnnouncements()
    setConfirming(false)
    setRefocus((count) => count + 1)
  }

  const confirmDelete = async () => {
    if (inFlight.current) return
    inFlight.current = true
    clearAnnouncements()
    setShowAlert(false)
    setBusy(true)
    const result = await onDelete(book.id, book.title)
    // On success the page has already moved to Catalog.
    if (result.ok) return
    inFlight.current = false
    setBusy(false)
    setShowAlert(true)
    announce('alert', result.message)
  }

  const dialog = confirming && (
    <ConfirmDialog
      heading={`Delete ${book.title}?`}
      lines={[CONSEQUENCE, roleLine(book)].filter((line) => line !== null)}
      confirmLabel="Delete book"
      busy={busy}
      busyReason={DELETING}
      showAlert={showAlert}
      onConfirm={() => void confirmDelete()}
      onCancel={cancelConfirm}
    />
  )

  return { button: deleteButton, open: openConfirm, dialog }
}
