import { Image, StyleSheet, Text, View } from 'react-native'
import type { Chaser } from '../shared'
import { COP_CATCH, COP_RUN_FRAMES, COP_SHOUT } from '../sprites'
import { FONTS, UI } from '../theme'

// Drawn like the player (see PlayerSprite): a 100px box, sprite at 120%, 8px lower on the floor.
const SIZE = 120

interface ChaserSpriteProps {
  chaser: Chaser
  groundLevel: number
  clock: number
}

/** The intro's cop: running in, shouting "PARA AÍ!", chasing, or giving up. */
export default function ChaserSprite({ chaser, groundLevel, clock }: ChaserSpriteProps) {
  const running = chaser.state === 'enter' || chaser.state === 'chase'
  const frame = running ? COP_RUN_FRAMES[Math.floor(clock / 100) % COP_RUN_FRAMES.length] : COP_SHOUT
  const bubble = chaser.state === 'shout' ? 'PARA AÍ!' : chaser.state === 'giveup' ? 'VOLTA AQUI!' : null
  const left = chaser.x + 50 - SIZE / 2
  const top = groundLevel + 8 - SIZE
  return (
    <>
      {bubble && (
        <View style={[styles.bubble, { left: chaser.x + 40, top: top - 18 }]}>
          <Text style={styles.bubbleText}>{bubble}</Text>
        </View>
      )}
      <Image testID="chaser" source={frame} fadeDuration={0} style={{ position: 'absolute', left, top, width: SIZE, height: SIZE }} />
    </>
  )
}

/** Game over: the cop runs in from off-screen and grabs the player (progress 0 → 1). */
export function CaughtCop({ playerX, groundLevel, progress }: { playerX: number; groundLevel: number; progress: number }) {
  const eased = 1 - Math.pow(1 - Math.min(1, progress), 2)
  const from = -160
  const to = playerX - 64
  return (
    <Image
      source={COP_CATCH}
      fadeDuration={0}
      style={{ position: 'absolute', left: from + (to - from) * eased + 50 - SIZE / 2, top: groundLevel + 8 - SIZE, width: SIZE, height: SIZE }}
    />
  )
}

const styles = StyleSheet.create({
  bubble: {
    position: 'absolute',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: UI.ink,
    backgroundColor: '#fff',
    transform: [{ rotate: '-4deg' }],
  },
  bubbleText: {
    color: UI.ink,
    fontFamily: FONTS.display,
    fontSize: 17,
  },
})
