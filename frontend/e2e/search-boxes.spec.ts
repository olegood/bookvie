// Story 14.4 Search the boxes. While Search card notes holds non-blank text in
// Boxes view, a box with matches lifts 6px and shows the pill "M of N" where
// its count was, a box without one fades to 0.38 through one inner wrapper
// (still a link, a Tab stop and a full-strength focus ring), the count line
// becomes the shelf sentence, `status` reads it after the pause, and each box's
// name carries its match. Nothing is hidden, and UX-DR92's staging (the List's
// results in Boxes view) is gone. The lift and the fade change over 150ms
// ease-out while the text changes, and at once under reduced motion or on a
// List → Boxes switch. fixtures.ts stores "list" before every other spec; this
// one turns that off.

import { readFileSync } from 'node:fs'
import { inLiveRegion, recordStatus, statusTexts } from './card-note-add-another.ts'
import {
  box,
  boxFrameOf,
  boxFrames,
  boxLinks,
  boxName,
  boxOfBook,
  cardNotesPage,
  groupHeadings,
  HABIT_BOXES,
  HABIT_COUNT_LINE,
  HABIT_SHELF,
  noteCount,
  pillLook,
  searchField,
  viewButton,
  type BoxFrame,
} from './card-note-boxes.ts'
import { systemColor } from './dev-mode.ts'
import { expect, test } from './fixtures.ts'
import { ACCENT, ACCENT_DARK, DESIGN_MD, designComponentColor, rgbOf } from './library.ts'
import { SPINE_LABEL } from './bookcase.ts'
import { afterAnnounceDelay } from './stats.ts'

const EXPERIENCE_MD = DESIGN_MD.replace(/DESIGN\.md$/, 'EXPERIENCE.md')

const [ATOMIC, DEEP_WORK, REFACTORING, TINY, WALDEN] = HABIT_BOXES
const MATCHED = [ATOMIC, DEEP_WORK, TINY, WALDEN]

/** "habit": 17 notes in 4 Books. */
const HABIT_LINE = '17 card notes in 4 Books contain “habit”.'

/** Each box's name while the field holds "habit". */
const HABIT_NAMES = [
  'Atomic Habits, 3 of 12 card notes match',
  'Deep Work, 1 of 12 card notes matches',
  'Refactoring, no match',
  'Tiny Habits, 12 of 12 card notes match',
  'Walden, 1 of 1 card note matches',
]

/** Each matching box's pill for "habit". */
const HABIT_PILLS = [
  [ATOMIC, '3 of 12'],
  [DEEP_WORK, '1 of 12'],
  [TINY, '12 of 12'],
  [WALDEN, '1 of 1'],
] as const

/** DESIGN.md components.card-note-box.lift and .fade. */
const LIFT = -6
const FADE = 0.38

/** One inner wrapper, holding the cards and the front, at 0.38; never the link or its list item. */
const ONE_FADED_WRAPPER = [{ opacity: FADE, outer: false, holdsAll: true }]

/** Every box's id, lift and front opacity, for a poll that waits out the transition. */
async function resting(page: Parameters<typeof boxFrames>[0]): Promise<[string, number, number][]> {
  const [frame] = await boxFrames(page)
  return (frame ?? []).map((b) => [b.id, b.lift, b.opacity])
}

/** The "habit" end state: matches lifted, Refactoring faded. */
const HABIT_STATE = HABIT_BOXES.map((b): [string, number, number] =>
  b.matches > 0 ? [b.id, LIFT, 1] : [b.id, 0, FADE],
)

/** Every box at rest. */
const AT_REST = HABIT_BOXES.map((b): [string, number, number] => [b.id, 0, 1])

/** A box's front opacity and lift in each sampled frame where it is drawn. */
function track(frames: BoxFrame[][], id: string): { opacity: number; lift: number }[] {
  return frames.flatMap((frame) => frame.filter((b) => b.id === id).map(({ opacity, lift }) => ({ opacity, lift })))
}

