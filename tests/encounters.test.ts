import { describe, expect, it } from 'vitest'
import { ARTIST_INFO } from '../src/data/graffitiArtists'
import {
  artOwner,
  fromRoster,
  gameArtist,
  hasTheirSignature,
  isGameArtist,
  nameSignature,
  pickEncounterArtist,
  pickGameArtist,
  theirSignatureId,
  type RosterArtist,
} from '../src/data/encounters'

const artist = (id: string, patch: Partial<RosterArtist> = {}): RosterArtist => ({
  id,
  name: `Artista ${id}`,
  kind: 'graffiti',
  city: null,
  bio: null,
  instagram: null,
  color: '#ff4d9d',
  minScore: 0,
  phase: 1,
  signatureUrl: null,
  ...patch,
})

const pick = (roster: RosterArtist[], { phase = 1 as 1 | 2 | 3, score = 0, collected = [] as string[], met = [] as string[] } = {}) =>
  pickEncounterArtist(roster, { phase, score, collected: new Set(collected), metThisRun: new Set(met), random: () => 0 })?.id ?? null

describe('who shows up in an encounter (src/data/encounters.ts)', () => {
  it('only artists whose phase and score were reached', () => {
    const roster = [artist('a', { phase: 2 }), artist('b', { minScore: 2000 }), artist('c', { phase: 3, minScore: 5000 })]
    expect(pick(roster, { phase: 1, score: 1500 })).toBeNull()
    expect(pick(roster, { phase: 1, score: 2000 })).toBe('b')
    expect(pick(roster, { phase: 2, score: 0 })).toBe('a')
    expect(pick(roster, { phase: 3, score: 5000, met: ['a', 'b'] })).toBe('c')
  })

  it("prefers someone whose signature the player doesn't have yet", () => {
    const roster = [artist('a'), artist('b')]
    expect(pick(roster, { collected: ['a'] })).toBe('b')
    expect(pick(roster, { collected: ['a', 'b'] })).toBe('a') // everyone collected: anyone not met in this run
  })

  it("doesn't repeat someone in the same run: the game's own artist shows up instead", () => {
    expect(pick([artist('a')], { met: ['a'] })).toBeNull()
  })

  it("the game's own artists don't repeat in a run either", () => {
    const game = (drawn: 'remo' | 'pixo' | 'nina', met: string[], onStreet: string[] = []) => pickGameArtist(drawn, new Set(met), new Set(onStreet))
    expect(game('remo', [])).toBe('remo') // the one the engine drew
    expect(game('remo', ['remo'])).toBe('pixo') // already met: another one
    expect(game('remo', ['remo', 'pixo'])).toBe('nina')
    expect(game('remo', ['remo', 'pixo', 'nina'])).toBeNull() // met everyone: they just wave
    // Not met but already on the street: someone else, if there's anyone left.
    expect(game('pixo', ['remo'], ['pixo'])).toBe('nina')
    // Everyone not met is on the street: one of them shows up twice rather than someone met.
    expect(game('pixo', ['remo'], ['pixo', 'nina'])).toBe('pixo')
  })

  it("an artist's signature goes in the blackbook once", () => {
    const book = [{ id: `${theirSignatureId('remo')}1700000000000` }, { id: 'pixo-signature-1700000000001' }]
    expect(hasTheirSignature(book, 'remo')).toBe(true)
    expect(hasTheirSignature(book, 'pixo')).toBe(false) // the player's own drawing for Pixo isn't Pixo's signature
  })

  it('an empty roster (offline) gives the game its own artists', () => {
    expect(pick([])).toBeNull()
    expect(gameArtist('nina')).toMatchObject({ id: 'nina', name: ARTIST_INFO.nina.name, kind: 'graffiti' })
    expect(gameArtist('nina').signature).toMatch(/^data:image\/svg\+xml/)
  })

  it('fills in a default line and draws the name when there is no bio or image', () => {
    const dj = fromRoster(artist('d', { kind: 'dj', name: 'DJ Beco' }))
    expect(dj.bio).toMatch(/som/)
    expect(dj.signature).toBeNull()
    const svg = decodeURIComponent(nameSignature('<DJ "Beco">', '#4ecdc4'))
    expect(svg).toContain('DJ Beco')
    expect(svg).not.toContain('<DJ')
  })

  it('tells whose a blackbook item is, also for real artists offline', () => {
    expect(isGameArtist('remo')).toBe(true)
    expect(isGameArtist('3f2b6c1e-8a4d-4c7e-9b1a-2d3e4f5a6b7c')).toBe(false)
    expect(artOwner({ artist: 'pixo' })).toEqual({ name: ARTIST_INFO.pixo.name, color: ARTIST_INFO.pixo.color })
    expect(artOwner({ artist: 'x-1', artistName: 'MC Laje', artistColor: '#ffd23f' })).toEqual({ name: 'MC Laje', color: '#ffd23f' })
    expect(artOwner({ artist: 'x-2' })).toEqual({ name: 'Artista', color: '#ff4d9d' })
  })
})
