// Story 8.3 Give books without a cover a typeset cover: test automation after
// the story was done, beside the ATDD and automate leaves in
// catalog-typeset-covers.spec.ts. The typeset cover under WCAG text spacing
// and under a much larger font (it never paints past its 2:3 box onto the
// reading bar or the caption), a cover request that fails at the network, and
// the tile following a Book detail change: Remove cover, Change color, Mark
// finished. Then a pale spine color, whose spine-edge hairline still shows.
//
// Like the ATDD leaves, the cover's look is read from the tile's pixels at
// device scale 2 (`typesetOf` in typeset-covers.ts) and its text from computed
// styles. The tiles are found by role and name, the cover box by its 2:3
// geometry, never by a class name.

import type { Locator } from '@playwright/test'
import { finished } from './bookcase.ts'
import { expect, startSeededServer, test } from './fixtures.ts'
import { stopAndRemove } from './home.ts'
import { openEdit } from './library.ts'
import { BAR, barPercent, bookId, LIGHT, lookOf, near, OLIVE, PURPLE, RED, type Rgb, tileItem } from './tile-marks.ts'
import { navigateToCatalog, openTiles } from './tiles.ts'
import {
  BLEAK_HOUSE,
  boxFacts,
  count,
  EMMA,
  GOOD_OMENS,
  GOOD_OMENS_ID,
  inside,
  JEKYLL,
  KINDRED,
  KINDRED_ID,
  SPINE_LABEL,
  SPINE_LABEL_STRIP_CSS,
  TYPESET,
  typesetOf,
  typesetServer,
  UNREAD,
  WIDE_COVER,
} from './typeset-covers.ts'

// WCAG 1.4.12 text spacing, as a user stylesheet would set it.
const TEXT_SPACING =
  '* { letter-spacing: 0.12em !important; word-spacing: 0.16em !important; line-height: 1.5 !important; }' +
  ' p { margin-bottom: 2em !important; }'

// A much larger font on the text inside each tile's aria-hidden cover box (and
// the empty bar slot), as a large minimum font size would give: found by the
// Tiles list's role and name and the tile link's structure, not by a class.
const LARGE_TEXT = '[role="list"][aria-label^="Tiles"] a > [aria-hidden="true"] * { font-size: 120px !important; }'

/** Bleak House: read, with a real cover (TYPESET_SHELF's seventh Book). */
const BLEAK_HOUSE_ID = bookId(7)

/** DESIGN.md's Teal swatch, #4B7C7B. */
const TEAL: Rgb = [75, 124, 123]

/** A pale spine color the user can set (#F2D35B), close to the page and the plate. */
const PALE = { hex: '#F2D35B', rgb: [242, 211, 91] as Rgb }

/** Whether a read tile shows the typeset cover in `fill`: the fill beside the plate, and a plate. */
async function readTypeset(item: Locator, fill: Rgb): Promise<boolean> {
  const look = await typesetOf(item, fill)
  return near(look.sideFill, fill, 24) && look.plate !== null && !look.visibleImg
}

/**
 * Hit-tests the points of a tile outside its cover box: the middle of each
 * caption line and of the reading bar's slot. For each, whether the element
 * there is inside the box: clipped content isn't hit-testable, so a typeset
 * cover that spills past its box is found here even where it paints nothing.
 */
function hitsBelowBox(item: Locator): Promise<{ where: string; inBox: boolean }[]> {
  return item.evaluate((li, bar) => {
    const origin = li.getBoundingClientRect()
    const boxNode = Array.from(li.querySelectorAll('*')).find((node) => {
      const r = node.getBoundingClientRect()
      return Math.abs(r.width - origin.width) <= 1 && Math.abs(r.height - r.width * 1.5) <= 1.5
    })
    if (!boxNode) throw new Error('no 2:3 cover box as wide as the column')
    const box = boxNode.getBoundingClientRect()
    const points: { where: string; x: number; y: number }[] = [
      { where: 'bar slot', x: box.x + box.width / 2, y: box.bottom + bar.gap + bar.height / 2 },
    ]
    // The caption: every text outside the box, at the middle of its line.
    const walker = document.createTreeWalker(li, NodeFilter.SHOW_TEXT)
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = (node.textContent ?? '').trim()
      if (text === '' || boxNode.contains(node)) continue
      const r = node.parentElement!.getBoundingClientRect()
      points.push({ where: `caption "${text}"`, x: r.x + Math.min(r.width, box.width) / 2, y: r.y + r.height / 2 })
    }
    return points.map(({ where, x, y }) => {
      const hit = document.elementFromPoint(x, y)
      return { where, inBox: hit !== null && boxNode.contains(hit) }
    })
  }, BAR)
}

