// Story 11.4 Tell me when a tab is older than the app, on a production server.
//
// The bundle's baked version (frontend/package.json) equals the worker
// server's `app-info.version` (AR34), so a tab shows no notice (AC-2) until a
// test answers `app-info` with another version. Then a `surface` band under
// the top nav says "bookvie was updated to X. Reload to use it." with
// **Reload** (AC-3). It stays on every route and blocks nothing (AC-4),
// Reload reloads at once (AC-5), it is announced once per new version and
// hides on the bundle's own version (AC-6), a failed refetch changes nothing
// (AC-7), Tab reaches Reload after the theme toggle (AC-8), forced colors
// keep it drawn (AC-9), and the README's Updating line names it (AC-10).
// AC-1 (the baked version and the four copies) is scripts/version.test.mjs.

import type { Page } from '@playwright/test'
import { noteField, recordStatus, statusTexts } from './card-note-add-another.ts'
import { addCardNote, cardNotePanel, SAVED } from './card-note-keys.ts'
import { liveRegionText, mainNav, README, readText, ROUTES, systemColor, watchAppInfo } from './dev-mode.ts'
import { expect, test } from './fixtures.ts'
import { DUNE, LEFT_HAND_ID, mainAt, mainBookCard, storedBook } from './home.ts'
import { afterAnnounceDelay } from './stats.ts'
import {
  type Answer,
  anyNoticeSentence,
  answerAppInfo,
  backgroundsIn,
  BUNDLE_VERSION,
  focusWindow,
  NEWER_VERSION,
  NEWEST_VERSION,
  noticeBand,
  noticeSentence,
  noticeText,
  OLDER_VERSION,
  productionInfo,
  reloadButton,
  textExtent,
} from './update-notice.ts'

/** Newer and older servers than the bundle, derived from its version. */
const NEWER = NEWER_VERSION
const NEWEST = NEWEST_VERSION
const OLDER = OLDER_VERSION
/** DESIGN.md → typography: `body-sm` is this sans stack. */
const SANS = 'system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif'
const SURFACE = 'rgb(255, 255, 255)'
const LINE = 'rgb(228, 223, 213)'
const INK = 'rgb(43, 46, 42)'
const ACCENT = 'rgb(85, 112, 89)'
/** `button-secondary`'s fill, as Backup's Restore button shows it. */
const BUTTON_SECONDARY = 'rgb(250, 249, 246)'
/** Dev amber, light and dark (DESIGN.md → components.favicon / dev-pill). */
const AMBER = ['rgb(140, 94, 14)', 'rgb(235, 194, 122)']

function exportButton(page: Page) {
  return page.getByRole('main').getByRole('button', { name: 'Export all data', exact: true })
}

