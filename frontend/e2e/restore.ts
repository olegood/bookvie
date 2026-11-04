// Shared by the restore specs (Stories 2.2 and 2.3): the Backup page's Restore
// card, the file chooser, the Confirm dialog, real exports and hand-made zips.

import { crc32 } from 'node:zlib'
import type { Page } from '@playwright/test'
import type { Server } from './fixtures.ts'

export const RESTORE = 'Restore from file…'
export const REPLACE_ALL = 'Replace all data'
export const RESTORE_INTENT = '/api/intents/restore'
export const RESTORE_INVALID = "This file isn't a bookvie export, or it's damaged. Nothing was changed."

export type FilePayload = { name: string; mimeType: string; buffer: Buffer }

// For the dialog alone, or a file that is plainly no zip: its bytes don't matter.
export const ANY_FILE: FilePayload = {
  name: 'bookvie-export-2026-10-30.zip',
  mimeType: 'application/zip',
  buffer: Buffer.from('PK\x03\x04 a file the dialog never sends'),
}

export function restoreButton(page: Page, name = RESTORE) {
  return page.getByRole('main').getByRole('button', { name, exact: true })
}

/** The Restore surface card (`section aria-label="Restore"`). */
export function restoreCard(page: Page) {
  return page.getByRole('region', { name: 'Restore', exact: true })
}

export function confirmDialog(page: Page) {
  return page.getByRole('alertdialog')
}

/** Presses Restore from file… and picks `file` in the chooser it opens. */
export async function pickFile(page: Page, file: FilePayload): Promise<void> {
  const chooser = page.waitForEvent('filechooser')
  await restoreButton(page).click()
  await (await chooser).setFiles(file)
}

/** Picks `file` and confirms with Replace all data. */
export async function restoreFrom(page: Page, file: FilePayload): Promise<void> {
  await pickFile(page, file)
  await confirmDialog(page).getByRole('button', { name: REPLACE_ALL, exact: true }).click()
}

/** A real export of `server` (Story 2.1), as the browser would have saved it. */
export async function exportOf(page: Page, server: Server): Promise<FilePayload> {
  const response = await page.request.get(`${server.url}/api/export`, { headers: { 'X-Bookvie-Export': '1' } })
  return zipFile(await response.body())
}

export function zipFile(buffer: Buffer): FilePayload {
  return { name: 'bookvie-export-2026-10-30.zip', mimeType: 'application/zip', buffer }
}

/**
 * A hand-made zip with `entries` stored (not compressed), in order. A name
 * ending in `/` is a directory entry. Names are written as given, so a test
 * can build an archive no export would hold (`../x`, an extra entry).
 */
export function storedZip(entries: [name: string, data: string | Buffer][]): Buffer {
  const locals: Buffer[] = []
  const centrals: Buffer[] = []
  let offset = 0
  for (const [name, content] of entries) {
    const fileName = Buffer.from(name, 'utf8')
    const data = Buffer.from(content)
    const crc = crc32(data)
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4) // version needed
    local.writeUInt16LE(0x0800, 6) // UTF-8 names
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(data.length, 18)
    local.writeUInt32LE(data.length, 22)
    local.writeUInt16LE(fileName.length, 26)
    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4) // version made by
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(0x0800, 8)
    central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(data.length, 20)
    central.writeUInt32LE(data.length, 24)
    central.writeUInt16LE(fileName.length, 28)
    central.writeUInt32LE(name.endsWith('/') ? 0x10 : 0, 38) // MS-DOS directory bit
    central.writeUInt32LE(offset, 42)
    locals.push(local, fileName, data)
    centrals.push(central, fileName)
    offset += local.length + fileName.length + data.length
  }
  const directory = Buffer.concat(centrals)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(entries.length, 8)
  end.writeUInt16LE(entries.length, 10)
  end.writeUInt32LE(directory.length, 12)
  end.writeUInt32LE(offset, 16)
  return Buffer.concat([...locals, directory, end])
}
