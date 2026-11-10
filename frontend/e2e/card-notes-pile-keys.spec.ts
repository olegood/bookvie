// Pile arrow keys (_bmad-output/implementation-artifacts/
// spec-pile-arrow-key-navigation.md). Left and Right do what Previous and Next
// do, Home and End go to the first and last note, from anywhere in the pile
// except the Order radios. Keys with Alt, Ctrl, Meta or Shift are left to the
// browser. Focus stays put, a move is announced like a button press, an end
// does nothing, and handled keys are preventDefault-ed. Previous and Next carry
// aria-keyshortcuts. No visible hint.

import type { Locator, Page } from '@playwright/test'
import { expect, test } from './fixtures.ts'
import { DUNE_ID } from './home.ts'
import {
  announcedNote,
  announcement,
  BEGINNING,
  cardNotesPage,
  DUNE_EDIT_BY_TEXT,
  DUNE_IN_PAGE_ORDER,
  FEAR,
  group,
  LIBRARY,
  MYSTERY,
  nextButton,
  NEUROMANCER,
  NEUROMANCER_ID,
  orderGroup,
  pile,
  pileOpener,
  position,
  press,
  previousButton,
  seededRandom,
  SPICE,
} from './pile.ts'

/** Records every pile `status` text set from now on (non-empty), to prove a key announced nothing. */
async function recordPileStatus(dialog: Locator): Promise<() => Promise<string[]>> {
  await announcement(dialog).evaluate((region) => {
    const seen: string[] = []
    ;(window as Window & { pileStatusTexts?: string[] }).pileStatusTexts = seen
    new MutationObserver(() => seen.push(region.textContent ?? '')).observe(region, {
      childList: true,
      characterData: true,
      subtree: true,
    })
  })
  return async () =>
    (
      (await dialog.page().evaluate(() => (window as Window & { pileStatusTexts?: string[] }).pileStatusTexts)) ?? []
    ).filter((text) => text !== '')
}

type KeyRecord = { key: string; mods: string; prevented: boolean }

/** Records each keydown's `defaultPrevented` once every handler has run (a bubble listener on `window`). */
async function recordKeys(page: Page): Promise<() => Promise<KeyRecord[]>> {
  await page.evaluate(() => {
    const seen: KeyRecord[] = []
    ;(window as Window & { keyRecords?: KeyRecord[] }).keyRecords = seen
    window.addEventListener('keydown', (event) => {
      const mods = ['Alt', 'Control', 'Meta', 'Shift'].filter((mod) => event.getModifierState(mod)).join('+')
      seen.push({ key: event.key, mods, prevented: event.defaultPrevented })
    })
  })
  return async () => (await page.evaluate(() => (window as Window & { keyRecords?: KeyRecord[] }).keyRecords)) ?? []
}

