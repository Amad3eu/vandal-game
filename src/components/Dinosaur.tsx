import { DinosaurState } from '../types/game'
import type { CSSProperties } from 'react'
import type { DinoColor } from '../App'
import './Dinosaur.css'

const sprayColorFilterMap: Record<DinoColor, string> = {
  verde: 'none',
  azul: 'hue-rotate(160deg) saturate(1.15)',
  laranja: 'hue-rotate(8deg) saturate(1.25)',
  rosa: 'hue-rotate(300deg) saturate(1.2)',
  cinza: 'grayscale(0.92) contrast(1.08)',
}

const SPRAY_SPRITE_URL =
  'https://static.vecteezy.com/system/resources/previews/054/062/298/non_2x/vintage-red-pixel-spray-assets-for-games-png.png'

interface DinosaurProps {
  state: DinosaurState
  color: DinoColor
  hasSkate?: boolean
}

export default function Dinosaur({ state, color, hasSkate = false }: DinosaurProps) {
  const sprayFilter = sprayColorFilterMap[color]
  const dinosaurStyle = {
    '--spray-filter': sprayFilter,
    left: `${state.x}px`,
    top: `${state.y}px`,
    width: `${state.width}px`,
    height: `${state.height}px`,
  } as CSSProperties

  return (
    <div
      className={`dinosaur ${state.isJumping ? 'jumping' : 'running'} ${state.isDucking ? 'ducking' : ''}`}
      style={dinosaurStyle}
    >
      <img
        src={SPRAY_SPRITE_URL}
        alt="Personagem lata de spray"
        className="spray-character"
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
