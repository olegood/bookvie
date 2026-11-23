// Story 13.6: the Dropbox backup line's words (EXPERIENCE.md → Dropbox backup line).

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { DropboxBackupView } from '../api/views.ts'
import { copiesText, dropboxBackupLine, dropboxWhen, REASONS } from './dropboxBackupLine.ts'

// Local wall-clock times, so the cases hold in any TZ.
const at = (year: number, month: number, day: number, hour = 12, minute = 0) =>
  new Date(year, month - 1, day, hour, minute)
const iso = (date: Date) => date.toISOString()

const NOW = at(2026, 11, 21, 10, 0)
const TODAY = iso(at(2026, 11, 21, 9, 2))
const YESTERDAY = iso(at(2026, 11, 20, 9, 2))
const NOV_19 = iso(at(2026, 11, 19, 9, 2))

const view = (fields: Partial<DropboxBackupView> & Pick<DropboxBackupView, 'state'>): DropboxBackupView => ({
  reportAt: null,
  lastUploadAt: null,
  copies: null,
  cause: null,
  ...fields,
})

describe('dropboxWhen', () => {
  it('[P1] AC-2 reads today, yesterday, this year, another year and a future time by local calendar day', () => {
    assert.equal(dropboxWhen(TODAY, NOW), 'today at 09:02')
    assert.equal(dropboxWhen(YESTERDAY, NOW), 'yesterday at 09:02')
    assert.equal(dropboxWhen(iso(at(2026, 11, 20, 23, 59)), at(2026, 11, 21, 0, 1)), 'yesterday at 23:59')
    assert.equal(dropboxWhen(NOV_19, NOW), 'on 19 Nov')
    assert.equal(dropboxWhen(iso(at(2026, 1, 5, 7, 0)), NOW), 'on 5 Jan')
    assert.equal(dropboxWhen(iso(at(2025, 11, 19, 9, 2)), NOW), 'on 19 Nov 2025')
    assert.equal(dropboxWhen(iso(at(2025, 12, 31, 18, 0)), at(2026, 1, 1, 9, 0)), 'yesterday at 18:00')
    // A future time (a clock that ran ahead) is "today".
    assert.equal(dropboxWhen(iso(at(2026, 11, 23, 8, 5)), NOW), 'today at 08:05')
  })
})

describe('copiesText', () => {
  it('[P1] AC-2 says 1 copy and N copies', () => {
    assert.equal(copiesText(1), '1 copy')
    assert.equal(copiesText(2), '2 copies')
    assert.equal(copiesText(3), '3 copies')
  })
})

describe('dropboxBackupLine', () => {
  it('[P1] an upload whose prune did not finish shows its real count, more than 3', () => {
    // Epic 13 retro item 91: the run is recorded as uploaded with the copies Dropbox holds.
    assert.equal(
      dropboxBackupLine(view({ state: 'uploaded', reportAt: TODAY, lastUploadAt: TODAY, copies: 4 }), NOW),
      'Dropbox backup: last upload today at 09:02 · 4 copies in Dropbox',
    )
  })

  it('[P1] AC-2 words every state', () => {
    assert.equal(dropboxBackupLine(view({ state: 'dev' }), NOW), 'Dropbox backup: never from a development server')
    assert.equal(
      dropboxBackupLine(view({ state: 'none' }), NOW),
      'Dropbox backup: none yet · run /bookvie-backup in Claude Code',
    )
    assert.equal(
      dropboxBackupLine(view({ state: 'uploaded', reportAt: TODAY, lastUploadAt: TODAY, copies: 3 }), NOW),
      'Dropbox backup: last upload today at 09:02 · 3 copies in Dropbox',
    )
    assert.equal(
      dropboxBackupLine(view({ state: 'uploaded', reportAt: YESTERDAY, lastUploadAt: YESTERDAY, copies: 1 }), NOW),
      'Dropbox backup: last upload yesterday at 09:02 · 1 copy in Dropbox',
    )
    assert.equal(
      dropboxBackupLine(view({ state: 'skipped', reportAt: TODAY, lastUploadAt: NOV_19, copies: 3 }), NOW),
      'Dropbox backup: checked today at 09:02, nothing new · last upload on 19 Nov · 3 copies in Dropbox',
    )
  })

  it('[P1] AC-2 words each failure, with the last upload only when there was one', () => {
    for (const [cause, reason] of Object.entries(REASONS) as [keyof typeof REASONS, string][]) {
      assert.equal(
        dropboxBackupLine(view({ state: 'failed', reportAt: TODAY, lastUploadAt: NOV_19, copies: 3, cause }), NOW),
        `Dropbox backup: failed today at 09:02 · ${reason} Last upload on 19 Nov.`,
      )
    }
    assert.equal(
      dropboxBackupLine(view({ state: 'failed', reportAt: YESTERDAY, cause: 'dropbox_full' }), NOW),
      `Dropbox backup: failed yesterday at 09:02 · ${REASONS.dropbox_full}`,
    )
  })

  it('[P2] AC-2 words each part of a line by its own "when": another year, a single copy, a last upload today', () => {
    const lastYear = iso(at(2025, 11, 19, 9, 2))
    assert.equal(
      dropboxBackupLine(view({ state: 'skipped', reportAt: TODAY, lastUploadAt: lastYear, copies: 1 }), NOW),
      'Dropbox backup: checked today at 09:02, nothing new · last upload on 19 Nov 2025 · 1 copy in Dropbox',
    )
    assert.equal(
      dropboxBackupLine(view({ state: 'uploaded', reportAt: TODAY, lastUploadAt: lastYear, copies: 3 }), NOW),
      'Dropbox backup: last upload on 19 Nov 2025 · 3 copies in Dropbox',
    )
    // A run that failed later the same day as an upload: both read "today".
    const laterToday = iso(at(2026, 11, 21, 9, 45))
    assert.equal(
      dropboxBackupLine(
        view({ state: 'failed', reportAt: laterToday, lastUploadAt: TODAY, copies: 3, cause: 'upload_incomplete' }),
        NOW,
      ),
      `Dropbox backup: failed today at 09:45 · ${REASONS.upload_incomplete} Last upload today at 09:02.`,
    )
  })
})

describe('dropboxWhen across a new year', () => {
  it('[P2] AC-2 gives the year to a date two or more days back in the old year', () => {
    const newYear = at(2026, 1, 2, 9, 0)
    assert.equal(dropboxWhen(iso(at(2026, 1, 1, 8, 0)), newYear), 'yesterday at 08:00')
    assert.equal(dropboxWhen(iso(at(2025, 12, 31, 8, 0)), newYear), 'on 31 Dec 2025')
    assert.equal(dropboxWhen(iso(at(2025, 12, 30, 23, 59)), newYear), 'on 30 Dec 2025')
  })
})
