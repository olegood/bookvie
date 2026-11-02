import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  colorLine,
  colorSetCopy,
  isPressed,
  nearestSwatchName,
  placePopover,
  pressedValue,
  SWATCH_COLORS,
  swatchName,
  type ColoredBook,
} from './spineColor.ts'

const curated: ColoredBook = { spineColor: '#749076', spineColorUser: null, spineColorFromCover: null, hasCover: false }
const covered: ColoredBook = { spineColor: '#A85A4A', spineColorUser: null, spineColorFromCover: '#A85A4A', hasCover: true }
const picked: ColoredBook = { ...covered, spineColor: '#4B7C7B', spineColorUser: '#4B7C7B' }

describe('swatchName', () => {
  it('names each curated hex, ignoring case', () => {
    assert.equal(swatchName('#4B7C7B'), 'Teal')
    assert.equal(swatchName('#4b7c7b'), 'Teal')
    assert.deepEqual(
      SWATCH_COLORS.map(([, hex]) => swatchName(hex)),
      ['Sage', 'Slate', 'Clay', 'Ochre', 'Plum', 'Teal', 'Moss', 'Stone'],
    )
  })

  it('is null for any other color', () => {
    assert.equal(swatchName('#A85A4A'), null)
    assert.equal(swatchName(''), null)
  })
})

describe('nearestSwatchName', () => {
  it('is the curated color itself for a curated hex', () => {
    for (const [name, hex] of SWATCH_COLORS) assert.equal(nearestSwatchName(hex), name)
  })

  it('is the nearest by RGB distance for any other hex', () => {
    assert.equal(nearestSwatchName('#A85A4A'), 'Clay')
    assert.equal(nearestSwatchName('#4a7d7c'), 'Teal')
    assert.equal(nearestSwatchName('#000000'), 'Moss')
  })

  it('falls back to Sage for a non-hex', () => {
    assert.equal(nearestSwatchName('teal'), 'Sage')
  })
})

describe('colorLine', () => {
  it('says "set by you" for any user color, even a curated one', () => {
    assert.equal(colorLine(picked), 'Color: set by you')
    assert.equal(colorLine({ ...curated, spineColorUser: '#749076' }), 'Color: set by you')
  })

  it('names a cover color by its nearest curated name', () => {
    assert.equal(colorLine(covered), 'Color: Clay, from cover')
  })

  it('names a curated color', () => {
    assert.equal(colorLine(curated), 'Color: Sage')
    // A black-and-white cover gives no color, so the curated one shows.
    assert.equal(colorLine({ ...curated, hasCover: true }), 'Color: Sage')
  })
})

describe('pressedValue and isPressed', () => {
  it('presses From cover with a cover and no user color', () => {
    assert.equal(pressedValue(covered), '')
    assert.equal(pressedValue({ ...curated, hasCover: true }), '')
    assert.equal(isPressed(covered, ''), true)
    assert.equal(isPressed(covered, '#A85A4A'), false)
  })

  it('presses the resolved color otherwise, ignoring case', () => {
    assert.equal(pressedValue(curated), '#749076')
    assert.equal(pressedValue(picked), '#4B7C7B')
    assert.equal(isPressed({ ...picked, spineColor: '#4b7c7b', spineColorUser: '#4b7c7b' }, '#4B7C7B'), true)
    assert.equal(isPressed(picked, ''), false)
  })
})

describe('colorSetCopy', () => {
  it('names the swatch, or the nearest one for a cover color', () => {
    assert.equal(colorSetCopy('#4B7C7B'), 'Color set to Teal.')
    assert.equal(colorSetCopy('#A85A4A'), 'Color set to Clay.')
  })
})

describe('placePopover', () => {
  const viewport = { width: 1024, height: 768 }
  const size = { width: 500, height: 200 }

  it('sits above the spine, centred on it, with the pointer at its centre', () => {
    const spine = { left: 500, top: 500, width: 28, height: 136 }
    const place = placePopover(spine, size, viewport)
    assert.equal(place.side, 'above')
    assert.equal(place.top, 500 - 8 - 200)
    assert.equal(place.left, 514 - 250)
    assert.equal(place.left + place.pointerX, 514)
  })

  it('flips below when there is no room above', () => {
    const spine = { left: 500, top: 150, width: 28, height: 136 }
    const place = placePopover(spine, size, viewport)
    assert.equal(place.side, 'below')
    assert.equal(place.top, 150 + 136 + 8)
  })

  it('flips below when the room above is outside the shelf (the top row)', () => {
    const spine = { left: 500, top: 400, width: 28, height: 136 }
    assert.equal(placePopover(spine, size, viewport, 300).side, 'below')
    assert.equal(placePopover(spine, size, viewport, 150).side, 'above')
  })

  it('shifts inward at the viewport edges, the pointer still at the spine', () => {
    const left = placePopover({ left: 30, top: 500, width: 28, height: 136 }, size, viewport)
    assert.equal(left.left, 16)
    assert.equal(left.left + left.pointerX, 44)
    const right = placePopover({ left: 960, top: 500, width: 28, height: 136 }, size, viewport)
    assert.equal(right.left, 1024 - 16 - 500)
    assert.equal(right.left + right.pointerX, 974)
  })

  it('keeps the pointer inside the corners', () => {
    const place = placePopover({ left: 0, top: 500, width: 10, height: 136 }, size, viewport)
    assert.equal(place.pointerX, 20)
  })

  it('clamps the top to 16px from each viewport edge, 16 when it cannot fit', () => {
    const tall = { width: 500, height: 600 }
    // Below a spine near the bottom: pulled up to end 16px above the bottom edge.
    const low = placePopover({ left: 500, top: 100, width: 28, height: 136 }, tall, viewport, 200)
    assert.equal(low.side, 'below')
    assert.equal(low.top, 768 - 16 - 600)
    // Taller than the viewport allows: 16 from the top.
    const huge = placePopover({ left: 500, top: 600, width: 28, height: 136 }, { width: 500, height: 900 }, viewport)
    assert.equal(huge.top, 16)
  })

  it('scrolls away with a spine that has left the viewport, instead of staying pinned', () => {
    // Scrolled off the top: below its spine, partly above the viewport.
    const up = placePopover({ left: 500, top: -200, width: 28, height: 136 }, size, viewport)
    assert.equal(up.side, 'below')
    assert.equal(up.top, -200 + 136 + 8)
    // Scrolled off the bottom: above its spine, partly below the viewport.
    const down = placePopover({ left: 500, top: 900, width: 28, height: 136 }, size, viewport)
    assert.equal(down.side, 'above')
    assert.equal(down.top, 900 - 8 - 200)
  })

  it('takes the side with more space when neither has room', () => {
    const tall = { width: 500, height: 700 }
    assert.equal(placePopover({ left: 500, top: 100, width: 28, height: 136 }, tall, viewport).side, 'below')
    assert.equal(placePopover({ left: 500, top: 600, width: 28, height: 136 }, tall, viewport).side, 'above')
  })
})
