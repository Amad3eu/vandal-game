// The run check lives in src/game/submission.ts (shared with the Node server in
// server/leaderboard) and comes here inside the engine bundle (npm run build:server-engine).
// @deno-types="./vandal-engine.d.ts"
export { LIMITS, checkSubmission, isRunLog } from './vandal-engine.js'
export type { IssuedSeed, SubmissionResult } from './vandal-engine.d.ts'
