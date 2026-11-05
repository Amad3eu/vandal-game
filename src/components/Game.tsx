import { useState, useEffect, useRef, useCallback } from 'react'
import Dinosaur from './Dinosaur'
import Obstacles from './Obstacle'
import HUD from './HUD'
import TouchControls from './TouchControls'
import GraffitiDialog, { ArtistPortrait, artistStyle } from './GraffitiDialog'
import DrawingCanvas from './DrawingCanvas'
import DrawingConfirmation from './DrawingConfirmation'
import Chaser, { CaughtScene } from './Chaser'
import RouteMap from './RouteMap'
import SlamEffect from './SlamEffect'
import { SLAM_SHAKE_UNTIL } from '../data/slam'
import Blackbook from './Blackbook'
import { useGameInput } from '../hooks/useGameInput'
import { GAME_MODES, RUNNER_TUNING } from '../data/gameModes'
import { PHASE_BANNER_MS, PHASES, phaseBannerTip } from '../data/phases'
import {
  artOwner,
  gameArtist,
  hasTheirSignature,
  isGameArtist,
  nameSignature,
  pickEncounterArtist,
  pickGameArtist,
  theirSignatureId,
  type EncounterArtist,
  type RosterArtist,
} from '../data/encounters'
import {
  advanceGame,
  awardSignature,
  createGameState,
  fitWorld,
  getView,
  pressDash,
  pressJump,
  releaseJump,
  resizeWorld,
  resumeGame,
  type GameState,
} from '../game/engine'
import { Checkpoint, GameMode, GamePhase, GraffitiArt } from '../types/game'
import type { RunLog } from '../game/engine'
import type { MusicOption } from '../App'
import dayBackground from '../assets/background/9.png'
import nightBackground from '../assets/background/7.png'
import themeTrack from '../assets/soundtrack/SonoTWS - Tired Of People Act II - SonoTWS (youtube).mp3'
import './Game.css'

/** How long the cop's grab shows before the game over menu. */
const CAUGHT_MS = 1300

/** The last run's log (seed + inputs per tick), kept for replays and, later, score checks. */
const LAST_RUN_KEY = 'dinoGameLastRun'

/** Largest signature kept in the blackbook: it lives in localStorage, which only holds a few MB. */
const SIGNATURE_MAX = { width: 480, height: 200 }

/**
 * The signature image to keep in the blackbook, as a small data URL (so it stays even offline or
 * if the artist is taken off the server). Artists without an image, or whose image can't be
 * loaded, get their name drawn instead.
 */
async function signatureImage(artist: EncounterArtist) {
  const drawnName = nameSignature(artist.name, artist.color)
  if (!artist.signature) return drawnName
  if (artist.signature.startsWith('data:')) return artist.signature
  try {
    const response = await fetch(artist.signature, { signal: AbortSignal.timeout(8000) })
    const blob = await response.blob()
    if (!response.ok || !blob.type.startsWith('image/')) return drawnName
    const bitmap = await createImageBitmap(blob)
    const scale = Math.min(1, SIGNATURE_MAX.width / bitmap.width, SIGNATURE_MAX.height / bitmap.height)
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/png')
  } catch {
    return drawnName
  }
}

function readTotalCoins() {
  const saved = localStorage.getItem('dinoGameTotalCoins')
  return saved ? parseInt(saved, 10) : 0
}

/** How a run ended, handed to the app for the record, the scoreboards and the continue offer. */
export interface RunResult {
  score: number
  checkpoint: Checkpoint | null
  phase: GamePhase
  coins: number
  /** Meters run. */
  distance: number
  log: RunLog | null
}

interface GameProps {
  mode: GameMode
  highScore: number
  selectedMusic: MusicOption
  /** Continue from this checkpoint instead of starting from phase 1. */
  checkpoint?: Checkpoint | null
  /** Seed handed out by the leaderboard server for a ranked run (a random one otherwise). */
  seed?: number
  /** Real artists from the leaderboard server; encounters pick from them (see src/data/encounters.ts). */
  artists?: RosterArtist[]
  onGameOver: (result: RunResult) => void
}

