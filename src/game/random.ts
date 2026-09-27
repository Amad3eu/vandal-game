/**
 * Seeded random numbers (mulberry32): the same seed gives the same obstacles, so a recorded
 * run can be replayed exactly (e.g. by a server checking a score).
 */
export function createRandom(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A fresh 32-bit seed for a new run. */
export function newSeed() {
  return Math.floor(Math.random() * 4294967296) >>> 0
}
