import { Obstacle } from '../types/game'
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
