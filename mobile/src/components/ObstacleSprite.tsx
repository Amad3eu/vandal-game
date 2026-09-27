import { Image, View } from 'react-native'
import { ARTIST_INFO, type Obstacle } from '../shared'
import { INTRO_TAG, INTRO_WALL, POWER_JUMP, POWER_LIGHTNING, SPRAY_FRAMES, TRAIN_FRAMES } from '../sprites'

interface ObstacleSpriteProps {
  obstacle: Obstacle
  clock: number
  /** How much of the intro wall's tag is painted (0..1). */
  tagProgress?: number
}

const at = (x: number, y: number, width: number, height: number) =>
  ({ position: 'absolute', left: x, top: y, width, height }) as const

// Positions mirror the web's Obstacle.css so hitboxes and drawings line up the same way.
export default function ObstacleSprite({ obstacle: o, clock, tagProgress = 1 }: ObstacleSpriteProps) {
  switch (o.type) {
    case 'wall': {
      // Brick wall from the intro, with the tag painted in from the left (like the web's clip-path).
      const tagWidth = o.width * 0.86
      const tagHeight = tagWidth * (26 / 76)
      return (
        <View style={at(o.x, o.y, o.width, o.height)}>
          <Image source={INTRO_WALL} fadeDuration={0} style={{ position: 'absolute', left: 0, top: 0, width: o.width, height: o.height }} />
          <View style={{ position: 'absolute', left: o.width * 0.07, top: o.height * 0.22, width: tagWidth * tagProgress, height: tagHeight, overflow: 'hidden' }}>
            <Image source={INTRO_TAG} fadeDuration={0} style={{ width: tagWidth, height: tagHeight }} />
          </View>
        </View>
      )
    }

    case 'spray':
      return (
        <Image
          source={SPRAY_FRAMES[Math.floor(clock / 90) % SPRAY_FRAMES.length]}
          fadeDuration={0}
          style={at(o.x - 4, o.y + 8.8, 88, 88)}
        />
      )

    case 'train':
      // The drawn roof lines up with the platform top (where the player's feet are drawn).
      return (
        <Image
          source={TRAIN_FRAMES[Math.floor(clock / 120) % TRAIN_FRAMES.length]}
          fadeDuration={0}
          style={at(o.x + o.width / 2 - 112, o.y - 3, 224, 112)}
        />
      )

    case 'floating-platform': {
      // Checkpoint climb step: a scaffold beam with diagonal hazard stripes and two brackets.
      const stripes = Math.ceil(o.width / 28) + 1
      return (
        <View style={at(o.x, o.y, o.width, o.height)}>
          <View style={{ position: 'absolute', left: '12%', top: o.height, width: 10, height: 26, backgroundColor: '#3a4050', borderWidth: 2, borderTopWidth: 0, borderColor: '#1f2430' }} />
          <View style={{ position: 'absolute', right: '12%', top: o.height, width: 10, height: 26, backgroundColor: '#3a4050', borderWidth: 2, borderTopWidth: 0, borderColor: '#1f2430' }} />
          <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, overflow: 'hidden', borderRadius: 4, borderWidth: 3, borderColor: '#1f2430', backgroundColor: '#2b2f3a' }}>
            {Array.from({ length: stripes }, (_, i) => (
              <View key={i} style={{ position: 'absolute', left: i * 28 - 10, top: -4, width: 14, height: o.height + 8, backgroundColor: '#ffd23f', transform: [{ skewX: '-45deg' }] }} />
            ))}
            <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 3, backgroundColor: 'rgba(255,255,255,0.35)' }} />
          </View>
        </View>
      )
    }

    case 'checkpoint': {
      // Grey pole with a pink flag hanging low; once grabbed it goes up and turns green.
      const wave = 1 - 0.08 * (0.5 + 0.5 * Math.sin(clock / 140))
      return (
        <View style={at(o.x, o.y, o.width, o.height)}>
          <View style={{ position: 'absolute', left: 8, top: 0, bottom: 0, width: 7, borderRadius: 4, backgroundColor: '#d1d5db', borderWidth: 2, borderColor: '#1f2430' }} />
          <View
            style={{
              position: 'absolute',
              left: 15,
              top: o.reached ? 4 : o.height * 0.38,
              width: 46,
              height: 32,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 2,
              borderColor: '#1f2430',
              borderTopRightRadius: 6,
              borderBottomRightRadius: 6,
              backgroundColor: o.reached ? '#34d399' : '#ff4d9d',
              transformOrigin: 'left center',
              transform: [{ scaleX: wave }],
            }}
          >
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#fff' }} />
          </View>
          <View style={{ position: 'absolute', left: -2, bottom: 0, width: 28, height: 8, borderRadius: 3, backgroundColor: '#3a4050', borderWidth: 2, borderColor: '#1f2430' }} />
        </View>
      )
    }

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
