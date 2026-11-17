// Story 11.3 Show the version on the Backup page, on a dev server.
//
// On a `--dev` server line 1 of About this copy adds the commit in brackets
// and " · Development server" (AC-2). The production card and the other
// criteria are in about-this-copy.spec.ts.

import { aboutCard, exportButton, serverAppInfo } from './about-this-copy.ts'
import { expect, test } from './fixtures.ts'
import { answerAppInfo } from './library.ts'
import { BUNDLE_VERSION } from './update-notice.ts'

/** " · ": space, U+00B7 middle dot, space, as text (DESIGN.md → About this copy). */
const DOT = ' · '

test.use({ serverDev: true })

test.describe('Story 11.3 Show the version on the Backup page, on a dev server (ATDD)', () => {
  test('[P0] AC-2 on a dev server line 1 reads "bookvie 1.1.0 (a1b2c3d) · Development server", or without brackets when commit is null, and line 2 gives the dev data folder', async ({
    page,
    server,
  }) => {
    await answerAppInfo(page, () => ({
      version: BUNDLE_VERSION,
      mode: 'dev',
      dataDir: '~/bookvie-data-dev',
      commit: 'a1b2c3d',
    }))
    await page.goto(`${server.url}/backup`)
    await expect(exportButton(page)).toBeVisible()
    const card = aboutCard(page)

    // The criterion.
    await expect(
      card.getByText(`bookvie ${BUNDLE_VERSION} (a1b2c3d)${DOT}Development server`, { exact: true }),
    ).toBeVisible()

    await expect(card.getByText('Data folder: ~/bookvie-data-dev', { exact: true })).toBeVisible()

    // No commit (no git, or not a checkout): no brackets.
    await page.unrouteAll({ behavior: 'ignoreErrors' })
    await answerAppInfo(page, () => ({
      version: BUNDLE_VERSION,
      mode: 'dev',
      dataDir: '~/bookvie-data-dev',
      commit: null,
    }))
    await page.reload()
    await expect(card.getByText(`bookvie ${BUNDLE_VERSION}${DOT}Development server`, { exact: true })).toBeVisible()
    await expect(card).not.toContainText('(')
    await expect(card).not.toContainText(')')

    // The real dev server: its own version, commit and the folder it was given.
    await page.unrouteAll({ behavior: 'ignoreErrors' })
    const info = await serverAppInfo(page, server.url)
    expect(info.mode).toBe('dev')
    await page.reload()
    const commit = info.commit === null ? '' : ` (${info.commit})`
    await expect(
      card.getByText(`bookvie ${info.version}${commit}${DOT}Development server`, { exact: true }),
    ).toBeVisible()
    await expect(card.getByText(`Data folder: ${info.dataDir}`, { exact: true })).toBeVisible()
  })
})
