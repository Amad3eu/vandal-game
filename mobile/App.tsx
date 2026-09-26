import { useEffect, useRef, useState } from 'react'
import { View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useAudioPlayer } from 'expo-audio'
import type { GameMode } from './src/shared'
import {
  DEFAULT_PROGRESS,
  loadProgress,
  saveHighScore,
  saveMode,
  saveMusic,
  saveTotalCoins,
  type SavedProgress,
} from './src/storage'
import { SOUNDTRACK } from './src/sprites'
import { COLORS } from './src/theme'
import GameScreen from './src/screens/GameScreen'
import MenuScreen from './src/screens/MenuScreen'

export default function App() {
  const [progress, setProgress] = useState<SavedProgress | null>(null)
  const [screen, setScreen] = useState<'menu' | 'game'>('menu')
  const [lastScore, setLastScore] = useState<number | null>(null)
  const [runId, setRunId] = useState(0)
  const progressRef = useRef(progress)
  progressRef.current = progress
  const music = useAudioPlayer(SOUNDTRACK)

  useEffect(() => {
    loadProgress()
      .then(setProgress)
      .catch(() => setProgress(DEFAULT_PROGRESS))
  }, [])

  // Like the web version: the track loops from the start of each run and stops in the menu.
  useEffect(() => {
    music.loop = true
    music.volume = 0.45
    if (screen === 'game' && progress?.music) {
      void music.seekTo(0)
      music.play()
    } else {
      music.pause()
    }
  }, [music, screen, progress?.music])

  const update = (change: Partial<SavedProgress>) => setProgress((current) => current && { ...current, ...change })

  const handleModeChange = (mode: GameMode) => {
    update({ mode })
    saveMode(mode)
  }

  const handleMusicChange = (enabled: boolean) => {
    update({ music: enabled })
    saveMusic(enabled)
  }

  const handleCoinsChange = (totalCoins: number) => {
    update({ totalCoins })
    saveTotalCoins(totalCoins)
  }

  // Each mode keeps its own record, as on the web.
  const handleGameOver = (score: number) => {
    const current = progressRef.current
    if (current && score > current.highScores[current.mode]) {
      update({ highScores: { ...current.highScores, [current.mode]: score } })
      saveHighScore(current.mode, score)
    }
    setLastScore(score)
    setScreen('menu')
  }

  if (!progress) return <View style={{ flex: 1, backgroundColor: COLORS.sky }} />

  return (
    <SafeAreaProvider>
      <StatusBar hidden={screen === 'game'} style="dark" />
      {screen === 'game' ? (
        <GameScreen
          key={runId}
          mode={progress.mode}
          totalCoins={progress.totalCoins}
          onCoinsChange={handleCoinsChange}
          onGameOver={handleGameOver}
          onExit={() => {
            // Quitting from the pause screen doesn't count as a finished run.
            setLastScore(null)
            setScreen('menu')
          }}
        />
      ) : (
        <MenuScreen
          progress={progress}
          lastScore={lastScore}
          onModeChange={handleModeChange}
          onMusicChange={handleMusicChange}
          onStart={() => {
            setRunId((id) => id + 1)
            setScreen('game')
          }}
        />
      )}
    </SafeAreaProvider>
  )
}
