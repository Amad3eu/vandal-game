import { useEffect, useRef } from 'react'

export function useGameInput(
  onJump: () => void,
  onDuckStart: () => void = () => {},
  onDuckEnd: () => void = () => {}
) {
  const keysPressed = useRef<Set<string>>(new Set())

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current.add(e.key.toUpperCase())

      if (e.key === ' ' || e.key === 'ArrowUp') {
        e.preventDefault()
        onJump()
      }

      if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's') {
        onDuckStart()
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.key.toUpperCase())

      if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's') {
        onDuckEnd()
      }
    }

    const handleClick = () => {
      onJump()
    }

    const handleTouchStart = () => {
      onJump()
    }

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 2) {
        e.preventDefault()
        onDuckStart()
      }
    }

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 2) {
        e.preventDefault()
        onDuckEnd()
      }
    }

    const preventContextMenu = (e: MouseEvent) => {
      e.preventDefault()
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('click', handleClick)
    window.addEventListener('touchstart', handleTouchStart)
    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('contextmenu', preventContextMenu)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('click', handleClick)
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('contextmenu', preventContextMenu)
    }
  }, [onDuckEnd, onDuckStart, onJump])

  return {
    isKeyPressed: (key: string) => keysPressed.current.has(key.toUpperCase()),
  }
}
