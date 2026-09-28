// Types for vandal-engine.js, the bundle of src/game/server.ts (npm run build:server-engine).
// Keep in step with src/game/engine.ts (RunLog, RunEvent), src/game/replay.ts and src/game/submission.ts.

export type HeldInput = { left: boolean; right: boolean; down: boolean }

export type RunEvent =
  | { tick: number; type: 'held'; held: HeldInput }
  | { tick: number; type: 'jump' | 'jumpEnd' | 'dash' | 'resume' }
  | { tick: number; type: 'signature'; artist: 'remo' | 'pixo' | 'nina' }
  | { tick: number; type: 'resize'; width: number; height: number }

export interface RunLog {
  version: number
  mode: 'runner' | 'free'
  width: number
  height: number
  seed: number
  intro: boolean
  checkpoint: { phase: 1 | 2 | 3; score: number; speed: number; coins: number; signatures: string[] } | null
  events: RunEvent[]
  endTick?: number
  score?: number
}

export declare const ENGINE_VERSION: number
export declare const TICK_MS: number
export declare const MIN_WORLD_WIDTH: number
export declare const MIN_WORLD_HEIGHT: number

export declare function replayRun(log: RunLog): { score: number; tick: number; gameOver: boolean }
export declare function verifyRun(log: RunLog): { valid: boolean; score: number; tick: number }

export interface IssuedSeed {
  id: string
  user_id: string
  seed: number
  mode: string
  issued_at: string
  used_at: string | null
}

export type SubmissionResult = { ok: true; score: number; endTick: number } | { ok: false; reason: string }

export declare const LIMITS: {
  maxRunMinutes: number
  maxEvents: number
  seedTtlMinutes: number
  slackMs: number
  maxWorld: number
}

export declare function isRunLog(value: unknown): value is RunLog
export declare function checkSubmission(log: unknown, seed: IssuedSeed | null, userId: string, now?: number): SubmissionResult
