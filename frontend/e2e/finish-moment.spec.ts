// Story 3.7 See the finish on the shelf (ATDD). After **Done** succeeds for
// the Main book in this tab, Home's bookcase slice plays the finish moment
// once: it scrolls the finished spine into view if needed, fills it from its
// current fill to full over about 600 ms ease-out with the highlight ring,
// shows "Finished *X*." in the bookcase header, and once focus has settled the
// `status` region reads "Finished *X*. N of M finished." It never replays: not
// on reload, not on a revisit, and not in a tab that only refetched the views
// (AD-7, NFR6). The moment is the client's alone; `finish-reading` and the
// home view are unchanged, so there is no API leaf (Story 3.6 proves what is
// stored, backend/tests/test_finish_reading.py).
//
// Dates: every leaf starts `bookvie --fake-today 2026-10-28` and sets the
// browser clock to the same day (TC-2, AD-20), so Finished on is prefilled
// with a date the server accepts.
//
// How motion is observed (see `recordMotion`): an init script records every
// CSS transition and animation that starts on a spine or inside it, with its
// animated properties, duration and easing, and every `scrollIntoView` call
// with its options. The highlight ring is an accent `box-shadow` (DESIGN.md →
// Highlight ring, as on Catalog after an add); any other animated property on
// the spine counts as the fill.
//
// Contract the scaffolds pin (see the ATDD checklist):
// - the header line is text in Home's `region` "Bookcase": exactly
//   "Finished *X*." or, for a re-read, "Finished *X* again.";
// - the status line is "Finished *X*. N of M finished." and, for a re-read,
//   "Finished *X* again. N of M finished." (the re-read status is this
//   checklist's proposal: the UX docs give only the header line);
// - the finished spine is the slice's `button` named "*X* by …, finished".

import type { Locator, Page } from '@playwright/test'
import { ACCENT, shelfOf } from './bookcase.ts'
import { expect, test } from './fixtures.ts'
import { DUNE, LEFT_HAND, LEFT_HAND_ID, mainAt, mainBookCard, serverAtFakeToday, stopAndRemove } from './home.ts'

const TITLE = LEFT_HAND.title
const PURPOSE = 'To see how Le Guin builds a world'
const EARLIER = '2026-10-25T21:00:00+01:00'
const SPINE_COLOR = { hex: '#4F7096', rgb: 'rgb(79, 112, 150)' }
/** What the ring may animate; anything else on the spine is the fill. */
const RING_PROPERTIES = new Set(['box-shadow', 'boxShadow', 'outline', 'outline-color', 'outlineColor', 'outline-offset', 'outlineOffset'])

/** The Main book at p.300 of 330, never finished, in a known color, plus Dune: 0 of 2 finished. */
const MAIN_AT_300 = mainAt(300, {
  book: { spineColorUser: SPINE_COLOR.hex },
  reading: { startDate: '2026-10-01', purpose: PURPOSE, lastProgressUpdate: EARLIER },
  others: [DUNE],
})

/**
 * The same Main book among 120 Books by "Author": Le Guin sorts last, so with
 * no Main book its row is the slice's third (filled from the first rows), below
 * the fold of a short window. 0 of 121 finished.
 */
const MAIN_AT_300_LAST_ROW = mainAt(300, {
  book: { spineColorUser: SPINE_COLOR.hex },
  reading: { startDate: '2026-10-01', lastProgressUpdate: EARLIER },
  others: shelfOf(120).map((book, n) => ({ ...book, id: `00000000-0000-4000-8000-${String(n + 1).padStart(12, '0')}`, pages: 300 })),
})

/** A re-read: finished in April with 5 stars, now the Main book again at p.300. 1 of 2 finished. */
const REREAD_AT_300 = {
  mainBookId: LEFT_HAND_ID,
  books: [
    {
      ...LEFT_HAND,
      spineColorUser: SPINE_COLOR.hex,
      readings: [
        { startDate: '2026-03-01', finishDate: '2026-04-20', finishedPages: 330, currentPage: 330, rating: 5 },
        { startDate: '2026-10-01', currentPage: 300, lastProgressUpdate: EARLIER },
      ],
    },
    DUNE,
  ],
}

