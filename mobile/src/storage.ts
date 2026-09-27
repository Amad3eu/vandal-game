import AsyncStorage from '@react-native-async-storage/async-storage'
import { GAME_MODES, type GameMode, type GraffitiArt, type RunLog } from './shared'

// Same keys as the web version's localStorage.
const MODE_KEY = 'dinoGameMode'
const MUSIC_KEY = 'dinoGameMusic'
const TOTAL_COINS_KEY = 'dinoGameTotalCoins'
const BLACKBOOK_KEY = 'dinoGameBlackbook'
const LAST_RUN_KEY = 'dinoGameLastRun'

export interface SavedProgress {
  mode: GameMode
  music: boolean
  totalCoins: number
  highScores: Record<GameMode, number>
}

export const DEFAULT_PROGRESS: SavedProgress = {
  mode: 'runner',
  music: true,
  totalCoins: 0,
  highScores: { runner: 0, free: 0 },
}

const toInt = (value: string | null | undefined) => (value ? parseInt(value, 10) || 0 : 0)

export async function loadProgress(): Promise<SavedProgress> {
  const keys = [MODE_KEY, MUSIC_KEY, TOTAL_COINS_KEY, GAME_MODES.runner.highScoreKey, GAME_MODES.free.highScoreKey]
  const saved = Object.fromEntries(await AsyncStorage.multiGet(keys))
  return {
    mode: saved[MODE_KEY] === 'free' ? 'free' : 'runner',
    music: saved[MUSIC_KEY] !== 'none',
    totalCoins: toInt(saved[TOTAL_COINS_KEY]),
    highScores: {
      runner: toInt(saved[GAME_MODES.runner.highScoreKey]),
      free: toInt(saved[GAME_MODES.free.highScoreKey]),
    },
  }
}

// Writes are fire-and-forget: losing one on a crash only costs the latest coin or setting.
const save = (key: string, value: string) => void AsyncStorage.setItem(key, value).catch(() => {})

export const saveMode = (mode: GameMode) => save(MODE_KEY, mode)
export const saveMusic = (enabled: boolean) => save(MUSIC_KEY, enabled ? 'theme' : 'none')
export const saveTotalCoins = (coins: number) => save(TOTAL_COINS_KEY, String(coins))
export const saveHighScore = (mode: GameMode, score: number) => save(GAME_MODES[mode].highScoreKey, String(score))

/** The last run's log (seed + inputs per tick), kept for replays and, later, score checks. */
export const saveLastRun = (log: RunLog | null) => log && save(LAST_RUN_KEY, JSON.stringify(log))

export async function addToBlackbook(art: GraffitiArt) {
  const saved = await AsyncStorage.getItem(BLACKBOOK_KEY).catch(() => null)
  const arts: GraffitiArt[] = saved ? JSON.parse(saved) : []
  save(BLACKBOOK_KEY, JSON.stringify([...arts, art]))
}
