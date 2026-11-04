import type { ArtistKind } from './encounters'

/**
 * The street artists drawn as simple pixel-art people, standing (web and app draw these same
 * pixels). Placeholder art until real sprites come: cap and hoodie in the artist's color, and
 * their thing: a spray can, headphones, a mic, or a tracksuit for b-boys/b-girls.
 *
 * Letters: K outline, S skin, C cap, H hoodie, h hoodie shade, P pants, B sneakers, E eye,
 * G can, N nozzle, D headphones, M mic, W white stripe. A dot is transparent.
 */
const BODY = [
  '......KKKKK.....',
  '.....KCCCCCK....',
  '....KCCCCCCCK...',
  '..KKCCCCCCCCK...',
  '..KKKKKKKKKKK...',
  '....KSSSSSSK....',
  '....KSESSSSK....',
  '....KSSSSSSK....',
  '.....KSSSSK.....',
  '....KKHHHHKK....',
  '...KHHHHHHHHK...',
  '..KHHhHHHHhHHK..',
  '..KHHhHHHHhHHK..',
  '..KSKHHHHHHKSK..',
  '..KKKHHHHHHKKK..',
  '....KHHHHHHK....',
  '....KPPPPPPK....',
  '....KPPPKPPK....',
  '....KPPPKPPK....',
  '....KPPPKPPK....',
  '....KPPK.KPPK...',
  '...KBBBK.KBBBK..',
  '...KKKKK.KKKKK..',
]

type Overlay = [row: number, col: number, letter: string][]

/** Each kind's thing, drawn over the body. */
const PROPS: Record<ArtistKind, Overlay> = {
  // A spray can in the right hand, nozzle up.
  graffiti: [
    [10, 14, 'K'], [11, 13, 'K'], [11, 14, 'N'], [11, 15, 'K'],
    [12, 13, 'K'], [12, 14, 'G'], [12, 15, 'K'],
    [13, 13, 'G'], [13, 14, 'G'], [13, 15, 'K'],
    [14, 13, 'K'], [14, 14, 'G'], [14, 15, 'K'],
    [15, 13, 'K'], [15, 14, 'K'],
  ],
  // Headphones over the cap, on both ears.
  dj: [
    [1, 4, 'D'], [1, 10, 'D'], [0, 5, 'D'], [0, 9, 'D'],
    [5, 3, 'D'], [6, 3, 'D'], [7, 3, 'D'],
    [5, 12, 'D'], [6, 12, 'D'], [7, 12, 'D'],
  ],
  // A mic up to the mouth.
  mc: [
    [7, 2, 'K'], [7, 3, 'M'], [8, 2, 'K'], [8, 3, 'M'],
    [9, 3, 'K'], [10, 2, 'K'], [11, 2, 'S'], [12, 2, 'S'],
  ],
  // A tracksuit: white stripes down the arms and legs.
  breaking: [
    [10, 4, 'W'], [11, 3, 'W'], [12, 3, 'W'],
    [10, 11, 'W'], [11, 12, 'W'], [12, 12, 'W'],
    [16, 5, 'W'], [17, 5, 'W'], [18, 5, 'W'], [19, 5, 'W'],
    [16, 10, 'W'], [17, 10, 'W'], [18, 10, 'W'], [19, 10, 'W'],
  ],
}

const SKINS = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#5c3a21']

/** A darker shade of a #rrggbb color. */
function shade(hex: string, amount = 0.72) {
  const n = Number.parseInt(hex.slice(1), 16)
  const channel = (shift: number) => Math.round(((n >> shift) & 255) * amount)
  return `#${[16, 8, 0].map((shift) => channel(shift).toString(16).padStart(2, '0')).join('')}`
}

/** A run of same-colored pixels in one row (fewer shapes to draw than one per pixel). */
export interface PixelRun {
  x: number
  y: number
  width: number
  color: string
}

export const PERSON_SIZE = { width: BODY[0].length, height: BODY.length }

/**
 * The pixels of one artist: their color on the cap and hoodie, a skin tone picked from their id
 * (so each one always looks the same) and their kind's thing.
 */
export function personPixels({ id, color, kind }: { id: string; color: string; kind: ArtistKind }): PixelRun[] {
  let hash = 0
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  const palette: Record<string, string> = {
    K: '#140f1f',
    S: SKINS[hash % SKINS.length],
    C: shade(color, 0.85),
    H: color,
    h: shade(color),
    P: '#2d2a3e',
    B: '#f5f5f5',
    E: '#140f1f',
    G: '#ffd23f',
    N: '#d9d9d9',
    D: '#e8e8f0',
    M: '#9aa0a6',
    W: '#ffffff',
  }
  const grid = BODY.map((row) => row.split(''))
  for (const [row, col, letter] of PROPS[kind]) grid[row][col] = letter
  const runs: PixelRun[] = []
  grid.forEach((row, y) =>
    row.forEach((letter, x) => {
      if (letter === '.') return
      const last = runs[runs.length - 1]
      if (last && last.y === y && last.x + last.width === x && last.color === palette[letter]) last.width++
      else runs.push({ x, y, width: 1, color: palette[letter] })
    })
  )
  return runs
}
