import { useState, useEffect, useRef, useCallback } from 'react'
import Dinosaur from './Dinosaur'
import Obstacles from './Obstacle'
import HUD from './HUD'
import TouchControls from './TouchControls'
import GraffitiDialog, { ArtistPortrait, artistStyle } from './GraffitiDialog'
import DrawingCanvas from './DrawingCanvas'
import DrawingConfirmation from './DrawingConfirmation'
import Chaser, { CaughtScene } from './Chaser'
import Blackbook from './Blackbook'
import { useGameInput } from '../hooks/useGameInput'
import { ARTIST_SIGNATURES } from '../data/artistSignatures'
import { GAME_MODES, RUNNER_TUNING } from '../data/gameModes'
import { PHASES } from '../data/phases'
import { ARTIST_INFO } from '../data/graffitiArtists'
import {
  awardSignature,
  createGameState,
  fitWorld,
  getView,
  pressDash,
  pressJump,
  releaseJump,
  resizeWorld,
  resumeGame,
  stepGame,
  type GameState,
} from '../game/engine'
import { Checkpoint, GameMode, GraffitiArtist, GraffitiArt } from '../types/game'
import type { MusicOption } from '../App'
import dayBackground from '../assets/background/9.png'
import nightBackground from '../assets/background/7.png'
import themeTrack from '../assets/soundtrack/SonoTWS - Tired Of People Act II - SonoTWS (youtube).mp3'
import './Game.css'

/** How long the "new phase" banner stays up after grabbing a checkpoint flag. */
const PHASE_BANNER_MS = 2600
/** How long the cop's grab shows before the game over menu. */
const CAUGHT_MS = 1300

function readTotalCoins() {
  const saved = localStorage.getItem('dinoGameTotalCoins')
  return saved ? parseInt(saved, 10) : 0
}

interface GameProps {
  mode: GameMode
  highScore: number
  selectedMusic: MusicOption
  /** Continue from this checkpoint instead of starting from phase 1. */
  checkpoint?: Checkpoint | null
  onGameOver: (score: number, checkpoint: Checkpoint | null) => void
}

