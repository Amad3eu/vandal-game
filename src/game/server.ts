/**
 * What the server needs from the engine, to replay runs and check scores. `npm run
 * build:server-engine` bundles it into supabase/functions/_shared/vandal-engine.js (run it and
 * redeploy the functions whenever the rules change, together with ENGINE_VERSION).
 */
export { ENGINE_VERSION, MIN_WORLD_HEIGHT, MIN_WORLD_WIDTH, TICK_MS } from './config'
export { replayRun, verifyRun } from './replay'
export type { RunEvent, RunLog } from './engine'