test.describe('Pile arrow keys', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
  })

  test('[P0] AC-1 Left and Right step like Previous and Next from Next, Close or Previous, announcing the move and keeping focus', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(LIBRARY)
    await page.goto(cardNotesPage(server, DUNE_ID))
    await pileOpener(page.getByRole('main')).click()
    const dialog = pile(page, 'Dune')
    await expect(nextButton(dialog)).toBeFocused()
    await page.keyboard.press('ArrowRight')

    // The criterion: Right is Next, announced like a press.
    await expect(announcement(dialog)).toHaveText(`Note 2 of 4, pp.42–45: ${BEGINNING}`)
    await expect(position(dialog)).toHaveText('2 of 4')
    await expect(dialog.getByText(BEGINNING, { exact: true })).toBeVisible()
    await expect(nextButton(dialog)).toBeFocused()

    // Left is Previous.
    await page.keyboard.press('ArrowLeft')
    await expect(announcement(dialog)).toHaveText(`Note 1 of 4, p.12: ${FEAR}`)
    await expect(position(dialog)).toHaveText('1 of 4')
    await expect(nextButton(dialog)).toBeFocused()

    // From Close: the note steps, focus stays on Close.
    const close = dialog.getByRole('button', { name: 'Close', exact: true })
    await close.focus()
    await page.keyboard.press('ArrowRight')
    await expect(position(dialog)).toHaveText('2 of 4')
    await expect(close).toBeFocused()

    // From Previous: the same, backwards.
    await previousButton(dialog).focus()
    await page.keyboard.press('ArrowLeft')
    await expect(position(dialog)).toHaveText('1 of 4')
    await expect(announcement(dialog)).toHaveText(`Note 1 of 4, p.12: ${FEAR}`)
    await expect(previousButton(dialog)).toBeFocused()
  })

  test('[P0] AC-2 Home and End jump to the first and last note, announced; Home on the first and End on the last do nothing', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(LIBRARY)
    await page.goto(cardNotesPage(server, DUNE_ID))
    await pileOpener(page.getByRole('main')).click()
    const dialog = pile(page, 'Dune')
    await expect(nextButton(dialog)).toBeFocused()
    await page.keyboard.press('End')

    // The criterion: End jumps to the last note and announces it.
    await expect(announcement(dialog)).toHaveText(`Note 4 of 4, p.300: ${MYSTERY}`)
    await expect(position(dialog)).toHaveText('4 of 4')
    await expect(nextButton(dialog)).toBeFocused()

    // End on the last note: nothing changes, nothing is announced.
    const spoken = await recordPileStatus(dialog)
    await page.keyboard.press('End')
    await expect(position(dialog)).toHaveText('4 of 4')
    expect(await spoken()).toEqual([])

    // Home jumps to the first note.
    await page.keyboard.press('Home')
    await expect(announcement(dialog)).toHaveText(`Note 1 of 4, p.12: ${FEAR}`)
    await expect(position(dialog)).toHaveText('1 of 4')

    // Home on the first note: nothing more.
    await page.keyboard.press('Home')
    await expect(position(dialog)).toHaveText('1 of 4')
    expect(await spoken()).toEqual([`Note 1 of 4, p.12: ${FEAR}`])
  })

  test('[P1] AC-3 at either end the arrow keys do nothing and announce nothing (no wrap), and a one-note pile ignores all four keys', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(LIBRARY)
    await page.goto(cardNotesPage(server, DUNE_ID))
    await pileOpener(page.getByRole('main')).click()
    const dialog = pile(page, 'Dune')
    for (let n = 2; n <= 4; n++) await press(nextButton(dialog))
    await expect(position(dialog)).toHaveText('4 of 4')
    const spoken = await recordPileStatus(dialog)

    // Right twice at the last note, then Left once.
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowLeft')

    // The criterion: the Rights at the end announced nothing and didn't wrap; only the Left moved.
    await expect.poll(spoken).toEqual([`Note 3 of 4, p.96: ${SPICE}`])
    await expect(position(dialog)).toHaveText('3 of 4')
    await expect(nextButton(dialog)).not.toHaveAttribute('aria-disabled', 'true')

    // Left at the first note: no wrap to the last.
    await page.keyboard.press('Home')
    await expect(position(dialog)).toHaveText('1 of 4')
    await page.keyboard.press('ArrowLeft')
    await expect(position(dialog)).toHaveText('1 of 4')
    await expect(previousButton(dialog)).toHaveAttribute('aria-disabled', 'true')
    expect(await spoken()).toEqual([`Note 3 of 4, p.96: ${SPICE}`, `Note 1 of 4, p.12: ${FEAR}`])

    // A one-note pile: all four keys do nothing.
    await page.goto(cardNotesPage(server, NEUROMANCER_ID))
    await pileOpener(page.getByRole('main')).click()
    const single = pile(page, 'Neuromancer')
    const singleSpoken = await recordPileStatus(single)
    for (const key of ['ArrowRight', 'ArrowLeft', 'Home', 'End']) await page.keyboard.press(key)
    await expect(position(single)).toHaveText('1 of 1')
    expect(await singleSpoken()).toEqual([])
    await expect(previousButton(single)).toHaveAttribute('aria-disabled', 'true')
    await expect(nextButton(single)).toHaveAttribute('aria-disabled', 'true')
  })

  test('[P1] AC-4 on an Order radio the arrow keys pick the order without stepping the note, and Home and End do nothing', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(LIBRARY)
    await page.goto(cardNotesPage(server, DUNE_ID))
    await pileOpener(page.getByRole('main')).click()
    const dialog = pile(page, 'Dune')
    const order = orderGroup(dialog)
    const pageOrder = order.getByRole('radio', { name: 'Page order', exact: true })
    const shuffledRadio = order.getByRole('radio', { name: 'Shuffled', exact: true })

    // The control: from Next, Right steps, so the radio check below isn't vacuous.
    await page.keyboard.press('ArrowRight')
    await expect(position(dialog)).toHaveText('2 of 4')

    // The criterion: on the Page order radio, Right picks Shuffled and the pile restarts at 1, no extra step.
    await pageOrder.focus()
    await page.keyboard.press('ArrowRight')
    await expect(shuffledRadio).toBeChecked()
    await expect(shuffledRadio).toBeFocused()
    await expect(position(dialog)).toHaveText('1 of 4')

    // Left picks Page order back, again at 1.
    await page.keyboard.press('ArrowLeft')
    await expect(pageOrder).toBeChecked()
    await expect(position(dialog)).toHaveText('1 of 4')
    await expect(dialog.getByText(FEAR, { exact: true })).toBeVisible()

    // Home and End on a radio leave the note alone.
    await page.keyboard.press('End')
    await expect(position(dialog)).toHaveText('1 of 4')
    await page.keyboard.press('Home')
    await expect(position(dialog)).toHaveText('1 of 4')
    await expect(pageOrder).toBeFocused()
  })

  test('[P1] AC-5 a key held with Alt, Ctrl, Meta or Shift steps nothing and is not preventDefault-ed', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(LIBRARY)
    await page.goto(cardNotesPage(server, DUNE_ID))
    await pileOpener(page.getByRole('main')).click()
    const dialog = pile(page, 'Dune')
    await expect(nextButton(dialog)).toBeFocused()
    const keys = await recordKeys(page)

    // Only forward keys, at the first note: a modified Left could be the browser's Back.
    for (const chord of ['Alt+ArrowRight', 'Control+ArrowRight', 'Meta+ArrowRight', 'Shift+ArrowRight', 'Shift+End']) {
      await page.keyboard.press(chord)
    }
    // The control: a plain Right steps, so "nothing stepped" isn't vacuous.
    await page.keyboard.press('ArrowRight')

    // The criterion: none of the modified keys stepped or was prevented; the plain one did both.
    await expect(position(dialog)).toHaveText('2 of 4')
    expect((await keys()).filter((record) => record.key === 'ArrowRight' || record.key === 'End')).toEqual([
      { key: 'ArrowRight', mods: 'Alt', prevented: false },
      { key: 'ArrowRight', mods: 'Control', prevented: false },
      { key: 'ArrowRight', mods: 'Meta', prevented: false },
      { key: 'ArrowRight', mods: 'Shift', prevented: false },
      { key: 'End', mods: 'Shift', prevented: false },
      { key: 'ArrowRight', mods: '', prevented: true },
    ])
    await expect(announcement(dialog)).toHaveText(`Note 2 of 4, pp.42–45: ${BEGINNING}`)
  })

  test('[P1] AC-6 each handled key is preventDefault-ed, including at an end where it moves nothing', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(LIBRARY)
    await page.goto(cardNotesPage(server, DUNE_ID))
    await pileOpener(page.getByRole('main')).click()
    const dialog = pile(page, 'Dune')
    await expect(nextButton(dialog)).toBeFocused()
    const keys = await recordKeys(page)

    // At the first note: Home and Left move nothing; End and Right (at the last) neither.
    for (const key of ['Home', 'ArrowLeft', 'End', 'ArrowRight']) await page.keyboard.press(key)

    // The criterion: all four were handled, so none reaches the browser's scrolling.
    expect(await keys()).toEqual([
      { key: 'Home', mods: '', prevented: true },
      { key: 'ArrowLeft', mods: '', prevented: true },
      { key: 'End', mods: '', prevented: true },
      { key: 'ArrowRight', mods: '', prevented: true },
    ])
    await expect(position(dialog)).toHaveText('4 of 4')
  })

  test('[P1] AC-7 Previous carries aria-keyshortcuts "ArrowLeft" and Next "ArrowRight"', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(LIBRARY)
    await page.goto(cardNotesPage(server, DUNE_ID))
    await pileOpener(page.getByRole('main')).click()
    const dialog = pile(page, 'Dune')

    // The criterion.
    await expect(previousButton(dialog)).toHaveAttribute('aria-keyshortcuts', 'ArrowLeft')
    await expect(nextButton(dialog)).toHaveAttribute('aria-keyshortcuts', 'ArrowRight')
    // Nothing else claims a shortcut, and there is no on-screen hint.
    await expect(dialog.locator('[aria-keyshortcuts]')).toHaveCount(2)
    await expect(dialog.getByText(/←|→|arrow/i)).toHaveCount(0)
  })

  test("[P1] AC-8 in Shuffled the keys follow the shuffle, and closing at End focuses the shuffle's last note's Edit", async ({
    page,
    seededServer,
  }) => {
    await seededRandom(page)
    const server = await seededServer(LIBRARY)
    await page.goto(cardNotesPage(server))
    const dune = group(page, 'Dune')
    await pileOpener(dune).click()
    const dialog = pile(page, 'Dune')
    await orderGroup(dialog).getByRole('radio', { name: 'Shuffled', exact: true }).check()
    await expect(position(dialog)).toHaveText('1 of 4')
    await nextButton(dialog).focus()
    await page.keyboard.press('End')

    // The criterion: End reaches "4 of 4" of the shuffle.
    await expect(position(dialog)).toHaveText('4 of 4')
    const last = await announcedNote(dialog)

    // Left walks the shuffle back; Next walks it forward again: the same sequence.
    const byKeys = [last]
    for (let n = 3; n >= 1; n--) {
      await page.keyboard.press('ArrowLeft')
      await expect(position(dialog)).toHaveText(`${n} of 4`)
      byKeys.unshift(await announcedNote(dialog))
    }
    const byButtons = [byKeys[0]]
    for (let n = 2; n <= 4; n++) {
      await press(nextButton(dialog))
      await expect(position(dialog)).toHaveText(`${n} of 4`)
      byButtons.push(await announcedNote(dialog))
    }
    expect(byButtons).toEqual(byKeys)
    expect(byKeys).not.toEqual(DUNE_IN_PAGE_ORDER)

    // Close at the shuffle's last note: focus on that note's Edit (story 5.4 AC-6).
    await page.keyboard.press('Home')
    await page.keyboard.press('End')
    await expect(position(dialog)).toHaveText('4 of 4')
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(dune.getByRole('button', { name: DUNE_EDIT_BY_TEXT[last], exact: true })).toBeFocused()
  })
})

