// The remembered Card notes view (Boxes · List; EXPERIENCE.md → Card notes
// shelf → Remembered). The choice lives in localStorage, read and written
// inside try/catch: storage that throws or holds anything but "boxes" or
// "list" means Boxes.

export type CardNotesViewChoice = 'boxes' | 'list'

export const CARD_NOTES_VIEWS: readonly CardNotesViewChoice[] = ['boxes', 'list']

const STORAGE_KEY = 'bookvie.cardNotesView'

function isCardNotesView(value: unknown): value is CardNotesViewChoice {
  return value === 'boxes' || value === 'list'
}

export function readCardNotesView(): CardNotesViewChoice {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return isCardNotesView(stored) ? stored : 'boxes'
  } catch {
    return 'boxes'
  }
}

export function writeCardNotesView(choice: CardNotesViewChoice): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, choice)
  } catch {
    // Storage unavailable: the view still switches for this visit.
  }
}
