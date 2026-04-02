import { useState } from 'react'
import Game from './components/Game'
import Menu from './components/Menu'
import './App.css'

type GameState = 'menu' | 'playing' | 'gameover'
export type DinoColor = 'verde' | 'azul' | 'laranja' | 'rosa' | 'cinza'

export default function App() {
  const [gameState, setGameState] = useState<GameState>('menu')
  const [score, setScore] = useState(0)
  const [dinoColor, setDinoColor] = useState<DinoColor>(() => {
    const saved = localStorage.getItem('dinoGameColor') as DinoColor | null
    return saved ?? 'verde'
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

  return (
    <div className="app">
      {gameState === 'menu' && (
        <Menu
          highScore={highScore}
          selectedColor={dinoColor}
          onColorChange={handleColorChange}
          onStart={handleStartGame}
        />
      )}
      {gameState === 'playing' && (
        <Game
          dinosaurColor={dinoColor}
          onGameOver={handleGameOver}
        />
      )}
      {gameState === 'gameover' && (
        <Menu
          gameOver
          finalScore={score}
          highScore={highScore}
          selectedColor={dinoColor}
          onColorChange={handleColorChange}
          onStart={handleStartGame}
          onReturnToMenu={handleReturnToMenu}
        />
      )}
    </div>
  )
}
