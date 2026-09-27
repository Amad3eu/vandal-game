import { useEffect, useState } from 'react'
import nightBackground from '../assets/background/7.png'
import walkSprite1 from '../assets/sprites/walk/walk-1.png'
import walkSprite2 from '../assets/sprites/walk/walk-2.png'
import walkSprite3 from '../assets/sprites/walk/walk-3.png'
import walkSprite4 from '../assets/sprites/walk/walk-4.png'

const RUN_FRAMES = [walkSprite1, walkSprite2, walkSprite3, walkSprite4, walkSprite3, walkSprite2]

/** Title screen backdrop: the city at night scrolling by, and the player running on the street. */
export default function TitleScene() {
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) return
    const timer = window.setInterval(() => setFrame((f) => (f + 1) % RUN_FRAMES.length), 90)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <div className="title-scene" aria-hidden="true">
      <div className="title-city" style={{ backgroundImage: `url(${nightBackground})` }} />
      <div className="title-shade" />
      <div className="title-street">
        <img className="title-runner" src={RUN_FRAMES[frame]} alt="" draggable={false} />
      </div>
    </div>
  )
}
