/** The admin area of the leaderboard server (server/leaderboard/admin.ts), with this admin's key. */

export const SERVER_URL = (import.meta.env.VITE_LEADERBOARD_URL ?? '').replace(/\/+$/, '')

export type ArtistKind = 'graffiti' | 'dj' | 'mc' | 'breaking'

export interface ArtistForm {
  name: string
  kind: ArtistKind
  city: string | null
  bio: string | null
  instagram: string | null
  color: string
  signature: string | null
  minScore: number
  phase: 1 | 2 | 3
  active: boolean
}

export interface Artist extends ArtistForm {
  id: string
  updatedAt: string
}

export interface AdminPlayer {
  id: string
  nickname: string | null
  hidden: boolean
  best: number
  runs: number
  lastRunAt: string
  createdAt: string
}

export interface AdminRun {
  id: string
  mode: string
  score: number
  seconds: number
  engineVersion: number
  createdAt: string
}

export interface LogEntry {
  id: number
  admin: string
  action: string
  target: string | null
  details: Record<string, unknown> | null
  createdAt: string
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: { error?: string; field?: string } | null
  ) {
    super(`admin api ${status}`)
  }
}

export function createAdminApi(key: string) {
  const request = async <T>(method: string, path: string, body?: unknown): Promise<T> => {
    const response = await fetch(`${SERVER_URL}/admin${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${key}`,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) throw new ApiError(response.status, data)
    return data as T
  }

  return {
    me: () => request<{ name: string }>('GET', '/me'),
    players: (mode: 'runner' | 'free') => request<AdminPlayer[]>('GET', `/players?mode=${mode}`),
    updatePlayer: (id: string, change: { nickname?: string | null; hidden?: boolean }) =>
      request<{ id: string; nickname: string | null; hidden: boolean }>('PUT', `/players/${id}`, change),
    playerRuns: (id: string) => request<AdminRun[]>('GET', `/players/${id}/runs`),
    deleteRun: (id: string) => request<{ deleted: true }>('DELETE', `/runs/${id}`),
    artists: () => request<Artist[]>('GET', '/artists'),
    createArtist: (artist: ArtistForm) => request<Artist>('POST', '/artists', artist),
    updateArtist: (id: string, artist: ArtistForm) => request<Artist>('PUT', `/artists/${id}`, artist),
    deleteArtist: (id: string) => request<{ deleted: true }>('DELETE', `/artists/${id}`),
    log: () => request<LogEntry[]>('GET', '/log'),
  }
}

export type AdminApi = ReturnType<typeof createAdminApi>

/** Plain words for what went wrong. */
export function errorText(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Chave de admin inválida.'
    if (error.status === 429) return 'Muitas tentativas. Espere alguns minutos.'
    if (error.status === 404) return 'Não encontrado (talvez já tenha sido apagado).'
    if (error.body?.error === 'nickname') return 'Apelido inválido: 2 a 20 letras, números, espaço, _ . -'
    if (error.body?.error === 'field') return `Campo inválido: ${FIELD_LABELS[error.body.field ?? ''] ?? error.body.field}.`
    return `Erro do servidor (${error.status}).`
  }
  return 'Não deu para falar com o servidor.'
}

const FIELD_LABELS: Record<string, string> = {
  name: 'nome (2 a 40 caracteres)',
  kind: 'tipo',
  city: 'cidade (até 40 caracteres)',
  bio: 'bio (até 280 caracteres)',
  instagram: 'Instagram (só o @usuario)',
  color: 'cor',
  signature: 'assinatura (PNG, WebP ou JPEG de até 300 KB)',
  minScore: 'pontuação mínima',
  phase: 'fase',
  active: 'ativo',
}
