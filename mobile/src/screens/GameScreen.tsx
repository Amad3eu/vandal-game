import { useEffect, useRef, useState } from 'react'
import { AppState, BackHandler, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  ARTIST_SIGNATURES,
  PHASES,
  advanceGame,
  createGameState,
  fitWorld,
  getView,
  pressDash,
  pressJump,
  releaseJump,
  resizeWorld,
  resumeGame,
  type Checkpoint,
  type GameMode,
  type GameState,
  type GraffitiArtist,
} from '../shared'
import { createActionInput, createTouchTracker, layoutTouchButtons, type ActionInput } from '../input'
import { addToBlackbook, saveLastRun } from '../storage'
import { COLORS, FONTS, UI } from '../theme'
import ArtistDialog from '../components/ArtistDialog'
import Hud from '../components/Hud'
import RouteMap from '../components/RouteMap'
import TouchButtons from '../components/TouchButtons'
import World from '../components/World'

/** How a run ended: for the record, the scoreboard and the continue offer. */
export interface RunResult {
  score: number
  checkpoint: Checkpoint | null
  phase: 1 | 2 | 3
  coins: number
  /** Meters run. */
  distance: number
}

interface GameScreenProps {
  mode: GameMode
  totalCoins: number
  /** Record of this mode, shown in the HUD. */
  highScore: number
  /** Continue from this checkpoint instead of starting from phase 1. */
  checkpoint: Checkpoint | null
  onCoinsChange: (totalCoins: number) => void
  onGameOver: (result: RunResult) => void
  onExit: () => void
}

/** How long the "new phase" banner stays up after grabbing a checkpoint flag. */
const PHASE_BANNER_MS = 2600
/** Game over: how long the cop's grab shows before the menu, and how long the run-in takes. */
const CAUGHT_MS = 1300
const CAUGHT_RUN_MS = 550
const PAUSE_SIZE = 44

