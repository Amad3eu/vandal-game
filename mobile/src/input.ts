import type { GestureResponderEvent } from 'react-native'
import type { GameAction, GameMode, HeldInput } from './shared'

interface InputHandlers {
  onJump: () => void
  onJumpEnd: () => void
  onDash: () => void
}

/**
 * Tracks which fingers hold each action, with the same rules as the web input hook: an action
 * stays held until its last source lets go, and jump/dash fire once when first pressed.
 */
export function createActionInput(handlers: InputHandlers) {
  const sources = new Map<GameAction, Set<string>>()
  const isHeld = (action: GameAction) => (sources.get(action)?.size ?? 0) > 0

  const input = {
    held: { left: false, right: false, down: false } as HeldInput,
    isPressed: isHeld,
    press(action: GameAction, source: string) {
      const holders = sources.get(action) ?? new Set<string>()
      sources.set(action, holders)
      const wasHeld = holders.size > 0
      holders.add(source)
      input.held = { left: isHeld('left'), right: isHeld('right'), down: isHeld('down') }
      if (wasHeld) return
      if (action === 'jump') handlers.onJump()
      if (action === 'dash') handlers.onDash()
    },
    release(action: GameAction, source: string) {
      const holders = sources.get(action)
      if (!holders?.delete(source)) return
      input.held = { left: isHeld('left'), right: isHeld('right'), down: isHeld('down') }
      if (action === 'jump' && holders.size === 0) handlers.onJumpEnd()
    },
    releaseAll() {
      for (const [action, holders] of sources) {
        for (const source of [...holders]) input.release(action, source)
      }
    },
  }
  return input
}

export type ActionInput = ReturnType<typeof createActionInput>

export interface TouchButton {
  action: GameAction
  /** Center on screen and diameter, in points. */
  x: number
  y: number
  size: number
}

interface Insets {
  top: number
  right: number
  bottom: number
  left: number
}

/**
 * Where the on-screen buttons go (same layout as the web version): ◀ ▶ bottom-left in the
 * free mode; dash, duck and jump bottom-right, in a row in landscape and a triangle in portrait.
 */
export function layoutTouchButtons(mode: GameMode, width: number, height: number, insets: Insets): TouchButton[] {
  const compact = height <= 420
  const size = compact ? 56 : 64
  const jumpSize = compact ? 68 : 80
  const gap = compact ? 10 : 12
  const bottom = height - Math.max(16, insets.bottom)
  const left = Math.max(16, insets.left)
  const right = width - Math.max(16, insets.right)
  const buttons: TouchButton[] = []

  if (mode === 'free') {
    buttons.push({ action: 'left', x: left + size / 2, y: bottom - size / 2, size })
    buttons.push({ action: 'right', x: left + size + gap + size / 2, y: bottom - size / 2, size })
  }

  const jump = { action: 'jump' as const, x: right - jumpSize / 2, y: bottom - jumpSize / 2, size: jumpSize }
  const downX = right - jumpSize - gap - size / 2
  if (height > width) {
    buttons.push({ action: 'dash', x: jump.x, y: bottom - jumpSize - gap - size / 2, size })
    buttons.push({ action: 'down', x: downX, y: bottom - size / 2, size })
  } else {
    buttons.push({ action: 'dash', x: downX - size - gap, y: bottom - size / 2, size })
    buttons.push({ action: 'down', x: downX, y: bottom - size / 2, size })
  }
  buttons.push(jump)
  return buttons
}

const TOUCH_SLOP = 8

function buttonAt(buttons: TouchButton[], x: number, y: number) {
  const hit = buttons.find((b) => Math.hypot(b.x - x, b.y - y) <= b.size / 2 + TOUCH_SLOP)
  return hit ? hit.action : null
}

/**
 * Turns raw multi-touch events into actions. React Native's Pressable only tracks one touch at a
 * time, so a single full-screen layer reads every finger instead. A finger that starts on a
 * button can slide between buttons (D-pad style); one that starts anywhere else is a
 * tap-to-jump for as long as it stays down.
 */
export function createTouchTracker(input: ActionInput, getButtons: () => TouchButton[]) {
  const fingers = new Map<string, { onButton: boolean; action: GameAction | null }>()

  const update = (event: GestureResponderEvent, ended: boolean) => {
    // Arrays on iOS/Android, TouchLists on the web: Array.from handles both.
    const touches = Array.from(event.nativeEvent.touches)
    const changedTouches = Array.from(event.nativeEvent.changedTouches)
    const lifted = ended ? new Set(changedTouches.map((t) => String(t.identifier))) : new Set<string>()
    const active = touches.filter((t) => !lifted.has(String(t.identifier)))
    const buttons = getButtons()
    const seen = new Set<string>()

    for (const touch of active) {
      const id = String(touch.identifier)
      seen.add(id)
      const hit = buttonAt(buttons, touch.pageX, touch.pageY)
      const previous = fingers.get(id)
      const onButton = previous ? previous.onButton : hit !== null
      const action: GameAction | null = onButton ? hit : 'jump'
      if (previous?.action !== action) {
        if (previous?.action) input.release(previous.action, `touch:${id}`)
        if (action) input.press(action, `touch:${id}`)
      }
      fingers.set(id, { onButton, action })
    }

    for (const [id, finger] of fingers) {
      if (seen.has(id)) continue
      if (finger.action) input.release(finger.action, `touch:${id}`)
      fingers.delete(id)
    }
  }

  return {
    onTouchStart: (event: GestureResponderEvent) => update(event, false),
    onTouchMove: (event: GestureResponderEvent) => update(event, false),
    onTouchEnd: (event: GestureResponderEvent) => update(event, true),
    onTouchCancel: (event: GestureResponderEvent) => update(event, true),
  }
}