type Motion = { spine: string | null; properties: string[]; duration: number; easing: string }
type Scroll = { spine: string | null; options: unknown }

/**
 * Runs in the page before any script (an init script): records each CSS
 * transition or animation that starts on a spine `button` or inside it, and
 * each `scrollIntoView` call, into `window.motions` and `window.scrolls`.
 */
function recordMotion(): void {
  const store = window as unknown as { motions: Motion[]; scrolls: Scroll[] }
  store.motions = []
  store.scrolls = []
  const seen = new WeakSet<Animation>()
  const skip = new Set(['offset', 'computedOffset', 'easing', 'composite'])
  const note = (event: Event) => {
    const target = event.target
    if (!(target instanceof Element)) return
    const spine = target.closest('button[aria-label]')
    if (spine === null) return
    for (const animation of target.getAnimations()) {
      if (seen.has(animation)) continue
      seen.add(animation)
      const effect = animation.effect as KeyframeEffect | null
      if (effect === null) continue
      const keyframes = effect.getKeyframes()
      const properties =
        'transitionProperty' in animation
          ? [(animation as CSSTransition).transitionProperty]
          : [...new Set(keyframes.flatMap((frame) => Object.keys(frame).filter((key) => !skip.has(key))))]
      const timing = effect.getTiming()
      const easing = timing.easing !== undefined && timing.easing !== 'linear' ? timing.easing : (keyframes[0]?.easing ?? 'linear')
      store.motions.push({ spine: spine.getAttribute('aria-label'), properties, duration: Number(timing.duration), easing })
    }
  }
  document.addEventListener('transitionrun', note, true)
  document.addEventListener('animationstart', note, true)
  const original = Element.prototype.scrollIntoView
  Element.prototype.scrollIntoView = function (this: Element, options?: boolean | ScrollIntoViewOptions) {
    store.scrolls.push({ spine: this.getAttribute('aria-label'), options: options ?? null })
    original.call(this, options)
  }
}

function motions(page: Page): Promise<Motion[]> {
  return page.evaluate(() => (window as unknown as { motions: Motion[] }).motions)
}

function scrolls(page: Page): Promise<Scroll[]> {
  return page.evaluate(() => (window as unknown as { scrolls: Scroll[] }).scrolls)
}

function resetMotion(page: Page): Promise<void> {
  return page.evaluate(() => {
    const store = window as unknown as { motions: Motion[]; scrolls: Scroll[] }
    store.motions = []
    store.scrolls = []
  })
}

function isFill(motion: Motion): boolean {
  return motion.spine?.startsWith(`${TITLE} by `) === true && motion.properties.some((name) => !RING_PROPERTIES.has(name))
}

function onFinishedSpine(motion: Motion): boolean {
  return motion.spine?.startsWith(`${TITLE} by `) === true
}

/** Two animation frames: a moment started by the render that showed the spine has begun by then. */
function twoFrames(page: Page): Promise<void> {
  return page.evaluate(
    () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))),
  )
}

function homeBookcase(page: Page): Locator {
  return page.getByRole('main').getByRole('region', { name: 'Bookcase', exact: true })
}

/** The bookcase header's finish line, any variant. */
function finishLine(page: Page): Locator {
  return homeBookcase(page).getByText(/^Finished .+\.$/)
}

function meter(page: Page): Locator {
  return homeBookcase(page).getByRole('progressbar', { name: 'Books finished', exact: true })
}

function finishedSpine(page: Page): Locator {
  return page
    .getByRole('main')
    .getByRole('list', { name: /^Bookcase slice, \d+ rows?$/ })
    .getByRole('button', { name: `${TITLE} by Ursula K. Le Guin, finished`, exact: true })
}

function noMainHeading(page: Page): Locator {
  return mainBookCard(page).getByRole('heading', { name: 'No Main book.', exact: true })
}

/** Whether the spine, its slot or anything inside it shows the accent ring. */
function ringed(spine: Locator): Promise<boolean> {
  return spine.evaluate(
    (element, accent) =>
      [element, element.parentElement!, ...Array.from(element.querySelectorAll('*'))].some((node) =>
        getComputedStyle(node).boxShadow.includes(accent),
      ),
    ACCENT,
  )
}

