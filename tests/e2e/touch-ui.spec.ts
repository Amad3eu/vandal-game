import { expect, test } from '@playwright/test'
import { layout, offline, openTitle, playButton } from './helpers'

// On-screen buttons on phones, keyboard hints on computers (src/touchUi.ts).

test.describe('phone, portrait', () => {
  test.use({ viewport: { width: 390, height: 780 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })

  test('touch buttons inside the screen, nothing over the player', async ({ page }) => {
    await offline(page)
    await openTitle(page)
    await playButton(page).tap()
    await page.locator('.dinosaur').waitFor()
    const facts = await layout(page)
    expect(facts).toMatchObject({ touchUi: true, buttonsInside: true, hintShown: false, feedbackShown: false, mapOverHud: false, scrolls: false })
    expect(facts.buttons).toBeGreaterThanOrEqual(3)
  })

  test('"Como jogar" shows the touch controls', async ({ page }) => {
    await offline(page)
    await openTitle(page)
    await page.locator('button').filter({ hasText: /como jogar/i }).first().tap()
    await expect(page.locator('.controls-list li.only-touch').first()).toBeVisible()
    await expect(page.locator('.controls-list li.only-keyboard').first()).toBeHidden()
  })
})

test.describe('phone, landscape', () => {
  test.use({ viewport: { width: 780, height: 360 }, isMobile: true, hasTouch: true })

  test('touch buttons inside the screen', async ({ page }) => {
    await offline(page)
    await openTitle(page)
    await playButton(page).tap()
    await page.locator('.dinosaur').waitFor()
    expect(await layout(page)).toMatchObject({ touchUi: true, buttonsInside: true, hintShown: false, mapOverHud: false, scrolls: false })
  })
})

test.describe('computer', () => {
  test.use({ viewport: { width: 1280, height: 720 } })

  test('keyboard hints, no touch buttons', async ({ page }) => {
    await offline(page)
    await openTitle(page)
    await playButton(page).click()
    await page.locator('.dinosaur').waitFor()
    expect(await layout(page)).toMatchObject({ touchUi: false, buttons: 0, hintShown: true, mapOverHud: false, scrolls: false })
  })
})
