/**
 * Touch screens get the on-screen buttons and the touch instructions: the `touch-ui` class on
 * <html>, which the CSS uses. The `(hover: none) and (pointer: coarse)` media query alone isn't
 * enough: some Android browsers (Samsung Internet, for one) say they can hover, so they got the
 * keyboard hints over the player and no buttons. So a phone-sized touch screen starts in touch
 * mode, and from then on the last pointer used decides (a finger turns it on, a mouse off).
 */
export function watchTouchUi() {
  const root = document.documentElement
  const set = (on: boolean) => root.classList.toggle('touch-ui', on)
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false
  const phoneSized = navigator.maxTouchPoints > 0 && Math.min(screen.width, screen.height) <= 820
  set(coarse || phoneSized)
  window.addEventListener(
    'pointerdown',
    (event) => {
      if (event.pointerType === 'touch') set(true)
      else if (event.pointerType === 'mouse') set(false)
    },
    { capture: true, passive: true }
  )
}
