import { Image, StyleSheet, View } from 'react-native'
import { TOUCH_BUTTON_LABELS, type GameAction } from '../shared'
import type { TouchButton } from '../input'
import { POWER_LIGHTNING } from '../sprites'

interface TouchButtonsProps {
  buttons: TouchButton[]
  isPressed: (action: GameAction) => boolean
}

const CHEVRON_ROTATION: Partial<Record<GameAction, string>> = {
  left: '-135deg',
  right: '45deg',
  jump: '-45deg',
  down: '135deg',
}

// Chevrons are drawn with borders so they look the same everywhere (no emoji fonts involved).
function Chevron({ action }: { action: GameAction }) {
  return <View style={[styles.chevron, { transform: [{ rotate: CHEVRON_ROTATION[action] ?? '0deg' }] }]} />
}

/** Drawings only: touches are read by the full-screen layer in GameScreen. */
export default function TouchButtons({ buttons, isPressed }: TouchButtonsProps) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {buttons.map((button) => {
        const pressed = isPressed(button.action)
        return (
          <View
            key={button.action}
            testID={`touch-${button.action}`}
            accessibilityLabel={TOUCH_BUTTON_LABELS[button.action]}
            style={[
              styles.button,
              button.action === 'jump' && styles.jump,
              button.action === 'dash' && styles.dash,
              pressed && styles.pressed,
              {
                left: button.x - button.size / 2,
                top: button.y - button.size / 2,
                width: button.size,
                height: button.size,
                borderRadius: button.size / 2,
              },
            ]}
          >
            {button.action === 'dash' ? (
              <Image source={POWER_LIGHTNING} style={styles.bolt} />
            ) : (
              <Chevron action={button.action} />
            )}
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
  },
  jump: {
    backgroundColor: 'rgba(102, 126, 234, 0.55)',
  },
  dash: {
    backgroundColor: 'rgba(245, 158, 11, 0.55)',
  },
  pressed: {
    backgroundColor: 'rgba(102, 126, 234, 0.85)',
    transform: [{ scale: 0.92 }],
  },
  chevron: {
    width: 16,
    height: 16,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: '#fff',
    borderRadius: 2,
  },
  bolt: {
    width: 40,
    height: 40,
  },
})
