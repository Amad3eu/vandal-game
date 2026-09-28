/**
 * What a leaderboard server needs from the game: the engine to replay runs and the check that
 * decides if a run counts. `npm run build:server-engine` bundles it into
 * supabase/functions/_shared/vandal-engine.js for the Supabase functions (run it and redeploy
 * them whenever the rules change, together with ENGINE_VERSION); the Node server in
 * server/leaderboard imports it directly.
 */
export { ENGINE_VERSION, MIN_WORLD_HEIGHT, MIN_WORLD_WIDTH, TICK_MS } from './config'
export { replayRun, verifyRun } from './replay'
export { LIMITS, checkSubmission, isRunLog } from './submission'
export type { IssuedSeed, SubmissionResult } from './submission'
export type { RunEvent, RunLog } from './engine'
