import { DinosaurState } from '../types/game'
import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import type { DinoColor } from '../App'
import runSprite1 from '../assets/sprites/player/run-1.svg'
import runSprite2 from '../assets/sprites/player/run-2.svg'
import runSprite3 from '../assets/sprites/player/run-3.svg'
import runSprite4 from '../assets/sprites/player/run-4.svg'
import runSprite5 from '../assets/sprites/player/run-5.svg'
import runSprite6 from '../assets/sprites/player/run-6.svg'
import runSprite7 from '../assets/sprites/player/run-7.svg'
import runSprite8 from '../assets/sprites/player/run-8.svg'
import jumpSprite1 from '../assets/sprites/player/jump-1.svg'
import jumpSprite2 from '../assets/sprites/player/jump-2.svg'
import jumpSprite3 from '../assets/sprites/player/jump-3.svg'
import jumpSprite4 from '../assets/sprites/player/jump-4.svg'
import duckSprite from '../assets/sprites/player/duck.svg'
import './Dinosaur.css'

const playerColorFilterMap: Record<DinoColor, string> = {
  verde: 'hue-rotate(90deg) saturate(1.25) brightness(0.98)',
  azul: 'hue-rotate(165deg) saturate(1.35) brightness(0.95)',
  laranja: 'hue-rotate(18deg) saturate(1.35) brightness(1.02)',
  rosa: 'hue-rotate(300deg) saturate(1.4) brightness(1)',
  cinza: 'grayscale(1) contrast(1.1)',
}

interface DinosaurProps {
  state: DinosaurState
  color: DinoColor
  hasSkate?: boolean
  skateFlickering?: boolean
}

export default function Dinosaur({ state, color, hasSkate = false, skateFlickering = false }: DinosaurProps) {
  const playerFilter = playerColorFilterMap[color]
  const runFrames = useMemo(
    () => [
      runSprite1,
      runSprite2,
      runSprite3,
      runSprite4,
      runSprite5,
      runSprite6,
      runSprite7,
      runSprite8,
    ],
    []
  )
  const [runFrameIndex, setRunFrameIndex] = useState(0)
  const [jumpFrameIndex, setJumpFrameIndex] = useState(0)

  const isJumping = Boolean(state.isJumping)
  const isDucking = Boolean(state.isDucking)
  const isRunning = !isJumping && !isDucking && !hasSkate
  const jumpFrames = useMemo(
    () => [jumpSprite1, jumpSprite2, jumpSprite3, jumpSprite4],
    []
  )

  useEffect(() => {
    if (!isRunning) {
      setRunFrameIndex(0)
      return
    }

    const frameTimer = window.setInterval(() => {
      setRunFrameIndex((prev) => (prev + 1) % runFrames.length)
    }, 90)

    return () => {
      window.clearInterval(frameTimer)
    }
  }, [isRunning, runFrames.length])

  useEffect(() => {
    if (!isJumping) {
      setJumpFrameIndex(0)
      return
    }

    let timeoutId = 0
    const delays = [80, 120, 80, 80]

    const tick = (index: number) => {
      setJumpFrameIndex(index)
      timeoutId = window.setTimeout(() => {
        tick((index + 1) % jumpFrames.length)
      }, delays[index] ?? 80)
    }

    tick(0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [isJumping, jumpFrames.length])

  const dinosaurStyle = {
    '--player-filter': playerFilter,
    left: `${state.x}px`,
    top: `${state.y}px`,
    width: `${state.width}px`,
    height: `${state.height}px`,
  } as CSSProperties

  return (
    <div
      className={`dinosaur ${isJumping ? 'jumping' : 'running'} ${isDucking ? 'ducking' : ''} ${hasSkate ? 'has-skate' : ''} ${skateFlickering ? 'skate-flickering' : ''}`}
      style={dinosaurStyle}
    >
      <img
        src={runFrames[runFrameIndex]}
        alt="Personagem correndo"
        className={`run-frame ${!isJumping && !isDucking ? 'active' : ''}`}
        draggable={false}
      />
      <img
        src={jumpFrames[jumpFrameIndex]}
        alt="Personagem pulando"
        className={`state-character frame-jump ${isJumping ? 'active' : ''}`}
        draggable={false}
      />
      <img
        src={duckSprite}
        alt="Personagem agachado"
        className={`state-character frame-duck ${isDucking ? 'active' : ''}`}
        draggable={false}
      />
      {hasSkate && (
        <div className="player-skate" aria-hidden="true">
          <div className="player-skate-deck" />
          <div className="player-skate-wheel player-skate-wheel-left" />
          <div className="player-skate-wheel player-skate-wheel-right" />
        </div>
      )}
    </div>
  )
}
