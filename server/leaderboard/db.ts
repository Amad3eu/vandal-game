import type { Pool, PoolClient } from 'pg'
import type { IssuedSeed, RunLog } from '../../src/game/server'

/**
 * Tables of the global leaderboard. Created on start if missing (every statement is idempotent),
 * so a fresh Railway Postgres needs no setup. Same shape as the Supabase version
 * (supabase/migrations), with players signing in by a random token instead of Supabase Auth.
 */
export const SCHEMA = `
create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  -- sha256 of the player's secret token; the token itself only lives on the device
  token_hash text not null unique,
  nickname text check (nickname is null or char_length(nickname) between 2 and 20),
  created_at timestamptz not null default now()
);

-- One per run started. A run is only accepted with a seed handed to that player, used once.
create table if not exists run_seeds (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players (id) on delete cascade,
  seed bigint not null check (seed between 0 and 4294967295),
  mode text not null check (mode in ('runner', 'free')),
  issued_at timestamptz not null default now(),
  used_at timestamptz
);
create index if not exists run_seeds_player_issued on run_seeds (player_id, issued_at desc);

create table if not exists runs (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players (id) on delete cascade,
  seed_id uuid not null unique references run_seeds (id),
  mode text not null check (mode in ('runner', 'free')),
  engine_version int not null,
  -- the score of the server's replay, not the one the client claimed
  score int not null check (score >= 0),
  end_tick int not null check (end_tick > 0),
  -- the whole run (seed + inputs per tick): for ghosts, replays and audits
  log jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists runs_mode_score on runs (mode, score desc);
create index if not exists runs_player_mode on runs (player_id, mode, score desc);
`

export interface Player {
  id: string
  nickname: string | null
}

export interface LeaderboardEntry {
  rank: number
  playerId: string
  nickname: string
  score: number
}

export function createStore(pool: Pool) {
  return {
    migrate: () => pool.query(SCHEMA),

    async createPlayer(tokenHash: string): Promise<Player> {
      const { rows } = await pool.query('insert into players (token_hash) values ($1) returning id, nickname', [tokenHash])
      return rows[0]
    },

    async playerByToken(tokenHash: string): Promise<Player | null> {
      const { rows } = await pool.query('select id, nickname from players where token_hash = $1', [tokenHash])
      return rows[0] ?? null
    },

    async setNickname(playerId: string, nickname: string) {
      await pool.query('update players set nickname = $2 where id = $1', [playerId, nickname])
    },

    async seedsSince(playerId: string, since: Date): Promise<number> {
      const { rows } = await pool.query('select count(*)::int as count from run_seeds where player_id = $1 and issued_at >= $2', [playerId, since])
      return rows[0].count
    },

    async issueSeed(playerId: string, seed: number, mode: string): Promise<{ id: string; seed: number }> {
      const { rows } = await pool.query('insert into run_seeds (player_id, seed, mode) values ($1, $2, $3) returning id, seed', [playerId, seed, mode])
      return { id: rows[0].id, seed: Number(rows[0].seed) }
    },

    /** The seed as submission.ts expects it, or null. */
    async seed(seedId: string): Promise<IssuedSeed | null> {
      const { rows } = await pool.query('select id, player_id, seed, mode, issued_at, used_at from run_seeds where id = $1', [seedId])
      const row = rows[0]
      if (!row) return null
      return {
        id: row.id,
        user_id: row.player_id,
        seed: Number(row.seed),
        mode: row.mode,
        issued_at: new Date(row.issued_at).toISOString(),
        used_at: row.used_at ? new Date(row.used_at).toISOString() : null,
      }
    },

    /**
     * Uses the seed and saves the run in one transaction. False when the seed was already used
     * (two submissions racing): each seed counts once.
     */
    async saveRun(playerId: string, seedId: string, log: RunLog, score: number, endTick: number): Promise<boolean> {
      const client: PoolClient = await pool.connect()
      try {
        await client.query('begin')
        const claimed = await client.query('update run_seeds set used_at = now() where id = $1 and used_at is null', [seedId])
        if (claimed.rowCount !== 1) {
          await client.query('rollback')
          return false
        }
        await client.query(
          'insert into runs (player_id, seed_id, mode, engine_version, score, end_tick, log) values ($1, $2, $3, $4, $5, $6, $7)',
          [playerId, seedId, log.mode, log.version, score, endTick, JSON.stringify(log)]
        )
        await client.query('commit')
        return true
      } catch (error) {
        await client.query('rollback').catch(() => {})
        throw error
      } finally {
        client.release()
      }
    },

    /** Best verified score per player in a mode, best first (runs with no points stay off the board). */
    async leaderboard(mode: string, limit: number): Promise<LeaderboardEntry[]> {
      const { rows } = await pool.query(
        `with best as (
           select distinct on (r.player_id) r.player_id, r.score, r.created_at
           from runs r
           where r.mode = $1 and r.score > 0
           order by r.player_id, r.score desc, r.created_at
         )
         select rank() over (order by b.score desc)::int as rank, b.player_id, coalesce(p.nickname, 'Anônimo') as nickname, b.score
         from best b
         join players p on p.id = b.player_id
         order by b.score desc, b.created_at
         limit $2`,
        [mode, limit]
      )
      return rows.map((row) => ({ rank: row.rank, playerId: row.player_id, nickname: row.nickname, score: row.score }))
    },

    /** A player's best score in a mode and their place (null until they score points). */
    async standing(mode: string, playerId: string): Promise<{ rank: number; best: number } | null> {
      const { rows } = await pool.query(
        `with best as (select player_id, max(score) as score from runs where mode = $1 and score > 0 group by player_id)
         select (select count(*) + 1 from best o where o.score > b.score)::int as rank, b.score as best
         from best b
         where b.player_id = $2`,
        [mode, playerId]
      )
      return rows[0] ?? null
    },
  }
}

export type Store = ReturnType<typeof createStore>
