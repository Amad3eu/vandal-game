/**
 * Online leaderboard behind one small interface, like the ads: our own server (server/leaderboard,
 * on Railway: VITE_LEADERBOARD_URL), Supabase, a fake local board for testing (`?online=dev` or
 * VITE_ONLINE=dev), or nothing (offline, the default).
 *
 * A ranked run asks the server for its seed (startRun), and when it ends the whole run log is
 * sent (submitRun): the server replays it and ranks the replayed score.
 */
import type { GameMode } from '../types/game'
import type { RunLog } from '../game/engine'
import { createDevOnline } from './dev'
import { createServerOnline } from './server'
import { createSupabaseOnline } from './supabase'

export interface RunTicket {
  seedId: string
  seed: number
}

export interface SubmitResult {
  accepted: boolean
  score?: number
  best?: number
  rank?: number | null
  reason?: string
}

export interface LeaderboardRow {
  rank: number
  playerId: string
  nickname: string
  score: number
}

export interface OnlineService {
  readonly name: 'server' | 'supabase' | 'dev'
  /** Seed for a ranked run, or null if the server can't be reached (the run is then offline). */
  startRun(mode: GameMode): Promise<RunTicket | null>
  submitRun(ticket: RunTicket, log: RunLog): Promise<SubmitResult>
  leaderboard(mode: GameMode): Promise<LeaderboardRow[]>
  /** This player's id and nickname (signing in anonymously the first time). */
  me(): Promise<{ id: string; nickname: string | null } | null>
  setNickname(nickname: string): Promise<boolean>
}

/** Resolves to null if the promise takes longer than `ms` (a slow network never blocks a run). */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([promise, new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))])
}

let service: OnlineService | null | undefined

export function getOnline(): OnlineService | null {
  if (service !== undefined) return service
  const forced = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('online') : null
  const choice = forced ?? import.meta.env.VITE_ONLINE
  const server = import.meta.env.VITE_LEADERBOARD_URL
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (choice === 'dev') service = createDevOnline()
  else if (server) service = createServerOnline(server)
  else if (url && key) service = createSupabaseOnline(url, key)
  else service = null
  return service
}

/** Friendly text for why the server refused a run (reasons from src/game/submission.ts). */
export function rejectionText(reason?: string) {
  switch (reason) {
    case 'continued-run':
      return 'Partidas continuadas do checkpoint não entram no placar'
    case 'old-version':
      return 'Versão antiga do jogo: atualize a página'
    case 'replay-mismatch':
      return 'O servidor não conseguiu confirmar essa partida'
    default:
      return 'Partida não entrou no placar'
  }
}
