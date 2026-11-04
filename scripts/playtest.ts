/**
 * Playtest with a bot: many runs on the real engine, measuring what a player meets. Run it after
 * changing obstacles or their odds, to see if the game got too easy, too hard or too repetitive:
 *
 *   npm run playtest
 *
 * 1. Bot runs (300 per player profile, Corrida): how long they last and what ends them. The bot
 *    jumps the next hazard, ducks under beams, takes ramps and jumps early onto trains. The
 *    "experiente" and "iniciante" profiles react a few frames early or late at random, like a
 *    person; "perfeito" never misses (how forgiving the rules are at best).
 * 2. Tour (invincible, 3 minutes in each phase, no checkpoint climbs): how often each thing
 *    shows up, the time between hazards and how long the screen stays empty.
 */
import { PHASE_2_SCORE, PHASE_3_SCORE } from '../src/game/config'
import { advanceGame, createGameState, pressJump, releaseJump, resumeGame } from '../src/game/engine'
import { createRandom } from '../src/game/random'
import type { GamePhase, Obstacle } from '../src/types/game'
import { IDLE, SAFE, decide } from '../tests/helpers/bot'

const FRAME_MS = 1000 / 60
const RUNS = 300
const MAX_SECONDS = 300
/** Pickups and platforms: not something that ends a run. */
const NOT_HAZARDS = SAFE

const median = (values: number[]) => quantile(values, 0.5)
const quantile = (values: number[], q: number) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted.length ? sorted[Math.floor(q * (sorted.length - 1))] : 0
}
const percent = (part: number, whole: number) => `${((100 * part) / Math.max(1, whole)).toFixed(1)}%`

/** What was touching the player when the run ended. */
function deathCause(obstacles: Obstacle[], player: { x: number; y: number; width: number; height: number }) {
  const touching = obstacles.find(
    (o) =>
      !NOT_HAZARDS.has(o.type) &&
      o.x < player.x + player.width &&
      o.x + o.width > player.x &&
      o.y < player.y + player.height &&
      o.y + o.height > player.y
  )
  return touching?.type ?? 'outro'
}

/** How far off (in frames, at random) a profile reacts to each obstacle. */
const PROFILES = { perfeito: 0, experiente: 3, iniciante: 6 }

function botRuns(profile: keyof typeof PROFILES) {
  const causes: Record<string, number> = {}
  const phases: Record<number, number> = {}
  const seconds: number[] = []
  const scores: number[] = []
  const reachedAt: Record<number, number[]> = { 2: [], 3: [] } // seconds until each phase opened
  const jitter = PROFILES[profile]
  for (let seed = 1; seed <= RUNS; seed++) {
    const state = createGameState({ mode: 'runner', width: 1280, height: 720, seed, intro: true })
    const reflexes = createRandom(seed * 7919)
    const lateness = new Map<number, number>() // per obstacle: how early or late this time
    let tick = 0
    let releaseAt = -1
    let phase = state.phase
    while (!state.gameOver && tick < 60 * MAX_SECONDS) {
      tick++
      if (state.phase !== phase) {
        phase = state.phase
        reachedAt[phase].push(tick / 60)
      }
      if (tick === releaseAt) releaseJump(state)
      for (const o of state.obstacles) if (!lateness.has(o.id)) lateness.set(o.id, (reflexes() * 2 - 1) * jitter)
      const next = state.obstacles.filter((o) => !NOT_HAZARDS.has(o.type) && o.x + o.width > state.player.x).sort((a, b) => a.x - b.x)[0]
      const { jump, duck } = decide(state, 'runner', next ? lateness.get(next.id) : 0)
      if (jump && (!state.player.isJumping || state.wallCling) && releaseAt < tick) {
        pressJump(state)
        releaseAt = tick + 14
      }
      if (advanceGame(state, { ...IDLE, down: duck }, FRAME_MS).some((e) => e.type === 'artist')) resumeGame(state)
    }
    phases[state.phase] = (phases[state.phase] ?? 0) + 1
    const cause = state.gameOver ? deathCause(state.obstacles, state.player) : `sobreviveu ${MAX_SECONDS / 60} min`
    causes[cause] = (causes[cause] ?? 0) + 1
    seconds.push(tick / 60)
    scores.push(state.score)
  }
  console.log(`\n## Robô ${profile}: ${RUNS} partidas (Corrida, até ${MAX_SECONDS / 60} min)`)
  console.log(`duração (s): mediana ${median(seconds).toFixed(0)} · 10% ${quantile(seconds, 0.1).toFixed(0)} · 90% ${quantile(seconds, 0.9).toFixed(0)}`)
  console.log(`pontos: mediana ${median(scores)} · 90% ${quantile(scores, 0.9)}`)
  console.log(`fase alcançada: ${[1, 2, 3].map((phase) => `${phase}: ${percent(phases[phase] ?? 0, RUNS)}`).join(' · ')}`)
  console.log(`começo de cada fase (s, mediana de quem chegou): fase 2 em ${median(reachedAt[2]).toFixed(0)} · fase 3 em ${median(reachedAt[3]).toFixed(0)}`)
  console.log(
    'o que encerrou a partida:',
    Object.entries(causes)
      .sort((a, b) => b[1] - a[1])
      .map(([cause, count]) => `${cause} ${percent(count, RUNS)}`)
      .join(' · ')
  )
}

