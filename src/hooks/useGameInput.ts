import { useEffect, useRef } from 'react'

export function useGameInput(
  onJump: () => void,
  onDuckStart: () => void = () => {},
  onDuckEnd: () => void = () => {},
  onJumpEnd: () => void = () => {},
  onDash: () => void = () => {}
) {
  const keysPressed = useRef<Set<string>>(new Set())

  // Keep the latest callbacks without re-binding listeners every render.
  const handlers = useRef({ onJump, onDuckStart, onDuckEnd, onJumpEnd, onDash })
  handlers.current = { onJump, onDuckStart, onDuckEnd, onJumpEnd, onDash }

  useEffect(() => {
    const isJumpKey = (e: KeyboardEvent) =>
      e.key === ' ' || e.key === 'ArrowUp' || e.key.toLowerCase() === 'w'
    const isDuckKey = (e: KeyboardEvent) => e.key === 'ArrowDown' || e.key.toLowerCase() === 's'
    const isDashKey = (e: KeyboardEvent) =>
      e.key === 'Shift' || e.key.toLowerCase() === 'x' || e.key.toLowerCase() === 'k'

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase()
      const alreadyPressed = keysPressed.current.has(key)
      keysPressed.current.add(key)

      if (isJumpKey(e)) {
        e.preventDefault()
        if (!alreadyPressed) handlers.current.onJump()
      }

      if (isDuckKey(e) && !alreadyPressed) {
        handlers.current.onDuckStart()
      }

      if (isDashKey(e) && !alreadyPressed) {
        e.preventDefault()
        handlers.current.onDash()
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.key.toUpperCase())

      if (isDuckKey(e)) {
        handlers.current.onDuckEnd()
      }

      if (isJumpKey(e)) {
        handlers.current.onJumpEnd()
      }
    }

    const handleClick = () => {
      handlers.current.onJump()
    }

    const handleTouchStart = () => {
      handlers.current.onJump()
    }

    const handleTouchEnd = () => {
      handlers.current.onJumpEnd()
    }

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 2) {
        e.preventDefault()
        handlers.current.onDuckStart()
      }
    }

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 2) {
        e.preventDefault()
        handlers.current.onDuckEnd()
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
    window.addEventListener('click', handleClick)
    window.addEventListener('touchstart', handleTouchStart)
    window.addEventListener('touchend', handleTouchEnd)
    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('contextmenu', preventContextMenu)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('click', handleClick)
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchend', handleTouchEnd)
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('contextmenu', preventContextMenu)
    }
  }, [])

  return {
    isKeyPressed: (key: string) => keysPressed.current.has(key.toUpperCase()),
  }
}
