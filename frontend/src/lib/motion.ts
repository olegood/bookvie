// The user's motion preference, read when it is needed (it can change while
// the app is open). Smooth scrolls and animations become instant under
// `prefers-reduced-motion: reduce`.

/** Whether the user asked for reduced motion. */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
