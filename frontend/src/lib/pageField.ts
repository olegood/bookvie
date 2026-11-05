// The page field's rules and copy (EXPERIENCE.md → Page field). The field
// takes the absolute page, a whole number from 0 to the Book's page count;
// the server checks the same and owns the percentage (AD-6).

/** The page typed in the field, or `null` when it isn't a whole number from 0 to `pages`. */
export function parsePage(typed: string, pages: number): number | null {
  const text = typed.trim()
  if (!/^[0-9]+$/.test(text)) return null
  const page = Number(text)
  return page <= pages ? page : null
}

/** The inline and `alert` message for a page out of range: "Page must be between 0 and 330." */
export function pageRangeMessage(pages: number): string {
  return `Page must be between 0 and ${pages}.`
}

/** The `status` line after a save: "Page 212 of 330, 64%." */
export function pageSavedCopy(page: number, pages: number, percent: number): string {
  return `Page ${page} of ${pages}, ${percent}%.`
}
