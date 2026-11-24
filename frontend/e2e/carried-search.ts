// Shared by carried-search.spec.ts (Story 14.5's ATDD leaves) and
// carried-search-automate.spec.ts: the "habit" and "habits" shelf states and
// sentences on HABIT_SHELF, the open box's chip, the notes in main, the
// non-empty status texts, and a shelf opened with a search already announced.

import type { Locator, Page } from '@playwright/test'
import { statusTexts } from './card-note-add-another.ts'
import { boxLinks, HABIT_BOXES, searchField } from './card-note-boxes.ts'
import { expect } from './fixtures.ts'

/** DESIGN.md components.card-note-box.lift and .fade (14.4). */
export const LIFT = -6
export const FADE = 0.38

/** The shelf sentence for "habit" (17 notes in 4 Books; 14.4's measured count). */
export const HABIT_LINE = '17 card notes in 4 Books contain “habit”.'
/** The shelf sentence for "habits": Atomic Habits 1 of 12, Tiny Habits 4 of 12 (probed on the shipped List and shelf). */
export const HABITS_LINE = '5 card notes in 2 Books contain “habits”.'

/** The h1's text, as `focusAtStatus` names the focused h1. */
export const H1 = 'Card notes'

/** Every box lifted when `matched` holds it, else faded. */
export function searchedState(matched: readonly string[]): [string, number, number][] {
  return HABIT_BOXES.map((b): [string, number, number] => (matched.includes(b.id) ? [b.id, LIFT, 1] : [b.id, 0, FADE]))
}

/** "habit": every box but Refactoring has a match. */
export const HABIT_STATE = searchedState(HABIT_BOXES.filter((b) => b.matches > 0).map((b) => b.id))
/** "habits": only Atomic Habits and Tiny Habits. */
export const HABITS_STATE = searchedState([HABIT_BOXES[0].id, HABIT_BOXES[3].id])
/** Every box at rest. */
export const AT_REST = HABIT_BOXES.map((b): [string, number, number] => [b.id, 0, 1])

/** The open box's chip text, which ships: proves the open box has rendered. */
export function chip(page: Page, title: string): Locator {
  return page.getByRole('main').getByText(`In ${title}`, { exact: true })
}

/** The notes listed in main (the open box's, or the List's). */
export function notes(page: Page): Locator {
  return page.getByRole('main').getByRole('listitem')
}

/** The non-empty texts the status region has shown since `recordStatus`. */
export async function announced(page: Page): Promise<string[]> {
  return (await statusTexts(page)).filter((text) => text !== '')
}

/** Opens the shelf, types `text` and waits for 14.4's announcement of it, so later recordings start clean. */
export async function searchTheShelf(page: Page, url: string, text: string, line: string): Promise<void> {
  await page.goto(url)
  await expect(boxLinks(page)).toHaveCount(HABIT_BOXES.length)
  await searchField(page).fill(text)
  await expect(page.getByRole('status')).toHaveText(line)
}
