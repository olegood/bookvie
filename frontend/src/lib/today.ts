// Home's date header (EXPERIENCE.md → Home): the browser's local date, in
// English, with no year, like "Wednesday, 28 October". Views never carry the
// server's date (AD-20); the page recomputes it with `useNow`.

// Fixed English names, so the header never depends on the browser's locale data.
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

/** The local calendar date of `now` as "Wednesday, 28 October". */
export function formatToday(now: Date): string {
  return `${WEEKDAYS[now.getDay()]}, ${now.getDate()} ${MONTHS[now.getMonth()]}`
}