test.describe('Story 14.4 Search the boxes (ATDD)', () => {
  test.use({ cardNotesView: null })

  test('[P0] AC-1 a box with matches lifts 6px and shows the pill "3 of 12" where its count was; a box without one fades through one inner wrapper; nothing hides or reflows; the List\'s matcher decides', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(HABIT_SHELF)
    await page.goto(cardNotesPage(server))
    await expect(boxLinks(page)).toHaveCount(HABIT_BOXES.length)
    const [before] = await boxFrames(page)
    // The shipped count line is in meta: the pill's font family is read from it.
    const meta = await page
      .getByRole('main')
      .getByText(HABIT_COUNT_LINE, { exact: true })
      .evaluate((line) => getComputedStyle(line).fontFamily)
    await searchField(page).fill('habit')

    await expect(boxOfBook(page, ATOMIC.id).getByText('3 of 12', { exact: true })).toBeVisible()

    // The lift and the fade, once the transition is over; the grid keeps every slot.
    await expect.poll(() => resting(page)).toEqual(HABIT_STATE)
    const [after] = await boxFrames(page)
    for (const b of after) {
      const was = before.find(({ id }) => id === b.id)
      expect(b.slot, b.id).toEqual(was?.slot)
      // No shadow added, no scale.
      expect(b.shadow, b.id).toBe(was?.shadow)
      expect(b.scaled, b.id).toBe(false)
    }
    for (const b of MATCHED) expect(after.find(({ id }) => id === b.id)?.faded, b.title).toEqual([])
    expect(after.find(({ id }) => id === REFACTORING.id)?.faded).toMatchObject(ONE_FADED_WRAPPER)
    for (const b of HABIT_BOXES) await expect(boxOfBook(page, b.id), b.title).toBeVisible()

    // The pill: meta at 600, spine-label on #E3EBE2, 22px tall, rounded.full, a 6px #557059 dot spacing.2 before the text,
    // left-aligned where the count was. The count is gone from a box with matches and stays on one without.
    for (const [b, text] of HABIT_PILLS) {
      expect(await pillLook(boxOfBook(page, b.id), text, b.title), b.title).toEqual({
        height: 22,
        background: rgbOf(designComponentColor('card-note-box', 'pill-background')),
        color: SPINE_LABEL,
        fontFamily: meta,
        fontSize: '13px',
        fontWeight: '600',
        radius: '9999px',
        padding: '0px 8px',
        border: expect.stringMatching(/^0px /),
        leftOfTitle: 0,
        dot: {
          width: 6,
          height: 6,
          background: rgbOf(designComponentColor('card-note-box', 'pill-dot')),
          gapToText: 8,
        },
      })
      await expect(boxOfBook(page, b.id).getByText(noteCount(b.notes), { exact: true }), b.title).toHaveCount(0)
    }
    await expect(boxOfBook(page, REFACTORING.id).getByText(noteCount(4), { exact: true })).toBeVisible()

    // The List's matcher: case is ignored and the query is trimmed; spaces only is empty.
    await searchField(page).fill('  HaBiT  ')
    await expect(boxOfBook(page, ATOMIC.id).getByText('3 of 12', { exact: true })).toBeVisible()
    await expect(boxOfBook(page, TINY.id).getByText('12 of 12', { exact: true })).toBeVisible()
    await expect.poll(() => resting(page)).toEqual(HABIT_STATE)
    await searchField(page).fill('   ')
    await expect.poll(() => resting(page)).toEqual(AT_REST)
    await expect(boxOfBook(page, ATOMIC.id).getByText(noteCount(12), { exact: true })).toBeVisible()
    await expect(page.getByRole('main').getByText(HABIT_COUNT_LINE, { exact: true })).toBeVisible()
    await expect(groupHeadings(page)).toHaveCount(0)
  })

  test('[P0] AC-2 the count line reads "17 card notes in 4 Books contain “habit”." as I type, status reads it once after the pause, and each box\'s name carries its match', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(HABIT_SHELF)
    await page.goto(cardNotesPage(server))
    await expect(boxLinks(page)).toHaveCount(HABIT_BOXES.length)
    await recordStatus(page)
    await searchField(page).fill('habit')

    const main = page.getByRole('main')
    await expect(main.getByText(HABIT_LINE, { exact: true })).toBeVisible()

    // Plain text, not a live region; status reads the same sentence once, after the pause.
    expect(await inLiveRegion(main.getByText(HABIT_LINE, { exact: true }))).toBe(false)
    await expect(page.getByRole('status')).toHaveText(HABIT_LINE)
    await afterAnnounceDelay(page)
    expect((await statusTexts(page)).filter(Boolean)).toEqual([HABIT_LINE])

    // The names, in grid order.
    for (const [i, name] of HABIT_NAMES.entries()) await expect(boxLinks(page).nth(i)).toHaveAccessibleName(name)

    // Updated as I type: "habits" holds 5 notes in 2 Books, and the line changes before any pause.
    await searchField(page).press('End')
    await searchField(page).press('s')
    await expect(main.getByText('5 card notes in 2 Books contain “habits”.', { exact: true })).toBeVisible()
    await expect(page.getByRole('status')).toHaveText('5 card notes in 2 Books contain “habits”.')
    await expect(box(page, 'Atomic Habits, 1 of 12 card notes matches')).toBeVisible()
    await expect(box(page, 'Tiny Habits, 4 of 12 card notes match')).toBeVisible()

    // The singular, quoting the trimmed text as typed.
    await searchField(page).fill('  WOODS ')
    await expect(main.getByText('1 card note in 1 Book contains “WOODS”.', { exact: true })).toBeVisible()
    await expect(page.getByRole('status')).toHaveText('1 card note in 1 Book contains “WOODS”.')
    await expect(box(page, 'Walden, 1 of 1 card note matches')).toBeVisible()
    await expect(box(page, 'Atomic Habits, no match')).toBeVisible()
  })

  test('[P1] AC-3 with "zettel" every box fades, the count line reads "No card notes contain “zettel”." and status reads it once', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(HABIT_SHELF)
    await page.goto(cardNotesPage(server))
    await expect(boxLinks(page)).toHaveCount(HABIT_BOXES.length)
    await recordStatus(page)
    await searchField(page).fill('zettel')

    const main = page.getByRole('main')
    const line = 'No card notes contain “zettel”.'
    await expect.poll(() => resting(page)).toEqual(HABIT_BOXES.map((b) => [b.id, 0, FADE]))

    // The count line is the one place saying it; every box stays, faded through its inner wrapper, named "no match".
    await expect(main.getByText(line, { exact: true })).toHaveCount(1)
    expect(await inLiveRegion(main.getByText(line, { exact: true }))).toBe(false)
    const [frame] = await boxFrames(page)
    for (const b of frame) expect(b.faded, b.id).toMatchObject(ONE_FADED_WRAPPER)
    for (const [i, b] of HABIT_BOXES.entries()) {
      await expect(boxLinks(page).nth(i)).toHaveAccessibleName(`${b.title}, no match`)
      await expect(boxLinks(page).nth(i)).toBeVisible()
    }
    await expect(page.getByRole('status')).toHaveText(line)
    await afterAnnounceDelay(page)
    expect((await statusTexts(page)).filter(Boolean)).toEqual([line])
  })

  test("[P0] AC-4 Esc, or emptying the field, brings every box back to full strength with its count and the count line's totals; Boxes never shows the List's results, and EXPERIENCE.md drops the staging note", async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(HABIT_SHELF)
    await page.goto(cardNotesPage(server))
    await expect(boxLinks(page)).toHaveCount(HABIT_BOXES.length)
    await recordStatus(page)
    await searchField(page).fill('habit')

    await expect(box(page, HABIT_NAMES[0])).toBeVisible()

    // No List results in Boxes view: no group headings, no <mark>, no "N notes match.".
    const main = page.getByRole('main')
    await expect(groupHeadings(page)).toHaveCount(0)
    await expect(main.locator('mark')).toHaveCount(0)
    await expect(page.getByRole('status')).toHaveText(HABIT_LINE)

    const restored = async () => {
      await expect.poll(() => resting(page)).toEqual(AT_REST)
      for (const [i, b] of HABIT_BOXES.entries()) {
        await expect(boxLinks(page).nth(i)).toHaveAccessibleName(boxName(b.title, b.notes))
      }
      await expect(main.getByText(/^\d+ of \d+$/)).toHaveCount(0)
      await expect(main.getByText(HABIT_COUNT_LINE, { exact: true })).toBeVisible()
      const [frame] = await boxFrames(page)
      for (const b of frame) expect(b.faded, b.id).toEqual([])
    }

    // Esc in the field.
    await searchField(page).press('Escape')
    await expect(searchField(page)).toHaveValue('')
    await restored()

    // Emptying it by hand.
    await searchField(page).fill('habit')
    await expect(box(page, HABIT_NAMES[0])).toBeVisible()
    await searchField(page).fill('')
    await restored()
    expect((await statusTexts(page)).filter((text) => /notes? match/.test(text))).toEqual([])

    // EXPERIENCE.md → Card notes shelf → Temporary no longer holds the staging note.
    const experience = readFileSync(EXPERIENCE_MD, 'utf8')
    const shelf = experience.split('### Card notes shelf')[1]?.split(/^## /m)[0] ?? ''
    expect(shelf).toContain('**Search on the shelf.**')
    expect(shelf).not.toContain('Staging (until the Epic 14 retro)')
    expect(shelf).not.toContain('Until Story 14.4')
  })

  test('[P1] AC-5 the lift and the fade change over 150ms ease-out as I type, at once under reduced motion, and at once on a List → Boxes switch with text in the field', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(HABIT_SHELF)
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.goto(cardNotesPage(server))
    await expect(boxLinks(page)).toHaveCount(HABIT_BOXES.length)
    let sampling = boxFrames(page, 600)
    await searchField(page).fill('habit')
    let frames = await sampling

    expect(track(frames, REFACTORING.id).some(({ opacity }) => opacity > FADE + 0.01 && opacity < 0.99)).toBe(true)

    // The lift runs too, and both end where they should.
    expect(track(frames, ATOMIC.id).some(({ lift }) => lift < -0.01 && lift > LIFT + 0.01)).toBe(true)
    expect(track(frames, REFACTORING.id).at(-1)).toEqual({ opacity: FADE, lift: 0 })
    expect(track(frames, ATOMIC.id).at(-1)).toEqual({ opacity: 1, lift: LIFT })
    // 150ms ease-out, on the faded wrapper's opacity and on whatever moves the front.
    const now = await boxFrameOf(page, REFACTORING.id)
    const fadeTransitions = now?.faded[0]?.transitions ?? {}
    expect(fadeTransitions.opacity ?? fadeTransitions.all).toBe('0.15s ease-out')
    const liftTransitions = (await boxFrameOf(page, ATOMIC.id))?.liftTransitions ?? {}
    expect(liftTransitions.transform ?? liftTransitions.translate ?? liftTransitions.all).toBe('0.15s ease-out')

    // Under reduced motion, no frame in between.
    await searchField(page).press('Escape')
    await expect.poll(() => resting(page)).toEqual(AT_REST)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    sampling = boxFrames(page, 400)
    await searchField(page).fill('habit')
    frames = await sampling
    expect(track(frames, REFACTORING.id).filter(({ opacity }) => opacity > FADE + 0.01 && opacity < 0.99)).toEqual([])
    expect(track(frames, ATOMIC.id).filter(({ lift }) => lift < -0.01 && lift > LIFT + 0.01)).toEqual([])
    expect(track(frames, REFACTORING.id).at(-1)).toEqual({ opacity: FADE, lift: 0 })

    // List → Boxes with text in the field: the boxes arrive in their search state, with motion allowed.
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await viewButton(page, 'List').click()
    await expect(groupHeadings(page)).toHaveCount(MATCHED.length)
    sampling = boxFrames(page, 400)
    await viewButton(page, 'Boxes').click()
    frames = await sampling
    const refactoring = track(frames, REFACTORING.id)
    const atomic = track(frames, ATOMIC.id)
    expect(refactoring.length).toBeGreaterThan(0)
    expect(refactoring.every(({ opacity, lift }) => opacity === FADE && lift === 0)).toBe(true)
    expect(atomic.every(({ opacity, lift }) => opacity === 1 && lift === LIFT)).toBe(true)
  })

  test('[P1] AC-6 with text in the field, Boxes ⇄ List keeps the text, each view applies it its own way, focus stays on the pressed button, and status stays silent', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(HABIT_SHELF)
    await page.goto(cardNotesPage(server))
    await expect(boxLinks(page)).toHaveCount(HABIT_BOXES.length)
    await searchField(page).fill('habit')

    await expect(box(page, HABIT_NAMES[0])).toBeVisible()

    await expect(page.getByRole('status')).toHaveText(HABIT_LINE)
    await recordStatus(page)

    // List: grouped results with highlights.
    const main = page.getByRole('main')
    await viewButton(page, 'List').click()
    await expect(viewButton(page, 'List')).toBeFocused()
    await expect(searchField(page)).toHaveValue('habit')
    await expect(groupHeadings(page)).toHaveText(MATCHED.map((b) => b.title))
    await expect(main.locator('mark')).toHaveCount(17)
    await expect(boxLinks(page)).toHaveCount(0)
    await expect(main.getByText(HABIT_LINE, { exact: true })).toHaveCount(0)

    // Boxes: lift, fade and pills, and the shelf sentence.
    await viewButton(page, 'Boxes').click()
    await expect(viewButton(page, 'Boxes')).toBeFocused()
    await expect(searchField(page)).toHaveValue('habit')
    for (const [i, name] of HABIT_NAMES.entries()) await expect(boxLinks(page).nth(i)).toHaveAccessibleName(name)
    await expect.poll(() => resting(page)).toEqual(HABIT_STATE)
    await expect(boxOfBook(page, ATOMIC.id).getByText('3 of 12', { exact: true })).toBeVisible()
    await expect(main.getByText(HABIT_LINE, { exact: true })).toBeVisible()
    await expect(groupHeadings(page)).toHaveCount(0)

    await afterAnnounceDelay(page)
    expect(await statusTexts(page)).toEqual([])
  })

  test('[P1] AC-7 a faded box with keyboard focus keeps a full-strength ring in light, dark and forced colors; under forced colors the pill is Canvas with CanvasText text, border and dot, and the fade and lift still apply', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(HABIT_SHELF)
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto(cardNotesPage(server))
    await expect(boxLinks(page)).toHaveCount(HABIT_BOXES.length)
    await searchField(page).fill('habit')

    await expect.poll(async () => (await boxFrameOf(page, REFACTORING.id))?.faded).toMatchObject(ONE_FADED_WRAPPER)

    // Tab from the field: Boxes, List, Atomic Habits, Deep Work, Refactoring.
    const refactoring = boxOfBook(page, REFACTORING.id)
    await searchField(page).focus()
    for (let i = 0; i < 5; i++) await page.keyboard.press('Tab')
    await expect(refactoring).toBeFocused()
    await expect(refactoring).toHaveAccessibleName('Refactoring, no match')
    await expect(refactoring).toHaveCSS('outline', `${ACCENT} solid 2px`)
    await expect(refactoring).toHaveCSS('outline-offset', '4px')
    await expect(refactoring).toHaveCSS('opacity', '1')
    expect((await boxFrameOf(page, REFACTORING.id))?.faded.filter(({ outer }) => outer)).toEqual([])

    await page.emulateMedia({ colorScheme: 'dark' })
    await expect(refactoring).toHaveCSS('outline', `${ACCENT_DARK} solid 2px`)
    await expect(refactoring).toHaveCSS('opacity', '1')

    // Forced colors: the system ring, the pill in system colors, the fade and the lift kept.
    await page.emulateMedia({ forcedColors: 'active' })
    const canvas = await systemColor(page, 'Canvas')
    const canvasText = await systemColor(page, 'CanvasText')
    await expect(refactoring).toHaveCSS('outline-style', 'solid')
    await expect(refactoring).not.toHaveCSS('outline-color', ACCENT_DARK)
    await expect(refactoring).toBeFocused()
    expect(await pillLook(boxOfBook(page, ATOMIC.id), '3 of 12', ATOMIC.title)).toMatchObject({
      background: canvas,
      color: canvasText,
      border: `1px solid ${canvasText}`,
      dot: { background: canvasText },
    })
    await expect.poll(() => resting(page)).toEqual(HABIT_STATE)
    expect((await boxFrameOf(page, REFACTORING.id))?.faded).toMatchObject(ONE_FADED_WRAPPER)
  })
})
