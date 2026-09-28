import type { GameMode } from '../types/game'
import type { RunLog } from '../game/engine'
import { verifyRun } from '../game/replay'
import type { LeaderboardRow, OnlineService, SubmitResult } from './online'

const BOARD_KEY = 'dinoGameDevBoard'
const ME = 'dev-player'

interface DevEntry {
  playerId: string
  nickname: string
  mode: GameMode
  score: number
}

// A few made-up rivals so the board isn't empty while testing.
const RIVALS: DevEntry[] = [
  { playerId: 'dev-remo', nickname: 'Remo', mode: 'runner', score: 3200 },
  { playerId: 'dev-pixo', nickname: 'Pixo', mode: 'runner', score: 1800 },
  { playerId: 'dev-nina', nickname: 'Nina', mode: 'runner', score: 650 },
  { playerId: 'dev-remo', nickname: 'Remo', mode: 'free', score: 1400 },
]

function read(): { entries: DevEntry[]; nickname: string | null } {
  try {
    const saved = JSON.parse(localStorage.getItem(BOARD_KEY) ?? 'null')
    if (saved) return saved
  } catch {
    // fall through to a fresh board
  }
  return { entries: RIVALS, nickname: null }
}

function write(board: ReturnType<typeof read>) {
  try {
    localStorage.setItem(BOARD_KEY, JSON.stringify(board))
  } catch {
    // the fake board is only for testing
  }
}

/**
 * A fake leaderboard kept in this browser, for testing the online flow without a server. Like
 * the real one it hands out seeds and replays the run before ranking the replayed score.
 */
export function createDevOnline(): OnlineService {
  const seeds = new Map<string, { seed: number; mode: GameMode; used: boolean }>()

  const rows = (mode: GameMode): LeaderboardRow[] => {
    const { entries, nickname } = read()
    const best = new Map<string, DevEntry>()
    for (const entry of entries.filter((e) => e.mode === mode)) {
      if ((best.get(entry.playerId)?.score ?? -1) < entry.score) best.set(entry.playerId, entry)
    }
    return [...best.values()]
      .sort((a, b) => b.score - a.score)
      .map((entry, index) => ({
        rank: index + 1,
        playerId: entry.playerId,
        nickname: entry.playerId === ME ? nickname ?? 'Você' : entry.nickname,
        score: entry.score,
      }))
  }

  return {
    name: 'dev',

    async startRun(mode) {
      const seedId = `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`
      const seed = Math.floor(Math.random() * 4294967296) >>> 0
      seeds.set(seedId, { seed, mode, used: false })
      return { seedId, seed }
    },

    async submitRun(ticket, log: RunLog): Promise<SubmitResult> {
      const issued = seeds.get(ticket.seedId)
      if (!issued || issued.used || issued.seed !== log.seed || issued.mode !== log.mode) return { accepted: false, reason: 'seed-mismatch' }
      if (log.checkpoint) return { accepted: false, reason: 'continued-run' }
      const replay = verifyRun(log)
      if (!replay.valid) return { accepted: false, reason: 'replay-mismatch' }
      issued.used = true
      const board = read()
      board.entries.push({ playerId: ME, nickname: board.nickname ?? 'Você', mode: log.mode, score: replay.score })
      write(board)
      const mine = rows(log.mode).find((row) => row.playerId === ME)
      return { accepted: true, score: replay.score, best: mine?.score, rank: mine?.rank ?? null }
    },

    async leaderboard(mode) {
      return rows(mode).slice(0, 20)
    },

    async me() {
      return { id: ME, nickname: read().nickname }
    },

    async setNickname(nickname) {
      const board = read()
      board.nickname = nickname
      write(board)
      return true
    },
  }
}
