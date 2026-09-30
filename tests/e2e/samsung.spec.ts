import { expect, test } from '@playwright/test'
import { layout, offline, openTitle, playButton } from './helpers'

// A touch phone whose browser says it has a mouse (hover: hover, pointer: fine), like Samsung
// Internet: before src/touchUi.ts it got the keyboard hints over the player and no buttons.
// The browser flags that make it claim a mouse are in the 'samsung-like' project (playwright.config.ts).
test.use({ viewport: { width: 355, height: 620 }, hasTouch: false, isMobile: false })

test('a phone that claims a mouse still gets the touch buttons', async ({ page, context }) => {
  await context.addInitScript(() => Object.defineProperty(Navigator.prototype, 'maxTouchPoints', { get: () => 5 }))
  await offline(page)
  await openTitle(page)
  expect(await page.evaluate(() => matchMedia('(hover: none) and (pointer: coarse)').matches)).toBe(false)

  // A finger on "Jogar" (real touch events, the page has no touch emulation).
  const cdp = await context.newCDPSession(page)
  const box = (await playButton(page).boundingBox())!
  const point = { x: box.x + box.width / 2, y: box.y + box.height / 2, id: 1 }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })

  await page.locator('.dinosaur').waitFor()
  const facts = await layout(page)
  expect(facts).toMatchObject({ touchUi: true, buttonsInside: true, hintShown: false, feedbackShown: false, scrolls: false })
  expect(facts.buttons).toBeGreaterThanOrEqual(3)
})
