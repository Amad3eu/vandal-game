import type { GameMode } from '../types/game'
import type { RunLog } from '../game/engine'
import { withTimeout, type LeaderboardRow, type OnlineService, type RunTicket, type SubmitResult } from './online'

/** How long starting a ranked run may wait for the server before playing offline. */
const START_TIMEOUT_MS = 2500
const PLAYER_KEY = 'vandalOnlinePlayer'

/** Where this device keeps its player id and secret token (localStorage here; AsyncStorage in the app). */
export interface TokenStore {
  get(key: string): Promise<string | null>
  set(key: string, value: string | null): Promise<void>
}

const browserStore: TokenStore = {
  async get(key) {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },
  async set(key, value) {
    try {
      if (value === null) localStorage.removeItem(key)
      else localStorage.setItem(key, value)
    } catch {
      // private mode: the player gets a new account next time
    }
  },
}

interface SavedPlayer {
  id: string
  token: string
}

/**
 * Our own leaderboard server (server/leaderboard, made for Railway). The first time, the device
 * gets an anonymous player (an id and a secret token, kept on the device); the nickname is optional.
 */
export function createServerOnline(baseUrl: string, store: TokenStore = browserStore): OnlineService {
  const api = baseUrl.replace(/\/+$/, '')
  let player: Promise<SavedPlayer> | null = null

  const signUp = async (): Promise<SavedPlayer> => {
    const response = await fetch(`${api}/v1/players`, { method: 'POST' })
    if (!response.ok) throw new Error(`sign up: ${response.status}`)
    const { id, token } = await response.json()
    await store.set(PLAYER_KEY, JSON.stringify({ id, token }))
    return { id, token }
  }

  const signedIn = () =>
    (player ??= (async () => {
      try {
        const saved = JSON.parse((await store.get(PLAYER_KEY)) ?? 'null')
        if (typeof saved?.id === 'string' && typeof saved?.token === 'string') return saved as SavedPlayer
      } catch {
        // unreadable: sign up again
      }
      return signUp()
    })().catch((error) => {
      player = null
      throw error
    }))

  /** A request as this player. An unknown token (the server's database was reset) signs up again once. */
  const call = async (path: string, init: { method: string; body?: unknown }, retry = true): Promise<Response> => {
    const { token } = await signedIn()
    const response = await fetch(`${api}${path}`, {
      method: init.method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    })
    if (response.status === 401 && retry) {
      await store.set(PLAYER_KEY, null)
      player = null
      return call(path, init, false)
    }
    return response
  }

  return {
    name: 'server',

    async startRun(mode: GameMode) {
      const request = (async (): Promise<RunTicket | null> => {
        const response = await call('/v1/runs', { method: 'POST', body: { mode } })
        if (!response.ok) return null
        const data = await response.json()
        return { seedId: data.seedId, seed: data.seed }
      })().catch(() => null)
      return withTimeout(request, START_TIMEOUT_MS)
    },

    async submitRun(ticket: RunTicket, log: RunLog): Promise<SubmitResult> {
      try {
        const response = await call('/v1/runs/submit', { method: 'POST', body: { seedId: ticket.seedId, log } })
        const data = await response.json().catch(() => null)
        if (response.ok && data) return data as SubmitResult
        return { accepted: false, reason: data?.reason ?? 'network' }
      } catch {
        return { accepted: false, reason: 'network' }
      }
    },

    async leaderboard(mode: GameMode): Promise<LeaderboardRow[]> {
      try {
        const response = await fetch(`${api}/v1/leaderboard?mode=${mode}&limit=20`)
        return response.ok ? await response.json() : []
      } catch {
        return []
      }
    },

    async me() {
      try {
        const response = await call('/v1/me', { method: 'GET' })
        return response.ok ? await response.json() : null
      } catch {
        return null
      }
    },

    async setNickname(nickname: string) {
      try {
        return (await call('/v1/me/nickname', { method: 'PUT', body: { nickname } })).ok
      } catch {
        return false
      }
    },
  }
}
