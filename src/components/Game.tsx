import { useState, useEffect, useRef, useCallback } from 'react'
import Dinosaur from './Dinosaur'
import Obstacles from './Obstacle'
import HUD from './HUD'
import TouchControls from './TouchControls'
import GraffitiDialog from './GraffitiDialog'
import DrawingCanvas from './DrawingCanvas'
import DrawingConfirmation from './DrawingConfirmation'
import Blackbook from './Blackbook'
import { useGameInput } from '../hooks/useGameInput'
import { ARTIST_SIGNATURES } from '../data/artistSignatures'
import { GAME_MODES, RUNNER_TUNING } from '../data/gameModes'
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
import { GameMode, GraffitiArtist, GraffitiArt } from '../types/game'
import type { MusicOption } from '../App'
import dayBackground from '../assets/background/9.png'
import nightBackground from '../assets/background/7.png'
import themeTrack from '../assets/soundtrack/SonoTWS - Tired Of People Act II - SonoTWS (youtube).mp3'
import './Game.css'

const BACKGROUND_TRANSITION_START = 900
const BACKGROUND_TRANSITION_END = 1700

function readTotalCoins() {
  const saved = localStorage.getItem('dinoGameTotalCoins')
  return saved ? parseInt(saved, 10) : 0
}

interface GameProps {
  mode: GameMode
  highScore: number
  selectedMusic: MusicOption
  onGameOver: (score: number) => void
}

export default function Game({ mode, highScore, selectedMusic, onGameOver }: GameProps) {
  const gameContainerRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // The rules live in the DOM-free engine (src/game); this component runs the loop,
  // forwards input and renders the engine's state. It remounts for every run.
  const engineRef = useRef<GameState>()
  if (!engineRef.current) {
    engineRef.current = createGameState({ mode, width: 1200, height: 700, totalCoins: readTotalCoins() })
  }
  const engine = engineRef.current

  const [view, setView] = useState(() => getView(engine))
  const [worldScale, setWorldScale] = useState(1)
  const [gameActive, setGameActive] = useState(true)

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
          onGameOver(event.score)
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
  const backgroundBlend = Math.min(
    1,
    Math.max(0, (score - BACKGROUND_TRANSITION_START) / (BACKGROUND_TRANSITION_END - BACKGROUND_TRANSITION_START))
  )
  const isNight = phase >= 2
  const modeInfo = GAME_MODES[mode]
  // Gripping a wall turns the sprite away from it; otherwise it faces the walking direction.
  const visualFacing = wallClingSide !== 0 ? (-wallClingSide as 1 | -1) : player.facing ?? 1
  const isMoving = mode === 'runner' || Math.abs(player.velocityX ?? 0) > 0.3

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
            <div className="bg-layer bg-ground" />
          </div>

          <Dinosaur
            state={player}
            hasSkate={view.skateMs > 0}
            skateFlickering={view.skateFlickering}
            isDashing={view.dashing}
            isWallClinging={wallClingSide !== 0}
            facing={visualFacing}
            isMoving={isMoving}
          />
          <Obstacles obstacles={view.obstacles} />
        </div>

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
          <div className="signature-choice-overlay">
            <div className="signature-choice-container">
              <h2>Quer desenhar uma assinatura para {currentArtist}?</h2>
              <p>Você já recebeu a assinatura do artista!</p>

              <div className="choice-buttons">
                <button
                  className="btn-draw-signature"
                  onClick={() => {
                    setDrawingType('signature')
                    setInteractionStage('drawing')
                  }}
                >
                  📷 Desenhar Minha Assinatura
                </button>
                <button className="btn-skip" onClick={endEncounter}>
                  Não, Obrigado
                </button>
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

        {!gameActive && interactionStage === 'none' && (
          <div className="game-over-overlay">
            <div className="game-over-message">
              <h2>Fim de Jogo!</h2>
              <p>Clique para voltar ao menu principal</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
