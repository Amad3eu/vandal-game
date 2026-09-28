import type { GameMode, GamePhase } from '../types/game'

/**
 * Scoreboard kept on this device (localStorage on the web, AsyncStorage in the app): the best
 * runs of each mode, with no server. The global leaderboard (src/online) comes on top of it.
 */
export interface LocalScore {
  mode: GameMode
  score: number
  /** Phase the run reached. */
  phase: GamePhase
  coins: number
  /** Meters run (older entries may not have it). */
  distance?: number
  /** Continued from a checkpoint (its points started from the flag). */
  continued: boolean
  /** When it ended (ms since epoch). */
  date: number
}

/** Best runs kept per mode. */
export const LOCAL_BOARD_SIZE = 10
export const LOCAL_BOARD_KEY = 'dinoGameLocalBoard'

const byScore = (a: LocalScore, b: LocalScore) => b.score - a.score || a.date - b.date

/** The mode's runs, best first. */
export function localTop(board: LocalScore[], mode: GameMode) {
  return board.filter((entry) => entry.mode === mode).sort(byScore)
}

/**
 * Adds a finished run, keeping the best LOCAL_BOARD_SIZE of its mode. `rank` is its position
 * (1 = best) or null when it didn't make the board. Runs with 0 points aren't kept.
 */
export function addLocalScore(board: LocalScore[], entry: LocalScore, size = LOCAL_BOARD_SIZE) {
  if (entry.score <= 0) return { board, rank: null }
  const mode = [...localTop(board, entry.mode), entry].sort(byScore).slice(0, size)
  const position = mode.indexOf(entry)
  return {
    board: [...board.filter((other) => other.mode !== entry.mode), ...mode],
    rank: position === -1 ? null : position + 1,
  }
}

/** Reads a saved board, dropping anything that doesn't look like a run. */
export function parseLocalBoard(json: string | null): LocalScore[] {
  try {
    const data = JSON.parse(json ?? '[]')
    if (!Array.isArray(data)) return []
    return data.filter(
      (e) =>
        e &&
        (e.mode === 'runner' || e.mode === 'free') &&
        Number.isFinite(e.score) &&
        [1, 2, 3].includes(e.phase) &&
        Number.isFinite(e.date)
    )
  } catch {
    return []
  }
}
