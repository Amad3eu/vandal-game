import { useEffect, useRef, useState } from 'react'
import { View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useAudioPlayer } from 'expo-audio'
import { useFonts } from 'expo-font'
import { Bungee_400Regular } from '@expo-google-fonts/bungee'
import { SedgwickAveDisplay_400Regular } from '@expo-google-fonts/sedgwick-ave-display'
import { Silkscreen_400Regular } from '@expo-google-fonts/silkscreen'
import type { Checkpoint, GameMode } from './src/shared'
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
import { UI } from './src/theme'
import GameScreen from './src/screens/GameScreen'
import MenuScreen from './src/screens/MenuScreen'

export default function App() {
  const [progress, setProgress] = useState<SavedProgress | null>(null)
  const [screen, setScreen] = useState<'menu' | 'game'>('menu')
  const [lastScore, setLastScore] = useState<number | null>(null)
  const [newRecord, setNewRecord] = useState(false)
  // Same fonts as the web's title screen; if loading fails the system font is used.
  const [fontsLoaded, fontError] = useFonts({ Bungee_400Regular, SedgwickAveDisplay_400Regular, Silkscreen_400Regular })
  const [runId, setRunId] = useState(0)
  // Checkpoint of the run that just ended (offered in the game over menu) and the one the
  // current run started from.
  const [lastCheckpoint, setLastCheckpoint] = useState<Checkpoint | null>(null)
  const [runCheckpoint, setRunCheckpoint] = useState<Checkpoint | null>(null)
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
    // A checkpoint belongs to the mode it was reached in.
    if (mode !== progressRef.current?.mode) setLastCheckpoint(null)
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
  const handleGameOver = (score: number, checkpoint: Checkpoint | null) => {
    const current = progressRef.current
    setNewRecord(Boolean(current && score > current.highScores[current.mode]))
    if (current && score > current.highScores[current.mode]) {
      update({ highScores: { ...current.highScores, [current.mode]: score } })
      saveHighScore(current.mode, score)
    }
    setLastScore(score)
    setLastCheckpoint(checkpoint)
    setScreen('menu')
  }

  const startRun = (from: Checkpoint | null) => {
    setRunCheckpoint(from)
    setLastCheckpoint(null)
    setRunId((id) => id + 1)
    setScreen('game')
  }

  if (!progress || (!fontsLoaded && !fontError)) return <View style={{ flex: 1, backgroundColor: UI.ink }} />

  return (
    <SafeAreaProvider>
      <StatusBar hidden={screen === 'game'} style="light" />
      {screen === 'game' ? (
        <GameScreen
          key={runId}
          mode={progress.mode}
          totalCoins={progress.totalCoins}
          checkpoint={runCheckpoint}
          onCoinsChange={handleCoinsChange}
          onGameOver={handleGameOver}
          onExit={() => {
            // Quitting from the pause screen doesn't count as a finished run.
            setLastScore(null)
            setLastCheckpoint(null)
            setScreen('menu')
          }}
        />
      ) : (
        <MenuScreen
          progress={progress}
          lastScore={lastScore}
          newRecord={newRecord}
          checkpoint={lastCheckpoint}
          onModeChange={handleModeChange}
          onMusicChange={handleMusicChange}
          onStart={() => startRun(null)}
          onContinue={() => startRun(lastCheckpoint)}
        />
      )}
    </SafeAreaProvider>
  )
}
