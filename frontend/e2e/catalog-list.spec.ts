// Story 1.8 List view and Search titles: fixed columns and author order
// (UX-DR21), title search with its count and no-match states (UX-DR17,
// UX-DR18), and the cataloging skill's exact-title check.

import type { Locator, Page } from '@playwright/test'
import { expect, test } from './fixtures.ts'

function bookRows(page: Page): Locator {
  return page.getByRole('table').getByRole('row').filter({ hasNot: page.getByRole('columnheader') })
}

test.describe('Story 1.8 List view and Search titles (ATDD)', () => {
  test('[P1] AC-9 the List view has fixed columns and sorts by first author with Intl.Collator, then title', async ({
    page,
    seededServer,
  }) => {
    // Seeded out of order. Code-point order would put "bell hooks" and
    // "Émile Zola" after the capitalized authors.
    const server = await seededServer({
      books: [
        { title: 'The Dispossessed', authors: ['Ursula K. Le Guin'], pages: 387 },
        { title: 'Nana', authors: ['Émile Zola'], pages: 464 },
        { title: 'Dune', authors: ['Frank Herbert', 'Brian Herbert'], pages: 412 },
        { title: 'All About Love', authors: ['bell hooks'], pages: 240 },
        { title: 'A Wizard of Earthsea', authors: ['Ursula K. Le Guin'], pages: 183 },
      ],
    })
    await page.goto(`${server.url}/`)
    const table = page.getByRole('table')

    await expect(table.getByRole('columnheader')).toHaveText(['Title', 'Author', 'Pages', 'Status', 'Date added'])
    await expect(bookRows(page)).toHaveText([
      /^All About Love/,
      /^Nana/,
      /^Dune/,
      /^A Wizard of Earthsea/,
      /^The Dispossessed/,
    ])
    // Titles are set in the serif.
    await expect(table.getByText('Nana', { exact: true })).toHaveCSS('font-family', /ui-serif/)
  })

  test('[P1] AC-9 List view cells show authors, pages, status and the local Date added', async ({
    page,
    seededServer,
  }) => {
    // 23:30 UTC on 14 March is 00:30 on 15 March in Europe/Madrid (UTC+1),
    // so a date formatted in UTC would read "14 Mar 2026".
    const server = await seededServer({
      books: [
        {
          title: 'Dune',
          authors: ['Frank Herbert', 'Brian Herbert'],
          pages: 1412,
          createdAt: '2026-03-14T23:30:00+00:00',
          readings: [{ startDate: null, currentPage: 1412, finishDate: '2026-03-20', finishedPages: 1412 }],
        },
        { title: 'Nana', authors: ['Émile Zola'], pages: 464, createdAt: '2026-03-14T23:30:00+00:00' },
      ],
    })
    await page.goto(`${server.url}/`)

    const cells = (title: string) =>
      bookRows(page).filter({ has: page.getByText(title, { exact: true }) }).getByRole('cell')
    await expect(cells('Dune')).toHaveText(['Dune', 'Frank Herbert; Brian Herbert', '1,412', 'Finished', '15 Mar 2026'])
    await expect(cells('Nana')).toHaveText(['Nana', 'Émile Zola', '464', 'Not read yet', '15 Mar 2026'])
  })

  test('[P0] AC-10 Search titles hides rows whose titles don\'t contain the text and announces the count', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({
      books: [
        { title: 'Dune' },
        { title: 'Dune Messiah' },
        { title: 'Children of Dune' },
        { title: 'The Left Hand of Darkness' },
        { title: 'Neuromancer' },
      ],
    })
    await page.goto(`${server.url}/`)
    const search = page.getByRole('searchbox', { name: 'Search titles', exact: true })
    await expect(bookRows(page)).toHaveCount(5)
    const status = page.getByRole('status')
    await status.evaluate((region) => {
      const seen: string[] = []
      ;(window as Window & { statusTexts?: string[] }).statusTexts = seen
      new MutationObserver(() => seen.push(region.textContent ?? '')).observe(region, {
        childList: true,
        characterData: true,
        subtree: true,
      })
    })

    // Ignoring case. "d" alone would match four titles, so a count announced
    // per keystroke instead of after typing pauses shows up as a second text.
    await search.pressSequentially('DUNE')
    await expect(bookRows(page)).toHaveCount(3)
    await expect(page.getByText('The Left Hand of Darkness', { exact: true })).toBeHidden()
    await expect(status).toHaveText('3 books match.')
    expect(
      (await page.evaluate(() => (window as Window & { statusTexts?: string[] }).statusTexts))?.filter((text) => text !== ''),
    ).toEqual(['3 books match.'])

    // No matches.
    await search.fill('zzz')
    await expect(page.getByRole('main').getByText('No titles match “zzz”.', { exact: true })).toBeVisible()
    await expect(status).toHaveText('0 books match.')
    await expect(bookRows(page)).toHaveCount(0)

    // Esc in a non-empty field clears it.
    await search.press('Escape')
    await expect(search).toHaveValue('')
    await expect(bookRows(page)).toHaveCount(5)

    // A visible label, no placeholder, and the first control after the nav.
    await expect(page.getByText('Search titles', { exact: true })).toBeVisible()
    await expect(search).not.toHaveAttribute('placeholder')
    await page.getByRole('main').focus()
    await page.keyboard.press('Tab')
    await expect(search).toBeFocused()
  })

  test('[P0] AC-11 the cataloging skill confirms a save from the row whose title equals it exactly', async ({
    page,
    seededServer,
  }) => {
    const server = await seededServer({ books: [{ title: 'Dune Messiah' }, { title: 'Dune' }] })
    await page.goto(`${server.url}/`)

    await page.getByRole('searchbox', { name: 'Search titles', exact: true }).fill('Dune')
    await expect(bookRows(page).filter({ has: page.getByText('Dune', { exact: true }) })).toHaveCount(1)
    // The count alone can't confirm it: "Dune Messiah" matches too.
    await expect(bookRows(page)).toHaveCount(2)
  })
})
