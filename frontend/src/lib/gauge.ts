// The gauge's copy (EXPERIENCE.md → Gauge). The server supplies the percentage
// (AD-6); these only format it and place the ticks, and never divide pages.

/** The progressbar's `aria-valuetext`: "64%, page 212 of 330". */
export function gaugeValueText(percent: number, page: number, pages: number): string {
  return `${percent}%, page ${page} of ${pages}`
}

/** The visible page line: "p.212 of 330". */
export function gaugePageLine(page: number, pages: number): string {
  return `p.${page} of ${pages}`
}

/**
 * A Waiting for you row's mini bar `aria-valuetext`: "page 120 of 330, 36%",
 * page first as EXPERIENCE.md writes it (the row's visible line is
 * {@link gaugePageLine}).
 */
export function miniBarValueText(page: number, pages: number, percent: number): string {
  return `page ${page} of ${pages}, ${percent}%`
}

/** The ticks under the track: 0 · half · total, the half rounded and dropped under 4 pages. */
export function gaugeTicks(pages: number): number[] {
  return pages < 4 ? [0, pages] : [0, Math.round(pages / 2), pages]
}
