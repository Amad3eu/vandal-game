import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import type { GameAction, GameMode } from '../types/game'
import { GAME_MODES, TOUCH_BUTTON_LABELS } from '../data/gameModes'
import './TouchControls.css'

interface TouchControlsProps {
  mode: GameMode
  onPress: (action: GameAction, source: string) => void
  onRelease: (action: GameAction, source: string) => void
}

const ICONS: Record<GameAction, ReactNode> = {
  left: <path d="M15 5 8 12l7 7" />,
  right: <path d="m9 5 7 7-7 7" />,
  jump: <path d="m5 15 7-7 7 7" />,
  down: <path d="m5 9 7 7 7-7" />,
  dash: <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />,
}

/** On-screen buttons for touch screens (hidden by CSS when there is a mouse/keyboard). */
export default function TouchControls({ mode, onPress, onRelease }: TouchControlsProps) {
  const buttons = GAME_MODES[mode].touchButtons
  const moveButtons = buttons.filter((action) => action === 'left' || action === 'right')
  const actionButtons = buttons.filter((action) => action !== 'left' && action !== 'right')

  const renderButton = (action: GameAction) => {
    // Each finger is its own source, so walking and jumping at the same time works. Capturing
    // the pointer makes sure the release arrives even if the finger slides off the button.
    const start = (e: ReactPointerEvent<HTMLButtonElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId)
      e.currentTarget.dataset.pressed = 'true'
      onPress(action, `touch-button:${e.pointerId}`)
    }
    const end = (e: ReactPointerEvent<HTMLButtonElement>) => {
      delete e.currentTarget.dataset.pressed
      onRelease(action, `touch-button:${e.pointerId}`)
    }

    return (
      <button
        key={action}
        type="button"
        tabIndex={-1}
        className={`touch-button touch-button-${action}`}
        aria-label={TOUCH_BUTTON_LABELS[action]}
        onPointerDown={start}
        onPointerUp={end}
        onPointerCancel={end}
        onLostPointerCapture={end}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className={action === 'dash' ? 'touch-icon-filled' : 'touch-icon'}>
          {ICONS[action]}
        </svg>
      </button>
    )
  }

  return (
    <div className="touch-controls">
      <div className="touch-cluster touch-cluster-move">{moveButtons.map(renderButton)}</div>
      <div className="touch-cluster touch-cluster-actions">{actionButtons.map(renderButton)}</div>
    </div>
  )
}
