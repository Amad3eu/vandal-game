import { expect, test, type Page, type Route } from '@playwright/test'
import { PHASES } from '../../src/admin/roadmap'
import { SERVER } from './helpers'

// The admin page (/admin) against a fake leaderboard server kept in memory by the test.

const KEY = 'test-admin-key-luiz-0123456789'
// A 1x1 PNG, as a signature upload.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')

type Json = Record<string, unknown>

/** Answers the admin API like the real server would, and records every change the page sends. */
async function fakeServer(page: Page) {
  const now = new Date().toISOString()
  const state = {
    players: [
      { id: 'p1', nickname: 'Remo_SP', hidden: false, best: 3300, runs: 2, lastRunAt: now, createdAt: now },
      { id: 'p2', nickname: 'Xingador123', hidden: false, best: 2100, runs: 1, lastRunAt: now, createdAt: now },
    ],
    runs: { p1: [{ id: 'r1', mode: 'runner', score: 3300, seconds: 95, engineVersion: 2, createdAt: now }] } as Record<string, Json[]>,
    artists: [] as Json[],
    log: [] as Json[],
    sent: [] as { method: string; path: string; body: Json | null }[],
  }
  const reply = (route: Route, status: number, body: unknown) =>
    route.fulfill({ status, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(body) })

  await page.route(`${SERVER}/**`, async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const method = request.method()
    if (method === 'OPTIONS')
      return route.fulfill({
        status: 204,
        headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type', 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE' },
      })
    if (request.headers().authorization !== `Bearer ${KEY}`) return reply(route, 401, { error: 'auth' })
    const body = request.postData() ? (JSON.parse(request.postData()!) as Json) : null
    const path = url.pathname
    if (method !== 'GET') {
      state.sent.push({ method, path, body })
      state.log.unshift({ id: state.log.length + 1, admin: 'luiz', action: 'player.rename', target: null, details: { nickname: 'x' }, createdAt: now })
    }

    if (path === '/admin/me') return reply(route, 200, { name: 'luiz' })
    if (path === '/admin/players') return reply(route, 200, state.players)
    const player = path.match(/^\/admin\/players\/(\w+)$/)
    if (player && method === 'PUT') {
      const found = state.players.find((p) => p.id === player[1])!
      Object.assign(found, body)
      return reply(route, 200, found)
    }
    const runs = path.match(/^\/admin\/players\/(\w+)\/runs$/)
    if (runs) return reply(route, 200, state.runs[runs[1]] ?? [])
    const run = path.match(/^\/admin\/runs\/(\w+)$/)
    if (run && method === 'DELETE') {
      state.runs.p1 = []
      return reply(route, 200, { deleted: true })
    }
    if (path === '/admin/artists' && method === 'GET') return reply(route, 200, state.artists)
    if (path === '/admin/artists' && method === 'POST') {
      const artist = { ...body, id: `a${state.artists.length + 1}`, updatedAt: now }
      state.artists.push(artist)
      return reply(route, 201, artist)
    }
    const artist = path.match(/^\/admin\/artists\/(\w+)$/)
    if (artist && method === 'PUT') {
      const index = state.artists.findIndex((a) => a.id === artist[1])
      state.artists[index] = { ...body, id: artist[1], updatedAt: now }
      return reply(route, 200, state.artists[index])
    }
    if (artist && method === 'DELETE') {
      state.artists = state.artists.filter((a) => a.id !== artist[1])
      return reply(route, 200, { deleted: true })
    }
    if (path === '/admin/log') return reply(route, 200, state.log)
    return reply(route, 404, { error: 'not-found' })
  })
  return state
}

async function signIn(page: Page, key = KEY) {
  await page.goto('/admin')
  await page.fill('#admin-key', key)
  await page.getByRole('button', { name: /entrar/i }).click()
}

test('a wrong key stays out; the right one opens the roadmap', async ({ page }) => {
  await fakeServer(page)
  await signIn(page, 'x'.repeat(30))
  await expect(page.getByRole('alert')).toHaveText(/inválida/)
  await page.fill('#admin-key', KEY)
  await page.getByRole('button', { name: /entrar/i }).click()
  await expect(page.getByTestId('admin-name')).toContainText('luiz')
  await expect(page.getByTestId('roadmap-phase')).toHaveCount(PHASES.length)
  await expect(page.getByText('Últimas entregas')).toBeVisible()
  await expect(page.getByText('Decisões')).toBeVisible()
})

