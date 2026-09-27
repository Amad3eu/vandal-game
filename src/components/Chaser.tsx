import { useEffect, useState } from 'react'
import type { Chaser as ChaserState } from '../game/engine'
import copRun1 from '../assets/sprites/cop/cop-run-1.png'
import copRun2 from '../assets/sprites/cop/cop-run-2.png'
import copRun3 from '../assets/sprites/cop/cop-run-3.png'
import copRun4 from '../assets/sprites/cop/cop-run-4.png'
import copShout from '../assets/sprites/cop/cop-shout.png'
import copCatch from '../assets/sprites/cop/cop-catch.png'
import './Intro.css'

const RUN_FRAMES = [copRun1, copRun2, copRun3, copRun4]

interface ChaserProps {
  chaser: ChaserState
  groundLevel: number
}

/** The cop from the intro, drawn like the player (a 100px box, sprite at 120%). */
export default function Chaser({ chaser, groundLevel }: ChaserProps) {
  const running = chaser.state === 'enter' || chaser.state === 'chase'
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    if (!running) return
    const timer = window.setInterval(() => setFrame((f) => (f + 1) % RUN_FRAMES.length), 100)
    return () => window.clearInterval(timer)
  }, [running])

  const bubble = chaser.state === 'shout' ? 'PARA AÍ!' : chaser.state === 'giveup' ? 'VOLTA AQUI!' : null

  return (
    <div className="chaser" style={{ left: chaser.x, top: groundLevel - 92 }}>
      {bubble && <span className="shout-bubble">{bubble}</span>}
      <img src={running ? RUN_FRAMES[frame] : copShout} alt="" draggable={false} />
    </div>
  )
}

/** Game over: the cop runs in and grabs the player (Subway Surfers style). */
export function CaughtScene({ playerX, groundLevel }: { playerX: number; groundLevel: number }) {
  return (
    <div
      className="chaser caught"
      style={{ top: groundLevel - 92, ['--catch-x' as string]: `${playerX - 64}px` }}
    >
      <img src={copCatch} alt="" draggable={false} />
    </div>
  )
}
