import { useState } from 'react'
import Game from './components/Game'
import Menu from './components/Menu'
import './App.css'

type GameState = 'menu' | 'playing' | 'gameover'
export type DinoColor = 'verde' | 'azul' | 'laranja' | 'rosa' | 'cinza'
export type MusicOption = 'none' | 'theme'

export default function App() {
  const [gameState, setGameState] = useState<GameState>('menu')
  const [score, setScore] = useState(0)
  const [dinoColor, setDinoColor] = useState<DinoColor>(() => {
    const saved = localStorage.getItem('dinoGameColor') as DinoColor | null
    return saved ?? 'verde'
  })
  const [selectedMusic, setSelectedMusic] = useState<MusicOption>(() => {
    const saved = localStorage.getItem('dinoGameMusic') as MusicOption | null
    return saved ?? 'theme'
  })
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('dinoGameHighScore')
    return saved ? parseInt(saved) : 0
  })

  const handleStartGame = () => {
    setScore(0)
    setGameState('playing')
  }

  const handleGameOver = (finalScore: number) => {
    setScore(finalScore)
    if (finalScore > highScore) {
      setHighScore(finalScore)
      localStorage.setItem('dinoGameHighScore', finalScore.toString())
    }
    setGameState('gameover')
  }

  const handleReturnToMenu = () => {
    setGameState('menu')
  }

  const handleColorChange = (color: DinoColor) => {
    setDinoColor(color)
    localStorage.setItem('dinoGameColor', color)
  }

  const handleMusicChange = (music: MusicOption) => {
    setSelectedMusic(music)
    localStorage.setItem('dinoGameMusic', music)
  }

  return (
    <div className="app">
      {gameState === 'menu' && (
        <Menu
          highScore={highScore}
          selectedColor={dinoColor}
          selectedMusic={selectedMusic}
          onColorChange={handleColorChange}
          onMusicChange={handleMusicChange}
          onStart={handleStartGame}
        />
      )}
      {gameState === 'playing' && (
        <Game
          dinosaurColor={dinoColor}
          selectedMusic={selectedMusic}
          onGameOver={handleGameOver}
        />
      )}
      {gameState === 'gameover' && (
        <Menu
          gameOver
          finalScore={score}
          highScore={highScore}
          selectedColor={dinoColor}
          selectedMusic={selectedMusic}
          onColorChange={handleColorChange}
          onMusicChange={handleMusicChange}
          onStart={handleStartGame}
          onReturnToMenu={handleReturnToMenu}
        />
      )}
    </div>
  )
}