test('moderates the leaderboard: rename, hide, delete a run', async ({ page }) => {
  const server = await fakeServer(page)
  await signIn(page)
  await page.getByRole('tab', { name: /placar/i }).click()
  await expect(page.getByTestId('admin-players').locator('tbody tr')).toHaveCount(2)

  await page.getByRole('button', { name: 'Renomear Xingador123' }).click()
  await page.fill('#rename', 'Jogador_Legal')
  await page.getByRole('button', { name: 'Salvar' }).click()
  await expect(page.getByTestId('admin-players')).toContainText('Jogador_Legal')
  expect(server.sent).toContainEqual({ method: 'PUT', path: '/admin/players/p2', body: { nickname: 'Jogador_Legal' } })

  await page.getByTestId('admin-players').locator('tr', { hasText: 'Jogador_Legal' }).getByRole('button', { name: 'Esconder do placar' }).click()
  await expect(page.getByTestId('admin-players')).toContainText('escondido')
  expect(server.sent).toContainEqual({ method: 'PUT', path: '/admin/players/p2', body: { hidden: true } })

  await page.getByRole('button', { name: 'Partidas de Remo_SP' }).click()
  await page.getByRole('button', { name: 'Apagar partida' }).click()
  await page.getByRole('button', { name: 'Apagar', exact: true }).click()
  await expect(page.getByText('Nenhuma partida.')).toBeVisible()
  expect(server.sent).toContainEqual({ method: 'DELETE', path: '/admin/runs/r1', body: null })
})

test('registers an artist with a signature, turns it off and deletes it', async ({ page }) => {
  const server = await fakeServer(page)
  await signIn(page)
  await page.getByRole('tab', { name: /grafiteiros/i }).click()
  await page.getByRole('button', { name: /novo artista/i }).click()
  await page.fill('#artist-name', 'DJ Nina')
  await page.getByRole('combobox', { name: 'Tipo' }).click()
  await page.getByRole('option', { name: 'DJ' }).click()
  await page.fill('#artist-city', 'Recife')
  await page.fill('#artist-instagram', '@dj.nina')
  await page.getByRole('combobox', { name: 'Fase' }).click()
  await page.getByRole('option', { name: /2 · Metrô/ }).click()
  await page.fill('#artist-score', '1200')
  await page.setInputFiles('[data-testid="signature-file"]', { name: 'nina.png', mimeType: 'image/png', buffer: PNG })
  await expect(page.getByAltText('Assinatura')).toBeVisible()
  await page.getByRole('button', { name: 'Cadastrar' }).click()

  await expect(page.getByTestId('admin-artists')).toContainText('DJ Nina')
  const created = server.sent.find((s) => s.method === 'POST' && s.path === '/admin/artists')!.body!
  expect(created).toMatchObject({ name: 'DJ Nina', kind: 'dj', city: 'Recife', instagram: '@dj.nina', phase: 2, minScore: 1200, active: true })
  expect(created.signature).toMatch(/^data:image\/png;base64,/)

  await page.getByRole('switch', { name: 'DJ Nina ativo' }).click()
  await expect(page.getByTestId('admin-artists')).toContainText('inativo')
  expect(server.sent.at(-1)).toMatchObject({ method: 'PUT', path: '/admin/artists/a1', body: { active: false } })

  await page.getByRole('button', { name: 'Apagar DJ Nina' }).click()
  await page.getByRole('button', { name: 'Apagar', exact: true }).click()
  await expect(page.getByText(/Nenhum artista cadastrado/)).toBeVisible()
})

test('the log lists what each admin did', async ({ page }) => {
  const server = await fakeServer(page)
  server.log.push({ id: 1, admin: 'guime', action: 'player.hide', target: 'p2', details: { nickname: 'Xingador123' }, createdAt: new Date().toISOString() })
  await signIn(page)
  await page.getByRole('tab', { name: /registro/i }).click()
  await expect(page.getByTestId('admin-log')).toContainText('guime')
  await expect(page.getByTestId('admin-log')).toContainText('Escondeu do placar')
})

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

  test('tabs fit the tab bar and nothing scrolls sideways', async ({ page }) => {
    await fakeServer(page)
    await signIn(page)
    await page.getByTestId('roadmap').waitFor()
    const fits = await page.evaluate(() => {
      const bar = document.querySelector('[role="tablist"]')!.getBoundingClientRect()
      return [...document.querySelectorAll('[role="tab"]')].every((tab) => {
        const box = tab.getBoundingClientRect()
        return box.top >= bar.top - 1 && box.bottom <= bar.bottom + 1
      })
    })
    expect(fits).toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1)
  })
})