export default function Game({ mode, highScore, selectedMusic, checkpoint = null, onGameOver }: GameProps) {
  const gameContainerRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // The rules live in the DOM-free engine (src/game); this component runs the loop,
  // forwards input and renders the engine's state. It remounts for every run.
  const engineRef = useRef<GameState>()
  if (!engineRef.current) {
    // Opens with the tagging intro and the cop; continuing from a checkpoint drops the player in instead.
    engineRef.current = createGameState({ mode, width: 1200, height: 700, totalCoins: readTotalCoins(), checkpoint, intro: true })
  }
  const engine = engineRef.current

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
  const [currentArtist, setCurrentArtist] = useState<GraffitiArtist | null>(null)
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

  const handleAcceptArtist = useCallback(() => {
    if (!currentArtist) return
    // First, add artist signature to blackbook
    const artistSig: GraffitiArt = {
      id: `${currentArtist}-sig-${Date.now()}`,
      artist: currentArtist,
      type: 'artist-signature',
      imageData: ARTIST_SIGNATURES[currentArtist],
      timestamp: Date.now(),
    }
    blackbookRef.current = [...blackbookRef.current, artistSig]
    setBlackbook([...blackbookRef.current])

    // Ask if player wants to draw signature for the artist
    setInteractionStage('signature-choice')
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
      id: `${currentArtist}-${drawingType}-${Date.now()}`,
      artist: currentArtist,
      type: drawingType === 'graffiti' ? 'artist-signature' : 'my-signature',
      imageData: drawnImage,
      timestamp: Date.now(),
    }

    const updatedBlackbook = [...blackbookRef.current, newArt]
    setBlackbook(updatedBlackbook)

    // Add signature and score (only once per artist)
    if (awardSignature(engine, currentArtist)) {
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
    localStorage.setItem('dinoGameBlackbook', JSON.stringify(blackbook))
  }, [blackbook])

  useEffect(() => {
    if (!gameActive) return

    // Only (re)starts the loop, e.g. when resuming after a graffiti encounter: the run's
    // coins, signatures and power-ups stay in the engine.
    let frameId = 0
    let lastTime = 0

    const gameLoop = (timestamp: number) => {
      if (!lastTime) lastTime = timestamp
      const deltaMs = Math.min(32, timestamp - lastTime)
      lastTime = timestamp

      const events = stepGame(engine, held.current, deltaMs)
      setView(getView(engine))

      for (const event of events) {
        if (event.type === 'coin') {
          localStorage.setItem('dinoGameTotalCoins', String(engine.totalCoins))
        } else if (event.type === 'artist') {
          // Pause and start the interaction; endEncounter resumes the engine.
          setCurrentArtist(event.artist)
          setInteractionStage('dialog')
          setGameActive(false)
          return
        } else if (event.type === 'gameOver') {
          setGameActive(false)
          setCaught(true)
          const { score, checkpoint: reached } = event
          window.setTimeout(() => onGameOver(score, reached), CAUGHT_MS)
          return
        }
      }

      frameId = requestAnimationFrame(gameLoop)
    }

    frameId = requestAnimationFrame(gameLoop)

    return () => {
      cancelAnimationFrame(frameId)
    }
  }, [engine, gameActive, held, onGameOver])

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
  // Standing still while tagging the wall in the intro.
  const isMoving = mode === 'runner' ? view.introStage === null : Math.abs(player.velocityX ?? 0) > 0.3

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
          <div className="game-scene" style={{ transform: `translateY(${view.cameraY}px)` }}>
            <div className="scene-ground" />
            {view.chaser && !caught && <Chaser chaser={view.chaser} groundLevel={engine.config.groundLevel} />}
            {caught && <CaughtScene playerX={player.x} groundLevel={engine.config.groundLevel} />}
            {view.introStage === 'tag' && <span className="spray-mist" style={{ left: player.x + 84, top: player.y + 34 }} />}
            {view.introStage === 'alert' && <span className="alert-bubble" style={{ left: player.x + 40, top: player.y - 44 }}>!</span>}
            <Dinosaur
              state={player}
              hasSkate={view.skateMs > 0}
              skateFlickering={view.skateFlickering}
              isDashing={view.dashing}
              isWallClinging={wallClingSide !== 0}
              facing={visualFacing}
              isMoving={isMoving}
            />
            <Obstacles obstacles={view.obstacles} tagProgress={view.tagProgress} />
          </div>
        </div>

        {showPhaseBanner && (
          <div className="phase-banner" key={phase} role="status">
            <span className="phase-banner-kicker">🚩 Checkpoint!</span>
            <strong className="phase-banner-title">
              {PHASES[phase].emoji} Fase {phase} · {PHASES[phase].name}
            </strong>
            <span className="phase-banner-note">
              {continuedHere ? 'Continuando do checkpoint' : '+250 pontos · checkpoint salvo'}
            </span>
          </div>
        )}

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
          signatures={view.signatures}
          blackbookCount={blackbook.length}
          onOpenBlackbook={() => setShowBlackbook(true)}
          phase={phase}
          dashCooldownMs={view.dashCooldownMs}
          grindCombo={grindCombo}
        />

        {currentArtist && interactionStage === 'dialog' && (
          <GraffitiDialog
            artist={currentArtist}
            onAccept={handleAcceptArtist}
            onReject={endEncounter}
            artistSignatureImage={ARTIST_SIGNATURES[currentArtist]}
          />
        )}

        {currentArtist && interactionStage === 'signature-choice' && (
          <div className="street-backdrop">
            <div className="street-dialog paper-panel" style={artistStyle(currentArtist)} role="dialog" aria-labelledby="choice-title">
              <div className="street-dialog-artist">
                <ArtistPortrait artist={currentArtist} />
                <span className="artist-tag-name">{ARTIST_INFO[currentArtist].name}</span>
              </div>
              <div className="street-dialog-body">
                <p className="speech-bubble">Fechou! Minha assinatura já tá no seu blackbook. 🤝</p>
                <h2 id="choice-title" className="dialog-ask">
                  Quer deixar a sua assinatura para {ARTIST_INFO[currentArtist].name}?
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
            artist={currentArtist}
            onDone={handleDrawingDone}
            onCancel={endEncounter}
            title={drawingType === 'signature' ? 'Sua Assinatura' : 'Seu Graffiti'}
          />
        )}

        {currentArtist && drawnImage && interactionStage === 'confirmation' && (
          <DrawingConfirmation
            imageData={drawnImage}
            artist={currentArtist}
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
