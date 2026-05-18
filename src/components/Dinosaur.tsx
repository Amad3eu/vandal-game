import { DinosaurState } from '../types/game'
import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import walkSprite1 from '../assets/sprites/walk/walk-1.png'
import walkSprite2 from '../assets/sprites/walk/walk-2.png'
import walkSprite3 from '../assets/sprites/walk/walk-3.png'
import walkSprite4 from '../assets/sprites/walk/walk-4.png'
import jumpSprite1 from '../assets/sprites/jump/jump-1.png'
import jumpSprite2 from '../assets/sprites/jump/jump-2.png'
import jumpSprite3 from '../assets/sprites/jump/jump-3.png'
import jumpSprite4 from '../assets/sprites/jump/jump-4.png'
import jumpSprite5 from '../assets/sprites/jump/jump-5.png'
import jumpSprite6 from '../assets/sprites/jump/jump-6.png'
import jumpSprite7 from '../assets/sprites/jump/jump-7.png'
import duckFrame1 from '../assets/sprites/Abaixa/Abaixa1.png'
import duckFrame2 from '../assets/sprites/Abaixa/Abaixa2.png'
import duckFrame3 from '../assets/sprites/Abaixa/Abaixa3.png'
import duckFrame4 from '../assets/sprites/Abaixa/Abaixa4.png'
import duckFrame5 from '../assets/sprites/Abaixa/Abaixa5.png'
import duckFrame6 from '../assets/sprites/Abaixa/Abaixa6.png'
import duckFrame7 from '../assets/sprites/Abaixa/Abaixa7.png'
import duckFrame8 from '../assets/sprites/Abaixa/Abaixa8.png'
import duckFrame9 from '../assets/sprites/Abaixa/Abaixa9.png'
import './Dinosaur.css'

interface DinosaurProps {
  state: DinosaurState
  hasSkate?: boolean
  skateFlickering?: boolean
}

export default function Dinosaur({ state, hasSkate = false, skateFlickering = false }: DinosaurProps) {
  const runFrames = useMemo(
    () => [
      walkSprite1,
      walkSprite2,
      walkSprite3,
      walkSprite4,
      walkSprite3,
      walkSprite2,
    ],
    []
  )
  const [runFrameIndex, setRunFrameIndex] = useState(0)
  const [jumpFrameIndex, setJumpFrameIndex] = useState(0)
  const [duckFrameIndex, setDuckFrameIndex] = useState(0)

  const isJumping = Boolean(state.isJumping)
  const isDucking = Boolean(state.isDucking)
  const isGrounded = !isJumping && !isDucking && !hasSkate
  const isRunning = isGrounded
  const jumpFrames = useMemo(
    () => [
      jumpSprite1,
      jumpSprite2,
      jumpSprite3,
      jumpSprite4,
      jumpSprite5,
      jumpSprite6,
      jumpSprite7,
    ],
    []
  )
  const duckFrames = useMemo(
    () => [
      duckFrame1,
      duckFrame2,
      duckFrame3,
      duckFrame4,
      duckFrame5,
      duckFrame6,
      duckFrame7,
      duckFrame8,
      duckFrame9,
    ],
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
    const delays = [70, 70, 70, 70, 70, 70, 90]

    const tick = (index: number) => {
      setJumpFrameIndex(index)
      timeoutId = window.setTimeout(() => {
        tick((index + 1) % jumpFrames.length)
      }, delays[index] ?? 70)
    }

    tick(0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [isJumping, jumpFrames.length])

  useEffect(() => {
    if (!isDucking) {
      setDuckFrameIndex(0)
      return
    }

    const frameTimer = window.setInterval(() => {
      setDuckFrameIndex((prev) => (prev + 1) % duckFrames.length)
    }, 90)

    return () => {
      window.clearInterval(frameTimer)
    }
  }, [isDucking, duckFrames.length])

  const visualOffset = isGrounded ? 8 : 0
  const dinosaurStyle = {
    left: `${state.x}px`,
    top: `${state.y + visualOffset}px`,
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
        src={duckFrames[duckFrameIndex]}
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
