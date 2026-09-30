import { expect, test } from '@playwright/test'
import { offline, openTitle, playButton } from './helpers'

test('a run from the title screen to game over', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(String(error)))
  await offline(page)
  await openTitle(page)
  await playButton(page).click()
  await page.locator('.dinosaur').waitFor()
  await expect(page.locator('.route-map')).toBeVisible()
  await expect(page.locator('.hud-sticker').first()).toBeVisible()

  // Nobody jumps: the first spray ends the run, the cop catches the player, the menu comes back.
  await expect(page.locator('[data-testid="final-score"]')).toBeVisible({ timeout: 45_000 })
  await expect(page.locator('.title-menu button').filter({ hasText: /jogar de novo|recome/i }).first()).toBeVisible()
  expect(errors).toEqual([])
})
