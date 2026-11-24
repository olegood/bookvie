// Story 14.4 Search the boxes, beyond the ATDD leaves (search-boxes.spec.ts):
// axe on the searched shelf, regex characters matched literally, the typing
// pause and the blank field under a paused clock, two window widths, the lift,
// fade and pill in dark, and a faded box that still opens. fixtures.ts stores
// "list" before every other spec; this one turns that off.

import AxeBuilder from '@axe-core/playwright'
import type { Locator, Page } from '@playwright/test'
import { SPINE_LABEL } from './bookcase.ts'
import { recordStatus, statusTexts } from './card-note-add-another.ts'
import {
  boxFrames,
  boxLinks,
  boxOfBook,
  cardNotesPage,
  columnsOf,
  HABIT_BOXES,
  HABIT_COUNT_LINE,
  HABIT_SHELF,
  pillLook,
  searchField,
} from './card-note-boxes.ts'
import { expect, test } from './fixtures.ts'
import { designComponentColor, rgbOf } from './library.ts'
import { AXE_TAGS } from './stats.ts'

const [ATOMIC, DEEP_WORK, REFACTORING, TINY, WALDEN] = HABIT_BOXES

/** "habit": 17 notes in 4 Books. */
const HABIT_LINE = '17 card notes in 4 Books contain “habit”.'

/** DESIGN.md components.card-note-box.lift and .fade. */
const LIFT = -6
const FADE = 0.38

/** DESIGN.md → Elevation & Depth → Card note box front, dark, as computed style writes a box-shadow. */
const BOX_FRONT_SHADOW_DARK = 'rgba(0, 0, 0, 0.12) 0px -3px 0px 0px inset, rgba(0, 0, 0, 0.35) 0px 1px 2px 0px'

/**
 * axe rules a faded box is known to fail, and only a faded box:
 * `color-contrast`, the documented deviation (EXPERIENCE.md → Accessibility
 * Floor → Faded Card note boxes), and `label-content-name-mismatch`, since
 * "*Title*, no match" leaves out the visible "4 card notes" (WCAG 2.5.3;
 * `deferred-work.md`, Story 14.4's build, a UX decision for the Epic 14 retro).
 */
const FADED_BOX_GAPS = ['color-contrast', 'label-content-name-mismatch']

/** Past the search pause (500 ms) and announce's tick together. */
const PAST_THE_PAUSE_MS = 1_000

/** Inside the search pause: less than SEARCH_PAUSE_MS. */
const INSIDE_THE_PAUSE_MS = 400

/** Every box's id, lift and front opacity now. */
async function resting(page: Page): Promise<[string, number, number][]> {
  const [frame] = await boxFrames(page)
  return (frame ?? []).map((b) => [b.id, b.lift, b.opacity])
}

/** The "habit" end state: matches lifted, Refactoring faded. */
const HABIT_STATE = HABIT_BOXES.map((b): [string, number, number] =>
  b.matches > 0 ? [b.id, LIFT, 1] : [b.id, 0, FADE],
)

/**
 * Opens `url` with Playwright's clock installed, then pauses it once `loaded`
 * shows, so the search pause and announce's tick only run when the test calls
 * `runFor`. Pausing before the page has its data could strand the first load
 * (TanStack Query's `setTimeout(0)`; the Epic 6 trace flake, `card-notes.spec.ts`).
 */
async function openPaused(page: Page, url: string, loaded: Locator): Promise<void> {
  const start = new Date('2026-11-10T10:00:00+01:00')
  await page.clock.install({ time: start })
  await page.goto(url)
  await expect(loaded).toBeVisible()
  // A minute on: always ahead of the running clock, and still the same day.
  await page.clock.pauseAt(new Date(start.getTime() + 60_000))
}

