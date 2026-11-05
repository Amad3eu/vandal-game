import { expect, test, type Page } from '@playwright/test'
import { ARTIST_INFO } from '../../src/data/graffitiArtists'
import { SERVER, openTitle, playButton } from './helpers'

// Graffiti encounters with the real artists registered in the admin page (src/data/encounters.ts).

const DJ = '5b0c2d1e-7f3a-4b6c-8d9e-0a1b2c3d4e5f'
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
const cors = { 'Access-Control-Allow-Origin': '*' }

/** A server with one DJ unlocked from the start; runs themselves are offline. */
async function serverWithADj(page: Page) {
  await page.route(`${SERVER}/**`, (route) => {
    const path = new URL(route.request().url()).pathname
    if (path === '/v1/artists')
      return route.fulfill({
        headers: cors,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: DJ, name: 'DJ Nina', kind: 'dj', city: 'Recife', bio: 'Toco boom bap e samba no mesmo set.', instagram: 'dj.nina', color: '#4ecdc4', minScore: 0, phase: 1, hasSignature: true, version: 'v1' },
        ]),
      })
    if (path === `/v1/artists/${DJ}/signature`) return route.fulfill({ headers: cors, contentType: 'image/png', body: PNG })
    return route.fulfill({ status: 503, headers: cors, body: '{}' })
  })
}

/** Skips the intro and puts a graffiti encounter right in front of the player. */
async function encounterAhead(page: Page) {
  await page.locator('.dinosaur').waitFor()
  await page.evaluate(() => {
    const e = (window as unknown as { __engine: any }).__engine
    e.introMs = 99999
    e.introOffset = 0
    e.chaser = null
    e.nextSpawnGap = Infinity
    e.obstacles = [{ id: 7001, x: e.player.x + 160, y: e.config.groundLevel - 88, width: 80, height: 80, type: 'graffiti-artist', graffitiArtist: 'remo', passed: false }]
  })
}

test('meets a real DJ from the server and keeps their signature in the blackbook', async ({ page }) => {
  await serverWithADj(page)
  await openTitle(page)
  await playButton(page).click()
  await encounterAhead(page)

  await expect(page.locator('.artist-kind-icon')).toHaveText('🎧') // the DJ on the street
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('DJ Nina')
  await expect(dialog).toContainText('DJ · Recife')
  await expect(dialog.getByRole('link', { name: '@dj.nina' })).toHaveAttribute('href', 'https://instagram.com/dj.nina')
  await page.getByRole('button', { name: 'Ver assinatura' }).click()
  await expect(page.getByAltText('Assinatura de DJ Nina')).toHaveAttribute('src', new RegExp(`/v1/artists/${DJ}/signature\\?v=v1$`))
  await page.getByRole('button', { name: 'Sim, quero!' }).click()
  await expect(page.getByRole('dialog')).toContainText('Quer deixar a sua assinatura para DJ Nina?')
  await page.getByRole('button', { name: 'Agora não' }).click()

  await expect
    .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('dinoGameBlackbook') ?? '[]')))
    .toEqual([expect.objectContaining({ artist: DJ, artistName: 'DJ Nina', artistColor: '#4ecdc4', type: 'artist-signature', imageData: expect.stringMatching(/^data:image\/png;base64,/) })])
})

test("offline, the game's own artists show up", async ({ page }) => {
  await page.route(`${SERVER}/**`, (route) => route.abort())
  await openTitle(page)
  await playButton(page).click()
  await encounterAhead(page)
  await expect(page.getByRole('dialog')).toContainText(ARTIST_INFO.remo.name)
  await expect(page.locator('.artist-kind-icon')).toHaveCount(0)
})
