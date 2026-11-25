---
name: bookvie
description: Personal, local-first desktop web app for one reader's home library and reading. Birch Morning direction — bright, flat, Nordic; a pale birch bookcase where read books are colored and unread books are outlined.
status: final
updated: 2026-11-25
colors:
  # Light theme (default tokens). Dark twins carry the -dark suffix.
  page: '#F6F4EF'
  surface: '#FFFFFF'
  surface-inset: '#FAF9F6'
  line: '#E4DFD5'
  input-border: '#8A8273'
  ink: '#2B2E2A'
  ink-secondary: '#5F635C'
  ink-tertiary: '#666961'
  accent: '#557059'
  on-accent: '#FFFFFF'
  accent-soft: '#E3EBE2'
  focus-halo: 'rgba(85,112,89,0.16)'
  marker-up-next: '#5A7D98'
  marker-waiting: '#8C7B5C'
  marker-ring: '#FDFCF9'
  shelf-wall: '#EFEAE0'
  shelf-wall-line: '#E2DBCD'
  birch-plank: '#E9DCC3'
  birch-edge: '#D5C3A2'
  spine-unread-fill: '#FDFCF9'
  spine-unread-outline: '#8A8273'
  spine-unread-text: '#77716A'
  page-dark: '#191B18'
  surface-dark: '#222520'
  surface-inset-dark: '#1D201B'
  line-dark: '#343831'
  input-border-dark: '#767A6F'
  ink-dark: '#ECEAE3'
  ink-secondary-dark: '#B3B7AD'
  ink-tertiary-dark: '#9A9E94'
  accent-dark: '#93B597'
  on-accent-dark: '#142017'
  accent-soft-dark: '#2C3A2E'
  focus-halo-dark: 'rgba(147,181,151,0.18)'
  marker-up-next-dark: '#8EADC6'
  marker-waiting-dark: '#A8987A'
  marker-ring-dark: '#191B18'
  shelf-wall-dark: '#1E201C'
  shelf-wall-line-dark: '#2E312B'
  birch-plank-dark: '#6E604B'
  birch-edge-dark: '#4E4433'
  spine-unread-fill-dark: '#252822'
  spine-unread-outline-dark: '#70766A'
  spine-unread-text-dark: '#A39E92'
  # Read-spine edge line: fixed per theme, independent of the fill (>= 3:1 vs shelf-wall for any fill).
  spine-edge: '#5E584D'
  spine-edge-dark: '#858A7F'
  # Read-spine fills, label strip and label are theme-independent: a book looks the same morning and evening.
  spine-label-strip: '#FBF8F1'
  spine-label: '#2B2E2A'
  spine-sage: '#749076'
  spine-slate: '#5B7590'
  spine-clay: '#9B6753'
  spine-ochre: '#B48A45'
  spine-plum: '#7A6283'
  spine-teal: '#4B7C7B'
  spine-moss: '#6C7650'
  spine-stone: '#6F7375'
typography:
  wordmark:
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif'
    fontSize: 20px
    fontWeight: '600'
    letterSpacing: -0.01em
  nav:
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif'
    fontSize: 14.5px
    fontWeight: '400'
  nav-active:
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif'
    fontSize: 14.5px
    fontWeight: '600'
  page-title:
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif'
    fontSize: 22px
    fontWeight: '600'
    lineHeight: '1.25'
  page-header:
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif'
    fontSize: 15px
    fontWeight: '500'
    lineHeight: '1.4'
  panel-heading:
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif'
    fontSize: 18px
    fontWeight: '600'
    lineHeight: '1.3'
  book-title-lg:
    fontFamily: 'ui-serif, Georgia, "Iowan Old Style", serif'
    fontSize: 34px
    fontWeight: '500'
    lineHeight: '1.1'
    letterSpacing: -0.01em
  book-title-md:
    fontFamily: 'ui-serif, Georgia, "Iowan Old Style", serif'
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.2'
  book-title-sm:
    fontFamily: 'ui-serif, Georgia, "Iowan Old Style", serif'
    fontSize: 15.5px
    fontWeight: '400'
    lineHeight: '1.25'
  author:
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif'
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.4'
  gauge-figure:
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif'
    fontSize: 44px
    fontWeight: '300'
    lineHeight: '1'
    letterSpacing: -0.02em
  page-field:
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif'
    fontSize: 18px
    fontWeight: '400'
  pile-text:
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif'
    fontSize: 17px
    fontWeight: '400'
    lineHeight: '1.6'
  body:
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif'
    fontSize: 15px
    fontWeight: '400'
    lineHeight: '1.55'
  body-sm:
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif'
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  meta:
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif'
    fontSize: 13px
    fontWeight: '400'
    lineHeight: '1.45'
  section-label:
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif'
    fontSize: 12px
    fontWeight: '600'
    letterSpacing: 0.08em
  spine-label:
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif'
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 12px
    letterSpacing: 0.02em
rounded:
  plank: 2px
  spine: 3px 3px 0 0
  cover: 4px
  sm: 6px
  md: 9px
  lg: 12px
  xl: 14px
  full: 9999px
spacing:
  '1': 4px
  '2': 8px
  '3': 12px
  '4': 16px
  '5': 20px
  '6': 24px
  '7': 32px
  '8': 36px
  page-x: 36px
  page-top: 24px
  side-column: 320px
  topbar-height: 60px
  min-viewport: 1024px
  cover-main-width: 200px
  cover-main-height: 300px
  spine-width: 28px
  spine-gap: 4px
  spine-height-min: 120px
  spine-height-max: 200px
  spine-height-step: 8px
  spine-label-strip-top: 8px
  spine-label-strip-top-marked: 20px
  spine-label-strip-max: 96px
  shelf-row-height: 204px
