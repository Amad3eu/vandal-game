/**
 * Global leaderboard server (Node + Postgres), made for Railway: `npm run build:leaderboard`,
 * then `npm run start:leaderboard`. See the README ("Placar global no Railway").
 *
 *   DATABASE_URL      Postgres connection (on Railway: ${{Postgres.DATABASE_URL}})
 *   ALLOWED_ORIGINS   sites that may call it, comma separated (default: any)
 *   PLAYERS_PER_HOUR  new players per IP address per hour (default 60; mobile carriers put
 *                     many phones behind one address)
 *   PORT              set by Railway (default 8788)
 */
import pg from 'pg'
import { createApp } from './app'
import { createStore } from './db'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error('DATABASE_URL is not set')
  process.exit(1)
}

const pool = new pg.Pool({ connectionString: databaseUrl, max: 10 })
// A dropped idle connection (the database restarting) is logged instead of crashing the server.
pool.on('error', (error) => console.error('postgres:', error.message))
const store = createStore(pool)
await store.migrate()

const origins = (process.env.ALLOWED_ORIGINS ?? '').split(',').map((origin) => origin.trim()).filter(Boolean)
const app = createApp(store, {
  allowedOrigins: origins.length ? origins : '*',
  playersPerHour: Number(process.env.PLAYERS_PER_HOUR) || 60,
})
const port = Number(process.env.PORT ?? 8788)
const server = app.listen(port, () => console.log(`leaderboard listening on :${port}`))

// Railway stops the old container with SIGTERM on each deploy.
process.on('SIGTERM', () => {
  server.close(() => pool.end().then(() => process.exit(0)))
})