/** Where the running fill started, in px, and the spine body's height (polled each frame until the fill runs). */
async function fillStart(page: Page): Promise<{ from: number; body: number }> {
  const start = await page.waitForFunction(
    (label) => {
      const spine = document.querySelector(`button[aria-label="${label}"]`)
      for (const node of spine === null ? [] : Array.from(spine.querySelectorAll('*'))) {
        const running = node.getAnimations().find((animation) => (animation as CSSTransition).transitionProperty === 'height')
        const from = (running?.effect as KeyframeEffect | null | undefined)?.getKeyframes()[0]?.height
        if (typeof from !== 'string') continue
        // The keyframe keeps a percentage of the body, or is a resolved length.
        const body = node.parentElement!.clientHeight
        return { from: from.endsWith('%') ? (parseFloat(from) / 100) * body : parseFloat(from), body }
      }
      return null
    },
    `${TITLE} by Ursula K. Le Guin, finished`,
    { polling: 'raf' },
  )
  return (await start.jsonValue())!
}

/** The next home view response: a refetch has landed once it resolves. */
function homeViewRefetch(page: Page): Promise<unknown> {
  return page.waitForResponse((response) => new URL(response.url()).pathname === '/api/views/home')
}

/** The Finish dialog's Done, opened from Home's page field at the last page. */
async function finishFromPageField(page: Page): Promise<void> {
  const card = mainBookCard(page)
  await card.getByRole('spinbutton', { name: 'Page', exact: true }).fill('330')
  await card.getByRole('button', { name: 'Update', exact: true }).click()
  await page.getByRole('dialog', { name: `Finished ${TITLE}`, exact: true }).getByRole('button', { name: 'Done', exact: true }).click()
}

/** The Finish dialog's Done, opened from **Mark finished** on the Main book's Book detail. */
async function finishFromBookDetail(page: Page, url: string): Promise<void> {
  await page.goto(`${url}/book/${LEFT_HAND_ID}`)
  await page.getByRole('main').getByRole('button', { name: 'Mark finished', exact: true }).click()
  await page.getByRole('dialog', { name: `Finished ${TITLE}`, exact: true }).getByRole('button', { name: 'Done', exact: true }).click()
}

