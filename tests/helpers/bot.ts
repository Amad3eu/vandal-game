import { advanceGame, createGameState, pressJump, releaseJump, resumeGame, type GameState } from '../../src/game/engine'
import type { GameMode, Obstacle } from '../../src/types/game'

const FRAME_MS = 1000 / 60
/** No keys held. */
export const IDLE = { left: false, right: false, down: false }
/** Things the bot doesn't need to dodge (trains and buildings are handled on their own: they're solid). */
export const SAFE = new Set(['skate', 'coin', 'power-lightning', 'power-jump', 'floating-platform', 'ramp', 'trampoline', 'checkpoint', 'wall', 'graffiti-artist'])

/** One frame of play; a graffiti encounter is closed right away (after `onArtist`, e.g. to sign). */
export function frame(state: GameState, input = IDLE, onArtist?: (state: GameState) => void) {
  const events = advanceGame(state, input, FRAME_MS)
  if (events.some((event) => event.type === 'artist')) {
    onArtist?.(state)
    resumeGame(state)
  }
  return events
}

/**
 * A simple player for tests: jumps over the next hazard when it gets close, ducks under hanging
 * beams, runs up ramps onto trains and jumps early onto trains without one. Stops trying after
 * `seconds` so the run ends. Good for runs of about a minute with a few thousand points.
 */
export function playRun(seed: number, { mode = 'runner' as GameMode, seconds = 60, onArtist }: { mode?: GameMode; seconds?: number; onArtist?: (state: GameState) => void } = {}) {
  const state = createGameState({ mode, width: 1280, height: 720, seed, intro: true, record: true })
  let tick = 0
  let releaseAt = -1
  while (!state.gameOver && tick < 60 * seconds) {
    tick++
    if (tick === releaseAt) releaseJump(state)
    const { jump, duck } = decide(state, mode)
    if (jump && (!state.player.isJumping || state.wallCling) && releaseAt < tick) {
      pressJump(state)
      releaseAt = tick + 14
    }
    frame(state, { ...IDLE, right: mode === 'free', down: duck }, onArtist)
  }
  // Stops dodging so the run ends. In the free mode trains and buildings are walls that don't
  // kill: it still climbs those, to walk on into the next hazard.
  for (let i = 0; i < 60 * 60 && !state.gameOver; i++) {
    tick++
    if (tick === releaseAt) releaseJump(state)
    const { jump } = mode === 'free' ? decide(state, mode, 0, true) : { jump: false }
    if (jump && (!state.player.isJumping || state.wallCling) && releaseAt < tick) {
      pressJump(state)
      releaseAt = tick + 14
    }
    frame(state, { ...IDLE, right: mode === 'free' }, onArtist)
  }
  if (!state.gameOver || !state.log) throw new Error('the bot never finished the run')
  return { state, log: state.log }
}

/**
 * What the bot does this frame, looking at the next thing ahead. `late` shifts its reaction by
 * that many frames (negative: early), to play like a person instead of a frame-perfect machine.
 * `climbOnly` looks only at trains and buildings (to get over them, not dodge hazards).
 */
export function decide(state: GameState, mode: GameMode, late = 0, climbOnly = false) {
  const p = state.player
  const front = p.x + p.width
  const ahead = state.obstacles
    .filter((o: Obstacle) => !o.knocked && (climbOnly ? o.type === 'train' || o.type === 'building' : !SAFE.has(o.type)) && o.x + o.width > p.x)
    .sort((a: Obstacle, b: Obstacle) => a.x - b.x)
  const next = ahead[0]
  // Checkpoint stairs: from the ground or a step, jump to the next step up (it's one-way: the
  // jump goes through it from below and lands on top).
  const bottom = p.y + p.height
  const grounded = !p.isJumping
  const step = state.obstacles
    .filter((o: Obstacle) => o.type === 'floating-platform' && o.y < bottom - 4 && o.x + o.width > front)
    .sort((a: Obstacle, b: Obstacle) => a.x - b.x)[0]
  const speed = mode === 'free' ? 5 : state.speed
  if (step && grounded && (!next || step.x < next.x)) {
    const lead = step.x - front + late * speed
    // From a step whose end is near, or from the ground when the step is close: a full jump.
    return { jump: lead < speed * 14 && lead > -step.width + speed * 10, duck: false }
  }
  if (!next) return { jump: false, duck: false }
  const gap = next.x - front + late * speed
  // Beams and high birds (at head height): duck. Low birds: jump, like anything else.
  const highBird = next.type === 'bird' && state.config.groundLevel - next.y > 80
  if (next.type === 'duck-bar' || highBird) return { jump: false, duck: gap < speed * 8 }
  // Phase 3 buildings: grab the wall and jump again; low ones are jumped onto like a train.
  if (state.wallCling) return { jump: true, duck: false }
  if (next.type === 'building') {
    const onTop = p.y + p.height <= next.y + 2
    const roof = state.config.groundLevel - next.y
    if (onTop) return { jump: false, duck: false }
    if (mode === 'free') return { jump: gap < speed * 10, duck: false } // also when already against its wall
    return { jump: roof < 150 ? gap < speed * 20 - 16 && gap > speed * 12 - 16 : gap < speed * 10 && gap > 0, duck: false }
  }
  if (next.type === 'train') {
    const onTop = p.y + p.height <= next.y + 2
    const ramp = state.obstacles.some((o: Obstacle) => o.type === 'ramp' && o.x + o.width >= next.x - 2 && o.x < next.x && o.x + o.width > p.x)
    if (onTop || ramp) return { jump: false, duck: false } // on the roof, or walking up the ramp
    // Free mode: walk up to its side and jump on. Runner: jump early enough to be over the roof
    // when reaching the front.
    if (mode === 'free') return { jump: gap < 30, duck: false }
    return { jump: gap < speed * 20 - 16 && gap > speed * 12 - 16, duck: false }
  }
  const reach = mode === 'free' ? 30 : speed * 7
  return { jump: gap < reach && gap > -10, duck: false }
}
