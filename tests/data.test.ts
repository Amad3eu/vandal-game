import { describe, expect, it } from 'vitest'
import { PHASE_2_SCORE, PHASE_3_SCORE } from '../src/game/config'
import { ROUTE_STOPS, flagDue, formatDistance, routeProgress } from '../src/data/routeMap'
import { addLocalScore, localTop, parseLocalBoard, type LocalScore } from '../src/data/scoreBoard'
import { slamPose } from '../src/data/slam'

const run = (score: number, date: number, mode: LocalScore['mode'] = 'runner'): LocalScore => ({ mode, score, phase: 1, coins: 0, continued: false, date })

describe('route map (src/data/routeMap.ts)', () => {
  it('moves forward with the score and waits at each flag', () => {
    const points = [0, 400, 900, PHASE_2_SCORE, PHASE_2_SCORE + 500].map((score) => routeProgress(score, 1))
    expect(points).toEqual([...points].sort((a, b) => a - b))
    expect(routeProgress(PHASE_2_SCORE * 3, 1)).toBe(ROUTE_STOPS[0].at)
    expect(routeProgress(PHASE_3_SCORE, 2)).toBe(ROUTE_STOPS[1].at)
    expect(routeProgress(PHASE_3_SCORE + 15_000, 3)).toBeLessThan(1) // the last stretch never quite ends
  })

  it('says a flag is due when its climb can show up', () => {
    expect(flagDue(PHASE_2_SCORE - 1, 1)).toBe(false)
    expect(flagDue(PHASE_2_SCORE, 1)).toBe(true)
    expect(flagDue(PHASE_3_SCORE, 2)).toBe(true)
    expect(flagDue(PHASE_3_SCORE, 3)).toBe(false)
  })

  it('writes distances in meters, then kilometers', () => {
    expect(formatDistance(520)).toBe('520 M')
    expect(formatDistance(1234)).toBe('1,2 KM')
  })
})

describe('scoreboard on this device (src/data/scoreBoard.ts)', () => {
  it('keeps the best runs of each mode, best first, with the new run ranked', () => {
    let board: LocalScore[] = []
    for (const [score, date] of [[300, 1], [900, 2], [500, 3]]) board = addLocalScore(board, run(score, date)).board
    const added = addLocalScore(board, run(700, 4))
    expect(added.rank).toBe(2)
    expect(localTop(added.board, 'runner').map((r) => r.score)).toEqual([900, 700, 500, 300])
  })

  it('keeps only the top runs and skips runs with no points', () => {
    let board: LocalScore[] = []
    for (let i = 1; i <= 12; i++) board = addLocalScore(board, run(i * 100, i), 10).board
    expect(localTop(board, 'runner')).toHaveLength(10)
    expect(addLocalScore(board, run(50, 99), 10).rank).toBeNull()
    expect(addLocalScore(board, run(0, 99)).rank).toBeNull()
    expect(localTop(addLocalScore(board, run(5000, 99, 'free')).board, 'runner')).toHaveLength(10)
  })

  it('reads a saved board and drops anything broken', () => {
    const saved = JSON.stringify([run(100, 1), { mode: 'x', score: 1 }, null, run(200, 2, 'free')])
    expect(parseLocalBoard(saved)).toHaveLength(2)
    expect(parseLocalBoard('not json')).toEqual([])
    expect(parseLocalBoard(null)).toEqual([])
  })
})

describe('SLAM pose (src/data/slam.ts)', () => {
  it('falls back, lies down, gets up and ends standing', () => {
    expect(slamPose(0)).toEqual({ rotate: -0, drop: 0 })
    expect(slamPose(0.3)).toEqual({ rotate: -80, drop: 0.22 })
    expect(slamPose(1)).toEqual({ rotate: 0, drop: 0 })
    const gettingUp = slamPose(0.7)
    expect(gettingUp.rotate).toBeGreaterThan(-80)
    expect(gettingUp.rotate).toBeLessThan(0)
  })
})
