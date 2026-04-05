import { Obstacle } from '../types/game'
import powerJumpIcon from '../assets/sprites/powerups/power-jump.svg'
import powerLightningIcon from '../assets/sprites/powerups/power-lightning.svg'
import './Obstacle.css'

interface ObstaclesProps {
  obstacles: Obstacle[]
}

export default function Obstacles({ obstacles }: ObstaclesProps) {
  return (
    <div className="obstacles">
      {obstacles.map((obstacle) => (
        <div
          key={obstacle.id}
          className={`obstacle obstacle-${obstacle.type}`}
          style={{
            left: `${obstacle.x}px`,
            top: `${obstacle.y}px`,
            width: `${obstacle.width}px`,
            height: `${obstacle.height}px`,
          }}
        >
          {obstacle.type === 'cactus' ? (
            <>
              <div className="cactus-arm cactus-arm-left" />
              <div className="cactus-body" />
              <div className="cactus-arm cactus-arm-right" />
            </>
          ) : obstacle.type === 'bird' ? (
            <>
              <div className="bird-wing bird-wing-left" />
              <div className="bird-body" />
              <div className="bird-eye" />
              <div className="bird-wing bird-wing-right" />
            </>
          ) : obstacle.type === 'duck-bar' ? (
            <>
              <div className="duck-bar-beam" />
              <div className="duck-bar-leg duck-bar-leg-left" />
              <div className="duck-bar-leg duck-bar-leg-right" />
            </>
          ) : obstacle.type === 'floating-platform' ? (
            <>
              <div className="floating-platform-top" />
              <div className="floating-platform-body" />
              <div className="floating-platform-light floating-platform-light-left" />
              <div className="floating-platform-light floating-platform-light-right" />
            </>
          ) : obstacle.type === 'trampoline' ? (
            <>
              <div className="trampoline-base" />
              <div className="trampoline-surface" />
              <div className="trampoline-leg trampoline-leg-left" />
              <div className="trampoline-leg trampoline-leg-right" />
            </>
          ) : obstacle.type === 'coin' ? (
            <>
              <div className="coin-core" />
              <div className="coin-shine" />
            </>
          ) : obstacle.type === 'power-lightning' ? (
            <>
              <img src={powerLightningIcon} alt="Poder raio" className="power-icon-image power-icon-lightning" draggable={false} />
            </>
          ) : obstacle.type === 'power-jump' ? (
            <>
              <img src={powerJumpIcon} alt="Poder super pulo" className="power-icon-image power-icon-jump" draggable={false} />
            </>
          ) : (
            <>
              <div className="skate-deck" />
              <div className="skate-wheel skate-wheel-left" />
              <div className="skate-wheel skate-wheel-right" />
            </>
          )}
        </div>
      ))}
    </div>
  )
}
