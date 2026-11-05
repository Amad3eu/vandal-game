import type { ArtistId, GamePhase, GraffitiArtist, GraffitiArt } from '../types/game'
import { ARTIST_SIGNATURES } from './artistSignatures'
import { ARTIST_INFO } from './graffitiArtists'

/**
 * Who the player meets in a graffiti encounter. The engine decides when an encounter happens
 * (the same for everyone, so replays match); the front end decides who it is: a real artist,
 * DJ, MC or b-boy/b-girl registered in the admin page, by phase and score, or one of the game's
 * own artists when none fits (or when playing offline).
 */

export type ArtistKind = 'graffiti' | 'dj' | 'mc' | 'breaking'

export interface EncounterArtist {
  id: ArtistId
  name: string
  color: string
  kind: ArtistKind
  /** What they say when you meet them. */
  bio: string
  city: string | null
  instagram: string | null
  /** Image of their signature (a URL, or a data URL), or null to draw their name instead. */
  signature: string | null
  /** From which phase and score they can show up. */
  phase: GamePhase
  minScore: number
}

/** A real artist as the leaderboard server lists them (GET /v1/artists). */
export interface RosterArtist {
  id: string
  name: string
  kind: ArtistKind
  city: string | null
  bio: string | null
  instagram: string | null
  color: string
  minScore: number
  phase: GamePhase
  /** Where to load the signature image from, or null when there is none. */
  signatureUrl: string | null
}

export const KIND_LABEL: Record<ArtistKind, string> = { graffiti: 'grafite', dj: 'DJ', mc: 'MC', breaking: 'breaking' }
export const KIND_ICON: Record<ArtistKind, string> = { graffiti: '🎨', dj: '🎧', mc: '🎤', breaking: '🌀' }

const DEFAULT_BIO: Record<ArtistKind, string> = {
  graffiti: 'E aí! Tô pintando por aqui. Bora trocar assinatura?',
  dj: 'Salve! Tô soltando o som hoje. Bora trocar assinatura?',
  mc: 'Salve! Acabei de sair da roda. Bora trocar assinatura?',
  breaking: 'Salve! Tô treinando uns passos aqui. Bora trocar assinatura?',
}

export const isGameArtist = (id: ArtistId): id is GraffitiArtist => Object.prototype.hasOwnProperty.call(ARTIST_INFO, id)

/** One of the game's own artists. */
export function gameArtist(id: GraffitiArtist): EncounterArtist {
  const info = ARTIST_INFO[id]
  return {
    id,
    name: info.name,
    color: info.color,
    kind: 'graffiti',
    bio: info.description,
    city: null,
    instagram: null,
    signature: ARTIST_SIGNATURES[id],
    phase: 1,
    minScore: 0,
  }
}

export function fromRoster(artist: RosterArtist): EncounterArtist {
  return {
    id: artist.id,
    name: artist.name,
    color: artist.color,
    kind: artist.kind,
    bio: artist.bio ?? DEFAULT_BIO[artist.kind],
    city: artist.city,
    instagram: artist.instagram,
    signature: artist.signatureUrl,
    phase: artist.phase,
    minScore: artist.minScore,
  }
}

/** A signature drawn from the name, for artists without an image (SVG data URL). */
export function nameSignature(name: string, color: string) {
  const text = name.replace(/[<>&"']/g, '')
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="150" viewBox="0 0 400 150">` +
    `<rect width="400" height="150" fill="white"/>` +
    `<text x="200" y="92" text-anchor="middle" font-family="Impact, Arial Black, sans-serif" font-size="54" fill="${color}" transform="rotate(-6 200 75)">${text}</text>` +
    `</svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

/**
 * Picks who shows up at an encounter, among the real artists already unlocked (their phase
 * reached and their score beaten) and not met yet in this run: first someone whose signature
 * the player doesn't have yet. Null means none fits (none unlocked, or all met in this run):
 * the game's own artist that the engine spawned shows up instead.
 */
export function pickEncounterArtist(
  roster: RosterArtist[],
  { phase, score, collected, metThisRun, random = Math.random }: { phase: GamePhase; score: number; collected: Set<ArtistId>; metThisRun: Set<ArtistId>; random?: () => number }
): EncounterArtist | null {
  const unlocked = roster.filter((artist) => artist.phase <= phase && artist.minScore <= score)
  const tiers = [
    unlocked.filter((artist) => !collected.has(artist.id) && !metThisRun.has(artist.id)),
    unlocked.filter((artist) => !metThisRun.has(artist.id)),
  ]
  const pool = tiers.find((tier) => tier.length > 0)
  if (!pool) return null
  return fromRoster(pool[Math.floor(random() * pool.length)])
}

/** Name and color of whoever a blackbook item belongs to (real artists keep theirs in the item). */
export function artOwner(art: Pick<GraffitiArt, 'artist' | 'artistName' | 'artistColor'>) {
  if (isGameArtist(art.artist)) return { name: ARTIST_INFO[art.artist].name, color: ARTIST_INFO[art.artist].color }
  return { name: art.artistName ?? 'Artista', color: art.artistColor ?? '#ff4d9d' }
}
