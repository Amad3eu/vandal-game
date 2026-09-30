import { advanceGame, createGameState, pressJump, releaseJump, resumeGame, type GameState } from '../../src/game/engine'
import type { GameMode, Obstacle } from '../../src/types/game'

const FRAME_MS = 1000 / 60
/** No keys held. */
export const IDLE = { left: false, right: false, down: false }
/** Obstacles that don't end the run on contact. */
const SAFE = new Set(['skate', 'coin', 'power-lightning', 'power-jump', 'floating-platform', 'train', 'building', 'trampoline', 'checkpoint', 'wall'])

/** One frame of play; a graffiti artist encounter is closed right away, like a player would. */
export function frame(state: GameState, input = IDLE) {
  const events = advanceGame(state, input, FRAME_MS)
  if (events.some((event) => event.type === 'artist')) resumeGame(state)
  return events
}

/**
 * A simple player for tests: jumps over the next hazard when it gets close, then stops jumping
 * after `seconds` so the run ends. Good for runs of about a minute with a few thousand points.
 */
export function playRun(seed: number, { mode = 'runner' as GameMode, seconds = 60 } = {}) {
  const state = createGameState({ mode, width: 1280, height: 720, seed, intro: true, record: true })
  const walk = { ...IDLE, right: mode === 'free' }
  let tick = 0
  let releaseAt = -1
  while (!state.gameOver && tick < 60 * seconds) {
    tick++
    if (tick === releaseAt) releaseJump(state)
    const p = state.player
    const next = state.obstacles
      .filter((o: Obstacle) => !SAFE.has(o.type) && !o.knocked && o.x + o.width > p.x)
      .sort((a: Obstacle, b: Obstacle) => a.x - b.x)[0]
    if (next && !p.isJumping && releaseAt < tick) {
      const gap = next.x - (p.x + p.width)
      const reach = mode === 'free' ? 30 : state.speed * 7
      if (gap < reach && gap > -10) {
        pressJump(state)
        releaseAt = tick + 14
      }
    }
    frame(state, walk)
  }
  for (let i = 0; !state.gameOver && i < 60 * 60; i++) frame(state, walk)
  if (!state.gameOver || !state.log) throw new Error('the bot never finished the run')
  return { state, log: state.log }
}
