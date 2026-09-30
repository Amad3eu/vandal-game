import type { Page } from '@playwright/test'

export const SERVER = 'http://leaderboard.test'

/** No leaderboard server: the game plays offline right away. */
export async function offline(page: Page) {
  await page.route(`${SERVER}/**`, (route) => route.abort())
}

/** Opens the title screen with a clean device (no saved runs, music off). */
export async function openTitle(page: Page) {
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.clear()
    localStorage.setItem('dinoGameMusic', 'none')
  })
  await page.reload()
  await page.locator('.title-menu').waitFor()
}

export const playButton = (page: Page) => page.locator('.title-menu button').filter({ hasText: /jogar/i }).first()

/** Layout facts checked on every screen size. */
export function layout(page: Page) {
  return page.evaluate(() => {
    const visible = (el: Element | null) => !!el && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden' && el.getBoundingClientRect().width > 0
    const box = (el: Element) => el.getBoundingClientRect()
    const overlap = (a: DOMRect, b: DOMRect) => !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom)
    const buttons = [...document.querySelectorAll('.touch-button')].filter(visible).map(box)
    const player = box(document.querySelector('.dinosaur')!)
    const hint = document.querySelector('.controls-hint')
    const map = document.querySelector('.route-map')
    return {
      touchUi: document.documentElement.classList.contains('touch-ui'),
      buttons: buttons.length,
      buttonsInside: buttons.every((b) => b.left >= 0 && b.top >= 0 && b.right <= innerWidth && b.bottom <= innerHeight),
      hintShown: visible(hint),
      hintOverPlayer: visible(hint) && overlap(box(hint!), player),
      feedbackShown: [...document.querySelectorAll('[class*="feedback"]')].some(visible),
      mapOverHud: !!map && [...document.querySelectorAll('.hud-sticker')].filter(visible).some((s) => overlap(box(s), box(map))),
      scrolls: document.documentElement.scrollHeight > innerHeight + 1 || document.documentElement.scrollWidth > innerWidth + 1,
    }
  })
}
