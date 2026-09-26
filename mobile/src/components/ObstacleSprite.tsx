import { Image, View } from 'react-native'
import { ARTIST_INFO, type Obstacle } from '../shared'
import { POWER_JUMP, POWER_LIGHTNING, SPRAY_FRAMES, TRAIN_FRAMES } from '../sprites'

interface ObstacleSpriteProps {
  obstacle: Obstacle
  clock: number
}

const at = (x: number, y: number, width: number, height: number) =>
  ({ position: 'absolute', left: x, top: y, width, height }) as const

// Positions mirror the web's Obstacle.css so hitboxes and drawings line up the same way.
export default function ObstacleSprite({ obstacle: o, clock }: ObstacleSpriteProps) {
  switch (o.type) {
    case 'spray':
      return (
        <Image
          source={SPRAY_FRAMES[Math.floor(clock / 90) % SPRAY_FRAMES.length]}
          fadeDuration={0}
          style={at(o.x - 4, o.y + 8.8, 88, 88)}
        />
      )

    case 'train':
    case 'floating-platform':
      // The drawn roof lines up with the platform top (where the player's feet are drawn).
      return (
        <Image
          source={TRAIN_FRAMES[Math.floor(clock / 120) % TRAIN_FRAMES.length]}
          fadeDuration={0}
          style={at(o.x + o.width / 2 - 112, o.y - 3, 224, 112)}
        />
      )

    case 'power-lightning':
    case 'power-jump':
      return (
        <Image
          source={o.type === 'power-jump' ? POWER_JUMP : POWER_LIGHTNING}
          style={at(o.x, o.y - 3 + 3 * Math.sin(clock / 150), o.width, o.height)}
        />
      )

    case 'coin':
      return (
        <View style={[at(o.x, o.y, o.width, o.height), { borderRadius: o.width / 2, backgroundColor: '#fbbf24', borderWidth: 2, borderColor: '#b45309' }]}>
          <View style={{ position: 'absolute', left: 3, top: 2, width: 5, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.7)' }} />
        </View>
      )

    case 'bird': {
      const flap = Math.floor(clock / 125) % 2 === 0 ? '-10deg' : '12deg'
      const wing = { position: 'absolute', top: o.height * 0.38, width: o.width * 0.28, height: o.height * 0.36, borderRadius: 8, backgroundColor: '#41525f', transform: [{ rotate: flap }] } as const
      return (
        <View style={[at(o.x, o.y, o.width, o.height), { borderRadius: 16, backgroundColor: '#3e4f5c' }]}>
          <View style={[wing, { left: o.width * 0.05 }]} />
          <View style={[wing, { right: o.width * 0.05 }]} />
          <View style={{ position: 'absolute', right: o.width * 0.18, top: o.height * 0.28, width: 5, height: 5, borderRadius: 3, backgroundColor: '#fff' }} />
        </View>
      )
    }

    case 'trampoline':
      return (
        <View style={at(o.x, o.y, o.width, o.height)}>
          <View style={{ position: 'absolute', bottom: 0, left: '4%', width: '92%', height: '46%', borderRadius: 8, backgroundColor: '#2f2f3b' }} />
          <View style={{ position: 'absolute', top: '24%', left: '16%', width: '10%', height: '54%', backgroundColor: '#26262d' }} />
          <View style={{ position: 'absolute', top: '24%', right: '16%', width: '10%', height: '54%', backgroundColor: '#26262d' }} />
          <View style={{ position: 'absolute', top: '8%', width: '100%', height: '28%', borderRadius: 999, backgroundColor: '#ff4f67' }} />
        </View>
      )

    case 'building': {
      const windowRows = Math.max(1, Math.floor((o.height - 66) / 22))
      return (
        <View style={at(o.x, o.y, o.width, o.height)}>
          <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderTopLeftRadius: 6, borderTopRightRadius: 6, backgroundColor: '#232741' }} />
          <View style={{ position: 'absolute', top: 14, left: 10, right: 10, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8 }}>
            {Array.from({ length: windowRows * 2 }, (_, i) => (
              <View key={i} style={{ width: '42%', height: 14, borderRadius: 2, backgroundColor: '#e9b44c', opacity: 0.85 }} />
            ))}
          </View>
          <View style={{ position: 'absolute', left: 8, right: 8, bottom: 14, height: 30, borderRadius: 4, backgroundColor: '#ff4d9d', opacity: 0.9 }} />
          <View style={{ position: 'absolute', left: -4, right: -4, top: -6, height: 12, borderRadius: 4, backgroundColor: '#575ea0' }} />
        </View>
      )
    }

    case 'graffiti-artist': {
      const color = o.graffitiArtist ? ARTIST_INFO[o.graffitiArtist].color : '#FF6B6B'
      const pulse = 1 + 0.05 * Math.sin(clock / 190)
      const part = (style: object) => <View style={[{ position: 'absolute', backgroundColor: color }, style]} />
      return (
        <View style={[at(o.x, o.y, o.width, o.height), { borderRadius: o.width / 2, borderWidth: 2, borderColor: 'rgba(0,0,0,0.1)', transform: [{ scale: pulse }] }]}>
          {part({ left: 28, top: 8, width: 25, height: 25, borderRadius: 13 })}
          {part({ left: 30, top: 32, width: 20, height: 24, borderRadius: 3 })}
          {part({ left: 12, top: 36, width: 12, height: 18, borderRadius: 6, transform: [{ rotate: '-30deg' }] })}
          {part({ right: 12, top: 36, width: 12, height: 18, borderRadius: 6, transform: [{ rotate: '30deg' }] })}
          {part({ left: 18, top: 54, width: 10, height: 16, borderRadius: 3 })}
          {part({ right: 18, top: 54, width: 10, height: 16, borderRadius: 3 })}
        </View>
      )
    }

    default:
      // skate, cactus and duck-bar are never spawned by the engine today.
      return null
  }
}
