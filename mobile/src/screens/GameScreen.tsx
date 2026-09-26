import { useEffect, useRef, useState } from 'react'
import { AppState, BackHandler, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  ARTIST_SIGNATURES,
  createGameState,
  fitWorld,
  getView,
  pressDash,
  pressJump,
  releaseJump,
  resizeWorld,
  resumeGame,
  stepGame,
  type GameMode,
  type GameState,
  type GraffitiArtist,
} from '../shared'
import { createActionInput, createTouchTracker, layoutTouchButtons, type ActionInput } from '../input'
import { addToBlackbook } from '../storage'
import { COLORS } from '../theme'
import ArtistDialog from '../components/ArtistDialog'
import Hud from '../components/Hud'
import TouchButtons from '../components/TouchButtons'
import World from '../components/World'

interface GameScreenProps {
  mode: GameMode
  totalCoins: number
  onCoinsChange: (totalCoins: number) => void
  onGameOver: (score: number) => void
  onExit: () => void
}

export default function GameScreen({ mode, totalCoins, onCoinsChange, onGameOver, onExit }: GameScreenProps) {
  const { width, height } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const world = fitWorld(width, height)

  // The same engine as the web version; this screen only drives it and draws it.
  const engineRef = useRef<GameState | null>(null)
  if (!engineRef.current) {
    engineRef.current = createGameState({ mode, width: world.width, height: world.height, totalCoins })
  }
  const engine = engineRef.current

  const inputRef = useRef<ActionInput | null>(null)
  if (!inputRef.current) {
    inputRef.current = createActionInput({
      onJump: () => pressJump(engine),
      onJumpEnd: () => releaseJump(engine),
      onDash: () => pressDash(engine),
    })
  }
  const input = inputRef.current

  const buttons = layoutTouchButtons(mode, width, height, insets)
  const buttonsRef = useRef(buttons)
  buttonsRef.current = buttons
  const trackerRef = useRef<ReturnType<typeof createTouchTracker> | null>(null)
  if (!trackerRef.current) trackerRef.current = createTouchTracker(input, () => buttonsRef.current)

  const [frame, setFrame] = useState(() => ({ view: getView(engine), clock: 0 }))
  const clockRef = useRef(0)
  const [paused, setPaused] = useState(false)
  const [artist, setArtist] = useState<GraffitiArtist | null>(null)
  const running = !paused && artist === null

  // Latest props/state for listeners that are subscribed once.
  const latest = useRef({ paused, onCoinsChange, onGameOver, onExit })
  latest.current = { paused, onCoinsChange, onGameOver, onExit }

  const pause = () => {
    input.releaseAll()
    setPaused(true)
  }

  // Phone rotation or split screen: move the floor, keeping obstacles and the player on it.
  useEffect(() => {
    resizeWorld(engine, world.width, world.height)
    setFrame({ view: getView(engine), clock: clockRef.current })
  }, [engine, world.width, world.height])

  useEffect(() => {
    if (!running) return
    let frameId = 0
    let lastTime = 0

    const gameLoop = (timestamp: number) => {
      if (!lastTime) lastTime = timestamp
      const deltaMs = Math.min(32, timestamp - lastTime)
      lastTime = timestamp
      clockRef.current += deltaMs

      const events = stepGame(engine, input.held, deltaMs)
      setFrame({ view: getView(engine), clock: clockRef.current })

      for (const event of events) {
        if (event.type === 'coin') {
          latest.current.onCoinsChange(engine.totalCoins)
        } else if (event.type === 'artist') {
          input.releaseAll()
          setArtist(event.artist)
          return
        } else if (event.type === 'gameOver') {
          input.releaseAll()
          latest.current.onGameOver(event.score)
          return
        }
      }
      frameId = requestAnimationFrame(gameLoop)
    }

    frameId = requestAnimationFrame(gameLoop)
    return () => cancelAnimationFrame(frameId)
  }, [engine, input, running])

  useEffect(() => {
    const pauseRun = () => {
      input.releaseAll()
      setPaused(true)
    }
    // Leaving the app (call, notification, home button) pauses instead of dying off-screen.
    const appState = AppState.addEventListener('change', (state) => {
      if (state !== 'active') pauseRun()
    })
    // Android back button: pause first, then leave from the pause screen.
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      if (latest.current.paused) latest.current.onExit()
      else pauseRun()
      return true
    })
    return () => {
      appState.remove()
      back.remove()
    }
  }, [input])

  const closeArtist = () => {
    resumeGame(engine)
    setArtist(null)
  }

  const { view, clock } = frame
  const facing = view.wallClingSide !== 0 ? (-view.wallClingSide as 1 | -1) : view.player.facing ?? 1
  const moving = mode === 'runner' || Math.abs(view.player.velocityX ?? 0) > 0.3

  return (
    <View style={styles.screen}>
      <World
        view={view}
        clock={clock}
        width={world.width}
        height={world.height}
        scale={world.scale}
        groundLevel={engine.config.groundLevel}
        facing={facing}
        moving={moving}
      />

      <View testID="touch-layer" style={StyleSheet.absoluteFill} {...trackerRef.current} />
      <TouchButtons buttons={buttons} isPressed={input.isPressed} />

      <View
        pointerEvents="box-none"
        style={[styles.top, { paddingTop: Math.max(8, insets.top), paddingLeft: Math.max(8, insets.left), paddingRight: Math.max(8, insets.right) }]}
      >
        <Pressable testID="pause" accessibilityLabel="Pausar" onPress={pause} style={styles.pauseButton}>
          <View style={styles.pauseBar} />
          <View style={styles.pauseBar} />
        </Pressable>
        <Hud view={view} mode={mode} />
      </View>

      {view.grindCombo > 1 && (
        <View pointerEvents="none" style={[styles.grind, { top: Math.max(8, insets.top) + 56, left: Math.max(8, insets.left) + 8 }]}>
          <Text style={styles.grindLabel}>GRIND</Text>
          <Text style={styles.grindValue}>x{view.grindCombo}</Text>
        </View>
      )}

      {artist && (
        <ArtistDialog
          artist={artist}
          onAccept={() =>
            addToBlackbook({
              id: `${artist}-sig-${Date.now()}`,
              artist,
              type: 'artist-signature',
              imageData: ARTIST_SIGNATURES[artist],
              timestamp: Date.now(),
            })
          }
          onClose={closeArtist}
        />
      )}

      {paused && (
        <View style={styles.overlay}>
          <View style={styles.pauseCard}>
            <Text style={styles.pauseTitle}>Pausado</Text>
            <Pressable testID="resume" style={[styles.pauseAction, styles.primary]} onPress={() => setPaused(false)}>
              <Text style={styles.pauseActionText}>CONTINUAR</Text>
            </Pressable>
            <Pressable testID="exit" style={[styles.pauseAction, styles.secondary]} onPress={onExit}>
              <Text style={[styles.pauseActionText, styles.secondaryText]}>MENU PRINCIPAL</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.sky,
    overflow: 'hidden',
  },
  top: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  pauseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  pauseBar: {
    width: 5,
    height: 16,
    borderRadius: 2,
    backgroundColor: '#fff',
  },
  grind: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(31, 17, 71, 0.78)',
    transform: [{ rotate: '-4deg' }],
  },
  grindLabel: {
    color: '#ffd23f',
    fontSize: 14,
    fontWeight: '900',
    fontStyle: 'italic',
  },
  grindValue: {
    color: '#ff4d9d',
    fontSize: 26,
    fontWeight: '900',
    fontStyle: 'italic',
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseCard: {
    width: 280,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    gap: 12,
    alignItems: 'stretch',
  },
  pauseTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  pauseAction: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  primary: {
    backgroundColor: COLORS.primary,
  },
  secondary: {
    backgroundColor: COLORS.panel,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  pauseActionText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 1,
  },
  secondaryText: {
    color: COLORS.text,
  },
})