test.describe('Story 11.4 Tell me when a tab is older than the app (ATDD)', () => {
  test('[P0] AC-2 a tab whose bundle version equals app-info.version shows no notice and announces nothing on any page, at load and after a refetch', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [DUNE] })

    // The criterion's witness: in another tab, a different server version
    // does show the notice, so its absence below means something.
    const other = await page.context().newPage()
    await answerAppInfo(other, () => productionInfo(NEWER))
    await other.goto(`${server.url}/backup`)
    await expect(noticeSentence(other, NEWER)).toBeVisible()
    await other.close()

    // The server's version is the bundle's.
    const info = (await (await page.request.get(`${server.url}/api/views/app-info`)).json()) as { version: string }
    expect(info.version).toBe(BUNDLE_VERSION)

    const seen = watchAppInfo(page)
    for (const [route, name] of ROUTES) {
      const before = seen.length
      await page.goto(`${server.url}${route}`)
      await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toHaveText(name)
      await expect.poll(() => seen.length, `${route} load`).toBeGreaterThan(before)
      await recordStatus(page)
      await afterAnnounceDelay(page)
      await expect(reloadButton(page), `${route} load`).toHaveCount(0)
      await expect(anyNoticeSentence(page), `${route} load`).toHaveCount(0)

      const loaded = seen.length
      await focusWindow(page)
      await expect.poll(() => seen.length, `${route} refetch`).toBeGreaterThan(loaded)
      await afterAnnounceDelay(page)
      await expect(reloadButton(page), `${route} refetch`).toHaveCount(0)
      await expect(anyNoticeSentence(page), `${route} refetch`).toHaveCount(0)
      expect(
        (await statusTexts(page)).filter((text) => text.includes('updated')),
        route,
      ).toEqual([])
      expect(await liveRegionText(page), route).not.toContain('updated')
    }
  })

  test('[P0] AC-3 a refetch that finds another version shows a full-width surface band under the top nav, "bookvie was updated to X. Reload to use it." then a compact Reload, pushing the page down', async ({
    page,
    server,
  }) => {
    const seen = watchAppInfo(page)
    let answer: Answer = 'pass'
    await answerAppInfo(page, () => answer)
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto(`${server.url}/backup`)
    await expect(exportButton(page)).toBeVisible()
    await expect.poll(() => seen.length).toBeGreaterThan(0)
    const main = page.getByRole('main')
    const mainTopBefore = (await main.boundingBox())!.y

    answer = productionInfo(NEWER)
    await focusWindow(page)
    const sentence = noticeSentence(page, NEWER)

    // The criterion: the sentence names the server's version.
    await expect(sentence).toBeVisible()

    const band = noticeBand(page)
    const reload = reloadButton(page)
    await expect(reload).toBeVisible()
    // A full-width surface band with a line hairline at the bottom.
    await expect(band).toHaveCSS('background-color', SURFACE)
    await expect(band).toHaveCSS('border-bottom-width', '1px')
    await expect(band).toHaveCSS('border-bottom-style', 'solid')
    await expect(band).toHaveCSS('border-bottom-color', LINE)
    const bandBox = (await band.boundingBox())!
    const pageWidth = await page.evaluate(() => document.documentElement.clientWidth)
    expect(bandBox.x).toBe(0)
    expect(bandBox.width).toBe(pageWidth)
    // Directly under the top nav (its bar may keep its own 1px hairline).
    const navBox = (await mainNav(page).boundingBox())!
    expect(bandBox.y).toBeGreaterThanOrEqual(navBox.y + navBox.height - 0.5)
    expect(bandBox.y).toBeLessThanOrEqual(navBox.y + navBox.height + 1.5)
    // It pushes the page down by its own height and never overlaps it.
    expect(await band.evaluate((element) => getComputedStyle(element).position)).toMatch(/^(static|relative)$/)
    const mainTop = (await main.boundingBox())!.y
    expect(mainTop).toBeGreaterThanOrEqual(bandBox.y + bandBox.height - 0.5)
    expect(Math.abs(mainTop - mainTopBefore - bandBox.height)).toBeLessThanOrEqual(1)
    // The sentence in body-sm/ink, its text aligned with the page's padding (the h1's left edge).
    await expect(sentence).toHaveCSS('font-family', SANS)
    await expect(sentence).toHaveCSS('font-size', '14px')
    await expect(sentence).toHaveCSS('font-weight', '400')
    await expect(sentence).toHaveCSS('color', INK)
    const text = await textExtent(sentence)
    const h1 = await textExtent(main.getByRole('heading', { level: 1 }))
    expect(Math.abs(text.left - h1.left)).toBeLessThanOrEqual(1)
    // Reload: a compact 30px button-secondary, spacing.4 (16px) after the sentence.
    await expect(reload).toHaveCSS('height', '30px')
    await expect(reload).toHaveCSS('background-color', BUTTON_SECONDARY)
    await expect(reload).toHaveCSS('font-size', '14px')
    const reloadBox = (await reload.boundingBox())!
    expect(Math.abs(reloadBox.x - text.right - 16)).toBeLessThanOrEqual(1)
    // No icon, no close button, no amber, no accent fill.
    await expect(band.getByRole('button')).toHaveCount(1)
    await expect(band.locator('svg, img, [role="img"]')).toHaveCount(0)
    const painted = await backgroundsIn(band)
    expect(painted.filter((entry) => [ACCENT, ...AMBER].some((color) => entry.endsWith(color)))).toEqual([])
    for (const color of AMBER) {
      await expect(sentence).not.toHaveCSS('color', color)
      await expect(reload).not.toHaveCSS('color', color)
    }

    // On load too, and an older server counts.
    answer = productionInfo(OLDER)
    await page.reload()
    await expect(noticeSentence(page, OLDER)).toBeVisible()
    await expect(reloadButton(page)).toBeVisible()
  })

  test('[P1] AC-4 the notice stays on every route until the tab reloads, is no dialog, alert or live region, and saving a page or a card note still works', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(mainAt(150))
    await answerAppInfo(page, () => productionInfo(NEWER))
    await page.goto(server.url)
    await expect(mainBookCard(page).getByRole('spinbutton', { name: 'Page', exact: true })).toBeVisible()
    const sentence = noticeSentence(page, NEWER)

    // The criterion: after a client-side route change, the notice is still there.
    await mainNav(page).getByRole('link', { name: 'Catalog', exact: true }).click()
    await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toHaveText('Catalog')
    await expect(sentence).toBeVisible()

    for (const name of ['Stats', 'Card notes', 'Backup', 'Home']) {
      await mainNav(page).getByRole('link', { name, exact: true }).click()
      await expect(page.getByRole('main').getByRole('heading', { level: 1 }), name).toHaveText(name)
      await expect(sentence, name).toBeVisible()
      await expect(reloadButton(page), name).toHaveCount(1)
    }

    // Not a dialog, not an alert, not itself a live region.
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.getByRole('alertdialog')).toHaveCount(0)
    const band = noticeBand(page)
    expect(
      await band.evaluate((element) => {
        const found: string[] = []
        for (const node of [element, ...Array.from(element.querySelectorAll('*'))]) {
          const role = node.getAttribute('role')
          if (role && ['alert', 'status', 'log', 'dialog', 'alertdialog', 'marquee', 'timer'].includes(role)) {
            found.push(`${node.localName} role=${role}`)
          }
          if (node.hasAttribute('aria-live')) found.push(`${node.localName} aria-live`)
          if (node.localName === 'dialog') found.push('dialog')
        }
        return found
      }),
    ).toEqual([])

    // Nothing blocked: a page saves on Home.
    const field = mainBookCard(page).getByRole('spinbutton', { name: 'Page', exact: true })
    await field.fill('212')
    await mainBookCard(page).getByRole('button', { name: 'Update', exact: true }).click()
    await expect(page.getByRole('status')).toHaveText('Page 212 of 330, 64%.')
    expect(storedBook(server, LEFT_HAND_ID).readings[0].currentPage).toBe(212)

    // And a card note saves.
    await addCardNote(page).click()
    const panel = cardNotePanel(page)
    await noteField(panel).fill('Light is the left hand of darkness.')
    await panel.getByRole('button', { name: 'Save note', exact: true }).click()
    await expect(panel).toBeHidden()
    await expect(page.getByRole('status')).toHaveText(SAVED)
    expect((storedBook(server, LEFT_HAND_ID).cardNotes as { text: string }[]).map(({ text }) => text)).toEqual([
      'Light is the left hand of darkness.',
    ])
    await expect(sentence).toBeVisible()
  })

  test('[P0] AC-5 Reload reloads the page at once, without asking, by click, Enter or Space', async ({
    page,
    server,
  }) => {
    const dialogs: string[] = []
    page.on('dialog', async (dialog) => {
      dialogs.push(dialog.type())
      await dialog.dismiss()
    })
    await answerAppInfo(page, () => productionInfo(NEWER))
    await page.goto(`${server.url}/backup`)
    await expect(exportButton(page)).toBeVisible()
    const reload = reloadButton(page)
    const marked = () => page.evaluate(() => (window as Window & { beforeReload?: true }).beforeReload === true)

    for (const press of ['click', 'Enter', 'Space'] as const) {
      // The criterion: pressing Reload loads the page again, in this tab, at once.
      await expect(reload, press).toBeVisible()
      await page.evaluate(() => {
        ;(window as Window & { beforeReload?: true }).beforeReload = true
      })
      const loaded = page.waitForEvent('load')
      if (press === 'click') await reload.click()
      else {
        await reload.focus()
        await page.keyboard.press(press)
      }
      await loaded
      expect(await marked(), press).toBe(false)
      await expect(page, press).toHaveURL(`${server.url}/backup`)
      await expect(exportButton(page), press).toBeVisible()
    }
    expect(dialogs).toEqual([])
  })

  test('[P0] AC-6 the status region announces the notice once when it appears, not again for the same version, once more for a new version, and the bundle’s own version hides it', async ({
    page,
    server,
  }) => {
    const seen = watchAppInfo(page)
    let answer: Answer = 'pass'
    await answerAppInfo(page, () => answer)
    await page.goto(`${server.url}/backup`)
    await expect(exportButton(page)).toBeVisible()
    await expect.poll(() => seen.length).toBeGreaterThan(0)
    await recordStatus(page)
    const announced = async () => (await statusTexts(page)).filter((text) => text !== '')

    answer = productionInfo(NEWER)
    await focusWindow(page)

    // The criterion: the sentence is announced, once.
    await expect.poll(announced).toEqual([noticeText(NEWER)])

    await expect(noticeSentence(page, NEWER)).toBeVisible()

    // The same server version again: nothing more.
    let before = seen.length
    await focusWindow(page)
    await expect.poll(() => seen.length).toBeGreaterThan(before)
    await afterAnnounceDelay(page)
    expect(await announced()).toEqual([noticeText(NEWER)])
    await expect(noticeSentence(page, NEWER)).toBeVisible()

    // A different server version: the sentence changes and is announced once.
    answer = productionInfo(NEWEST)
    await focusWindow(page)
    await expect.poll(announced).toEqual([noticeText(NEWER), noticeText(NEWEST)])
    await expect(noticeSentence(page, NEWEST)).toBeVisible()
    await expect(noticeSentence(page, NEWER)).toHaveCount(0)
    before = seen.length
    await focusWindow(page)
    await expect.poll(() => seen.length).toBeGreaterThan(before)
    await afterAnnounceDelay(page)
    expect(await announced()).toEqual([noticeText(NEWER), noticeText(NEWEST)])

    // The bundle's own version again: the notice hides.
    answer = productionInfo(BUNDLE_VERSION)
    await focusWindow(page)
    await expect(reloadButton(page)).toHaveCount(0)
    await expect(anyNoticeSentence(page)).toHaveCount(0)
  })

  test('[P1] AC-7 a failed app-info refetch leaves a shown notice showing, and with no notice shows none and complains nowhere', async ({
    page,
    server,
  }) => {
    const seen = watchAppInfo(page)
    const failures = () => seen.filter((response) => response.status === 500).length
    let answer: Answer = productionInfo(NEWER)
    await answerAppInfo(page, () => answer)
    await page.goto(`${server.url}/backup`)
    await expect(exportButton(page)).toBeVisible()
    const sentence = noticeSentence(page, NEWER)

    // The criterion: with the notice showing, a failed refetch leaves it showing.
    await expect(sentence).toBeVisible()

    await recordStatus(page)
    await afterAnnounceDelay(page)
    const announcedBefore = (await statusTexts(page)).filter((text) => text !== '')
    answer = 'fail'
    await focusWindow(page)
    await expect.poll(failures).toBeGreaterThan(0)
    await afterAnnounceDelay(page)
    await expect(sentence).toBeVisible()
    await expect(reloadButton(page)).toBeVisible()
    expect((await statusTexts(page)).filter((text) => text !== '')).toEqual(announcedBefore)
    await expect(page.getByRole('alert')).toHaveText('')

    // No notice yet, and app-info fails (bookvie restarting): none appears, nothing complains.
    let failed = failures()
    await page.reload()
    await expect(exportButton(page)).toBeVisible()
    await expect.poll(failures).toBeGreaterThan(failed)
    await afterAnnounceDelay(page)
    await expect(anyNoticeSentence(page)).toHaveCount(0)
    await expect(reloadButton(page)).toHaveCount(0)
    expect(await liveRegionText(page)).toBe('')
    await expect(page.getByRole('main')).not.toContainText("Couldn't")
    await expect(page.getByRole('banner')).not.toContainText("Couldn't")

    // After a success with the bundle's version, a failed refetch still shows none.
    answer = 'pass'
    await focusWindow(page)
    await expect.poll(() => seen.at(-1)?.status).toBe(200)
    answer = 'fail'
    failed = failures()
    await focusWindow(page)
    await expect.poll(failures).toBeGreaterThan(failed)
    await afterAnnounceDelay(page)
    await expect(anyNoticeSentence(page)).toHaveCount(0)
    expect(await liveRegionText(page)).toBe('')
  })

  test('[P1] AC-8 Tab reaches Reload after the theme toggle and before the page, Skip to content skips it, and the notice sits in the header after the top bar', async ({
    page,
    server,
  }) => {
    await answerAppInfo(page, () => productionInfo(NEWER))
    await page.goto(`${server.url}/backup`)
    await expect(exportButton(page)).toBeVisible()
    const banner = page.getByRole('banner')
    const lastThemeButton = banner.getByRole('group', { name: 'Theme' }).getByRole('button').last()
    const reload = reloadButton(page)

    // The criterion: Tab from the theme toggle lands on Reload.
    await lastThemeButton.focus()
    await page.keyboard.press('Tab')
    await expect(reload).toBeFocused()

    // Then the page's content.
    await page.keyboard.press('Tab')
    await expect(exportButton(page)).toBeFocused()

    // Skip to content skips it.
    await page.reload()
    await expect(exportButton(page)).toBeVisible()
    await expect(reload).toBeVisible()
    await page.keyboard.press('Tab')
    await expect(banner.getByRole('link', { name: 'Skip to content', exact: true })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('main')).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(exportButton(page)).toBeFocused()

    // Inside the header landmark, after the top bar (nav and theme toggle), outside the nav.
    const band = noticeBand(page)
    await expect(band).toBeVisible()
    const order = await band.evaluate((element) => {
      const header = element.closest('header')
      const nav = header?.querySelector('nav')
      const theme = header?.querySelector('[role="group"][aria-label="Theme"]')
      return {
        inHeader: header !== null && header !== undefined,
        afterNav: !!nav && (nav.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
        afterTheme: !!theme && (theme.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
        inNav: !!nav && nav.contains(element),
      }
    })
    expect(order).toEqual({ inHeader: true, afterNav: true, afterTheme: true, inNav: false })
  })

  test('[P2] AC-9 under forced colors the notice keeps a CanvasText bottom border and Reload takes the system button colors', async ({
    page,
    server,
  }) => {
    await answerAppInfo(page, () => productionInfo(NEWER))
    const band = noticeBand(page)
    const reload = reloadButton(page)

    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme, forcedColors: 'active' })
      await page.goto(`${server.url}/backup`)
      await expect(exportButton(page)).toBeVisible()
      const canvasText = await systemColor(page, 'CanvasText')

      // The criterion: the band's bottom border is CanvasText.
      await expect(band, colorScheme).toHaveCSS('border-bottom-color', canvasText)

      await expect(band, colorScheme).toHaveCSS('border-bottom-style', 'solid')
      await expect(band, colorScheme).toHaveCSS('border-bottom-width', '1px')
      await expect(reload, colorScheme).toHaveCSS('background-color', await systemColor(page, 'ButtonFace'))
      await expect(reload, colorScheme).toHaveCSS('color', await systemColor(page, 'ButtonText'))
      await expect(noticeSentence(page, NEWER), colorScheme).toHaveCSS('color', canvasText)
    }
  })

  test('[P1] AC-6 a save whose refetch first finds a new version keeps the save’s announcement and shows the notice', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer(mainAt(150))
    const seen = watchAppInfo(page)
    let answer: Answer = 'pass'
    await answerAppInfo(page, () => answer)
    await page.goto(server.url)
    const field = mainBookCard(page).getByRole('spinbutton', { name: 'Page', exact: true })
    await expect(field).toBeVisible()
    await expect.poll(() => seen.length).toBeGreaterThan(0)

    // The intent's invalidation refetches app-info, which is the first to find another version.
    answer = productionInfo(NEWER)
    await field.fill('212')
    await mainBookCard(page).getByRole('button', { name: 'Update', exact: true }).click()
    await expect(noticeSentence(page, NEWER)).toBeVisible()
    await afterAnnounceDelay(page)
    await expect(page.getByRole('status')).toHaveText('Page 212 of 330, 64%.')
  })

  test('[P1] AC-2 with no notice the top bar is unchanged: topbar height (60px), surface-inset, 1px line hairline', async ({
    page,
    server,
  }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto(`${server.url}/backup`)
    await expect(exportButton(page)).toBeVisible()
    const bar = mainNav(page).locator('xpath=..')
    await expect(bar).toHaveCSS('height', '60px')
    await expect(bar).toHaveCSS('background-color', BUTTON_SECONDARY)
    await expect(bar).toHaveCSS('border-bottom-width', '1px')
    await expect(bar).toHaveCSS('border-bottom-style', 'solid')
    await expect(bar).toHaveCSS('border-bottom-color', LINE)
    await expect(reloadButton(page)).toHaveCount(0)
    const barBox = (await bar.boundingBox())!
    const bannerBox = (await page.getByRole('banner').boundingBox())!
    expect(bannerBox.height).toBe(barBox.height)
  })

  test('[P2] AC-10 the README’s Updating line says open tabs show a notice with Reload, not to hard-reload them', () => {
    const readme = readText(README)
    const updating = readme.split(/\n[ \t]*\n/).find((block) => block.startsWith('**Updating:**')) ?? ''

    // The criterion: the hard-reload instruction is gone.
    expect(updating).not.toMatch(/hard[- ]reload/i)

    expect(updating).toContain('npm run install:local')
    expect(updating).toMatch(/notice/i)
    expect(updating).toContain('Reload')
    expect(readme).not.toMatch(/hard[- ]reload/i)
  })
})