test.describe('Story 3.7 See the finish on the shelf (ATDD)', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'no-preference' })
    await page.context().addInitScript(recordMotion)
  })

  test('[P1] AC-1 Done for the Main book scrolls the finished spine into view, fills it to full over about 600 ms ease-out with the highlight ring, shows "Finished X." in the header, updates the meter, and status reads "Finished X. 1 of 121 finished."', async ({
    page,
  }) => {
    // A short window: after the finish, Le Guin's row is the slice's third, below the fold.
    await page.setViewportSize({ width: 1280, height: 480 })
    const server = await serverAtFakeToday(page, 'finish-moment', MAIN_AT_300_LAST_ROW)
    try {
      await page.goto(server.url)
      await finishFromPageField(page)

      await expect(homeBookcase(page).getByText(`Finished ${TITLE}.`, { exact: true })).toBeVisible()

      // The spine was brought into view, then filled from 100% of its body (the page field saved p.330 first) to the whole spine: one fill motion of about 600 ms, ease-out.
      const spine = finishedSpine(page)
      await expect(spine).toBeInViewport()
      await expect.poll(async () => (await motions(page)).filter(isFill).length).toBeGreaterThan(0)
      const [fill] = (await motions(page)).filter(isFill)
      expect(fill.duration).toBeGreaterThanOrEqual(500)
      expect(fill.duration).toBeLessThanOrEqual(700)
      expect(fill.easing).toBe('ease-out')
      // With the highlight ring, which then fades; the spine stays solid in its color.
      await expect.poll(() => ringed(spine)).toBe(true)
      await expect.poll(() => ringed(spine), { timeout: 4_000 }).toBe(false)
      await expect(spine).toHaveCSS('background-color', SPINE_COLOR.rgb)
      // The meter counts it.
      await expect(meter(page)).toHaveAttribute('aria-valuenow', '1')
      await expect(homeBookcase(page)).toContainText('1 of 121 finished')
      // Focus settles on "No Main book." (Story 3.6), then status speaks.
      await expect(noMainHeading(page)).toBeFocused()
      await expect(page.getByRole('status')).toHaveText(`Finished ${TITLE}. 1 of 121 finished.`)
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P1] AC-2 once played, the finish moment never plays again: not after a reload, not on a revisit to Home, and not in another tab that only refetched the views; the header line is gone', async ({
    page,
  }) => {
    const server = await serverAtFakeToday(page, 'finish-once', MAIN_AT_300)
    try {
      // Tab B is on Home before the finish; it will only receive refreshed views.
      const tabB = await page.context().newPage()
      await tabB.goto(server.url)
      await expect(mainBookCard(tabB).getByRole('link', { name: TITLE, exact: true })).toBeVisible()

      // Tab A finishes, and its moment plays (the transition this criterion follows).
      await finishFromBookDetail(page, server.url)
      await expect(homeBookcase(page).getByText(`Finished ${TITLE}.`, { exact: true })).toBeVisible()
      // The fill starts from where the Main fill stood (p.300 of 330), not from 0.
      const { from, body } = await fillStart(page)
      expect(Math.abs(from - (300 / 330) * body)).toBeLessThanOrEqual(3)
      await expect.poll(async () => (await motions(page)).filter(isFill).length).toBeGreaterThan(0)

      // Still on this Home: a refetch and a repack replay nothing, and the line stays.
      await expect.poll(() => ringed(finishedSpine(page)), { timeout: 4_000 }).toBe(false)
      await resetMotion(page)
      const refetched = homeViewRefetch(page)
      await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange', { bubbles: true })))
      await refetched
      const size = page.viewportSize()!
      await page.setViewportSize({ width: size.width - 300, height: size.height })
      await expect(finishedSpine(page)).toBeVisible()
      await twoFrames(page)
      expect((await motions(page)).filter(onFinishedSpine)).toEqual([])
      expect((await scrolls(page)).filter((scroll) => scroll.spine?.startsWith(`${TITLE} by `))).toEqual([])
      await expect(homeBookcase(page).getByText(`Finished ${TITLE}.`, { exact: true })).toBeVisible()

      // Reload: no fill, no ring, no header line.
      await page.reload()
      await expect(finishedSpine(page)).toBeVisible()
      await twoFrames(page)

      expect((await motions(page)).filter(onFinishedSpine)).toEqual([])

      await expect(finishLine(page)).toHaveCount(0)
      expect(await ringed(finishedSpine(page))).toBe(false)
      await expect(meter(page)).toHaveAttribute('aria-valuenow', '1')

      // Revisit: Catalog, then Home again.
      const nav = page.getByRole('navigation')
      await nav.getByRole('link', { name: 'Catalog', exact: true }).click()
      await expect(page.getByRole('heading', { level: 1, name: 'Catalog', exact: true })).toBeVisible()
      await resetMotion(page)
      await nav.getByRole('link', { name: 'Home', exact: true }).click()
      await expect(finishedSpine(page)).toBeVisible()
      await twoFrames(page)
      expect((await motions(page)).filter(onFinishedSpine)).toEqual([])
      await expect(finishLine(page)).toHaveCount(0)

      // Tab B refetches on visibility change: it shows the finish, but plays nothing.
      await tabB.bringToFront()
      // As the browser fires it: at the document, bubbling to `window`, where the views listen.
      await tabB.evaluate(() => document.dispatchEvent(new Event('visibilitychange', { bubbles: true })))
      await expect(noMainHeading(tabB)).toBeVisible()
      await expect(finishedSpine(tabB)).toBeVisible()
      await twoFrames(tabB)
      expect((await motions(tabB)).filter(onFinishedSpine)).toEqual([])
      expect((await scrolls(tabB)).filter((scroll) => scroll.spine?.startsWith(`${TITLE} by `))).toEqual([])
      await expect(finishLine(tabB)).toHaveCount(0)
      expect(await ringed(finishedSpine(tabB))).toBe(false)
      await expect(tabB.getByRole('status')).not.toContainText('Finished')
      await tabB.close()
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P2] AC-3 a finished re-read plays only the highlight ring, the header reads "Finished X again.", and the meter count does not change', async ({
    page,
  }) => {
    const server = await serverAtFakeToday(page, 'finish-reread', REREAD_AT_300)
    try {
      await page.goto(server.url)
      // Setup: the re-read already counts.
      await expect(meter(page)).toHaveAttribute('aria-valuenow', '1')
      await finishFromPageField(page)

      await expect(homeBookcase(page).getByText(`Finished ${TITLE} again.`, { exact: true })).toBeVisible()

      const spine = finishedSpine(page)
      await expect.poll(() => ringed(spine)).toBe(true)
      // The spine was already full color: nothing on it but the ring moves.
      expect((await motions(page)).filter(isFill)).toEqual([])
      await expect(spine).toHaveCSS('background-color', SPINE_COLOR.rgb)
      await expect(meter(page)).toHaveAttribute('aria-valuenow', '1')
      await expect(meter(page)).toHaveAttribute('aria-valuemax', '2')
      await expect(noMainHeading(page)).toBeFocused()
      await expect(page.getByRole('status')).toHaveText(`Finished ${TITLE} again. 1 of 2 finished.`)
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P2] AC-4 under prefers-reduced-motion the scroll uses behavior auto, and the fill and ring are instant', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' })
    await page.setViewportSize({ width: 1280, height: 480 })
    const server = await serverAtFakeToday(page, 'finish-reduced', MAIN_AT_300_LAST_ROW)
    try {
      await page.goto(server.url)
      await finishFromPageField(page)

      await expect
        .poll(async () => (await scrolls(page)).filter((scroll) => scroll.spine?.startsWith(`${TITLE} by `)))
        .toEqual([expect.objectContaining({ options: expect.objectContaining({ behavior: 'auto' }) })])

      const spine = finishedSpine(page)
      await expect(spine).toBeInViewport()
      // Instant: no motion with a duration on the spine, the ring on at once with no fade.
      expect((await motions(page)).filter((motion) => onFinishedSpine(motion) && motion.duration > 0)).toEqual([])
      await expect.poll(() => ringed(spine)).toBe(true)
      await expect(spine).toHaveCSS('transition-duration', '0s')
      await expect(spine).toHaveCSS('background-color', SPINE_COLOR.rgb)
      await expect(homeBookcase(page).getByText(`Finished ${TITLE}.`, { exact: true })).toBeVisible()
      // The ring goes at once too: no box-shadow fade once it is removed.
      await expect.poll(() => ringed(spine), { timeout: 4_000 }).toBe(false)
      await twoFrames(page)
      expect((await motions(page)).filter((motion) => onFinishedSpine(motion) && motion.duration > 0)).toEqual([])
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P2] AC-5 the finish moment has no sound, no confetti, no praise and no exclamation mark', async ({ page }) => {
    // Any sound would go through a media element or Web Audio: count both.
    await page.context().addInitScript(() => {
      const store = window as unknown as { sounds: number }
      store.sounds = 0
      const play = HTMLMediaElement.prototype.play
      HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
        store.sounds++
        return play.call(this)
      }
      const Context = window.AudioContext
      window.AudioContext = class extends Context {
        constructor(options?: AudioContextOptions) {
          super(options)
          store.sounds++
        }
      }
    })
    const server = await serverAtFakeToday(page, 'finish-tone', MAIN_AT_300)
    try {
      await page.goto(server.url)
      await finishFromPageField(page)

      // The one quiet line, exactly: no praise around it.
      await expect(finishLine(page)).toHaveText(`Finished ${TITLE}.`)

      await expect(page.getByRole('status')).toHaveText(`Finished ${TITLE}. 1 of 2 finished.`)
      // The spine was already in view: the fill and the ring still play, and the scroll is a no-op `nearest`.
      await expect.poll(async () => (await motions(page)).filter(isFill).length).toBeGreaterThan(0)
      expect((await scrolls(page)).filter((scroll) => scroll.spine?.startsWith(`${TITLE} by `))).toEqual([
        expect.objectContaining({ options: expect.objectContaining({ block: 'nearest' }) }),
      ])
      const ringMotion = (motion: Motion) => onFinishedSpine(motion) && motion.properties.some((name) => RING_PROPERTIES.has(name))
      await expect.poll(async () => (await motions(page)).some(ringMotion)).toBe(true)
      await expect.poll(() => ringed(finishedSpine(page)), { timeout: 4_000 }).toBe(false)
      // No exclamation mark anywhere on Home or in the live regions.
      expect(await page.locator('body').innerText()).not.toContain('!')
      expect(await page.getByRole('status').textContent()).not.toContain('!')
      // No sound, no confetti (no canvas, media or extra layer drawn over the page).
      expect(await page.evaluate(() => (window as unknown as { sounds: number }).sounds)).toBe(0)
      await expect(page.locator('canvas, audio, video')).toHaveCount(0)
      expect(await homeBookcase(page).innerText()).not.toMatch(/\b(great|well done|congrat|amazing|awesome|nice)/i)
    } finally {
      await stopAndRemove(server)
    }
  })
  test('[P2] the fill starts from the Main fill Home shows, not from a cached Book view of an earlier visit', async ({ page }) => {
    const server = await serverAtFakeToday(page, 'finish-cached-view', MAIN_AT_300)
    try {
      // Book detail at p.300 caches the `book` view at 91%; Home's page field then saves p.330.
      await page.goto(`${server.url}/book/${LEFT_HAND_ID}`)
      await expect(page.getByRole('main').getByRole('button', { name: 'Mark finished', exact: true })).toBeVisible()
      await page.getByRole('navigation').getByRole('link', { name: 'Home', exact: true }).click()
      const card = mainBookCard(page)
      await card.getByRole('spinbutton', { name: 'Page', exact: true }).fill('330')
      await card.getByRole('button', { name: 'Update', exact: true }).click()
      const dialog = page.getByRole('dialog', { name: `Finished ${TITLE}`, exact: true })
      await expect(dialog).toBeVisible()
      // Home has rendered the saved page (the card behind the modal reads 100%), and the
      // Main fill's own 91% → 100% transition has ended, so only the moment's fill is measured.
      await expect(page.locator('[aria-valuetext="100%, page 330 of 330"]')).toHaveCount(1)
      await page.waitForFunction(() => document.getAnimations().length === 0)
      await dialog.getByRole('button', { name: 'Done', exact: true }).click()

      const { from, body } = await fillStart(page)
      expect(Math.abs(from - body)).toBeLessThanOrEqual(3)
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P2] a new history entry on the same Home (a Start from the slice) drops the header line and replays nothing', async ({
    page,
  }) => {
    const server = await serverAtFakeToday(page, 'finish-then-start', MAIN_AT_300)
    try {
      await page.goto(server.url)
      await finishFromPageField(page)
      await expect(finishLine(page)).toHaveText(`Finished ${TITLE}.`)
      // The moment has played: the ring came on, then went.
      await expect.poll(() => ringed(finishedSpine(page))).toBe(true)
      await expect.poll(() => ringed(finishedSpine(page)), { timeout: 4_000 }).toBe(false)

      // Start Dune from its spine popover: Home stays mounted, on a new entry.
      await resetMotion(page)
      const slice = page.getByRole('main').getByRole('list', { name: /^Bookcase slice, \d+ rows?$/ })
      await slice.getByRole('button', { name: 'Dune by Frank Herbert, not read yet', exact: true }).click()
      await page.getByRole('dialog', { name: 'Dune', exact: true }).getByRole('button', { name: 'Start reading', exact: true }).click()
      await page.getByRole('dialog', { name: 'Start Dune?', exact: true }).getByRole('button', { name: 'Start reading', exact: true }).click()

      await expect(mainBookCard(page).getByRole('link', { name: 'Dune', exact: true })).toBeVisible()
      await expect(finishLine(page)).toHaveCount(0)
      await twoFrames(page)
      expect((await motions(page)).filter(onFinishedSpine)).toEqual([])
      expect(await ringed(finishedSpine(page))).toBe(false)
    } finally {
      await stopAndRemove(server)
    }
  })
})
