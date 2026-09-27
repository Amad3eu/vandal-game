import { TICK_MS } from './config'
import {
  awardSignature,
  createGameState,
  pressDash,
  pressJump,
  releaseJump,
  resizeWorld,
  resumeGame,
  stepGame,
  type GameState,
  type RunLog,
} from './engine'
import type { HeldInput } from '../types/game'

/**
 * Plays a recorded run again, tick by tick, with the same seed and the same inputs. The engine
 * is deterministic, so it ends with the same score: a server can use this to check a score
 * instead of trusting the client. Stops at the log's end tick (or at game over).
 */
export function replayRun(log: RunLog): GameState {
  const state = createGameState({
    mode: log.mode,
    width: log.width,
    height: log.height,
    seed: log.seed,
    intro: log.intro,
    checkpoint: log.checkpoint,
  })
  let held: HeldInput = { left: false, right: false, down: false }
  let next = 0
  const lastTick = log.endTick ?? (log.events.length ? log.events[log.events.length - 1].tick + 1 : 0)

  while (!state.gameOver && state.tick <= lastTick) {
    // Everything the player did before this tick was simulated, in the same order.
    while (next < log.events.length && log.events[next].tick === state.tick) {
      const event = log.events[next++]
      if (event.type === 'held') held = event.held
      else if (event.type === 'jump') pressJump(state)
      else if (event.type === 'jumpEnd') releaseJump(state)
      else if (event.type === 'dash') pressDash(state)
      else if (event.type === 'resume') resumeGame(state)
      else if (event.type === 'signature') awardSignature(state, event.artist)
      else if (event.type === 'resize') resizeWorld(state, event.width, event.height)
    }
    // A graffiti encounter the log never resumed: the run ended there.
    if (state.paused) break
    stepGame(state, held, TICK_MS)
    state.tick += 1
  }
  return state
}

/** Whether a log replays to the score it claims. */
export function verifyRun(log: RunLog) {
  const state = replayRun(log)
  return { valid: state.gameOver && state.tick === log.endTick && state.score === log.score, score: state.score, tick: state.tick }
}