function tour(phase: GamePhase) {
  const seen: Record<string, number> = {}
  const gaps: number[] = []
  let empty = 0
  let frames = 0
  const runs = 40
  const minutes = 3
  for (let seed = 1; seed <= runs; seed++) {
    const state = createGameState({ mode: 'runner', width: 1280, height: 720, seed })
    state.phase = phase
    if (phase > 1) state.score = phase === 2 ? PHASE_2_SCORE : PHASE_3_SCORE
    const ids = new Set<number>()
    let lastHazard: number | null = null
    for (let tick = 1; tick <= 60 * 60 * minutes; tick++) {
      // Invincible, renewed every frame: the "getting back up" kind, which (unlike lightning)
      // doesn't speed the run up and skew the rhythm being measured.
      state.recoverMs = 60_000
      // No checkpoint climbs: held in one phase, the missed climb would come back again and again.
      state.climbCooldown = Infinity
      if (advanceGame(state, IDLE, FRAME_MS).some((e) => e.type === 'artist')) resumeGame(state)
      state.phase = phase
      for (const o of state.obstacles) {
        if (ids.has(o.id)) continue
        ids.add(o.id)
        seen[o.type] = (seen[o.type] ?? 0) + 1
        if (!NOT_HAZARDS.has(o.type)) {
          if (lastHazard !== null) gaps.push((tick - lastHazard) / 60)
          lastHazard = tick
        }
      }
      frames++
      if (!state.obstacles.some((o) => o.x > state.player.x && o.x < state.worldWidth && o.type !== 'coin')) empty++
    }
  }
  console.log(`\n## Volta invencível: fase ${phase} (${runs} partidas × ${minutes} min)`)
  console.log(
    'por minuto:',
    Object.entries(seen)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => `${type} ${(count / (runs * minutes)).toFixed(1)}`)
      .join(' · ')
  )
  console.log(`tempo entre perigos (s): mediana ${median(gaps).toFixed(2)} · 90% ${quantile(gaps, 0.9).toFixed(2)} · máximo ${Math.max(...gaps).toFixed(1)}`)
  console.log(`tela sem nada pela frente: ${percent(empty, frames)}`)
}

console.log('# Playtest do Vandal Game')
for (const profile of ['perfeito', 'experiente', 'iniciante'] as const) botRuns(profile)
for (const phase of [1, 2, 3] as const) tour(phase)
