import type { Pool } from 'pg'

/** What the admin page reads and changes (tables in db.ts). */

export const ARTIST_KINDS = ['graffiti', 'dj', 'mc', 'breaking'] as const
export type ArtistKind = (typeof ARTIST_KINDS)[number]

export interface ArtistInput {
  name: string
  kind: ArtistKind
  city: string | null
  bio: string | null
  instagram: string | null
  color: string
  signature: string | null
  minScore: number
  phase: 1 | 2 | 3
  active: boolean
}

export interface Artist extends ArtistInput {
  id: string
  updatedAt: string
}

const ARTIST_COLUMNS = 'id, name, kind, city, bio, instagram, color, signature, min_score, phase, active, updated_at'

const toArtist = (row: Record<string, unknown>): Artist => ({
  id: row.id as string,
  name: row.name as string,
  kind: row.kind as ArtistKind,
  city: row.city as string | null,
  bio: row.bio as string | null,
  instagram: row.instagram as string | null,
  color: row.color as string,
  signature: row.signature as string | null,
  minScore: row.min_score as number,
  phase: row.phase as 1 | 2 | 3,
  active: row.active as boolean,
  updatedAt: new Date(row.updated_at as string).toISOString(),
})

const artistValues = (a: ArtistInput) => [a.name, a.kind, a.city, a.bio, a.instagram, a.color, a.signature, a.minScore, a.phase, a.active]

export function createAdminStore(pool: Pool) {
  return {
    /** Players with runs in a mode, best first, hidden ones included (and marked). */
    async players(mode: string, limit: number) {
      const { rows } = await pool.query(
        `select p.id, p.nickname, p.hidden, p.created_at, max(r.score) as best, count(r.id)::int as runs, max(r.created_at) as last_run_at
         from players p
         join runs r on r.player_id = p.id and r.mode = $1
         group by p.id
         order by best desc, last_run_at desc
         limit $2`,
        [mode, limit]
      )
      return rows.map((row) => ({
        id: row.id as string,
        nickname: row.nickname as string | null,
        hidden: row.hidden as boolean,
        best: row.best as number,
        runs: row.runs as number,
        lastRunAt: new Date(row.last_run_at).toISOString(),
        createdAt: new Date(row.created_at).toISOString(),
      }))
    },

    /** Renames (null clears the nickname) and/or hides a player. Null when the player doesn't exist. */
    async updatePlayer(id: string, change: { nickname?: string | null; hidden?: boolean }) {
      const { rows } = await pool.query(
        `update players set
           nickname = case when $2 then $3 else nickname end,
           hidden = coalesce($4, hidden)
         where id = $1
         returning id, nickname, hidden`,
        [id, 'nickname' in change, change.nickname ?? null, change.hidden ?? null]
      )
      return (rows[0] as { id: string; nickname: string | null; hidden: boolean } | undefined) ?? null
    },

    async playerRuns(id: string) {
      const { rows } = await pool.query(
        `select id, mode, score, end_tick, engine_version, created_at from runs where player_id = $1 order by created_at desc limit 100`,
        [id]
      )
      return rows.map((row) => ({
        id: row.id as string,
        mode: row.mode as string,
        score: row.score as number,
        seconds: Math.round(((row.end_tick as number) * 1000) / 60 / 1000),
        engineVersion: row.engine_version as number,
        createdAt: new Date(row.created_at).toISOString(),
      }))
    },

    /** Deletes a run; its owner and mode, or null if there was no such run. */
    async deleteRun(id: string) {
      const { rows } = await pool.query('delete from runs where id = $1 returning player_id, mode, score', [id])
      return (rows[0] as { player_id: string; mode: string; score: number } | undefined) ?? null
    },

    async artists(onlyActive: boolean): Promise<Artist[]> {
      const { rows } = await pool.query(
        `select ${ARTIST_COLUMNS} from artists ${onlyActive ? 'where active' : ''} order by phase, min_score, name`
      )
      return rows.map(toArtist)
    },

    async createArtist(input: ArtistInput): Promise<Artist> {
      const { rows } = await pool.query(
        `insert into artists (name, kind, city, bio, instagram, color, signature, min_score, phase, active)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         returning ${ARTIST_COLUMNS}`,
        artistValues(input)
      )
      return toArtist(rows[0])
    },

    async updateArtist(id: string, input: ArtistInput): Promise<Artist | null> {
      const { rows } = await pool.query(
        `update artists set name = $2, kind = $3, city = $4, bio = $5, instagram = $6, color = $7, signature = $8,
           min_score = $9, phase = $10, active = $11, updated_at = now()
         where id = $1
         returning ${ARTIST_COLUMNS}`,
        [id, ...artistValues(input)]
      )
      return rows[0] ? toArtist(rows[0]) : null
    },

    async deleteArtist(id: string) {
      const { rows } = await pool.query('delete from artists where id = $1 returning name', [id])
      return (rows[0]?.name as string | undefined) ?? null
    },

    async log(admin: string, action: string, target: string | null, details: Record<string, unknown> | null) {
      await pool.query('insert into admin_log (admin, action, target, details) values ($1, $2, $3, $4)', [admin, action, target, details])
    },

    async recentLog(limit: number) {
      const { rows } = await pool.query('select id, admin, action, target, details, created_at from admin_log order by id desc limit $1', [limit])
      return rows.map((row) => ({
        id: Number(row.id),
        admin: row.admin as string,
        action: row.action as string,
        target: row.target as string | null,
        details: row.details as Record<string, unknown> | null,
        createdAt: new Date(row.created_at).toISOString(),
      }))
    },
  }
}

export type AdminStore = ReturnType<typeof createAdminStore>