components:
  top-nav:
    background: '{colors.surface-inset}'
    border-bottom: '1px solid {colors.line}'
    height: '{spacing.topbar-height}'
    item: '{typography.nav}'
    item-active: '{typography.nav-active}'
    item-active-indicator: '2px solid {colors.accent}'
  theme-toggle:
    background: '{colors.surface}'
    border: '1px solid {colors.input-border}'
    radius: '{rounded.md}'
    option-selected-background: '{colors.accent-soft}'
    option-selected-foreground: '{colors.ink}'
    option-selected-indicator: '2px solid {colors.accent}'
  button-primary:
    background: '{colors.accent}'
    foreground: '{colors.on-accent}'
    radius: '{rounded.md}'
    height: 42px
  button-secondary:
    background: '{colors.surface-inset}'
    foreground: '{colors.ink}'
    border: '1px solid {colors.input-border}'
    radius: '{rounded.md}'
  back-to-top:
    background: '{colors.surface-inset}'
    foreground: '{colors.ink}'
    border: '1px solid {colors.input-border}'
    radius: '{rounded.md}'
    height: 42px
    offset-bottom: '{spacing.6}'
    offset-right: '{spacing.page-x}'
    gap: '{spacing.2}'
    glyph: '↑'
  link:
    foreground: '{colors.accent}'
    decoration: 'underline 1px, offset 3px'
  text-field:
    background: '{colors.surface}'
    border: '1.5px solid {colors.input-border}'
    border-focus: '1.5px solid {colors.accent}'
    halo-focus: '0 0 0 4px {colors.focus-halo}'
    border-invalid: '2px solid {colors.ink}'
    radius: '{rounded.md}'
    label: '{typography.body-sm}'
    label-color: '{colors.ink-secondary}'
    placeholder-color: '{colors.ink-tertiary}'
  sort-direction-toggle:
    background: '{colors.surface-inset}'
    foreground: '{colors.ink}'
    border: '1.5px solid {colors.input-border}'
    radius: '0 {rounded.md} {rounded.md} 0'
    height: 42px
    padding: '0 {spacing.3}'
    gap: '{spacing.1}'
    label: '{typography.body-sm}'
    glyph-color: '{colors.ink-secondary}'
  checkbox:
    control: native
    size: 16px
    accent: '{colors.accent}'
    label: '{typography.body-sm}'
    label-color: '{colors.ink}'
    label-gap: '{spacing.2}'
  main-book-card:
    background: '{colors.surface}'
    border: '1px solid {colors.line}'
    radius: '{rounded.xl}'
    padding: '28px 32px'
    cover-width: '{spacing.cover-main-width}'
    cover-height: '{spacing.cover-main-height}'
    cover-radius: '{rounded.cover}'
    eyebrow: '{typography.section-label}'
    eyebrow-color: '{colors.accent}'
    title: '{typography.book-title-lg}'
    author: '{typography.author}'
    author-color: '{colors.ink-secondary}'
  gauge:
    track: '{colors.accent-soft}'
    fill: '{colors.accent}'
    height: 14px
    radius: 7px
    figure: '{typography.gauge-figure}'
  page-field:
    background: '{colors.surface}'
    border: '1.5px solid {colors.input-border}'
    border-focus: '1.5px solid {colors.accent}'
    halo-focus: '0 0 0 4px {colors.focus-halo}'
    radius: '{rounded.md}'
    height: 42px
    width: 110px
    text: '{typography.page-field}'
    container-background: '{colors.surface-inset}'
    container-radius: '{rounded.lg}'
  re-entry-line:
    text: '{typography.body-sm}'
    foreground: '{colors.ink-secondary}'
    bullet: '{colors.ink-tertiary}'
  section-pane:
    background: '{colors.surface}'
    border: '1px solid {colors.line}'
    radius: '{rounded.xl}'
    padding: '20px 22px'
    heading: '{typography.section-label}'
    heading-color: '{colors.ink-tertiary}'
    row-divider: '1px solid {colors.line}'
    mini-bar-track: '{colors.accent-soft}'
    mini-bar-fill: '{colors.accent}'
  library-meter:
    track: '{colors.line}'
    fill: '{colors.accent}'
    height: 4px
    width: 180px
    label: '{typography.meta}'
  bookcase:
    background: '{colors.shelf-wall}'
    border: '1px solid {colors.shelf-wall-line}'
    radius: '{rounded.xl}'
    row-height: '{spacing.shelf-row-height}'
    plank-face: '{colors.birch-plank}'
    plank-edge: '4px solid {colors.birch-edge}'
    plank-radius: '{rounded.plank}'
    plank-height: 12px
    heading: '{typography.section-label}'
  spine:
    width: '{spacing.spine-width}'
    gap: '{spacing.spine-gap}'
    height-min: '{spacing.spine-height-min}'
    height-max: '{spacing.spine-height-max}'
    height-step: '{spacing.spine-height-step}'
    height-title-ratio: 0.3
    max-label-lines: 1
    label-overflow: ellipsis
    radius: '{rounded.spine}'
    label: '{typography.spine-label}'
    label-color: '{colors.spine-label}'
    label-strip: '{colors.spine-label-strip}'
    label-strip-width: 16px
    label-strip-radius: 2px
    label-strip-end-padding: 4px
    label-strip-top: '{spacing.spine-label-strip-top}'
    label-strip-top-marked: '{spacing.spine-label-strip-top-marked}'
    label-strip-max-length: '{spacing.spine-label-strip-max}'
    read-edge: '1px solid {colors.spine-edge}'
    main-fill-line: '2px solid {colors.spine-edge}'
    unread-fill: '{colors.spine-unread-fill}'
    unread-outline: '1.5px solid {colors.spine-unread-outline}'
    unread-text: '{colors.spine-unread-text}'
    marker-size: 7px
    marker-ring: '1.5px solid {colors.marker-ring}'
    marker-up-next: '{colors.marker-up-next}'
    marker-waiting: '{colors.marker-waiting}'
    marker-main: '{colors.spine-unread-text}'
    focus-ring: '0 0 0 2px {colors.page}, 0 0 0 4px {colors.accent}'
  spine-popover:
    background: '{colors.surface}'
    border: '1px solid {colors.line}'
    radius: '{rounded.lg}'
    width: 500px
    max-width: 'calc(100vw - 32px)'
    title: '{typography.book-title-md}'
    swatch-size: 16px
  side-panel:
    background: '{colors.surface}'
    border-left: '1px solid {colors.line}'
    width: 440px
    heading: '{typography.panel-heading}'
  dialog:
    background: '{colors.surface}'
    border: '1px solid {colors.line}'
    radius: '{rounded.lg}'
    heading: '{typography.panel-heading}'
  scrim:
    light: 'rgba(43,46,42,0.24)'
    dark: 'rgba(25,27,24,0.60)'
  card-note:
    background: '{colors.surface}'
    border: '1px solid {colors.line}'
    radius: '{rounded.lg}'
    text: '{typography.body}'
    page-ref: '{typography.meta}'
    page-ref-color: '{colors.ink-tertiary}'
    saved-count: '{typography.meta}'
    saved-count-color: '{colors.ink-tertiary}'
  list-view-row:
    divider: '1px solid {colors.line}'
    text: '{typography.body-sm}'
    title: '{typography.book-title-sm}'
  catalog-tile:
    cover-min-width: 140px
    cover-ratio: '2 / 3'
    column-gap: '{spacing.6}'
    row-gap: '{spacing.7}'
    caption-gap: '{spacing.2}'
    cover-radius: '{rounded.cover}'
    cover-edge: '1px solid {colors.line}'
    cover-loading: '{colors.surface-inset}'
    title: '{typography.book-title-sm}'
    title-weight: '600'
    title-color: '{colors.ink}'
    author: '{typography.body-sm}'
    author-color: '{colors.ink-secondary}'
    max-caption-lines: 1
    caption-overflow: ellipsis
    ribbon-width: 16px
    ribbon-height: 24px
    ribbon-notch: 6px
    ribbon-inset: 10px
    ribbon-edge: '1px solid {colors.spine-edge}'
    ribbon-halo: '1.5px solid {colors.spine-label-strip}'
    reading-bar-height: 5px
    reading-bar-gap: 6px
    reading-bar-slot: 11px
    reading-bar-track: '{colors.accent-soft}'
    reading-bar-fill: '{colors.accent}'
    typeset-edge: '1px solid {colors.spine-edge}'
    typeset-plate: '{colors.spine-label-strip}'
    typeset-plate-inset: 10px
    typeset-plate-top: 34px
    typeset-plate-radius: 2px
    typeset-title: '{typography.book-title-sm}'
    typeset-text: '{colors.spine-label}'
    typeset-unread-fill: '{colors.spine-unread-fill}'
    typeset-unread-outline: '1.5px solid {colors.spine-unread-outline}'
    typeset-unread-text: '{colors.spine-unread-text}'
  monthly-bar:
    fill: '{colors.accent}'
    track: '{colors.accent-soft}'
    label: '{typography.meta}'
  chip:
    background: '{colors.surface-inset}'
    border: '1px solid {colors.input-border}'
    radius: '{rounded.full}'
    text: '{typography.meta}'
    selected-background: '{colors.accent-soft}'
    selected-border: '2px solid {colors.accent}'
  focus-ring:
    outline: '2px solid {colors.accent}'
    offset: 2px
  highlight-ring:
    ring: '0 0 0 2px {colors.page}, 0 0 0 4px {colors.accent}'
  favicon:
    viewbox: '0 0 32 32'
    fill: '{colors.accent}'
    fill-dark: '{colors.accent-dark}'
    dev-fill: '#8C5E0E'
    dev-fill-dark: '#EBC27A'
  dev-pill:
    background: '#8C5E0E'
    background-dark: '#EBC27A'
    foreground: '#FFFFFF'
    foreground-dark: '#191B18'
    text: '{typography.section-label}'
    radius: '{rounded.sm}'
    padding: '4px 7px'
    gap: '{spacing.2}'
  update-notice:
    background: '{colors.surface}'
    border-bottom: '1px solid {colors.line}'
    padding: '10px {spacing.page-x}'
    gap: '{spacing.4}'
    text: '{typography.body-sm}'
    text-color: '{colors.ink}'
    button-height: 30px
  about-card:
    heading: '{typography.section-label}'
    heading-color: '{colors.ink-tertiary}'
    text: '{typography.body-sm}'
    text-color: '{colors.ink-secondary}'
  dropbox-backup-line:
    text: '{typography.meta}'
    text-color: '{colors.ink-tertiary}'
    text-color-strong: '{colors.ink}'
    margin-top: '{spacing.1}'
  card-notes-view-toggle:
    background: '{colors.surface}'
    border: '1px solid {colors.input-border}'
    radius: '{rounded.md}'
    option-selected-background: '{colors.accent-soft}'
    option-selected-foreground: '{colors.ink}'
    option-selected-indicator: '2px solid {colors.accent}'
  card-notes-count-line:
    text: '{typography.meta}'
    text-color: '{colors.ink-tertiary}'
  card-note-box:
    # The box is a Book's object: its front, label, cards and pill look the same in both themes, like a spine.
    # The hex values below are fixed literals, not the light theme's tokens: never use the theme's custom properties for them.
    width: 216px
    height: 196px
    radius: '{rounded.lg}'
    column-gap: '{spacing.6}'
    row-gap: '{spacing.8}'
    front-height: 116px
    front-radius: '6px 6px 12px 12px'
    front-padding: 14px
    label-background: '{colors.spine-label-strip}'
    label-radius: '{rounded.cover}'
    label-padding: '10px 12px'
    label-gap: '{spacing.1}'
    title: '{typography.book-title-sm}'
    title-color: '{colors.spine-label}'
    max-title-lines: 2
    count: '{typography.meta}'
    count-color: '#5F635C'
    card-background: '#FFFFFF'
    card-border: '1px solid #E4DFD5'
    card-width: 176px
    card-height: 96px
    card-inset: 20px
    card-radius: '{rounded.cover}'
    card-top: 70px
    card-step: 8px
    pile-steps: '1, 3, 5, 7'
    pill-background: '#E3EBE2'
    pill-foreground: '{colors.spine-label}'
    pill-dot: '#557059'
    pill-dot-size: 6px
    pill-radius: '{rounded.full}'
    pill-text: '{typography.meta}'
    pill-weight: '600'
    pill-height: 22px
    pill-padding: '0 {spacing.2}'
    lift: -6px
    fade: 0.38
    transition: 150ms ease-out
    focus-ring: '2px solid {colors.accent}'
    focus-offset: 4px
  open-box-strip:
    height: 8px
---

# bookvie — Design Spine

Visual identity. Behavior lives in [EXPERIENCE.md](./EXPERIENCE.md). Mocks illustrate this spine; they are not the contract. If a mock and a spine disagree, the spine wins.

- Key screens: [Home](mockups/key-home.html), [Catalog](mockups/key-catalog.html), [Book detail](mockups/key-book-detail.html).
- Direction reference: [Birch Morning v2](mockups/birch-v2-light-dark.html) (mood only; superseded wherever it differs from this spine).

## Brand & Style

Calm and focused. bookvie is a reader's own room in the morning: bright, flat, Nordic, pale birch wood and soft sage. The product is one person's home library, so the look stays quiet and personal rather than app-like.

The central image is the bookcase. Books stand on birch planks as narrow spines. A finished book has its color; an unread book is an outline waiting to be colored in. Uncovering the library, one spine at a time, is the visible reward. There is no other reward: no confetti, no badges, no streaks, no praise.

Style rules in one line each:

- Flat surfaces separated by hairlines and tone, not shadows.
- Sans-serif for everything the app says; serif only for book titles, which belong to the books.
- One accent, sage, meaning "your action" and "your progress". A development server adds one more color, dev amber, and only to say "this is not your real library" (Colors → Dev amber). Production never shows it.
- Color on the shelf belongs to the books. Chrome stays neutral so the spines carry the color.
- Light and dark themes share one layout. Dark is the same room in the evening: the birch plank becomes walnut, read spines keep their exact colors.

## Colors

Light values first, dark twins (`-dark` suffix) second. All load-bearing text pairs meet WCAG AA (4.5:1) and all load-bearing non-text pairs meet 3:1, in both themes.

