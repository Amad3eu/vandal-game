import { useCallback, useEffect, useRef } from 'react'
import type { GameAction, HeldInput } from '../types/game'

interface GameInputHandlers {
  onJump: () => void
  onJumpEnd?: () => void
  onDash?: () => void
}

// Physical key positions (KeyboardEvent.code), so WASD works on any keyboard layout.
const KEY_ACTIONS: Record<string, GameAction> = {
  Space: 'jump',
  ArrowUp: 'jump',
  KeyW: 'jump',
  ArrowDown: 'down',
  KeyS: 'down',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ShiftLeft: 'dash',
  ShiftRight: 'dash',
  KeyX: 'dash',
  KeyK: 'dash',
}

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

function heldFrom(sources: Map<GameAction, Set<string>>): HeldInput {
  const isHeld = (action: GameAction) => (sources.get(action)?.size ?? 0) > 0
  return { left: isHeld('left'), right: isHeld('right'), down: isHeld('down') }
}

export function useGameInput({ onJump, onJumpEnd = () => {}, onDash = () => {} }: GameInputHandlers) {
  const held = useRef<HeldInput>({ left: false, right: false, down: false })
  // Who is holding each action (a key, a finger, a mouse button). An action stays held until
  // its last source lets go, so W + Space or keyboard + touch never fire it twice.
  const sources = useRef(new Map<GameAction, Set<string>>())

  // Keep the latest callbacks without re-binding listeners every render.
  const handlers = useRef({ onJump, onJumpEnd, onDash })
  handlers.current = { onJump, onJumpEnd, onDash }

  const press = useCallback((action: GameAction, source = 'button') => {
    let holders = sources.current.get(action)
    if (!holders) {
      holders = new Set()
      sources.current.set(action, holders)
    }
    const wasHeld = holders.size > 0
    holders.add(source)
    held.current = heldFrom(sources.current)
    if (wasHeld) return

    if (action === 'jump') handlers.current.onJump()
    if (action === 'dash') handlers.current.onDash()
  }, [])

  const release = useCallback((action: GameAction, source = 'button') => {
    const holders = sources.current.get(action)
    if (!holders?.delete(source)) return
    held.current = heldFrom(sources.current)

    if (action === 'jump' && holders.size === 0) handlers.current.onJumpEnd()
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const action = KEY_ACTIONS[e.code]
      if (!action || isEditableTarget(e.target)) return
      e.preventDefault() // arrows and space would scroll the page
      press(action, `key:${e.code}`)
    }

    // Key releases are never filtered, otherwise a key released inside a text field would stay held.
    const handleKeyUp = (e: KeyboardEvent) => {
      const action = KEY_ACTIONS[e.code]
      if (action) release(action, `key:${e.code}`)
    }

    // Tap or click anywhere on the game to jump (hold for a higher jump); the right button ducks.
    const handlePointerDown = (e: PointerEvent) => {
      if (isUiTarget(e.target)) return
      press(e.button === 2 ? 'down' : 'jump', `pointer:${e.pointerId}`)
    }

    const handlePointerUp = (e: PointerEvent) => {
      release('jump', `pointer:${e.pointerId}`)
      release('down', `pointer:${e.pointerId}`)
    }

    // Alt-tabbing while holding a direction must not leave the player walking forever.
    const handleBlur = () => {
      for (const [action, holders] of sources.current) {
        for (const source of [...holders]) release(action, source)
      }
    }

    const preventContextMenu = (e: MouseEvent) => {
      e.preventDefault()
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)
    window.addEventListener('blur', handleBlur)
    window.addEventListener('contextmenu', preventContextMenu)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
      window.removeEventListener('blur', handleBlur)
      window.removeEventListener('contextmenu', preventContextMenu)
    }
  }, [press, release])

  // press/release are the hook's public input API: on-screen buttons (or any other front end)
  // drive the same actions as the keyboard.
  return { held, press, release }
}
