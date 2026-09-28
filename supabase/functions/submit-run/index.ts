// Receives a finished run, replays it with the game's engine and, if the replay matches, puts
// the replayed score on the leaderboard.
import { adminClient, corsHeaders, json, requireUser } from '../_shared/http.ts'
import { checkSubmission, type IssuedSeed } from '../_shared/submission.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method' }, 405)

  const admin = adminClient()
  const user = await requireUser(req, admin)
  if (!user) return json({ error: 'auth' }, 401)

  const body = await req.json().catch(() => null)
  const seedId = body?.seedId
  if (typeof seedId !== 'string') return json({ accepted: false, reason: 'seed-unknown' }, 400)

  const { data: seed } = await admin.from('run_seeds').select('*').eq('id', seedId).maybeSingle()
  const result = checkSubmission(body.log, seed ? { ...seed, seed: Number(seed.seed) } as IssuedSeed : null, user.id)
  if (!result.ok) return json({ accepted: false, reason: result.reason }, 422)

  // Each seed counts once: the update only matches while it's still unused.
  const { data: claimed } = await admin
    .from('run_seeds')
    .update({ used_at: new Date().toISOString() })
    .eq('id', seedId)
    .is('used_at', null)
    .select('id')
  if (!claimed?.length) return json({ accepted: false, reason: 'seed-used' }, 409)

  const { error } = await admin.from('runs').insert({
    user_id: user.id,
    seed_id: seedId,
    mode: body.log.mode,
    engine_version: body.log.version,
    score: result.score,
    end_tick: result.endTick,
    log: body.log,
  })
  if (error) return json({ error: 'db' }, 500)

  const { data: standing } = await admin.rpc('player_standing', { p_mode: body.log.mode, p_user: user.id })
  const row = Array.isArray(standing) ? standing[0] : null
  return json({ accepted: true, score: result.score, best: row?.best ?? result.score, rank: row?.rank ?? null })
})
