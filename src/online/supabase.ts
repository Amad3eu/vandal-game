import type { SupabaseClient } from '@supabase/supabase-js'
import type { GameMode } from '../types/game'
import type { RunLog } from '../game/engine'
import { withTimeout, type LeaderboardRow, type OnlineService, type RunTicket, type SubmitResult } from './online'

/** How long starting a ranked run may wait for the server before playing offline. */
const START_TIMEOUT_MS = 2500

/**
 * Supabase: anonymous accounts (a player gets one on first play and can pick a nickname),
 * the start-run / submit-run edge functions and the leaderboard() SQL function.
 * supabase-js is only downloaded when this is used.
 */
export function createSupabaseOnline(url: string, anonKey: string): OnlineService {
  let client: Promise<SupabaseClient> | null = null
  const getClient = () =>
    (client ??= import('@supabase/supabase-js').then(({ createClient }) => createClient(url, anonKey)))

  const signedIn = async () => {
    const supabase = await getClient()
    const { data } = await supabase.auth.getSession()
    if (!data.session) {
      const { error } = await supabase.auth.signInAnonymously()
      if (error) throw error
    }
    return supabase
  }

  return {
    name: 'supabase',

    async startRun(mode: GameMode) {
      const request = (async (): Promise<RunTicket | null> => {
        const supabase = await signedIn()
        const { data, error } = await supabase.functions.invoke('start-run', { body: { mode } })
        return error || !data ? null : { seedId: data.seedId, seed: data.seed }
      })().catch(() => null)
      return withTimeout(request, START_TIMEOUT_MS)
    },

    async submitRun(ticket: RunTicket, log: RunLog): Promise<SubmitResult> {
      try {
        const supabase = await signedIn()
        const { data, error } = await supabase.functions.invoke('submit-run', { body: { seedId: ticket.seedId, log } })
        if (!error) return data as SubmitResult
        // Refusals come back as 4xx with { accepted: false, reason }.
        const response = (error as { context?: Response }).context
        const body = response ? await response.json().catch(() => null) : null
        return { accepted: false, reason: body?.reason ?? 'network' }
      } catch {
        return { accepted: false, reason: 'network' }
      }
    },

    async leaderboard(mode: GameMode): Promise<LeaderboardRow[]> {
      const supabase = await getClient()
      const { data, error } = await supabase.rpc('leaderboard', { p_mode: mode, p_limit: 20 })
      if (error || !Array.isArray(data)) return []
      return data.map((row) => ({ rank: Number(row.rank), playerId: row.player_id, nickname: row.nickname, score: row.score }))
    },

    async me() {
      try {
        const supabase = await signedIn()
        const { data: user } = await supabase.auth.getUser()
        if (!user.user) return null
        const { data } = await supabase.from('profiles').select('nickname').eq('id', user.user.id).maybeSingle()
        return { id: user.user.id, nickname: data?.nickname ?? null }
      } catch {
        return null
      }
    },

    async setNickname(nickname: string) {
      try {
        const supabase = await signedIn()
        const { data: user } = await supabase.auth.getUser()
        if (!user.user) return false
        const { error } = await supabase.from('profiles').upsert({ id: user.user.id, nickname })
        return !error
      } catch {
        return false
      }
    },
  }
}
