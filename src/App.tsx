import { useState, useEffect } from 'react'
import Game, { type RunResult } from './components/Game'
import Menu from './components/Menu'
import Blackbook from './components/Blackbook'
import FeedbackWidget from './components/FeedbackWidget'
import { GAME_MODES } from './data/gameModes'
import { CONTINUES_PER_CHECKPOINT, checkpointKey } from './data/phases'
import { getAdsProvider } from './ads/ads'
import { getOnline, type RunTicket } from './online/online'
import { LOCAL_BOARD_KEY, addLocalScore, parseLocalBoard, type LocalScore } from './data/scoreBoard'
import { Checkpoint, GameMode, GraffitiArt } from './types/game'
import './App.css'

type GameState = 'menu' | 'playing' | 'gameover'
export type MusicOption = 'none' | 'theme'

/** What happened to the last run on the online leaderboard (see Menu). */
export type Submission =
  | { status: 'none' }
  | { status: 'sending' }
  | { status: 'ranked'; rank: number | null; best?: number }
  | { status: 'refused'; reason?: string }

const readHighScore = (mode: GameMode) => {
  const saved = localStorage.getItem(GAME_MODES[mode].highScoreKey)
  return saved ? parseInt(saved) : 0
}

export default function App() {
  const [gameState, setGameState] = useState<GameState>('menu')
  const [score, setScore] = useState(0)
  const [isNewRecord, setIsNewRecord] = useState(false)
  const [selectedMusic, setSelectedMusic] = useState<MusicOption>(() => {
    const saved = localStorage.getItem('dinoGameMusic') as MusicOption | null
    return saved ?? 'theme'
  })
  const [selectedMode, setSelectedMode] = useState<GameMode>(() =>
    localStorage.getItem('dinoGameMode') === 'free' ? 'free' : 'runner'
  )
  // Each mode keeps its own record: the free mode is paced by the player, so the scores differ.
  const [highScores, setHighScores] = useState<Record<GameMode, number>>(() => ({
    runner: readHighScore('runner'),
    free: readHighScore('free'),
  }))
  const highScore = highScores[selectedMode]
  const [blackbook, setBlackbook] = useState<GraffitiArt[]>(() => {
    const saved = localStorage.getItem('dinoGameBlackbook')
    return saved ? JSON.parse(saved) : []
  })
  const [showBlackbook, setShowBlackbook] = useState(false)
  // Checkpoint of the run that just ended (offered on the game over screen) and the one the
  // current run started from.
  const [lastCheckpoint, setLastCheckpoint] = useState<Checkpoint | null>(null)
  const [runCheckpoint, setRunCheckpoint] = useState<Checkpoint | null>(null)
  // Second chances already used from a flag (see CONTINUES_PER_CHECKPOINT).
  const [continues, setContinues] = useState({ key: '', used: 0 })
  // Rewarded ad for the second chance (nothing when no ads network is set up).
  const ads = getAdsProvider()
  const [adState, setAdState] = useState<'idle' | 'playing' | 'skipped'>('idle')
  // Online leaderboard (nothing when not set up): the server's seed for a ranked run, and what
  // happened to the last one.
  const online = getOnline()
  const [ticket, setTicket] = useState<RunTicket | null>(null)
  const [starting, setStarting] = useState(false)
  const [submission, setSubmission] = useState<Submission>({ status: 'none' })
  // Best runs on this device (no server needed) and the last run's place among them.
  const [localBoard, setLocalBoard] = useState<LocalScore[]>(() => {
    try {
      return parseLocalBoard(localStorage.getItem(LOCAL_BOARD_KEY))
    } catch {
      return []
    }
  })
  const [localRank, setLocalRank] = useState<number | null>(null)
  const [lastDistance, setLastDistance] = useState(0)

  const handleStartGame = async () => {
    if (starting) return
    // A ranked run gets its seed from the server; if it can't be reached, the run is offline.
    let runTicket: RunTicket | null = null
    if (online) {
      setStarting(true)
      runTicket = await online.startRun(selectedMode)
      setStarting(false)
    }
    setTicket(runTicket)
    setScore(0)
    setRunCheckpoint(null)
    setLastCheckpoint(null)
    setContinues({ key: '', used: 0 })
    setAdState('idle')
    setGameState('playing')
  }

  const handleContinue = async () => {
    if (!lastCheckpoint || adState === 'playing') return
    if (ads.rewardedEnabled) {
      setAdState('playing')
      const result = await ads.showRewarded('continue-checkpoint')
      // Closed early: no second chance. No ad to show at all: it stays free.
      if (result === 'skipped') {
        setAdState('skipped')
        return
      }
    }
    setAdState('idle')
    setTicket(null) // continued runs don't go on the leaderboard (v1)
    const key = checkpointKey(lastCheckpoint)
    setContinues((current) => ({ key, used: current.key === key ? current.used + 1 : 1 }))
    setRunCheckpoint(lastCheckpoint)
    setGameState('playing')
  }

  const handleGameOver = ({ score: finalScore, checkpoint, phase, coins, distance, log }: RunResult) => {
    setScore(finalScore)
    setLastDistance(distance)
    const local = addLocalScore(localBoard, {
      mode: selectedMode,
      score: finalScore,
      phase,
      coins,
      distance,
      continued: runCheckpoint !== null,
      date: Date.now(),
    })
    setLocalBoard(local.board)
    setLocalRank(local.rank)
    try {
      localStorage.setItem(LOCAL_BOARD_KEY, JSON.stringify(local.board))
    } catch {
      // Storage full or blocked: the board still shows until the page is closed.
    }
    if (online && ticket && log && !log.checkpoint) {
      setSubmission({ status: 'sending' })
      online.submitRun(ticket, log).then((result) =>
        setSubmission(result.accepted ? { status: 'ranked', rank: result.rank ?? null, best: result.best } : { status: 'refused', reason: result.reason })
      )
    } else {
      setSubmission({ status: 'none' })
    }
    setTicket(null)
    const exhausted = checkpoint !== null && checkpointKey(checkpoint) === continues.key && continues.used >= CONTINUES_PER_CHECKPOINT
    setLastCheckpoint(exhausted ? null : checkpoint)
    setAdState('idle')
    setIsNewRecord(finalScore > highScore)
    if (finalScore > highScore) {
      setHighScores((prev) => ({ ...prev, [selectedMode]: finalScore }))
      localStorage.setItem(GAME_MODES[selectedMode].highScoreKey, finalScore.toString())
    }
    setGameState('gameover')
  }

  const handleModeChange = (mode: GameMode) => {
    // A checkpoint belongs to the mode it was reached in.
    if (mode !== selectedMode) setLastCheckpoint(null)
    setSelectedMode(mode)
    localStorage.setItem('dinoGameMode', mode)
  }

  const handleReturnToMenu = () => {
    setLastCheckpoint(null)
    setGameState('menu')
  }

  const handleMusicChange = (music: MusicOption) => {
    setSelectedMusic(music)
    localStorage.setItem('dinoGameMusic', music)
  }

  // Sincronizar blackbook quando retornar ao menu
  useEffect(() => {
    if (gameState === 'menu' || gameState === 'gameover') {
      const saved = localStorage.getItem('dinoGameBlackbook')
      if (saved) {
        setBlackbook(JSON.parse(saved))
      }
    }
  }, [gameState])

  return (
    <div className={`app ${gameState === 'playing' ? 'is-playing' : ''}`}>
      {gameState === 'menu' && (
        <Menu
          highScore={highScore}
          selectedMode={selectedMode}
          onModeChange={handleModeChange}
          selectedMusic={selectedMusic}
          onMusicChange={handleMusicChange}
          onStart={handleStartGame}
          starting={starting}
          online={online}
          localBoard={localBoard}
          blackbookCount={blackbook.length}
          onOpenBlackbook={() => setShowBlackbook(true)}
        />
      )}
      {gameState === 'playing' && (
        <Game
          mode={selectedMode}
          highScore={highScore}
          selectedMusic={selectedMusic}
          checkpoint={runCheckpoint}
          seed={ticket?.seed}
          onGameOver={handleGameOver}
        />
      )}
      {gameState === 'gameover' && (
        <Menu
          gameOver
          finalScore={score}
          isNewRecord={isNewRecord}
          highScore={highScore}
          selectedMode={selectedMode}
          onModeChange={handleModeChange}
          selectedMusic={selectedMusic}
          onMusicChange={handleMusicChange}
          onStart={handleStartGame}
          starting={starting}
          online={online}
          localBoard={localBoard}
          localRank={localRank}
          distance={lastDistance}
          submission={submission}
          checkpoint={lastCheckpoint}
          continueWithAd={ads.rewardedEnabled}
          adState={adState}
          onContinue={handleContinue}
          onReturnToMenu={handleReturnToMenu}
          blackbookCount={blackbook.length}
          onOpenBlackbook={() => setShowBlackbook(true)}
        />
      )}
      {showBlackbook && (
        <Blackbook arts={blackbook} onClose={() => setShowBlackbook(false)} />
      )}
      <FeedbackWidget />
    </div>
  )
}
