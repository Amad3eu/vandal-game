import { useState, useEffect } from 'react'
import Game from './components/Game'
import Menu from './components/Menu'
import Blackbook from './components/Blackbook'
import FeedbackWidget from './components/FeedbackWidget'
import { GAME_MODES } from './data/gameModes'
import { GameMode, GraffitiArt } from './types/game'
import './App.css'

type GameState = 'menu' | 'playing' | 'gameover'
export type MusicOption = 'none' | 'theme'

const readHighScore = (mode: GameMode) => {
  const saved = localStorage.getItem(GAME_MODES[mode].highScoreKey)
  return saved ? parseInt(saved) : 0
}

export default function App() {
  const [gameState, setGameState] = useState<GameState>('menu')
  const [score, setScore] = useState(0)
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

  const handleStartGame = () => {
    setScore(0)
    setGameState('playing')
  }

  const handleGameOver = (finalScore: number) => {
    setScore(finalScore)
    if (finalScore > highScore) {
      setHighScores((prev) => ({ ...prev, [selectedMode]: finalScore }))
      localStorage.setItem(GAME_MODES[selectedMode].highScoreKey, finalScore.toString())
    }
    setGameState('gameover')
  }

  const handleModeChange = (mode: GameMode) => {
    setSelectedMode(mode)
    localStorage.setItem('dinoGameMode', mode)
  }

  const handleReturnToMenu = () => {
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
    <div className="app">
      {gameState === 'menu' && (
        <Menu
          highScore={highScore}
          selectedMode={selectedMode}
          onModeChange={handleModeChange}
          selectedMusic={selectedMusic}
          onMusicChange={handleMusicChange}
          onStart={handleStartGame}
          blackbookCount={blackbook.length}
          onOpenBlackbook={() => setShowBlackbook(true)}
        />
      )}
      {gameState === 'playing' && (
        <Game
          mode={selectedMode}
          highScore={highScore}
          selectedMusic={selectedMusic}
          onGameOver={handleGameOver}
        />
      )}
      {gameState === 'gameover' && (
        <Menu
          gameOver
          finalScore={score}
          highScore={highScore}
          selectedMode={selectedMode}
          onModeChange={handleModeChange}
          selectedMusic={selectedMusic}
          onMusicChange={handleMusicChange}
          onStart={handleStartGame}
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