export default function GameScreen({ mode, totalCoins, highScore, checkpoint, onCoinsChange, onGameOver, onExit }: GameScreenProps) {
  const { width, height } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const world = fitWorld(width, height)

  // The same engine as the web version; this screen only drives it and draws it.
  const engineRef = useRef<GameState | null>(null)
  if (!engineRef.current) {
    // Opens with the tagging intro and the cop; continuing from a checkpoint drops the player in instead.
    engineRef.current = createGameState({
      mode,
      width: world.width,
      height: world.height,
      totalCoins,
      checkpoint,
      intro: true,
      record: true,
    })
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
  // Bottom of the pause button + HUD strip, so the grind badge goes under it (away from the player).
  const [topBarBottom, setTopBarBottom] = useState(56)
  const [artist, setArtist] = useState<GraffitiArtist | null>(null)
  // Game over: the cop grabs the player for a moment, then the menu shows.
  const [caught, setCaught] = useState<RunResult | null>(null)
  const [caughtMs, setCaughtMs] = useState(0)
  const running = !paused && artist === null && caught === null

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
      const elapsedMs = timestamp - lastTime
      lastTime = timestamp
      clockRef.current += Math.min(32, elapsedMs)

      // Fixed 60Hz ticks inside: the same physics on any refresh rate.
      const events = advanceGame(engine, input.held, elapsedMs)
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
          saveLastRun(engine.log)
          setCaught({ score: event.score, checkpoint: event.checkpoint, phase: event.phase, coins: event.coins, distance: event.distance })
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

  useEffect(() => {
    if (!caught) return
    let frameId = 0
    const start = Date.now()
    const tick = () => {
      const elapsed = Date.now() - start
      setCaughtMs(elapsed)
      if (elapsed >= CAUGHT_MS) {
        latest.current.onGameOver(caught)
        return
      }
      frameId = requestAnimationFrame(tick)
    }
    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [caught])

  const closeArtist = () => {
    resumeGame(engine)
    setArtist(null)
  }

  const { view, clock } = frame
  const facing = view.wallClingSide !== 0 ? (-view.wallClingSide as 1 | -1) : view.player.facing ?? 1
  // Standing still while tagging the wall in the intro, and while down after a skate SLAM.
  const moving = view.slamProgress === null && (mode === 'runner' ? view.introStage === null : Math.abs(view.player.velocityX ?? 0) > 0.3)
  // Route map under the pause button; smaller on phones, like the web's.
  const smallMap = width <= 760 || height <= 520
  // Checkpoint banner: fades in, stays, fades out (the web version animates it in CSS).
  const bannerOpacity =
    view.phase > 1 && view.phaseMs < PHASE_BANNER_MS
      ? Math.min(1, view.phaseMs / 300, (PHASE_BANNER_MS - view.phaseMs) / 500)
      : 0
  const continuedHere = checkpoint !== null && view.phase === checkpoint.phase

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
        caughtProgress={caught ? Math.min(1, caughtMs / CAUGHT_RUN_MS) : null}
      />

      <View
        pointerEvents="none"
        style={[styles.routeMap, { top: Math.max(8, insets.top) + PAUSE_SIZE + 8, left: Math.max(8, insets.left) }]}
      >
        <RouteMap
          score={view.score}
          phase={view.phase}
          distance={view.distance}
          clock={clock}
          width={smallMap ? 70 : 104}
          height={smallMap ? 105 : 156}
        />
      </View>

      <View testID="touch-layer" style={StyleSheet.absoluteFill} {...trackerRef.current} />
      <TouchButtons buttons={buttons} isPressed={input.isPressed} />

      <View
        pointerEvents="box-none"
        onLayout={(event) => setTopBarBottom(event.nativeEvent.layout.y + event.nativeEvent.layout.height)}
        style={[styles.top, { paddingTop: Math.max(8, insets.top), paddingLeft: Math.max(8, insets.left), paddingRight: Math.max(8, insets.right) }]}
      >
        <Pressable testID="pause" accessibilityLabel="Pausar" onPress={pause} style={styles.pauseButton}>
          <View style={styles.pauseBar} />
          <View style={styles.pauseBar} />
        </Pressable>
        <Hud view={view} mode={mode} highScore={highScore} />
      </View>

      {view.grindCombo > 1 && (
        <View pointerEvents="none" style={[styles.grind, { top: topBarBottom + 10, right: Math.max(8, insets.right) + 8 }]}>
          <Text style={styles.grindLabel}>GRIND</Text>
          <Text style={styles.grindValue}>x{view.grindCombo}</Text>
        </View>
      )}

      {bannerOpacity > 0 && (
        <View testID="phase-banner" pointerEvents="none" style={[styles.bannerRow, { opacity: bannerOpacity }]}>
          <View style={styles.banner}>
            <Text style={styles.bannerKicker}>🚩 CHECKPOINT!</Text>
            <Text style={styles.bannerTitle}>
              {PHASES[view.phase].emoji} Fase {view.phase} · {PHASES[view.phase].name}
            </Text>
            <Text style={styles.bannerNote}>
              {continuedHere ? 'Continuando do checkpoint' : '+250 pontos · checkpoint salvo'}
            </Text>
          </View>
        </View>
      )}

      {caught && caughtMs > CAUGHT_RUN_MS - 100 && (
        <View pointerEvents="none" style={styles.caughtRow}>
          <Text testID="caught" style={styles.caughtSticker}>PEGO!</Text>
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
    width: PAUSE_SIZE,
    height: PAUSE_SIZE,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: UI.ink,
    backgroundColor: UI.paper,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  pauseBar: {
    width: 5,
    height: 16,
    borderRadius: 1,
    backgroundColor: UI.ink,
  },
  routeMap: {
    position: 'absolute',
  },
  grind: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: UI.ink,
    backgroundColor: UI.night,
    transform: [{ rotate: '-4deg' }],
  },
  grindLabel: {
    color: UI.yellow,
    fontFamily: FONTS.display,
    fontSize: 14,
  },
  grindValue: {
    color: UI.pink,
    fontFamily: FONTS.display,
    fontSize: 26,
  },
  caughtRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '30%',
    alignItems: 'center',
  },
  caughtSticker: {
    paddingHorizontal: 26,
    paddingVertical: 8,
    borderWidth: 4,
    borderColor: '#140f1f',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: UI.pink,
    color: '#fff',
    fontFamily: FONTS.display,
    fontSize: 44,
    transform: [{ rotate: '-6deg' }],
  },
  bannerRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '24%',
    alignItems: 'center',
  },
  banner: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 16,
    backgroundColor: 'rgba(31, 17, 71, 0.86)',
  },
  bannerKicker: {
    color: '#ffd23f',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  bannerTitle: {
    color: '#fff',
    fontFamily: FONTS.display,
    fontSize: 24,
  },
  bannerNote: {
    color: '#c7d2fe',
    fontSize: 13,
    fontWeight: '600',
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