// Automate follow-ups (bmad-testarch-automate): Book detail's pile, keys that
// would scroll, and a held key's auto-repeat.

/** A page ref chip in a list: "Open p.N in the pile". */
function pageRefButton(scope: Locator, ref: string): Locator {
  return scope.getByRole('button', { name: `Open ${ref} in the pile`, exact: true })
}

/** Book detail's Card notes block, named by its heading "Card notes (N)". */
function cardNotesBlock(page: Page, count: number): Locator {
  return page.getByRole('main').getByRole('region', { name: `Card notes (${count})`, exact: true })
}

type ScrollState = { pageY: number; dialogTop: number }

/**
 * The page's and the dialog's scroll positions once they settle: unchanged for
 * 30 animation frames, so a smooth keyboard scroll has had time to start and end.
 */
async function scrollState(dialog: Locator): Promise<ScrollState> {
  return dialog.evaluate(
    (element) =>
      new Promise<ScrollState>((resolve) => {
        const read = () => ({ pageY: window.scrollY, dialogTop: element.scrollTop })
        let last = read()
        let still = 0
        const tick = () => {
          const now = read()
          still = now.pageY === last.pageY && now.dialogTop === last.dialogTop ? still + 1 : 0
          last = now
          if (still >= 30) resolve(now)
          else requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      }),
  )
}

test.describe('Pile arrow keys automate', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
  })

  test("[P2] AC-1 on Book detail's pile, Right, End and Home step the pile, announced, with focus kept on Next", async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(LIBRARY)
    await page.goto(`${server.url}/book/${DUNE_ID}`)
    const opener = pileOpener(page.getByRole('main'))
    // The opener in main is the Card notes block's own.
    await expect(opener).toHaveCount(1)
    await expect(pileOpener(cardNotesBlock(page, 4))).toBeVisible()
    await opener.click()
    const dialog = pile(page, 'Dune')
    await expect(nextButton(dialog)).toBeFocused()

    // The criterion: the keys work in Book detail's pile as on the Card notes page.
    await page.keyboard.press('ArrowRight')
    await expect(announcement(dialog)).toHaveText(`Note 2 of 4, pp.42–45: ${BEGINNING}`)
    await expect(position(dialog)).toHaveText('2 of 4')
    await page.keyboard.press('End')
    await expect(announcement(dialog)).toHaveText(`Note 4 of 4, p.300: ${MYSTERY}`)
    await expect(position(dialog)).toHaveText('4 of 4')
    await page.keyboard.press('Home')
    await expect(announcement(dialog)).toHaveText(`Note 1 of 4, p.12: ${FEAR}`)
    await expect(position(dialog)).toHaveText('1 of 4')
    await expect(nextButton(dialog)).toBeFocused()
  })

  test('[P2] AC-6 in an overflowing pile over a scrollable page, Home and End step without scrolling the dialog or the page, and Home on a radio neither steps nor scrolls', async ({
    page,
    seededServer,
  }) => {
    await page.setViewportSize({ width: 360, height: 300 })
    const thirty = Array.from({ length: 30 }, (_, index) => ({
      text: `Note number ${index + 1} of the long list.`,
      pageStart: index + 1,
    }))
    const server = await seededServer({ books: [{ ...NEUROMANCER, cardNotes: thirty }] })
    await page.goto(cardNotesPage(server, NEUROMANCER_ID))
    await pageRefButton(page.getByRole('main'), 'p.1').click()
    const dialog = pile(page, 'Neuromancer')
    await expect(position(dialog)).toHaveText('1 of 30')
    await expect(nextButton(dialog)).toBeFocused()

    // Preconditions: both the dialog and the page behind it could scroll.
    const overflow = await dialog.evaluate((element) => ({
      dialog: element.scrollHeight > element.clientHeight,
      page: document.documentElement.scrollHeight > window.innerHeight,
    }))
    expect(overflow).toEqual({ dialog: true, page: true })

    // The criterion: from Next, End and Home step, and neither scrolls.
    const before = await scrollState(dialog)
    await page.keyboard.press('End')
    await expect(position(dialog)).toHaveText('30 of 30')
    expect(await scrollState(dialog)).toEqual(before)
    await page.keyboard.press('Home')
    await expect(position(dialog)).toHaveText('1 of 30')
    expect(await scrollState(dialog)).toEqual(before)

    // On a radio, Home and End do nothing: no step, and neither the dialog nor the page scrolls.
    const pageOrder = orderGroup(dialog).getByRole('radio', { name: 'Page order', exact: true })
    await pageOrder.focus()
    const onRadio = await scrollState(dialog)
    // Focusing the radio scrolled the dialog down, so a native Home would have somewhere to go.
    expect(onRadio.dialogTop).toBeGreaterThan(0)
    await page.keyboard.press('Home')
    await expect(pageOrder).toBeFocused()
    await expect(pageOrder).toBeChecked()
    await expect(position(dialog)).toHaveText('1 of 30')
    expect(await scrollState(dialog)).toEqual(onRadio)
  })

  test('[P2] AC-1 holding Right auto-repeats to the last note and stops there, with no wrap', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(LIBRARY)
    await page.goto(cardNotesPage(server, DUNE_ID))
    await pileOpener(page.getByRole('main')).click()
    const dialog = pile(page, 'Dune')
    await expect(nextButton(dialog)).toBeFocused()
    await page.evaluate(() => {
      const repeats: boolean[] = []
      ;(window as Window & { rightRepeats?: boolean[] }).rightRepeats = repeats
      window.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowRight') repeats.push(event.repeat)
      })
    })

    // Held: one press, then auto-repeats, more than the pile has notes.
    for (let n = 0; n < 8; n++) await page.keyboard.down('ArrowRight')
    await page.keyboard.up('ArrowRight')

    // The keydowns after the first are auto-repeats, so this is a genuine hold.
    const repeats = await page.evaluate(() => (window as Window & { rightRepeats?: boolean[] }).rightRepeats)
    expect(repeats).toEqual([false, true, true, true, true, true, true, true])

    // The criterion: the hold stops at the last note.
    await expect(position(dialog)).toHaveText('4 of 4')
    await expect(announcement(dialog)).toHaveText(`Note 4 of 4, p.300: ${MYSTERY}`)
    await expect(nextButton(dialog)).toHaveAttribute('aria-disabled', 'true')
    await expect(nextButton(dialog)).toBeFocused()
  })
})
