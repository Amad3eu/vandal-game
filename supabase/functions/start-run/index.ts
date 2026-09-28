// Hands out the seed for a new run, so a player can't pick a "good" seed by trying offline.
import { adminClient, corsHeaders, json, requireUser } from '../_shared/http.ts'

/** More than this in 10 minutes looks like a script, not a person restarting runs. */
const SEEDS_PER_10_MINUTES = 40

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method' }, 405)

  const admin = adminClient()
  const user = await requireUser(req, admin)
  if (!user) return json({ error: 'auth' }, 401)

  const body = await req.json().catch(() => ({}))
  const mode = body?.mode
  if (mode !== 'runner' && mode !== 'free') return json({ error: 'mode' }, 400)

  const since = new Date(Date.now() - 10 * 60_000).toISOString()
  const { count } = await admin
    .from('run_seeds')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('issued_at', since)
  if ((count ?? 0) >= SEEDS_PER_10_MINUTES) return json({ error: 'rate-limit' }, 429)

  const seed = crypto.getRandomValues(new Uint32Array(1))[0]
  const { data, error } = await admin.from('run_seeds').insert({ user_id: user.id, seed, mode }).select('id, seed').single()
  if (error || !data) return json({ error: 'db' }, 500)
  return json({ seedId: data.id, seed: Number(data.seed) })
})