export default function Game({ mode, highScore, selectedMusic, checkpoint = null, seed, artists = [], onGameOver }: GameProps) {
  const gameContainerRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // The rules live in the DOM-free engine (src/game); this component runs the loop,
  // forwards input and renders the engine's state. It remounts for every run.
  const engineRef = useRef<GameState>()
  if (!engineRef.current) {
    // Opens with the tagging intro and the cop; continuing from a checkpoint drops the player in instead.
    engineRef.current = createGameState({
      mode,
      width: 1200,
      height: 700,
      totalCoins: readTotalCoins(),
      checkpoint,
      intro: true,
      record: true,
      seed,
    })
  }
  const engine = engineRef.current
  // Browser tests only (the e2e build sets VITE_E2E; production builds drop this line).
  if (import.meta.env.VITE_E2E) (window as unknown as { __engine: GameState }).__engine = engine

  // Who each graffiti-artist obstacle is: picked when it shows up on the street, so the sprite,
  // the dialog and the blackbook all show the same person.
  const encounterArtists = useRef(new Map<number, EncounterArtist>())
  // Met in this run (a checkpoint brings the ones signed before it), and the ones signed, for the HUD.
  const metThisRun = useRef(new Set<string>(engine.signatures))
  const signedArtists = useRef(new Map<string, { name: string; color: string }>())
  const rosterRef = useRef(artists)
  rosterRef.current = artists

  const [view, setView] = useState(() => getView(engine))
  const [worldScale, setWorldScale] = useState(1)
  const [gameActive, setGameActive] = useState(true)
  // Game over: the cop grabs the player for a moment before the menu shows.
  const [caught, setCaught] = useState(false)

  // Graffiti interaction states
  const [blackbook, setBlackbook] = useState<GraffitiArt[]>(() => {
    const saved = localStorage.getItem('dinoGameBlackbook')
    return saved ? JSON.parse(saved) : []
  })
  const [currentArtist, setCurrentArtist] = useState<EncounterArtist | null>(null)
  const [interactionStage, setInteractionStage] = useState<
    'dialog' | 'drawing' | 'confirmation' | 'signature-choice' | 'none'
  >('none')
  const [drawnImage, setDrawnImage] = useState<string | null>(null)
  const [drawingType, setDrawingType] = useState<'graffiti' | 'signature'>('graffiti')
  const [showBlackbook, setShowBlackbook] = useState(false)
  const blackbookRef = useRef<GraffitiArt[]>([])

  // Ducking and walking are polled every frame from the held input, so they also work when
  // landing with the key already down.
  const { held, press, release } = useGameInput({
    onJump: () => pressJump(engine),
    onJumpEnd: () => releaseJump(engine),
    onDash: () => pressDash(engine),
  })

  /** Picks who each new graffiti-artist obstacle is, the moment it shows up on the street. */
  const assignEncounterArtists = useCallback(() => {
    const assigned = encounterArtists.current
    // Forget the ones that left the screen (unless it's the encounter going on).
    const present = new Set(engine.obstacles.map((obstacle) => obstacle.id))
    for (const id of assigned.keys()) if (!present.has(id) && id !== engine.artistEncounterId) assigned.delete(id)

    for (const obstacle of engine.obstacles) {
      if (obstacle.type !== 'graffiti-artist' || assigned.has(obstacle.id)) continue
      const collected = new Set(blackbookRef.current.filter((art) => art.type === 'artist-signature').map((art) => art.artist))
      // Nobody twice on the street at once, and nobody the player already met in this run.
      const onStreet = new Set([...assigned.values()].map((artist) => artist.id))
      const taken = new Set([...metThisRun.current, ...onStreet])
      const drawn = obstacle.graffitiArtist ?? 'remo'
      // When the player already met everyone in this run, it's someone met before: they wave
      // and the run goes on (see the 'artist' event below).
      const artist =
        pickEncounterArtist(rosterRef.current, { phase: engine.phase, score: engine.score, collected, metThisRun: taken }) ??
        gameArtist(pickGameArtist(drawn, metThisRun.current, onStreet) ?? drawn)
      assigned.set(obstacle.id, artist)
    }
  }, [engine])

  /** Blackbook fields that say whose art it is (real artists keep their name and color with it). */
  const ownerFields = (artist: EncounterArtist) =>
    isGameArtist(artist.id) ? { artist: artist.id } : { artist: artist.id, artistName: artist.name, artistColor: artist.color }

  const handleAcceptArtist = useCallback(async () => {
    if (!currentArtist) return
    // Ask right away if the player wants to draw their signature; the artist's one lands in the
    // blackbook as soon as its image is ready.
    setInteractionStage('signature-choice')
    // Their signature goes in once: meeting them again (in another run) doesn't add a copy.
    if (hasTheirSignature(blackbookRef.current, currentArtist.id)) return
    const imageData = await signatureImage(currentArtist)
    const artistSig: GraffitiArt = {
      id: `${theirSignatureId(currentArtist.id)}${Date.now()}`,
      ...ownerFields(currentArtist),
      type: 'artist-signature',
      imageData,
      timestamp: Date.now(),
    }
    blackbookRef.current = [...blackbookRef.current, artistSig]
    setBlackbook([...blackbookRef.current])
    // Saved right away too: the run may be over, and this screen gone, by the time the image loads.
    try {
      const saved: GraffitiArt[] = JSON.parse(localStorage.getItem('dinoGameBlackbook') ?? '[]')
      if (!hasTheirSignature(saved, currentArtist.id)) localStorage.setItem('dinoGameBlackbook', JSON.stringify([...saved, artistSig]))
    } catch {
      // Storage full or blocked: it still shows until the page is closed.
    }
  }, [currentArtist])

  const endEncounter = useCallback(() => {
    setInteractionStage('none')
    setCurrentArtist(null)
    setDrawnImage(null)
    resumeGame(engine)
    setGameActive(true)
  }, [engine])

  const handleDrawingDone = useCallback((imageData: string) => {
    setDrawnImage(imageData)
    setInteractionStage('confirmation')
  }, [])

  const handleConfirmArt = useCallback(() => {
    if (!currentArtist || !drawnImage) return

    // Add art to blackbook with appropriate type
    const newArt: GraffitiArt = {
      id: `${currentArtist.id}-${drawingType}-${Date.now()}`,
      ...ownerFields(currentArtist),
      type: drawingType === 'graffiti' ? 'artist-signature' : 'my-signature',
      imageData: drawnImage,
      timestamp: Date.now(),
    }

    // The ref first: the artist's signature may land in the blackbook at the same time.
    blackbookRef.current = [...blackbookRef.current, newArt]
    setBlackbook(blackbookRef.current)

    // Add signature and score (only once per artist)
    if (awardSignature(engine, currentArtist.id)) {
      signedArtists.current.set(currentArtist.id, { name: currentArtist.name, color: currentArtist.color })
      localStorage.setItem('dinoGameSignatures', JSON.stringify(engine.signatures))
    }

    endEncounter()
  }, [currentArtist, drawingType, drawnImage, endEncounter, engine])

  useEffect(() => {
    const updateLayout = () => {
      const { scale, width, height } = fitWorld(
        gameContainerRef.current?.clientWidth ?? 1200,
        gameContainerRef.current?.clientHeight ?? 700
      )
      setWorldScale(scale)
      resizeWorld(engine, width, height)
      setView(getView(engine))
    }

    updateLayout()
    window.addEventListener('resize', updateLayout)

    return () => {
      window.removeEventListener('resize', updateLayout)
    }
  }, [engine])

  useEffect(() => {
    blackbookRef.current = blackbook
    try {
      localStorage.setItem('dinoGameBlackbook', JSON.stringify(blackbook))
    } catch (error) {
      // Storage full or blocked: the blackbook still shows until the page is closed.
      console.warn('blackbook not saved:', error)
    }
  }, [blackbook])

  useEffect(() => {
    if (!gameActive) return

    // Only (re)starts the loop, e.g. when resuming after a graffiti encounter: the run's
    // coins, signatures and power-ups stay in the engine.
    let frameId = 0
    let lastTime = 0

    const gameLoop = (timestamp: number) => {
      if (!lastTime) lastTime = timestamp
      const elapsedMs = timestamp - lastTime
      lastTime = timestamp

      // Fixed 60Hz ticks inside: the same physics on any refresh rate.
      const events = advanceGame(engine, held.current, elapsedMs)
      assignEncounterArtists()
      setView(getView(engine))

      for (const event of events) {
        if (event.type === 'coin') {
          localStorage.setItem('dinoGameTotalCoins', String(engine.totalCoins))
        } else if (event.type === 'artist') {
          // Pause and start the interaction; endEncounter resumes the engine.
          const artist = (engine.artistEncounterId !== null && encounterArtists.current.get(engine.artistEncounterId)) || gameArtist(event.artist)
          if (metThisRun.current.has(artist.id)) {
            resumeGame(engine) // met already in this run: no second stop
            continue
          }
          metThisRun.current.add(artist.id)
          setCurrentArtist(artist)
          setInteractionStage('dialog')
          setGameActive(false)
          return
        } else if (event.type === 'gameOver') {
          setGameActive(false)
          setCaught(true)
          try {
            localStorage.setItem(LAST_RUN_KEY, JSON.stringify(engine.log))
          } catch {
            // Storage full or blocked: the replay is only a bonus.
          }
          const result: RunResult = {
            score: event.score,
            checkpoint: event.checkpoint,
            phase: event.phase,
            coins: event.coins,
            distance: event.distance,
            log: engine.log,
          }
          window.setTimeout(() => onGameOver(result), CAUGHT_MS)
          return
        }
      }

      frameId = requestAnimationFrame(gameLoop)
    }

    frameId = requestAnimationFrame(gameLoop)

    return () => {
      cancelAnimationFrame(frameId)
    }
  }, [engine, gameActive, held, onGameOver, assignEncounterArtists])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current = null
    }

    if (selectedMusic === 'none') {
      return
    }

    const audio = new Audio(themeTrack)
    audio.loop = true
    audio.volume = 0.45
    audioRef.current = audio
    void audio.play().catch(() => {
      // Browser can block autoplay until first interaction.
    })

    return () => {
      audio.pause()
      audio.currentTime = 0
      if (audioRef.current === audio) {
        audioRef.current = null
      }
    }
  }, [selectedMusic])

  /** Name and color of an artist signed in this run, for the HUD dots (also ones signed before a checkpoint). */
  const signatureOwner = (id: string) => {
    const known = signedArtists.current.get(id) ?? artists.find((artist) => artist.id === id)
    if (known) return { id, name: known.name, color: known.color }
    return { id, ...artOwner(blackbook.find((art) => art.artist === id) ?? { artist: id }) }
  }

  const { player, phase, score, grindCombo, wallClingSide } = view
  const speedPercentage = (view.speed / RUNNER_TUNING.maxSpeed) * 100
  // Night falls when the phase 2 checkpoint is grabbed (the layers fade with a CSS transition).
  const backgroundBlend = phase >= 2 ? 1 : 0
  const isNight = phase >= 2
  const showPhaseBanner = phase > 1 && view.phaseMs < PHASE_BANNER_MS
  const continuedHere = checkpoint !== null && phase === checkpoint.phase
  const modeInfo = GAME_MODES[mode]
  // Gripping a wall turns the sprite away from it; otherwise it faces the walking direction.
  const visualFacing = wallClingSide !== 0 ? (-wallClingSide as 1 | -1) : player.facing ?? 1
  // Standing still while tagging the wall in the intro, and while down after a skate SLAM.
  const isMoving = view.slamProgress === null && (mode === 'runner' ? view.introStage === null : Math.abs(player.velocityX ?? 0) > 0.3)

  return (
    <div className={`game-wrapper ${isNight ? 'is-night' : ''} phase-${phase}`}>
      <div
        ref={gameContainerRef}
        className={`game-container ${isNight ? 'is-night' : ''} phase-${phase}`}
      >
        {/* The world is laid out in game pixels and scaled to fit; UI below stays unscaled. */}
        <div
          className="game-world"
          style={{
            width: `${100 / worldScale}%`,
            height: `${100 / worldScale}%`,
            transform: `scale(${worldScale})`,
          }}
        >
          <div className="game-background">
            <div
              className="background-image-layer day"
              style={{ backgroundImage: `url(${dayBackground})`, opacity: `${1 - backgroundBlend}` }}
            />
            <div
              className="background-image-layer night"
              style={{ backgroundImage: `url(${nightBackground})`, opacity: `${backgroundBlend}` }}
            />
            <div className="bg-layer bg-clouds" />
          </div>

          {/* Floor, obstacles and player move down together when the camera follows the player up. */}
          <div
            className={`game-scene ${view.slamProgress !== null && view.slamProgress < SLAM_SHAKE_UNTIL ? 'is-slammed' : ''}`}
            style={{ transform: `translateY(${view.cameraY}px)` }}
          >
            <div className="scene-ground" />
            {view.chaser && !caught && <Chaser chaser={view.chaser} groundLevel={engine.config.groundLevel} />}
            {caught && <CaughtScene playerX={player.x} groundLevel={engine.config.groundLevel} />}
            {view.introStage === 'tag' && <span className="spray-mist" style={{ left: player.x + 84, top: player.y + 34 }} />}
            {view.introStage === 'alert' && <span className="alert-bubble" style={{ left: player.x + 40, top: player.y - 44 }}>!</span>}
            <Dinosaur
              state={player}
              hasSkate={view.skateMs > 0}
              recovering={view.recovering}
              slamProgress={view.slamProgress}
              isDashing={view.dashing}
              isWallClinging={wallClingSide !== 0}
              facing={visualFacing}
              isMoving={isMoving}
            />
            <Obstacles obstacles={view.obstacles} tagProgress={view.tagProgress} artists={encounterArtists.current} />
            {view.slamProgress !== null && (
              <SlamEffect progress={view.slamProgress} x={player.x} y={player.y} width={player.width} height={player.height} />
            )}
          </div>
        </div>

        {showPhaseBanner && (
          <div className="phase-banner" key={phase} role="status" style={{ animationDuration: `${PHASE_BANNER_MS}ms` }}>
            <span className="phase-banner-kicker">🚩 Checkpoint!</span>
            <strong className="phase-banner-title">
              {PHASES[phase].emoji} Fase {phase} · {PHASES[phase].name}
            </strong>
            <span className="phase-banner-note">
              {continuedHere ? 'Continuando do checkpoint' : '+250 pontos · checkpoint salvo'}
            </span>
            <span className="phase-banner-tip">{phaseBannerTip(phase)}</span>
          </div>
        )}

        <RouteMap score={score} phase={phase} distance={view.distance} />

        <TouchControls mode={mode} onPress={press} onRelease={release} />

        <div className="controls-hint" aria-hidden="true">
          <span className="controls-hint-title">
            {modeInfo.icon} {modeInfo.title}
          </span>
          {modeInfo.controls.map(([keys, action]) => (
            <span key={keys} className="controls-hint-item">
              <strong>{keys}</strong> {action}
            </span>
          ))}
        </div>

        {grindCombo > 1 && (
          <div className="grind-combo" aria-hidden="true">
            <span className="grind-combo-x">GRIND</span>
            {/* keyed by the value so the pop animation replays on every combo step */}
            <span key={grindCombo} className="grind-combo-value">x{grindCombo}</span>
          </div>
        )}

        <HUD
          mode={mode}
          score={score}
          coins={view.coins}
          totalCoins={view.totalCoins}
          highScore={highScore}
          gameSpeed={speedPercentage}
          isNight={isNight}
          skateTimeLeftMs={view.skateMs}
          lightningTimeLeftMs={view.lightningMs}
          jumpBoostTimeLeftMs={view.jumpBoostMs}
          signatures={view.signatures.map(signatureOwner)}
          blackbookCount={blackbook.length}
          onOpenBlackbook={() => setShowBlackbook(true)}
          phase={phase}
          dashCooldownMs={view.dashCooldownMs}
          grindCombo={grindCombo}
        />

        {currentArtist && interactionStage === 'dialog' && (
          <GraffitiDialog artist={currentArtist} onAccept={handleAcceptArtist} onReject={endEncounter} />
        )}

        {currentArtist && interactionStage === 'signature-choice' && (
          <div className="street-backdrop">
            <div className="street-dialog paper-panel" style={artistStyle(currentArtist.color)} role="dialog" aria-labelledby="choice-title">
              <div className="street-dialog-artist">
                <ArtistPortrait name={currentArtist.name} kind={currentArtist.kind} />
                <span className="artist-tag-name">{currentArtist.name}</span>
              </div>
              <div className="street-dialog-body">
                <p className="speech-bubble">Fechou! Minha assinatura já tá no seu blackbook. 🤝</p>
                <h2 id="choice-title" className="dialog-ask">
                  Quer deixar a sua assinatura para {currentArtist.name}?
                </h2>
                <div className="street-dialog-actions">
                  <button
                    className="sticker-btn is-pink"
                    onClick={() => {
                      setDrawingType('signature')
                      setInteractionStage('drawing')
                    }}
                  >
                    ✏️ Desenhar minha assinatura
                  </button>
                  <button className="sticker-btn is-ghost" onClick={endEncounter}>
                    Agora não
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentArtist && interactionStage === 'drawing' && (
          <DrawingCanvas
            artist={currentArtist.name}
            onDone={handleDrawingDone}
            onCancel={endEncounter}
            title={drawingType === 'signature' ? 'Sua Assinatura' : 'Seu Graffiti'}
          />
        )}

        {currentArtist && drawnImage && interactionStage === 'confirmation' && (
          <DrawingConfirmation
            imageData={drawnImage}
            artist={currentArtist.name}
            onConfirm={handleConfirmArt}
            onGoBack={() => {
              setDrawnImage(null)
              setInteractionStage('drawing')
            }}
          />
        )}

        {showBlackbook && (
          <Blackbook arts={blackbook} onClose={() => setShowBlackbook(false)} />
        )}

        {caught && <div className="caught-sticker">Pego!</div>}
      </div>
    </div>
  )
}