| Token | Light | Dark | Use | Not for |
|---|---|---|---|---|
| `page` | `#F6F4EF` | `#191B18` | App background; inner band of the spine focus and highlight rings | Cards |
| `surface` | `#FFFFFF` | `#222520` | Cards, popover, dialogs, side panel | — |
| `surface-inset` | `#FAF9F6` | `#1D201B` | Top bar, page-field container, secondary buttons | — |
| `line` | `#E4DFD5` | `#343831` | Decorative hairlines, card borders, meter track | Field borders, unread spine outline |
| `input-border` | `#8A8273` | `#767A6F` | Borders of every text field, select, toggle group, chip and secondary button; star outlines | Decoration |
| `ink` | `#2B2E2A` | `#ECEAE3` | Body text, headings, invalid-field border, failure messages | — |
| `ink-secondary` | `#5F635C` | `#B3B7AD` | Authors, re-entry line, inactive nav, field labels | — |
| `ink-tertiary` | `#666961` | `#9A9E94` | Section labels, hints, page refs, placeholders, "×" glyph | Text on `accent-soft` |
| `accent` (sage) | `#557059` | `#93B597` | Primary buttons; gauge, mini-bar, meter and monthly-bar fill; active nav underline, selected-option indicator, links, focus ring, highlight ring; search matches (the `<mark>` underline, a Card note box's match-pill dot) | Decoration, warnings |
| `on-accent` | `#FFFFFF` | `#142017` | Text on `accent` | — |
| `accent-soft` | `#E3EBE2` | `#2C3A2E` | Gauge, mini-bar and monthly-bar tracks; selected toggle option and chip fill (always with the `accent` indicator) | Selection on its own |
| `focus-halo` | `rgba(85,112,89,.16)` | `rgba(147,181,151,.18)` | Soft halo around a focused field (decorative; the `accent` border carries the contrast) | — |
| `marker-up-next` (sky) | `#5A7D98` | `#8EADC6` | Dot on the Up next spine | Text |
| `marker-waiting` (sand) | `#8C7B5C` | `#A8987A` | Dot on Waiting-for-you spines | Text |
| `marker-ring` | `#FDFCF9` | `#191B18` | 1.5px ring around every marker dot, so the dot reads on any spine color | — |
| `shelf-wall` | `#EFEAE0` | `#1E201C` | Bookcase background | — |
| `shelf-wall-line` | `#E2DBCD` | `#2E312B` | Bookcase border | — |
| `birch-plank` | `#E9DCC3` | `#6E604B` (walnut) | Plank face | — |
| `birch-edge` | `#D5C3A2` | `#4E4433` | Plank front edge | — |
| `spine-unread-fill` | `#FDFCF9` | `#252822` | Unread spine body | — |
| `spine-unread-outline` | `#8A8273` | `#70766A` | Unread spine outline (at least 3:1) | — |
| `spine-unread-text` | `#77716A` | `#A39E92` | Unread spine title, Main-book marker | — |
| `spine-edge` | `#5E584D` | `#858A7F` | 1px edge line on top and sides of every read spine, and the fill line of the Main-book spine (at least 3:1 against `shelf-wall` for any fill) | Unread spines |
| `spine-label-strip` | `#FBF8F1` | same | Paper label plate behind the title on read and Main-book spines | Unread spines |
| `spine-label` | `#2B2E2A` | same | Title text on the label strip | Text directly on a spine fill |

Markers (sky, sand) never carry meaning alone: the bookcase legend names them and every spine's accessible name states its status.

### Spine colors

Read spines use the book's own color, identical in both themes. Precedence, highest first:

1. **User-set** — chosen in the edit-book form or the spine popover. Always wins, and stays when the cover changes.
2. **Cover-derived** ("From cover", automatic) — when the Book has a cover image and no user choice.
3. **Curated palette** — when there is no cover and no user choice.

**Cover rule.** Computed once when a cover is added or replaced, then stored on the Book. Downscale the cover to about 64px, ignore near-neutral pixels (HSL saturation < 0.15, or lightness < 0.10 or > 0.90), group the rest into 24 hue bins, and take the average color of the fullest bin: the dominant non-neutral color. Soften it by capping HSL saturation at 0.45. The result is used as is (no lightness change). A cover with no non-neutral pixels (black-and-white) falls back to the curated color.

**Curated rule.** A curated color is assigned when the Book is created and stored on the Book, so it survives export and restore and never changes between visits. The new Book takes the color after the last Book's curated color (the most recently created Book still in the library) in the order of the eight, wrapping from Stone to Sage. The first Book takes Sage, and so does a new Book whose last Book's curated color isn't one of the eight. So a new Book's curated color never repeats the one created just before it, even after a delete; deleting the most recent Book frees its color for the next.

**Exact color.** Every read spine shows its color exactly — user-set, cover-derived, or curated. No lightness nudge, no clamp: a pale yellow the user picks is shown pale yellow, a near-black is shown near-black. The stored value is the color itself; the hex field shows it. Accessibility never depends on the fill; it comes from two fixed parts drawn on every read spine:

1. **Edge line** — `{components.spine.read-edge}`, a fixed color per theme that meets 3:1 against `shelf-wall` for any fill, including near-white, near-black and the wall colors themselves (ratios in Contrast).
2. **Label strip** — the title sits on a `spine-label-strip` plate (paper, theme-independent) in `spine-label` ink: 12.97:1 on any fill. With the height rule in Layout & Spacing → Spine sizing, at least about 24% of every spine's length shows the exact color below the strip (35–70% on most spines). The worst case is a marked spine whose title just reaches the cap. A 6px band of color also shows along each side of the strip. Strip geometry: Components → Spine.

Curated palette (exact colors, unchanged by any rule). Contrast against the wall is shown for information only; the edge line provides the 3:1 contrast.

| Token | Hex | vs `shelf-wall` light | vs `shelf-wall` dark |
|---|---|---|---|
| `spine-sage` | `#749076` | 2.92 | 4.69 |
| `spine-slate` | `#5B7590` | 3.99 | 3.44 |
| `spine-clay` | `#9B6753` | 3.93 | 3.49 |
| `spine-ochre` | `#B48A45` | 2.63 | 5.21 |
| `spine-plum` | `#7A6283` | 4.49 | 3.05 |
| `spine-teal` | `#4B7C7B` | 3.92 | 3.49 |
| `spine-moss` | `#6C7650` | 4.03 | 3.40 |
| `spine-stone` | `#6F7375` | 3.99 | 3.43 |

### Contrast (computed)

Text pairs (target 4.5):

| Pair | Light | Dark |
|---|---|---|
| `ink` on `page` | 12.51 | 14.40 |
| `ink` on `surface` | 13.75 | 12.89 |
| `ink-secondary` on `surface` | 6.13 | 7.61 |
| `ink-secondary` on `shelf-wall` | 5.11 | 8.05 |
| `ink-tertiary` on `surface` (hints, placeholders, "×") | 5.59 | 5.68 |
| `ink-tertiary` on `surface-inset` | 5.31 | 6.03 |
| `ink` on `surface-inset` (Sort direction toggle text) | 13.06 | 13.69 |
| `ink-secondary` on `surface-inset` (Sort direction toggle arrow) | 5.82 | 8.08 |
| `ink-tertiary` on `page` | 5.08 | 6.35 |
| `ink-tertiary` on `accent-soft` — not used | 4.59 | 4.39 ✗ |
| `accent` link on `surface` | 5.46 | 6.87 |
| `on-accent` on `accent` (button label) | 5.46 | 7.45 |
| `ink` on `accent-soft` (selected toggle label) | 11.30 | 9.96 |
| `spine-unread-text` on `spine-unread-fill` | 4.70 | 5.60 |
| `spine-label` on `spine-label-strip` (any fill, theme-independent) | 12.97 | 12.97 |

Non-text pairs (target 3.0):

| Pair | Light | Dark |
|---|---|---|
| `spine-unread-outline` vs `shelf-wall` | 3.17 | 3.51 |
| `spine-unread-outline` vs `spine-unread-fill` | 3.71 | 3.19 |
| Read spine edge (`spine-edge`) vs `shelf-wall`, any fill (checked against near-white `#F5F0E6`, light yellow `#F2D35B`, near-black `#1A1A1A`, pure white, pure black, and the wall colors `#EFEAE0` and `#1E201C`) | 5.88 | 4.65 |
| Main-book spine outline (`spine-unread-outline`) vs `shelf-wall` | 3.17 | 3.51 |
| `marker-up-next` vs `marker-ring` | 4.25 | 7.38 |
| `marker-waiting` vs `marker-ring` | 4.01 | 6.14 |
| Main-book marker (`spine-unread-text`) vs `marker-ring` | 4.70 | 6.49 |
| `input-border` vs `surface` | 3.80 | 3.53 |
| `input-border` vs `surface-inset` | 3.61 | 3.75 |
| `input-border` vs `page` | 3.46 | 3.95 |
| Star outline (`input-border`) vs `surface` | 3.80 | 3.53 |
| Gauge, mini-bar, monthly-bar fill (`accent`) vs `accent-soft` track | 4.48 | 5.31 |
| Selected-option indicator (`accent`) vs `accent-soft` | 4.48 | 5.31 |
| Focus ring (`accent`) vs `surface` / `page` | 5.46 / 4.96 | 6.87 / 7.68 |
| Spine focus ring: `accent` band vs `page` band (internal edge; carries the ring on any fill) | 4.96 | 7.68 |
| Spine focus ring: `accent` band vs `shelf-wall` | 4.55 | 7.27 |
| `library-meter` fill vs `shelf-wall` | 4.55 | 7.27 |
| `library-meter` track (`line`) vs `shelf-wall` — decorative; "X of Y finished" carries the value | 1.11 | 1.37 |
| `library-meter` fill vs `page` | 4.96 | 7.68 |
| `library-meter` track (`line`) vs `page` — decorative; "X of Y finished" carries the value | 1.21 | 1.45 |
| `accent-soft` track vs `surface` — decorative; the figure or "p.N of M" text carries the value | 1.22 | 1.29 |

The marker dot is identified against its own `marker-ring`, and the focus ring by its internal `accent`-to-`page` edge, so neither depends on the spine fill (which may be any color).

Card note box pairs. The label, cards and pill are the same in both themes, so their text pairs are the same in both themes too. The faded values are a documented deviation (EXPERIENCE.md → Accessibility Floor), not a target that's met.

| Pair | Light | Dark | Target |
|---|---|---|---|
| Title (`spine-label`) on the label | 12.97 | 12.97 | 4.5 |
| Count (`#5F635C`) on the label | 5.78 | 5.78 | 4.5 |
| Pill text (`spine-label`) on the pill (`#E3EBE2`) | 11.30 | 11.30 | 4.5 |
| Pill dot (`#557059`) vs the pill — marks a search match, like `<mark>`'s underline; "3 of 12" carries the match | 4.48 | 4.48 | — |
| Faded title at 0.38, label over `page` | 2.18 | 3.17 | deviation |
| Faded count at 0.38, label over `page` | 1.74 | 2.41 | deviation |
| Count line (`ink-tertiary`) on `page` | 5.08 | 6.35 | 4.5 |
| Box focus ring (`accent`) vs `page`, never faded | 4.96 | 7.68 | 3.0 |

### Dev amber

Only a server started with `--dev` shows dev amber, and only on two things: the dev favicon and the DEV pill. Dev amber is a literal in `{components.favicon}` and `{components.dev-pill}`, not a `colors` primitive, so the DESIGN.md/`tokens.css` comparison in `e2e/app-shell.spec.ts` doesn't change until a story ships it.

| Value | Light | Dark | Use | Not for |
|---|---|---|---|---|
| Dev amber | `#8C5E0E` | `#EBC27A` | Dev favicon fill; DEV pill fill | Anything in production; warnings; text on the page |
| On dev amber | `#FFFFFF` | `#191B18` | "DEV" on the pill | — |

| Pair | Light | Dark | Target |
|---|---|---|---|
| "DEV" on the pill | 5.64 | 10.34 | 4.5 |
| Pill vs `surface-inset` (top nav) | 5.36 | 9.83 | 3.0 |
| Dev favicon vs Chrome's tab strip (`#DEE1E6` / `#202124`) | 4.30 | 9.61 | 3.0 |
| Sage favicon vs Chrome's tab strip (`#DEE1E6` / `#202124`, with `accent-dark` in dark) | 4.16 | 7.13 | 3.0 |
| Sage favicon vs Chrome's active tab (`#FFFFFF` / `#35363A`) | 5.46 | 5.34 | 3.0 |
| Dev favicon vs Chrome's active tab (`#FFFFFF` / `#35363A`) | 5.64 | 7.20 | 3.0 |

### Forced colors

Under `forced-colors: active`:

- The label strip becomes `Canvas` with `CanvasText`; the read edge becomes `CanvasText`.
- Read spine fills, Main-book fills, and gauge, mini-bar and meter fills use `forced-color-adjust: none` on the fill element with `CanvasText`.
- Unread spines keep a `CanvasText` outline with a `Canvas` fill.
- Markers get a `CanvasText` ring.
- Selected options keep their border indicator.
- The native checkbox takes the system colors on its own; no override.
- The Sort direction toggle becomes `ButtonFace` with `ButtonText` text, border and glyph. The shared edge with the select stays visible.
- The DEV pill becomes `Canvas` with `CanvasText` text and a 1px `CanvasText` border, so it still reads as a pill.
- The update notice keeps its bottom border as `CanvasText`; Reload is a button and takes the system button colors.
- The Back to top button is a native button: it takes the system button colors (`ButtonFace`, `ButtonText`) and keeps its border.
- The favicon is outside the page and isn't affected.
- Card note boxes: the front uses `forced-color-adjust: none` with a `CanvasText` fill, like a read spine. The label becomes `Canvas` with `CanvasText` text. Each card becomes `Canvas` with a 1px `CanvasText` border. The pill becomes `Canvas` with `CanvasText` text, a 1px `CanvasText` border and a `CanvasText` dot, like the DEV pill. The fade's opacity and the lift still apply, so the contrast deviation covers forced colors too. The box's focus ring takes the system color. The open box strip uses `forced-color-adjust: none` with `CanvasText`.
- Catalog tiles: the finished ribbon and the reading bar's fill use `forced-color-adjust: none` with `CanvasText`, the bar's track becomes `Canvas` with a `CanvasText` outline, the typeset cover becomes `Canvas` with a `CanvasText` border, its text `CanvasText`, and the cover hairline and the loading box's border become `CanvasText`.

Read and unread stay distinct.

## Typography

Two families, both system stacks, nothing to download:

- **Sans** (`system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif`) — every word the app says: nav, labels, numbers, buttons, spine labels.
- **Serif** (`ui-serif, Georgia, "Iowan Old Style", serif`) — book titles only, wherever a title is shown as a title (Main book card, popover, Up next, lists, Card notes groups). Spine labels stay sans for legibility at 11px.

| Role | Token | Where |
|---|---|---|
| Wordmark | `{typography.wordmark}` | "bookvie" in the top nav, after a small `accent` square; on a dev server the DEV pill follows the word |
| Nav | `{typography.nav}` / `{typography.nav-active}` | Top nav items |
| Page title | `{typography.page-title}` | Visible `h1` on Catalog, Stats, Card notes, Backup, Book detail (Book detail's `h1` is the book title in `book-title-lg`). Home's `h1` "Home" is visually hidden. |
| Page header | `{typography.page-header}` | Home date line ("Wednesday, 28 October"), `ink-secondary` |
| Panel heading | `{typography.panel-heading}` | Side panel and dialog headings ("New book", "Possible duplicate"); a book title inside one is set in `book-title-md` |
| Main book title | `{typography.book-title-lg}` | Main book card, Book detail; clamped to 3 lines with an ellipsis |
| Book title, medium | `{typography.book-title-md}` | Spine popover, dialog headings that name a book |
| Book title, small | `{typography.book-title-sm}` | Up next, Waiting for you, On the side (clamped to 2 lines), List view, Card notes groups, a Card note box's label (2 lines) |
| Author | `{typography.author}` | Author line on the Main book card and Book detail, `ink-secondary` |
| Gauge figure | `{typography.gauge-figure}` | "64%" on the Main book card; the "%" at 20px in `ink-tertiary`; the two big Stats numbers |
| Page field | `{typography.page-field}` | The number in the page field; tabular figures (`font-variant-numeric: tabular-nums`) |
| Pile text | `{typography.pile-text}` | The single Card note shown in the pile |
| Body | `{typography.body}` | Default text, Card note text |
| Body small | `{typography.body-sm}` | Re-entry line, list rows, form labels, inline field messages |
| Meta | `{typography.meta}` | Page refs, hints, meter label, chips |
| Section label | `{typography.section-label}` | Set in uppercase: "MAIN BOOK", "UP NEXT", "WAITING FOR YOU (2)", "ON THE SIDE", "BOOKCASE" |
| Spine label | `{typography.spine-label}` | One-line title on a spine, set vertically (`writing-mode: vertical-rl; text-orientation: sideways`), at most 88px long (the strip cap less its end padding), ending in an ellipsis when cut; on read and Main-book spines it sits on the label strip. Never wraps. |

All UI text is English. Spine labels rotate every script the same way (`text-orientation: sideways`, so CJK runs sideways too). Right-to-left layout is out of scope.

## Layout & Spacing

Scale: 4 / 8 / 12 / 16 / 20 / 24 / 32 / 36 (`{spacing.1}`–`{spacing.8}`). Component sizes (card padding `28px 32px`, pane padding `20px 22px`, panel and popover widths, gauge radius, plank height, marker size) are fixed component dimensions, not spacing steps; they are listed as literal values in the component tokens on purpose.

- **Viewport.** Desktop Chrome only (AGENTS.md → Supported browser; Epic 7 retro item 59). Design target and minimum width `{spacing.min-viewport}` (1024px); below that the page scrolls horizontally. No phone layout (documented deviation: EXPERIENCE.md → Accessibility Floor → Reflow). The spine popover is capped at `calc(100vw - 32px)`.
- **Top nav.** Full-width bar, `{spacing.topbar-height}` tall: a "Skip to content" link (visible on focus only), wordmark (with the DEV pill on a dev server), nav items, theme toggle pushed right.
- **Update notice.** When shown, a full-width band directly under the top nav and above the page, pushing the page down. It never overlaps content.
- **Page.** `{spacing.page-x}` side padding, `{spacing.page-top}` top padding.
- **Home.** A header line (the date in `page-header`, for example, "Wednesday, 28 October"; no greeting) above a two-column grid: Main book card (fluid) beside a `{spacing.side-column}` (320px) column of section panes; gap `{spacing.6}`. Below the grid, full width, the bookcase slice (up to 3 shelf rows, the Main book's row first). Mock: [key-home](mockups/key-home.html).
- **Catalog.** Full width: `h1` "Catalog"; toolbar row 1 (Search titles with its visible label, Sort select with its direction toggle joined to it, view toggle, **New book** at the right); toolbar row 2 (filter chips, "Clear filters" link when any filter is on); the library meter; the collapsed pace calculator link; then the bookcase, the list or the tiles. Mocks: [key-catalog](mockups/key-catalog.html), [key-catalog-tiles](mockups/key-catalog-tiles.html). Both predate the Sort direction toggle, which only this document specifies (Components → Sort direction toggle).
- **Book detail.** One `surface` card, two columns (see Components → Book detail). Mock: [key-book-detail](mockups/key-book-detail.html).
- **Bookcase.** Shelf rows `{spacing.shelf-row-height}` tall, spines bottom-aligned on the plank, `{spacing.spine-gap}` between spines, 12px inner padding at row ends. About 35 spines fit one plank at 1280px; the row count follows the viewport width.
- **Spine sizing.** Width is always `{spacing.spine-width}` (28px). Height doesn't have to fit the title, but it still grows with it, so a shelf of mixed titles has mixed heights: **height = `{spacing.spine-height-min}` + `{components.spine.height-title-ratio}` × the title's rendered one-line length in `spine-label`**, rounded up to the next `{spacing.spine-height-step}` (8px) and capped at `{spacing.spine-height-max}` (120–200px). Examples: *Dune* (about 29px of text) → 136px; *Persuasion* (about 60px) → 144px; *The Left Hand of Darkness* (about 146px) → 168px; *The Visual Display of Quantitative Information* (about 250px) → 200px. Measure the rendered title, not a character count, so user text-spacing overrides grow the spine. The label itself is capped by the label strip (Components → Spine) and never wraps; the full title is always in the accessible name and the popover. Unread spines place their label at the same position and cap, without the strip.
- **Tiles.** A grid on the plain `page` background (no card, no planks): `repeat(auto-fill, minmax({components.catalog-tile.cover-min-width}, 1fr))`, `{components.catalog-tile.column-gap}` between columns and `{components.catalog-tile.row-gap}` between rows. That gives 5 columns at 1024px, 7 at 1280px and 8 at 1440px. Each tile's cover box is the column width at 2:3, so every box in the grid has the same size and the grid never moves while covers load. Covers sit at the bottom of the box, so a row of mixed shapes shares one bottom line. Reference: [catalog-tiles-reference](imports/catalog-tiles-reference.png).
- **Card notes.** `h1` "Card notes"; the "In *X*" chip under it (open box only); then the toolbar: Search card notes with its visible label, then, unscoped only, the Card notes view toggle and the Card notes count line, `{spacing.4}` apart. Then the boxes or the list. **Boxes:** a grid on the plain `page` background, `repeat(auto-fill, {components.card-note-box.width})`, left-aligned, `{components.card-note-box.column-gap}` between columns and `{components.card-note-box.row-gap}` between rows. That gives 4 columns at 1024px and 5 at 1280px and 1440px. Every box has the same size, so the grid never moves when a search changes. **The open box:** the open box strip runs the full width of the window directly under the app shell, above the page's top padding. Mocks: Components → Card note box.
- **Side panel.** Anchored to the right edge over the current page (Catalog for New book, Book detail for Edit book), full height below the top nav. The panel body sets `scroll-padding-bottom` to the sticky footer's height, so a focused field is never hidden behind the footer.

## Elevation & Depth

Flat. Hierarchy comes from tone (`page` → `surface`) and hairlines, not shadows. Shadows appear only where the object is physically "lifted". Shadows and the scrim are kept as literal values (the token format has no shadow type), with the scrim under `{components.scrim}`.

| Element | Light | Dark |
|---|---|---|
| Main book cover | `0 14px 30px rgba(60,80,100,.18)` | `0 14px 30px rgba(0,0,0,.45)` |
| Spine popover, dialogs, side panel | `0 18px 40px rgba(40,40,30,.18), 0 2px 6px rgba(40,40,30,.08)` | `0 18px 40px rgba(0,0,0,.5)` |
| Birch plank | `0 6px 10px rgba(120,100,60,.12)` | `0 6px 10px rgba(0,0,0,.35)` |
| Card note box front (a physical box; the lift adds no shadow) | `inset 0 -3px 0 rgba(0,0,0,.12), 0 1px 2px rgba(43,46,42,.12)` | `inset 0 -3px 0 rgba(0,0,0,.12), 0 1px 2px rgba(0,0,0,.35)` |
| Scrim under modal dialogs and the side panel | `ink` at 24% | `page-dark` at 60% |

## Shapes

Soft but not round: furniture, not toys. `{rounded.spine}` is a four-value radius by exception: rounded top, square base standing on the plank.

| Token | Value | Used on |
|---|---|---|
| `{rounded.plank}` | 2px | Birch plank |
| `{rounded.spine}` | 3px 3px 0 0 | Spines |
| `{rounded.cover}` | 4px | Cover images and the no-cover placeholder; a Card note box's label and cards |
| `{rounded.sm}` | 6px | Toggle options, small inputs |
| `{rounded.md}` | 9px | Buttons, page field, theme toggle, form fields |
| `{rounded.lg}` | 12px | Popover, dialogs, Card notes, page-field container |
| `{rounded.xl}` | 14px | Cards, section panes, bookcase |
| `{rounded.full}` | 9999px | Chips, color swatches, spine markers |

## Components

Visual specs. Behavior lives in EXPERIENCE.md → Component Patterns, under the same names. Longer specs follow the table as subsections.

| Component | Visual spec |
|---|---|
| **Top nav** | `{components.top-nav}`. "Skip to content" link first (visible only on focus, `surface` chip with `focus-ring`). Items: Home · Catalog · Stats · Card notes · Backup. Active item: `ink`, weight 600, 2px `accent` underline flush with the bar's bottom hairline. Inactive: `ink-secondary`. |
| **Favicon** | See [Favicon](#favicon) below. |
| **DEV pill** | `{components.dev-pill}`. Only on a dev server. The text "DEV" in `section-label` (uppercase, 12px, weight 600, 0.08em tracking) in `{components.dev-pill.foreground}`, on a `{components.dev-pill.background}` fill with `rounded.sm` corners and `4px 7px` padding. It sits `{spacing.2}` after the word "bookvie", centered on the wordmark's line. Its height follows the text (line-height 1 plus the padding, about 20px). Text, not color alone, says what it is. The same on every page; no hover, not interactive. Mock: [epic11-options](mockups/epic11-options.html) P1; the mock's 11px/700 text is superseded by `section-label`. |
| **Update notice** | `{components.update-notice}`. A full-width `surface` band under the top nav with a `line` hairline at the bottom, its text aligned with the page's `{spacing.page-x}` padding. One sentence in `body-sm`/`ink` ("bookvie was updated to 1.2.0. Reload to use it."), then, `{spacing.4}` after it, **Reload** as the compact `button-secondary` of the Section pane rows (30px tall, `body-sm`, `0 {spacing.3}` padding). No icon, no close button, no amber, no accent fill: it's news, not a warning. Mock: [epic11-options](mockups/epic11-options.html) N1. |
| **Theme toggle** | Three-option segmented control (Light · Dark · System), each with a small glyph (sun, moon, half-filled circle) and its text. `input-border` around the group. Selected option: `accent-soft` fill, `ink` text, weight 600, and a 2px `accent` bar along its bottom edge (the non-color indicator). All segmented controls (Catalog view, Stats presets, Pile order, Purpose fulfilled) use this same selected treatment. |
| **Text field** | `{components.text-field}`. Visible label above in `body-sm`/`ink-secondary`; "(required)" sits after the label element in `meta`/`ink-tertiary` and is not part of the label. Focus: `accent` border plus `focus-halo`. Invalid: 2px `ink` border and a one-line message below in `body-sm`/`ink`. Never red. Applies to every field, select, date field and the page field. |
| **Checkbox** | `{components.checkbox}`. The browser's native checkbox, 16px, tinted with `accent` through CSS `accent-color` (the theme's token swap gives the `accent` dark twin; `color-scheme: dark` gives the dark unchecked box). Label to its right in `body-sm`/`ink`, the whole label clickable. Focus: `{components.focus-ring}` on the box. No custom drawing. Used by the Card note panel's **Add another**. |
| **Main book card** | See [Main book card](#main-book-card) below. |
| **Main book card — empty** | Same card frame and size. "No Main book." in `panel-heading`/`ink`. Up next suggestion below it: a 44×64 cover thumbnail (or placeholder), serif title in `book-title-md`, author, and **Start reading** (or **Resume**) as `button-primary`. Catalog suggestion: a `link` "Choose a book in the Catalog". Which one shows: EXPERIENCE.md → State Patterns. No illustration. |
| **No-cover placeholder** | `surface-inset` fill, 1.5px dashed `spine-unread-outline` border, two short horizontal bars in `spine-unread-outline` suggesting a title. Same size as the cover it stands in for. Catalog tiles use the Typeset cover instead (Components → Catalog tile). |
| **Gauge** | `{components.gauge}`. Above the track: percentage in `gauge-figure` left, "p.N of M" in `ink-secondary` right. Below: tick labels 0 · half · total in `meta`/`ink-tertiary`; the half tick is rounded to a whole page and dropped when the Book has fewer than 4 pages. |
| **Page field** | `{components.page-field}` inside a `surface-inset` container: label "Page", the field, "of M" in `ink-tertiary`, and the **Update** `button-primary` pushed right. Focus and invalid as Text field. |
| **Re-entry line** | `{components.re-entry-line}`. Short facts separated by 6px `ink-tertiary` dots: "Last updated N days ago", "~N days left", "Last export: N days ago". Muted, never colored. |
| **Section pane** | `{components.section-pane}`. Used for Up next, Waiting for you (N), On the side. Each row: line 1, the serif title as a `link` in `ink` (2-line clamp); line 2, the content for that pane and one compact `button-secondary` (30px) right-aligned. Up next row: 44×64 cover thumbnail (or placeholder) at left, author, button **Start reading** or **Resume**. Waiting-for-you row: 60×5 mini bar (`accent-soft` track, `accent` fill), "p.N of M" in tabular figures, button **Resume**. On-the-side row: author, button **Start reading**. |
| **Library meter** | `{components.library-meter}`: thin continuous bar plus "X of Y finished" in `meta`/`ink-secondary`. One bar at any library size, never one dot per book. |
| **Bookcase** | `{components.bookcase}`. `shelf-wall` card; each row is spines standing on a birch plank (face, 4px front edge, and plank shadow). Header: "BOOKCASE" heading; on Home also the library meter right and a "See all in Catalog" `link`. On Catalog the library meter sits in its own row above the bookcase or list (see Catalog). Header line "Finished *X*." in `body-sm`/`ink-secondary` after a finish. Footer legend: finished · not read yet · Main book, filled to its % · up next · waiting for you, each with a mini swatch. Visual reference: [key-home](mockups/key-home.html) (slice), [key-catalog](mockups/key-catalog.html) (full). |
| **Sort select** | Native `select` styled as Text field, label "Sort" to its left in `body-sm`/`ink-secondary`. Options: Author · Title · Date added · Pages. The Sort direction toggle is joined to its right edge, so the select's right corners are square. |
| **Sort direction toggle** | `{components.sort-direction-toggle}`. Joined to the Sort select as one compound field: the same height and border, the shared edge drawn once (the toggle has no left border of its own), the outer right corners `rounded.md`. `surface-inset` fill, so the toggle reads as a button and the select as a field. Content: an arrow glyph in `ink-secondary` (↑ natural, ↓ reversed), then the order's text in `body-sm`/`ink` ("A–Z", "Newest first"). Its minimum width fits the wider of the current key's two labels, so pressing it never moves the controls to its right; only a key change may change its width. No hover change, like `button-secondary`. Focus: the shared edge is the select's right border and turns `accent` when the select has focus; the toggle gets `{components.focus-ring}`. Whichever half has focus is raised above the other (`position: relative; z-index: 1`), so its ring or halo paints over the neighbor. Light and dark come from the tokens; no extra state colors. |
| **Filter chips** | See [Filter chips](#filter-chips) below. |
| **Spine** | See [Spine](#spine) below. |
| **Spine popover** | See [Spine popover](#spine-popover) below. |
| **Catalog view toggle** | Three-option segmented control (Bookcase · List · Tiles), same visual as the theme toggle. |
| **Card notes view toggle** | `{components.card-notes-view-toggle}`. Two-option segmented control (Boxes · List), the Catalog view toggle's visual, text only with no glyphs. |
| **Card notes count line** | `{components.card-notes-count-line}`. One line at the end of the toolbar, Boxes view only. Its text swaps in place, so nothing below it moves. Wording: EXPERIENCE.md → Card notes shelf. |
| **Card note box** | See [Card note box](#card-note-box) below. |
| **Open box strip** | `{components.open-box-strip}`. An 8px band, full width, in the Book's exact spine color, under the app shell, on the open box only (Layout & Spacing → Card notes). No edge, no label, no shadow. Same in both themes. A spine close to the page color (near-white on the light page, near-black on the dark one) makes the strip faint; that is accepted, since the strip is decoration (`aria-hidden`) and the "In *X*" chip names the box (Epic 14 retro, 2026-11-24). |
| **List view** | Compact table: Title (`book-title-sm`), Author, Pages, Status, Date added. `{components.list-view-row}`; header in `section-label`. Status shown as text plus a mini spine glyph (colored or outlined). |
| **Catalog tile** | See [Catalog tile](#catalog-tile) below. |
| **Search field** | Text field with a leading magnifier glyph and a visible label in `body-sm`/`ink-secondary` to its left: "Search titles" (Catalog) or "Search card notes" (Card notes). No placeholder text. |
| **Back to top button** | `{components.back-to-top}`. A `button-secondary` (42px tall, `body-sm`, `0 {spacing.4}` padding): an up arrow "↑" (`aria-hidden`), then `{spacing.2}`, then the visible text "Back to top". Not an icon-only circle. On Catalog and Card notes only, fixed in the viewport's bottom-right corner, `{spacing.6}` above its bottom edge and `{spacing.page-x}` from its right edge, above the page's content (`z-index: 10`); the spine popover and the More actions menu (`z-index: 20`) open above it, and so do modal panels and dialogs. Shown only once the page is scrolled more than one window height (EXPERIENCE.md → Back to top). Flat: no shadow; its `input-border` border separates it from the content scrolling under it. The page ends with an empty block of the button's height, so at the very bottom it covers no Book, row, tile, card note or control. Focus: `{components.focus-ring}`. Light and dark come from the tokens. |
| **Book detail** | See [Book detail](#book-detail) below. |
| **New book panel** | `{components.side-panel}` with `side-panel` shadow. Header: "New book" (or "Edit book") in `panel-heading`, close "×" icon button. Body: one column of Text fields in Agent Label Contract order; Finished on is a date field; Tags is a text field with a suggestion list (`surface`, `rounded.lg`, `body-sm`). Spine color row: hex field plus the "From cover" chip and the eight swatches. Sticky footer: **Add book** (or **Save changes**) `button-primary`, **Cancel** `button-secondary`. |
| **Duplicate dialog** | `{components.dialog}`, centered, 440px. Heading "Possible duplicate", one sentence naming the matching Books (serif title, author, ISBN if present). Buttons right-aligned: **Don't add** (`button-secondary`), **Add anyway** (`button-primary`). No icon, no warning color. |
| **Start dialog** | `{components.dialog}`, 480px. Heading "Start *X*?" or "Resume *X*?" with *X* in serif. Up to two trade-off lines in `body`: "This pauses *Y* at p.120 (64%)." and "*Z* moves to Waiting for you.", "*Z* stays on the side." or "*Z* returns to the catalog." The "Which page?" number field (Text field, 110px). Optional Purpose field (one line, label "Purpose (optional)", hint in `ink-tertiary`). Buttons: **Start reading** or **Resume** (`button-primary`), **Cancel**. |
| **Finish dialog** | `{components.dialog}`, 440px. Heading "Finished *X*" in serif. **Finished on** date field (Text field). "Purpose fulfilled?" as a three-option radio group styled as a segmented control (yes · partly · not yet), with the Purpose sentence quoted above it in `ink-secondary`. "Rating" as five star radios: outline stars in `input-border`; selected and lower stars are filled `accent` (shape change, not only color); the "No rating" text option comes first. Buttons: **Done** (`button-primary`), **Cancel**. |
| **Card note panel** | `{components.card-note}` styled as an index card: `surface`, `rounded.lg`, 360px wide, small dialog. Heading "Card note" or "Edit card note" in `panel-heading`. Fields: Note (multi-line, `body`), Page. Under Page, add mode only: the **Add another** Checkbox, with the running count ("2 notes saved", `meta`/`ink-tertiary`, `{components.card-note.saved-count}`) right-aligned on the same line, shown after the first save in an opening. Buttons: **Save note**, **Cancel**; edit mode adds a **Delete** `button-secondary` at the left and has no checkbox or count. |
| **Card notes list** | Notes grouped under serif book titles (on Book detail, the Card notes block uses the same notes, ungrouped). Each note is a `card-note`: text in `body`, page ref ("p.42" or "pp.42–45") below as a compact `{components.chip}` button in `meta` (accessible name "Open p.42 in the pile"; opens the pile at that note, EXPERIENCE.md → Card notes list). Search matches are `<mark>`: `accent-soft` background plus weight 600 and a 1px `accent` underline. Scope chip ("In *X*", removable) when scoped to one Book. |
| **Pile** | Modal on `page` with `dialog` radius and shadow, over the scrim. A **Close** `button-secondary` (text label, not only a glyph) at the top right. One `card-note` at a time, centered, larger (`pile-text`), its page ref ("p.42" or "pp.42–45") below the text in `meta`, `ink-tertiary` (plain text, not the list's chip button), a faint stacked-card edge behind it (two 1px `line` offsets). Controls below: Previous · "N of M" · Next, and an order control (Page order · Shuffled) styled as a segmented control. At either end the inactive button keeps its shape with `ink-tertiary` text. Mock: [key-book-detail](mockups/key-book-detail.html) (Alternate); it predates Story 5.4, which drops its live region on the card (EXPERIENCE.md → Pile) and the Book title inside the card (the title is in the heading). |
| **Pace calculator** | Collapsed: `link` "How long until…?". Expanded: inline row on `surface-inset` — "pages/day" field (Text field, 80px; `type="text"` with `inputmode="decimal"`, so any text can be typed), result in `body` ("About 9 months · July 2027"). No error styling. With nothing left to read, "Nothing left to read." in `body-sm` / `ink-secondary` replaces the row. |
| **Stats range picker** | Segmented presets (This month · This year · Last year · All time · Custom); Custom reveals two date fields ("From", "To"). |
| **Monthly bars** | `{components.monthly-bar}`. One vertical bar per month (one per year for ranges over 24 months), height proportional to pages finished; value label above the bar in `meta`; period label below. Two big numbers above the chart: books finished, pages finished, in `gauge-figure` with `meta` captions. |
| **Backup page** | Three blocks on `surface` cards, stacked: Export (one `button-primary` "Export all data", "Last export: N days ago" below in `meta`/`ink-tertiary`, and the Dropbox backup line under it), Restore (`button-secondary` "Restore from file…", one-line explanation), and About this copy. |
| **About this copy** | `{components.about-card}`. The third Backup card, same frame as the other two. Heading "ABOUT THIS COPY" in `section-label`/`ink-tertiary`. Line 1 in `body-sm`/`ink-secondary`: "bookvie 1.1.0"; on a dev server "bookvie 1.1.0 (a1b2c3d) · Development server", the parts joined by " · " (space, middle dot, space, as in the tab title), not a drawn dot. Line 2, same style: "Data folder: ~/bookvie-data"; a long path wraps at any character (`overflow-wrap: anywhere`) inside the card. All sans, no monospace. This third card supersedes plan D9's "under Last export" placement (Oleg's pick B1). Mock: [epic11-options](mockups/epic11-options.html) B1, which shows the dev text on two lines and predates the " · " rule. |
| **Dropbox backup line** | `{components.dropbox-backup-line}`. A second `meta` line in the Export card, directly under "Last export", in the same left alignment; it wraps inside the card (a Failed reason can take two lines). Failed in `ink` (`text-color-strong`), like "Couldn't save"; every other state in `ink-tertiary`, like "Last export". Text only: no dot, glyph, icon, badge shape, tint or color, so it needs no forced-colors rule. The pattern "Dropbox backup: *detail*" carries it. Commands in a Failed reason stay in the body font, not monospace. Supersedes the colored dots in plan D11 (Oleg) and, since 2026-11-23, the five-state auto-backup line. |
| **Busy button** | Busy state of Export and Restore: the label reads "Exporting…" or "Restoring…", the button stays `accent` at 60% opacity, and there is no spinner animation. |
| **Failure message** | One line in `body-sm`/`ink` below the action that failed, for example, "Couldn't save. Your data wasn't changed." No icon, no red, no colored box. |
| **Confirm dialog** | `{components.dialog}` for Restore, Delete book, Delete card note, and Pause (when Pause displaces an Up next). Heading states the consequence; confirm button labelled with the action ("Replace all data", "Delete book", "Delete card note", "Pause") in `button-primary`; **Cancel** beside it. No red. |
| **Empty state** | Bare bookcase: two or three empty birch planks on `shelf-wall`, the sentence "Your shelf is empty. Add your first book." in `body`/`ink-secondary`, and a **New book** `button-primary`. |
| **Focus ring** | `{components.focus-ring}` on every focusable element; spines use the two-tone `{components.spine.focus-ring}`. Never removed. |
| **Highlight ring** | `{components.highlight-ring}`: 2px `page` gap then 2px `accent` ring. Used on a newly added spine or row and on the spine during the finish moment. |
| **Finish fill** | The finished spine fills with its color bottom to top, about 600 ms ease-out, with the highlight ring, then stays solid. Visual reference: the dark panel of [birch-v2-light-dark](mockups/birch-v2-light-dark.html) and the end state in [key-home](mockups/key-home.html) (Alternate 1). |

### Favicon

`{components.favicon}`. Our own drawing (MIT, like the repo; noted in a comment in the file). SVG only. Mock: [epic11-options](mockups/epic11-options.html), option F3.

- **Drawing:** a small shelf, three spines of different heights standing on one plank, on a 32-unit grid. Left spine 8 wide, 16 tall; middle 8 wide, 22 tall; right 7 wide, 14 tall; 1.5 units between spines; each spine has 2-unit rounded top corners (the spine's rounded top, scaled) and a square base. The plank runs nearly the full width (30 units), 4 units tall, 1 unit below the spines' bases. One flat fill, no outline, no label strips: at 16px they'd blur. The rest is transparent, so the tab strip shows around it. Path (fill `currentColor` in the mock): `M3 11a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v14H3z M12.5 5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v20h-8z M22 13a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v12h-7z M1 26h30v4H1z`.
- **Production:** `{components.favicon.fill}`; under `@media (prefers-color-scheme: dark)` inside the SVG, `{components.favicon.fill-dark}`.
- **Dev:** the same drawing with `{components.favicon.dev-fill}`, and `{components.favicon.dev-fill-dark}` under the dark scheme.
- The SVG's `prefers-color-scheme` is Chrome's own color scheme (its Mode setting, which follows the OS by default), not bookvie's Theme toggle. The tab strip is drawn in that same scheme, so the fill always matches the strip it sits on. Check once by hand with Chrome's Mode set opposite to the OS.
- **Caching:** production and dev serve different files at the same `/favicon.svg`, and a dev server started with an explicit `--port 8765` would share the origin. The response should carry `Cache-Control: no-cache` (a note for the architecture step), so a tab never keeps the other mode's icon.

### Main book card

`{components.main-book-card}`.

- **Left column:** cover 200×300 with the cover shadow; under it a stack of `button-secondary` actions (Add card note; See card notes · N).
- **Right column:** "MAIN BOOK" eyebrow in `accent` with a "⋯" icon button (`button-secondary`, 32×32, `ink-secondary` glyph) at the eyebrow's right end; title in `book-title-lg` as a `link` in `ink` (underline on hover and focus only); author in `author`; gauge; page field; re-entry line.
- **"⋯" menu:** a small `surface` list (`rounded.lg`, popover shadow) with the items "Pause" and "Open book" in `body`.

### Filter chips

`{components.chip}` toggle chips in labelled groups.

- **Groups:** names in `meta`/`ink-tertiary`: Status (Read · Unread), Type (Paperback · Hardcover · Ebook), Language ▾, Tag ▾, Publisher ▾.
- **Selected chip:** `accent-soft` fill, 2px `accent` border, and a leading check glyph.
- **Language ▾, Tag ▾ and Publisher ▾:** open a small `surface` list of checkboxes, each row in `body-sm`/`ink`, at most 320px tall and scrolling beyond that. When values are selected, the chip reads "Language: 2".
- **Publisher count:** after the name, one space apart, in `body-sm`/`ink-tertiary` ("Manning 49"). Not a right-aligned column. Language and Tag rows have no count.
- **Clear filters:** a `link` at the row end when any filter is on.

### Spine

`{components.spine}`. Visual reference: [key-home](mockups/key-home.html), [key-catalog](mockups/key-catalog.html).

- **Read:** solid fill in the book's exact color (see Colors → Spine colors), `{components.spine.read-edge}` on the top and both sides (no bottom line; the spine stands on the plank), and the label in `spine-label` on the `spine-label-strip` plate.
- **Label strip:** Like a real spine label, it covers only the top of the spine. It is `{components.spine.label-strip-width}` wide with `{components.spine.label-strip-radius}` corners, centered on the spine, and starts `{components.spine.label-strip-top}` below the spine's top (`{components.spine.label-strip-top-marked}` on a spine with a marker, so the dot sits above it). Its length is the label's rendered length plus `{components.spine.label-strip-end-padding}` at each end, capped at `{components.spine.label-strip-max-length}` (96px), so the label is at most 88px long. Unread spines have no strip, so the strip also separates read from unread by shape, not only by color.
- **Label:** at the top, one line. A label that would make the strip longer than the cap is cut to one line ending in an ellipsis; the full title stays in the spine's accessible name and the popover.
- **Unread:** `spine-unread-fill` body, 1.5px `spine-unread-outline` on the top and sides (no bottom border), `spine-unread-text` label, no strip.
- **Main book, never finished:** unread body and outline. Its exact color fills the open part of the spine below the label strip, from the plank up to its reading percentage (0% at the plank, 100% at the strip's lower end), topped by `{components.spine.main-fill-line}` (2px `spine-edge`, full width) at the fill level. The fill line therefore never hides behind the strip and is always visible. On finish, the fill completes to the whole spine (Finish fill).
- **Main book, re-read:** like any read spine, plus the Main-book marker.
- **Markers:** one 7px dot centered near the top with a 1.5px `marker-ring`: `spine-unread-text` (Main book), `marker-up-next` (Up next), `marker-waiting` (Waiting for you). Never two dots.
- **Focused or open:** `{components.spine.focus-ring}` — a two-tone ring (2px `page` band, then 2px `accent`), so it shows against neighboring spines, the shelf wall, and the walnut plank.

### Spine popover

`{components.spine-popover}`. Visual reference: [key-home](mockups/key-home.html) (Alternate 2).

- **Position:** anchored above the spine with a 14px rotated-square pointer; flips below the spine when there is no room above (top shelf row) and shifts inward at the viewport edges.
- **Left column:** title (`book-title-md`), subtitle (`meta`, `ink-secondary`), authors, "N pages · year", status line with a mini spine glyph, color line ("Color: Teal, from cover" in `meta`/`ink-secondary`).
- **Right column**, separated by a hairline: at most one `button-primary` (compact, 34px) with an optional hint line in `meta`/`ink-tertiary`; then `link`s ("Start reading" where applicable, "Open book →"); then the "Change color" block.
- **Change color block:** a "From cover" chip with the derived color dot, and the eight curated swatches (16px circles, each with its name as accessible name). Selected swatch or chip: 2px `accent` border plus `focus-halo` and a check glyph. On an unread book the block heading adds "· shown once read" in `ink-tertiary`.
- **Close:** "×" at the top right in `ink-tertiary`.

### Catalog tile

`{components.catalog-tile}`. Grid layout: Layout & Spacing → Tiles. Mock: [key-catalog-tiles](mockups/key-catalog-tiles.html). Reference: [catalog-tiles-reference](imports/catalog-tiles-reference.png); spines win over the reference where they differ (serif titles, no shadows).

- **Cover box:** 2:3, the column's width. The cover keeps its own shape inside it (`object-fit: contain`), at the bottom (`object-position: bottom`), with `{components.catalog-tile.cover-radius}` corners and a `{components.catalog-tile.cover-edge}` hairline so a white cover still has an edge on the page. Until the image arrives the box shows a flat `{components.catalog-tile.cover-loading}` fill with the same hairline, so the empty box still reads as a cover's place. No shadow, no crop, no dimming: a cover is shown as is.
- **Caption:** `{components.catalog-tile.caption-gap}` below the reading-bar slot. Every tile reserves the `{components.catalog-tile.reading-bar-slot}` slot under its box (the bar's gap plus its height), empty when there is no bar, so captions line up across a row. Line 1: the title in `book-title-sm` at weight 600, `ink`. Line 2: the first author in `body-sm`, `ink-secondary`, with "and N others" dropped (the accessible name carries it). Each is one line, cut with an ellipsis.
- **Finished ribbon:** on a Book with a finished Reading. A bookmark shape `{components.catalog-tile.ribbon-width}` × `{components.catalog-tile.ribbon-height}` with a `{components.catalog-tile.ribbon-notch}` V-notch at its lower end, hanging from the cover's top edge `{components.catalog-tile.ribbon-inset}` in from its right edge. It is filled with the Book's exact spine color, has the `{components.catalog-tile.ribbon-edge}` line on its sides and notch, and a `{components.catalog-tile.ribbon-halo}` outside that line, light in both themes like a spine's label strip. The spine color often matches the cover's own color (From cover), so the edge and the light halo, not the fill, keep the shape visible on any cover, dark or light. No glyph or text on it (text never sits straight on a book's color); its shape is the indicator. It sits on the visible cover, not on the empty part of the box.
- **Reading bar:** on a Book with an unfinished Reading (Main or paused). A bar the cover box's width, `{components.catalog-tile.reading-bar-height}` tall, inside the reading-bar slot, `{components.catalog-tile.reading-bar-gap}` below the box, `{components.catalog-tile.reading-bar-track}` track with `{components.catalog-tile.reading-bar-fill}` fill to the Book's reading percentage (the catalog view's `percent`, ARCHITECTURE-SPINE AD-6), square ends. A re-read shows the ribbon and the bar.
- **Unread:** no mark.
- **Typeset cover, read:** fills the whole box. The Book's exact spine color, `{components.catalog-tile.typeset-edge}` all round, `{components.catalog-tile.cover-radius}` corners. A `{components.catalog-tile.typeset-plate}` plate inset `{components.catalog-tile.typeset-plate-inset}` from the sides, starting `{components.catalog-tile.typeset-plate-top}` from the top so it clears the ribbon, with `{components.catalog-tile.typeset-plate-radius}` corners, holds the title (`book-title-sm` at its own weight 400, up to 4 lines, `{components.catalog-tile.typeset-text}`) and the first author (`meta`, 1 line). Like a spine's label strip, the plate keeps the text legible on any color.
- **Typeset cover, unread:** `{components.catalog-tile.typeset-unread-fill}` with `{components.catalog-tile.typeset-unread-outline}`, the title and author in `{components.catalog-tile.typeset-unread-text}`, no plate. It reads as an unread spine seen from the front.
- **Focus and highlight:** the whole tile is one link; the `{components.focus-ring}` (and the `{components.highlight-ring}` after an add) goes around the cover box, not the visible cover, so every ring in the grid has the same size.
- **Dark theme:** same layout. Ribbon fills, the ribbon halo, read typeset fills and the plate are the same in both themes; `spine-edge`, the chrome colors and the unread typeset cover's `spine-unread-*` colors take their dark twins, as on unread spines.

### Card note box

`{components.card-note-box}`. One Book's card notes drawn as an open box with cards in it. Grid layout: Layout & Spacing → Card notes. Mocks: [epic14-options](mockups/epic14-options.html) and the claude.ai canvas "Card notes boxes — mockups" (private; boards 1, 2 and 5; not needed to build: this spine and epic14-options are enough). Oleg picked fade A, paper cards in both themes, and no edge line on the front. Where a mock and the spines differ, the spines win. The canvas uses a 32px column gap (it fits only 3 columns at 1024px), shows a placeholder in the search field, puts the search sentence on its own line, and puts the chip beside the `h1`.

- **Frame:** `{components.card-note-box.width}` × `{components.card-note-box.height}`. The whole box is one link, with `{components.card-note-box.radius}` corners for its focus ring. The cards and the front sit inside it, positioned absolutely.
- **Front:** the lower `{components.card-note-box.front-height}`, full width, `{components.card-note-box.front-radius}` corners, filled with the Book's exact spine color (Colors → Spine colors) whether the Book is read or unread. It has the box-front shadow (Elevation & Depth) and no edge line, so a near-white front is outlined only by its shadow. The label carries the text, so the fill never has to.
- **Label:** a `{components.card-note-box.label-background}` plate (the spine label strip's paper), centered in the front with `{components.card-note-box.front-padding}` around it, `{components.card-note-box.label-radius}` corners, `{components.card-note-box.label-padding}` padding, `{components.card-note-box.label-gap}` between its lines. First comes the title in `book-title-sm`, `spine-label`, up to `{components.card-note-box.max-title-lines}` lines, then an ellipsis. Under it is the count ("12 card notes") in `meta`, `{components.card-note-box.count-color}`. Text never sits straight on the Book's color.
- **Cards:** `{components.card-note-box.card-width}` × `{components.card-note-box.card-height}` paper cards, `{components.card-note-box.card-background}` with `{components.card-note-box.card-border}`, `{components.card-note-box.card-radius}` corners, `{components.card-note-box.card-inset}` from the box's left edge. They stand behind the front, which hides their lower part. How many show depends on the note count (`{components.card-note-box.pile-steps}`; EXPERIENCE.md → Card notes shelf → A box). Card *i* of *k* (0 at the back) has its top at `{components.card-note-box.card-top}` − (*k* − 1 − *i*) × `{components.card-note-box.card-step}`, so a single card shows 10px above the front, and the back card of 7 shows 58px. Each card is turned slightly, by −1.6°, 1.2°, −0.6°, 1.8°, −1.2°, 0.8° and −1.8° in that order from the back; a smaller pile uses the first *k* angles. The pile looks handled, not stacked by a machine.
- **Match pill:** during a search it replaces the count on a box with matches: "3 of 12" in `meta` at weight 600, `{components.card-note-box.pill-foreground}`, on a `{components.card-note-box.pill-background}` pill, `{components.card-note-box.pill-height}` tall, `{components.card-note-box.pill-padding}` padding, `{components.card-note-box.pill-radius}` corners. A leading `{components.card-note-box.pill-dot-size}` dot in `{components.card-note-box.pill-dot}` comes `{spacing.2}` before the text. The pill is left-aligned in the label, where the count was.
- **Lift:** a box with matches moves up by 6px (`translateY({components.card-note-box.lift})`). No extra shadow, no scale.
- **Fade:** a box without a match shows its cards and front, label included, at `{components.card-note-box.fade}` opacity. One inner wrapper holds the cards and the front and takes the opacity, so they fade as one picture over `page` (the cards don't show through the front, nor the color through the label). The link around the wrapper is never faded, so the focus ring stays full strength. The faded contrast is a documented deviation (Colors → Contrast; EXPERIENCE.md → Accessibility Floor).
- **Motion:** the lift and the fade change over `{components.card-note-box.transition}`. Under `prefers-reduced-motion: reduce` they change at once.
- **Focus:** `{components.card-note-box.focus-ring}` at `{components.card-note-box.focus-offset}` offset around the whole box, faded or not. No hover change apart from the pointer cursor.
- **Dark theme:** the same box. The front keeps the Book's color, and the label, cards, count and pill keep the values above, like a spine's label strip. Only the page around the box and the shadow's strength change.

### Book detail

Accepted layout; mock [key-book-detail](mockups/key-book-detail.html). Mirrors the Main book card.

- **Left column (200px):** cover or no-cover placeholder; under it the action stack: one state-aware `button-primary`, then `button-secondary` actions in this order: Set as Up next, Pause, Mark finished, Mark as Side read or Remove from side, Add card note, Edit, Delete. Edit Purpose is not in the stack; it is the `link` in the Current reading block.
- **Right column, top:** title in `book-title-lg` (the page `h1`), subtitle, author in `author`, metadata grid in `body-sm`/`ink-secondary` (Pages, Edition when it isn't 1, Language, Publisher, Type, ISBN, Year), Tags as plain `chip`s.
- **Right column, blocks:** separated by hairlines, each under a `section-label` heading:
  - **Current reading:** status, gauge when active or paused, Purpose with an "Edit Purpose" `link`.
  - **Card notes (N):** Search card notes field, then up to the first three notes as `card-note`s in a three-column grid, each with an Edit `button-secondary`; below them the `link`s "Go through as a pile" and "See all card notes".
  - **Readings:** hairline-divided rows: started, finished, stars, Purpose fulfilled.
  - **How long until…?:** Pace calculator inline.
  - **Change color:** color line ("Color: Teal, from cover", "Color: Sage" or "Color: set by you") in `meta`/`ink-secondary` with a 16px swatch of the current color, then the "From cover" chip and the eight curated swatches, styled exactly as in the Spine popover; "· shown once read" on an unread Book.

## Do's and Don'ts

| Do | Don't |
|---|---|
| Keep color for the books; chrome stays neutral | Color chrome, headings, or status badges (except the DEV pill: Colors → Dev amber); the Dropbox backup line is words only |
| Use sage only for actions, progress, focus, selection and search matches | Use sage decoratively or as a warning |
| Serif for book titles only | Serif for UI text or numbers |
| Same 28px width for every spine; height in 8px steps within 120–200px | Variable widths, page-count-based widths, heights outside the range |
| Show every read spine in its exact color — user-set, from cover, or curated — with the `spine-edge` line and the label strip | Lighten, darken or clamp a book's color for contrast, or put the title straight on the fill |
| Keep `spine-edge` fixed per theme so it is at least 3:1 against the wall for any fill | Derive the edge from the fill (fails for fills near the wall color) |
| Keep unread outlines and field borders at least 3:1 | Return to the pale decorative outline or `line`-colored field borders |
| Pair every marker with a legend, a ring, and an accessible name | Let a colored dot carry meaning alone |
| Show selection with a border or bar as well as a fill | Show selection with a tint alone |
| Flat surfaces, hairlines, tone | Shadows for hierarchy |
| Muted text for status facts and failures ("Couldn't save. Your data wasn't changed.") | Red, orange, warning icons, or alarm styling anywhere (dev amber is not a warning: Colors → Dev amber) |
| Use dev amber only for the dev favicon and the DEV pill | Amber in production, or amber on the update notice or any message |
| One quiet fill on finish | Confetti, sound, bouncing, replays |
| Show a tile's cover as is, with status by ribbon and bar | Dim, desaturate, crop or tint covers to show status |
| When a Card note box fades, keep its "M of N" pill or count, its accessible name and a full-strength focus ring | Let the fade alone say "no match", or fade the focus ring with the box |
| Same layout in light and dark; read spine fills and label strips identical in both (only `spine-edge` has a dark twin) | Theme-specific layouts or recolored read spines |

## Direction history

[Birch Morning v2](mockups/birch-v2-light-dark.html) predates later decisions. Superseded there: its nav items, Home side panes, Main book buttons, header line, pale unread outline, ochre and sage spine values, spine labels set straight on the fill (no label strip, no edge line), two-line spine labels, and the bookcase scrolling inside Home. The three direction renders in `.working/` (lamplight-study, birch-morning, reading-room-ledger) are non-normative exploration.
