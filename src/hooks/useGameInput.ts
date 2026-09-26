import { useEffect, useRef } from 'react'

/** Directions the game loop polls every frame while they are held. */
export interface HeldInput {
  left: boolean
  right: boolean
  down: boolean
}

interface GameInputHandlers {
  onJump: () => void
  onJumpEnd?: () => void
  onDash?: () => void
}

// Physical key positions (KeyboardEvent.code), so WASD works on any keyboard layout.
const JUMP_KEYS = ['Space', 'ArrowUp', 'KeyW']
const DOWN_KEYS = ['ArrowDown', 'KeyS']
const LEFT_KEYS = ['ArrowLeft', 'KeyA']
const RIGHT_KEYS = ['ArrowRight', 'KeyD']
const DASH_KEYS = ['ShiftLeft', 'ShiftRight', 'KeyX', 'KeyK']
const GAME_KEYS = new Set([...JUMP_KEYS, ...DOWN_KEYS, ...LEFT_KEYS, ...RIGHT_KEYS, ...DASH_KEYS])

// Typing in the feedback form or the drawing tools must not move the player.
function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

// Clicking the UI (feedback widget, HUD buttons, dialogs) must not make the player jump.
function isUiTarget(target: EventTarget | null) {
  return (
    target instanceof Element &&
    target.closest('button, a, input, textarea, select, label, [role="dialog"]') !== null
  )
}

export function useGameInput({ onJump, onJumpEnd = () => {}, onDash = () => {} }: GameInputHandlers) {
  const held = useRef<HeldInput>({ left: false, right: false, down: false })

  // Keep the latest callbacks without re-binding listeners every render.
  const handlers = useRef({ onJump, onJumpEnd, onDash })
  handlers.current = { onJump, onJumpEnd, onDash }

  useEffect(() => {
    const pressedKeys = new Set<string>()
    let rightMouseDown = false

    const syncHeld = () => {
      const isHeld = (keys: string[]) => keys.some((key) => pressedKeys.has(key))
      held.current = {
        left: isHeld(LEFT_KEYS),
        right: isHeld(RIGHT_KEYS),
        down: isHeld(DOWN_KEYS) || rightMouseDown,
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!GAME_KEYS.has(e.code) || isEditableTarget(e.target)) return
      e.preventDefault() // arrows and space would scroll the page

      const alreadyPressed = pressedKeys.has(e.code)
      pressedKeys.add(e.code)
      syncHeld()
      if (alreadyPressed) return

      if (JUMP_KEYS.includes(e.code)) handlers.current.onJump()
      if (DASH_KEYS.includes(e.code)) handlers.current.onDash()
    }

    // Key releases are never filtered, otherwise a key released inside a text field would stay held.
    const handleKeyUp = (e: KeyboardEvent) => {
      pressedKeys.delete(e.code)
      syncHeld()
      if (JUMP_KEYS.includes(e.code)) handlers.current.onJumpEnd()
    }

    // Alt-tabbing while holding a direction must not leave the player walking forever.
    const handleBlur = () => {
      pressedKeys.clear()
      rightMouseDown = false
      syncHeld()
    }

    const handleClick = (e: MouseEvent) => {
      if (isUiTarget(e.target)) return
      handlers.current.onJump()
    }

    const handleTouchStart = (e: TouchEvent) => {
      if (isUiTarget(e.target)) return
      handlers.current.onJump()
    }

    const handleTouchEnd = () => {
      handlers.current.onJumpEnd()
    }

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 2) {
        e.preventDefault()
        rightMouseDown = true
        syncHeld()
      }
    }

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 2) {
        e.preventDefault()
        rightMouseDown = false
        syncHeld()
      } else {
        // Releasing the click ends the jump-hold (variable jump height).
        handlers.current.onJumpEnd()
      }
    }

    const preventContextMenu = (e: MouseEvent) => {
      e.preventDefault()
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', handleBlur)
    window.addEventListener('click', handleClick)
    window.addEventListener('touchstart', handleTouchStart)
    window.addEventListener('touchend', handleTouchEnd)
    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('contextmenu', preventContextMenu)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleBlur)
      window.removeEventListener('click', handleClick)
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchend', handleTouchEnd)
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('contextmenu', preventContextMenu)
    }
  }, [])

  return { held }
}
