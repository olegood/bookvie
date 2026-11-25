// Shared by the Story 16.1 favourite specs: the star button by its exact
// name, the shape drawn on top in its SVG, whether that SVG is painted at all
// (an unstarred tile or List row hides its outline until hover or focus), and
// the favourite mark at a spine's foot, found by what it looks like so no class
// name is pinned.

import type { Locator, Page } from '@playwright/test'

/**
 * The star button inside `scope`, by its exact name: "Favourite" on Book
 * detail and in the Spine popover, "Favourite *Title*" on a tile or List row.
 * Exact, since "Favourite" is a prefix of "Favourites" and "Favourite *Title*".
 */
export function favouriteStar(scope: Locator | Page, name = 'Favourite'): Locator {
  return scope.getByRole('button', { name, exact: true })
}

/** The shape drawn on top in the star's SVG (its last path, polygon or use): the star, above any paper stroke under it. */
export function starShape(star: Locator): Locator {
  return star.locator('svg').first().locator('path, polygon, use').last()
}

/**
 * Whether the star's SVG is painted: it has a size, its `visibility` is
 * `visible`, and neither it nor any ancestor has `opacity: 0`. The button
 * itself may stay in the page and in Tab order while this is false.
 */
export function starDrawn(star: Locator): Promise<boolean> {
  return star.evaluate((button) => {
    const svg = button.querySelector('svg')
    if (svg === null) return false
    const box = svg.getBoundingClientRect()
    if (box.width === 0 || box.height === 0) return false
    if (getComputedStyle(svg).visibility !== 'visible') return false
    for (let node: Element | null = svg; node !== null; node = node.parentElement) {
      if (Number(getComputedStyle(node).opacity) === 0) return false
    }
    return true
  })
}

/** How a spine draws its favourite mark, in px relative to the spine button. */
export type SpineMark = {
  width: number
  height: number
  /** From the mark's bottom edge to the spine's bottom edge. */
  bottomGap: number
  /** The mark's horizontal centre minus the spine's. */
  centreOffset: number
  /** The square's computed `background-color`. */
  background: string
  /** The star's width, and the computed `fill` of the shape drawn on top. */
  starWidth: number
  starFill: string
}

/**
 * The favourite mark inside `spineButton`: the innermost element below the
 * spine with a painted background that holds an SVG, or null when there is
 * none. The marker dot holds no SVG and the label strip holds text, not an SVG.
 */
export function spineMark(spineButton: Locator): Promise<SpineMark | null> {
  return spineButton.evaluate((spine) => {
    const holders = Array.from(spine.querySelectorAll('*')).filter(
      (node) =>
        node.querySelector('svg') !== null &&
        !(node instanceof SVGElement) &&
        getComputedStyle(node).backgroundColor !== 'rgba(0, 0, 0, 0)',
    )
    const mark = holders.at(-1)
    if (mark === undefined) return null
    const s = spine.getBoundingClientRect()
    const m = mark.getBoundingClientRect()
    const svg = mark.querySelector('svg')!
    const shape = Array.from(svg.querySelectorAll('path, polygon, use')).at(-1) ?? svg
    return {
      width: m.width,
      height: m.height,
      bottomGap: s.bottom - m.bottom,
      centreOffset: m.left + m.width / 2 - (s.left + s.width / 2),
      background: getComputedStyle(mark).backgroundColor,
      starWidth: svg.getBoundingClientRect().width,
      starFill: getComputedStyle(shape).fill,
    }
  })
}