test.describe('Story 8.3 Give books without a cover a typeset cover (automate, flows)', () => {
  test.use({ deviceScaleFactor: 2 })

  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.setViewportSize({ width: 1280, height: 900 })
  })

  test('[P2] AC-1 AC-2 with WCAG text spacing the title and author stay on the plate and the plate inside the box; the unread text stays inside the box', async ({
    page,
  }, testInfo) => {
    const server = await typesetServer(page, testInfo)
    try {
      await openTiles(page, server.url)
      const goodOmens = tileItem(page, GOOD_OMENS)
      await expect.poll(() => readTypeset(goodOmens, OLIVE.rgb)).toBe(true)
      const before = await boxFacts(tileItem(page, JEKYLL))

      await page.addStyleTag({ content: TEXT_SPACING })
      // The spacing took: the long title's four lines are taller at line-height 1.5.
      await expect
        .poll(async () => (await boxFacts(tileItem(page, JEKYLL))).texts[0]!.rect.height)
        .toBeGreaterThan(before.texts[0]!.rect.height + 4)

      // Read: the plate ends inside the box (the fill shows below it), and holds every run of text.
      for (const [name, fill] of [
        [GOOD_OMENS, OLIVE.rgb],
        [JEKYLL, RED.rgb],
      ] as const) {
        const look = await typesetOf(tileItem(page, name), fill)
        expect(look.plate, name).not.toBeNull()
        const plate = look.plate!
        expect(Math.abs(plate.y - look.box.y - TYPESET.plateTop), name).toBeLessThanOrEqual(1)
        expect(plate.y + plate.height, name).toBeLessThan(look.box.y + look.box.height - 2)
        expect(inside(plate, look.box), name).toBe(true)
        expect(look.texts, name).toHaveLength(2)
        for (const text of look.texts) expect(inside(text.rect, plate), `${name}: ${text.text}`).toBe(true)
      }

      // Unread (no plate): the title and the author stay inside the box.
      for (const name of [KINDRED, EMMA]) {
        const facts = await boxFacts(tileItem(page, name))
        expect(facts.texts, name).toHaveLength(2)
        for (const text of facts.texts) expect(inside(text.rect, facts.box), `${name}: ${text.text}`).toBe(true)
      }
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P2] AC-1 with a much larger font nothing of the typeset cover paints past its 2:3 box onto the reading bar or the caption', async ({
    page,
  }, testInfo) => {
    const server = await typesetServer(page, testInfo)
    try {
      await openTiles(page, server.url)
      const goodOmens = tileItem(page, GOOD_OMENS)
      const emma = tileItem(page, EMMA)
      await expect.poll(() => readTypeset(goodOmens, OLIVE.rgb)).toBe(true)
      const barBefore = barPercent(await lookOf(emma), LIGHT)
      expect(barBefore, "Emma's reading bar, as seeded").not.toBeNull()

      await page.addStyleTag({ content: LARGE_TEXT })
      for (const [name, item] of [
        [GOOD_OMENS, goodOmens],
        [EMMA, emma],
      ] as const) {
        // The text now runs far past the box's bottom: only the box's clip keeps it in.
        await expect
          .poll(async () => {
            const { box, texts } = await boxFacts(item)
            return Math.max(...texts.map((text) => text.rect.y + text.rect.height)) - (box.y + box.height)
          }, name)
          .toBeGreaterThan(40)
        // Under the box, the bar slot and each caption line are the tile's own, not the typeset cover's.
        const hits = await hitsBelowBox(item)
        expect(hits.length, name).toBeGreaterThanOrEqual(3)
        expect(
          hits.filter((hit) => hit.inBox).map((hit) => hit.where),
          name,
        ).toEqual([])
      }

      // Pixels: between the read box and its slot is the page, not the plate or its text.
      const read = await lookOf(goodOmens)
      expect(near(read.aboveBar, read.page, 6)).toBe(true)
      // Emma's bar still shows its 64%, unpainted over.
      expect(barPercent(await lookOf(emma), LIGHT)).toBeCloseTo(barBefore!, 0)
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P2] AC-3 a cover request that fails at the network gets the typeset cover for its read state, with no image shown', async ({
    page,
  }, testInfo) => {
    // Bleak House's cover never arrives: the request is aborted before navigation.
    await page.route(`**/media/${WIDE_COVER}`, (route) => route.abort())
    const server = await typesetServer(page, testInfo)
    try {
      await openTiles(page, server.url)
      const bleakHouse = tileItem(page, BLEAK_HOUSE)

      // Read: Bleak House's purple spine color with the plate, no image on screen.
      await expect.poll(() => readTypeset(bleakHouse, PURPLE.rgb)).toBe(true)
      const look = await typesetOf(bleakHouse, PURPLE.rgb)
      expect(look.visibleImg).toBe(false)
      expect(Math.abs(look.plate!.y - look.box.y - TYPESET.plateTop)).toBeLessThanOrEqual(1)
      expect(look.texts.map((text) => [text.text, text.color])).toEqual([
        ['Bleak House', SPINE_LABEL],
        ['Charles Dickens', SPINE_LABEL],
      ])
      for (const text of look.texts) expect(inside(text.rect, look.plate!), text.text).toBe(true)
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P2] AC-3 after Remove cover on Book detail, a read Book’s tile is the typeset cover in its spine color with the plate', async ({
    page,
  }, testInfo) => {
    const server = await typesetServer(page, testInfo)
    try {
      await openTiles(page, server.url)
      const bleakHouse = tileItem(page, BLEAK_HOUSE)
      // Before: the real cover, with no typeset text over it.
      await expect.poll(async () => (await boxFacts(bleakHouse)).visibleImg).toBe(true)
      expect((await boxFacts(bleakHouse)).texts).toEqual([])

      // Remove cover on Book detail, through the Edit book panel.
      await page.goto(`${server.url}/book/${BLEAK_HOUSE_ID}`)
      const panel = await openEdit(page)
      await panel.getByRole('button', { name: 'Remove cover', exact: true }).click()
      await panel.getByRole('button', { name: 'Save changes', exact: true }).click()
      await expect(panel).toBeHidden()

      await navigateToCatalog(page)
      await expect.poll(() => readTypeset(bleakHouse, PURPLE.rgb)).toBe(true)
      const look = await typesetOf(bleakHouse, PURPLE.rgb)
      expect(look.visibleImg).toBe(false)
      expect(Math.abs(look.plate!.y - look.box.y - TYPESET.plateTop)).toBeLessThanOrEqual(1)
      expect(look.texts.map((text) => [text.text, text.color])).toEqual([
        ['Bleak House', SPINE_LABEL],
        ['Charles Dickens', SPINE_LABEL],
      ])
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P2] AC-1 after Change color on Book detail, a read Book’s typeset cover is filled with the new color', async ({
    page,
  }, testInfo) => {
    const server = await typesetServer(page, testInfo)
    try {
      await openTiles(page, server.url)
      const goodOmens = tileItem(page, GOOD_OMENS)
      await expect.poll(() => readTypeset(goodOmens, OLIVE.rgb)).toBe(true)

      // Book detail's Change color block: pick Teal.
      await page.goto(`${server.url}/book/${GOOD_OMENS_ID}`)
      const block = page.getByRole('main').getByRole('region', { name: /^Change color/ })
      await block.getByRole('button', { name: 'Teal', exact: true }).click()
      await expect(page.getByRole('status')).toHaveText('Color set to Teal.')

      await navigateToCatalog(page)
      await expect.poll(() => readTypeset(goodOmens, TEAL)).toBe(true)
      const look = await typesetOf(goodOmens, TEAL)
      // The new color, not the old one, and still the plate with the title and the first author.
      expect(near(look.sideFill, OLIVE.rgb, 24)).toBe(false)
      expect(look.texts.map((text) => [text.text, text.color])).toEqual([
        ['Good Omens', SPINE_LABEL],
        ['Terry Pratchett', SPINE_LABEL],
      ])
      for (const text of look.texts) expect(inside(text.rect, look.plate!), text.text).toBe(true)
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P2] AC-1 AC-2 after Mark finished on Book detail, the never-read Up next’s unread typeset cover becomes the read one with the plate and the ribbon', async ({
    page,
  }, testInfo) => {
    const server = await typesetServer(page, testInfo)
    try {
      await openTiles(page, server.url)
      // Before: Kindred is the unread typeset cover, its text in spine-unread-text with no plate behind it.
      const unread = tileItem(page, KINDRED)
      await expect
        .poll(async () => (await boxFacts(unread)).texts.map((text) => text.color))
        .toEqual([UNREAD.light.text, UNREAD.light.text])
      const before = await typesetOf(unread, UNREAD.light.fill)
      expect(near(before.sideFill, UNREAD.light.fill, 2)).toBe(true)
      expect(before.backgrounds).not.toContain(SPINE_LABEL_STRIP_CSS)

      // Mark finished on Book detail: a never-read Book has no Purpose question.
      await page.goto(`${server.url}/book/${KINDRED_ID}`)
      await page.getByRole('main').getByRole('button', { name: 'Mark finished', exact: true }).click()
      const dialog = page.getByRole('dialog', { name: 'Finished Kindred', exact: true })
      await expect(dialog).toBeVisible()
      await dialog.getByLabel('Finished on', { exact: true }).fill('2026-10-20')
      await dialog.getByRole('button', { name: 'Done', exact: true }).click()
      await expect(dialog).toBeHidden()
      await expect(page.getByRole('status')).toHaveText('Finished Kindred.')

      await navigateToCatalog(page)
      // Kindred is finished now (and no longer Up next): its purple spine color with the plate.
      const kindred = tileItem(page, 'Kindred by Octavia E. Butler, finished')
      await expect.poll(() => readTypeset(kindred, PURPLE.rgb)).toBe(true)
      const look = await typesetOf(kindred, PURPLE.rgb)
      expect(Math.abs(look.plate!.y - look.box.y - TYPESET.plateTop)).toBeLessThanOrEqual(1)
      expect(look.texts.map((text) => [text.text, text.color])).toEqual([
        ['Kindred', SPINE_LABEL],
        ['Octavia E. Butler', SPINE_LABEL],
      ])
      // The ribbon hangs on the box, clear of the plate.
      expect(near((await lookOf(kindred)).ribbonMiddle, PURPLE.rgb, 24)).toBe(true)
      expect(near(look.belowRibbon, PURPLE.rgb, 24)).toBe(true)
    } finally {
      await stopAndRemove(server)
    }
  })

  test('[P3] AC-1 a pale spine color keeps the spine-edge hairline against the page, with the title and author in spine-label on the plate', async ({
    page,
  }, testInfo) => {
    const server = await startSeededServer(testInfo, 'typeset-covers-pale', {
      books: [
        {
          id: bookId(1),
          title: 'Villette',
          authors: ['Charlotte Brontë'],
          pages: 330,
          spineColorUser: PALE.hex,
          readings: finished(330),
        },
      ],
    })
    try {
      await openTiles(page, server.url)
      const villette = tileItem(page, 'Villette by Charlotte Brontë, finished')
      await expect.poll(async () => near((await typesetOf(villette, PALE.rgb)).sideFill, PALE.rgb, 24)).toBe(true)
      const look = await typesetOf(villette, PALE.rgb)

      // The hairline: spine-edge on every side, set apart from the page outside it and the pale fill inside it.
      expect(count(look.leftEdge, LIGHT.spineEdge)).toBeGreaterThanOrEqual(1)
      for (const pixel of [look.topEdge, look.rightEdge, look.bottomEdge]) {
        expect(near(pixel, LIGHT.spineEdge, 40)).toBe(true)
        expect(near(pixel, look.page, 60)).toBe(false)
        expect(near(pixel, PALE.rgb, 60)).toBe(false)
      }

      // The plate, and the title and the author in spine-label on it.
      expect(look.plate).not.toBeNull()
      expect(Math.abs(look.plate!.y - look.box.y - TYPESET.plateTop)).toBeLessThanOrEqual(1)
      expect(look.texts.map((text) => [text.text, text.color])).toEqual([
        ['Villette', SPINE_LABEL],
        ['Charlotte Brontë', SPINE_LABEL],
      ])
      for (const text of look.texts) expect(inside(text.rect, look.plate!), text.text).toBe(true)
    } finally {
      await stopAndRemove(server)
    }
  })
})