test.describe('Story 14.4 Search the boxes (automate)', () => {
  test.use({ cardNotesView: null })

  test('[P1] AC-1 the searched shelf passes axe in light and dark, apart from two known gaps on the faded box: its contrast and its name', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(HABIT_SHELF)
    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme })
      await page.goto(cardNotesPage(server))
      await expect(boxLinks(page)).toHaveCount(HABIT_BOXES.length)
      await searchField(page).fill('habit')
      await expect.poll(() => resting(page)).toEqual(HABIT_STATE)

      // Every other rule: no violation anywhere, the lifted boxes and their pills included.
      const others = await new AxeBuilder({ page }).withTags(AXE_TAGS).disableRules(FADED_BOX_GAPS).analyze()
      expect(others.violations.map(({ id, nodes }) => `${colorScheme}: ${id} (${nodes.length})`)).toEqual([])

      // The two gaps: any node that fails them is in Refactoring's faded box.
      const gaps = await new AxeBuilder({ page }).withRules(FADED_BOX_GAPS).analyze()
      for (const { id, nodes } of gaps.violations) {
        for (const { target } of nodes) {
          const selector = String(target[0])
          const href = await page.locator(selector).evaluate((el) => el.closest('a')?.getAttribute('href') ?? null)
          expect(href, `${colorScheme}: ${id} ${selector}`).toBe(`/card-notes?book=${REFACTORING.id}`)
        }
      }
    }
  })

  test('[P1] AC-1 regex characters in the query match literally, as in the List', async ({ page, seededServer }) => {
    const server = await seededServer(HABIT_SHELF)
    await page.goto(cardNotesPage(server))
    await expect(boxLinks(page)).toHaveCount(HABIT_BOXES.length)
    const main = page.getByRole('main')

    // "." is in every note: every box lifts, each pill "N of N".
    await searchField(page).fill('.')
    await expect(main.getByText('41 card notes in 5 Books contain “.”.', { exact: true })).toBeVisible()
    for (const b of HABIT_BOXES) {
      await expect(boxOfBook(page, b.id).getByText(`${b.notes} of ${b.notes}`, { exact: true }), b.title).toBeVisible()
    }
    await expect.poll(() => resting(page)).toEqual(HABIT_BOXES.map((b) => [b.id, LIFT, 1]))

    // "s." only in Walden's "woods.": a pattern would match "s " in "Small habits worth".
    await searchField(page).fill('s.')
    await expect(main.getByText('1 card note in 1 Book contains “s.”.', { exact: true })).toBeVisible()
    await expect(boxOfBook(page, WALDEN.id)).toHaveAccessibleName('Walden, 1 of 1 card note matches')
    await expect(boxOfBook(page, TINY.id)).toHaveAccessibleName('Tiny Habits, no match')

    // An unbalanced bracket or a class is plain text: no note holds it, and nothing breaks.
    for (const query of ['(habit', '[a-z]', 'habit)*']) {
      await searchField(page).fill(query)
      await expect(main.getByText(`No card notes contain “${query}”.`, { exact: true }), query).toBeVisible()
      await expect.poll(() => resting(page), query).toEqual(HABIT_BOXES.map((b) => [b.id, 0, FADE]))
    }
    await expect(boxLinks(page)).toHaveCount(HABIT_BOXES.length)
    await expect(page.getByRole('alert')).toHaveText('')
  })

  test('[P2] AC-2 status stays silent while typing continues inside the pause, then reads the last sentence once', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(HABIT_SHELF)
    await openPaused(page, cardNotesPage(server), boxLinks(page).first())
    await expect(boxLinks(page)).toHaveCount(HABIT_BOXES.length)
    await recordStatus(page)

    await searchField(page).pressSequentially('hab')
    await page.clock.runFor(INSIDE_THE_PAUSE_MS)
    await searchField(page).pressSequentially('it')
    await page.clock.runFor(INSIDE_THE_PAUSE_MS)
    // 800 ms since the first keystroke, 400 since the last: the count line follows, status hasn't spoken.
    await expect(page.getByRole('main').getByText(HABIT_LINE, { exact: true })).toBeVisible()
    expect((await statusTexts(page)).filter(Boolean)).toEqual([])

    await page.clock.runFor(PAST_THE_PAUSE_MS)
    await expect(page.getByRole('status')).toHaveText(HABIT_LINE)
    expect((await statusTexts(page)).filter(Boolean)).toEqual([HABIT_LINE])
  })

  test('[P2] AC-4 emptying the field inside the pause drops the pending sentence and announces nothing; spaces only announce nothing either', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(HABIT_SHELF)
    await openPaused(page, cardNotesPage(server), boxLinks(page).first())
    await expect(boxLinks(page)).toHaveCount(HABIT_BOXES.length)
    await recordStatus(page)
    const main = page.getByRole('main')

    // Typed, then emptied inside the pause.
    await searchField(page).fill('habit')
    await page.clock.runFor(INSIDE_THE_PAUSE_MS)
    await searchField(page).fill('')
    await page.clock.runFor(PAST_THE_PAUSE_MS)
    await expect(main.getByText(HABIT_COUNT_LINE, { exact: true })).toBeVisible()
    expect((await statusTexts(page)).filter(Boolean)).toEqual([])

    // Spaces only: no search, no announcement.
    await searchField(page).fill('   ')
    await page.clock.runFor(PAST_THE_PAUSE_MS)
    await expect(main.getByText(HABIT_COUNT_LINE, { exact: true })).toBeVisible()
    expect((await statusTexts(page)).filter(Boolean)).toEqual([])

    // Control: the same clock does drive the pause, so the silence above is meaningful.
    await searchField(page).fill('zettel')
    await page.clock.runFor(PAST_THE_PAUSE_MS)
    await expect(page.getByRole('status')).toHaveText('No card notes contain “zettel”.')
    expect((await statusTexts(page)).filter(Boolean)).toEqual(['No card notes contain “zettel”.'])
  })

  for (const [width, columns] of [
    [1024, 4],
    [1440, 5],
  ] as const) {
    test(`[P2] AC-2 at ${width}px (${columns} columns) a search moves no slot`, async ({ page, seededServer }) => {
      const server = await seededServer(HABIT_SHELF)
      await page.setViewportSize({ width, height: 900 })
      await page.goto(cardNotesPage(server))
      await expect(boxLinks(page)).toHaveCount(HABIT_BOXES.length)
      expect(await columnsOf(page)).toBe(columns)
      const slots = async () => ((await boxFrames(page))[0] ?? []).map(({ id, slot }) => [id, slot])
      const before = await slots()

      await searchField(page).fill('habit')
      await expect.poll(() => resting(page)).toEqual(HABIT_STATE)
      expect(await slots()).toEqual(before)
      expect(await columnsOf(page)).toBe(columns)

      await searchField(page).fill('zettel')
      await expect.poll(() => resting(page)).toEqual(HABIT_BOXES.map((b) => [b.id, 0, FADE]))
      expect(await slots()).toEqual(before)
    })
  }

  test('[P2] AC-5 in dark the lift and the fade are the same, and every front keeps its dark shadow', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(HABIT_SHELF)
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto(cardNotesPage(server))
    await expect(boxLinks(page)).toHaveCount(HABIT_BOXES.length)
    const [before] = await boxFrames(page)
    for (const b of before) expect(b.shadow, b.id).toBe(BOX_FRONT_SHADOW_DARK)

    await searchField(page).fill('habit')
    await expect.poll(() => resting(page)).toEqual(HABIT_STATE)
    const [after] = await boxFrames(page)
    for (const b of after) {
      expect(b.shadow, b.id).toBe(BOX_FRONT_SHADOW_DARK)
      expect(b.scaled, b.id).toBe(false)
    }
    expect(after.find(({ id }) => id === REFACTORING.id)?.faded).toMatchObject([
      { opacity: FADE, outer: false, holdsAll: true },
    ])
    for (const b of [ATOMIC, DEEP_WORK, TINY, WALDEN]) {
      expect(after.find(({ id }) => id === b.id)?.faded, b.title).toEqual([])
    }
  })

  test('[P2] AC-7 in dark the pill keeps #E3EBE2, spine-label text and its #557059 dot', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(HABIT_SHELF)
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto(cardNotesPage(server))
    await expect(boxLinks(page)).toHaveCount(HABIT_BOXES.length)
    await searchField(page).fill('habit')
    await expect(boxOfBook(page, ATOMIC.id).getByText('3 of 12', { exact: true })).toBeVisible()

    for (const [b, text] of [
      [ATOMIC, '3 of 12'],
      [WALDEN, '1 of 1'],
    ] as const) {
      expect(await pillLook(boxOfBook(page, b.id), text, b.title), b.title).toMatchObject({
        height: 22,
        background: rgbOf(designComponentColor('card-note-box', 'pill-background')),
        color: SPINE_LABEL,
        fontWeight: '600',
        dot: { width: 6, height: 6, background: rgbOf(designComponentColor('card-note-box', 'pill-dot')) },
      })
    }
  })

  test('[P1] AC-6 a click on a faded box still opens its open box', async ({ page, seededServer }) => {
    const server = await seededServer(HABIT_SHELF)
    await page.goto(cardNotesPage(server))
    await expect(boxLinks(page)).toHaveCount(HABIT_BOXES.length)
    await searchField(page).fill('habit')
    const refactoring = boxOfBook(page, REFACTORING.id)
    await expect(refactoring).toHaveAccessibleName('Refactoring, no match')
    await expect.poll(() => resting(page)).toEqual(HABIT_STATE)

    await refactoring.click()

    // The search goes into the box (Story 14.5): no note matches, and the pile stays reachable.
    await expect(page).toHaveURL(cardNotesPage(server, REFACTORING.id))
    const main = page.getByRole('main')
    await expect(main.getByRole('heading', { level: 1, name: 'Card notes', exact: true })).toBeFocused()
    await expect(main.getByText('In Refactoring', { exact: true })).toBeVisible()
    await expect(main.getByText('No card notes contain “habit”.', { exact: true })).toBeVisible()
    await expect(main.getByRole('button', { name: 'Go through as a pile', exact: true })).toBeVisible()
  })
})
