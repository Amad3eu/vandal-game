import { Image, Text, View } from 'react-native'
import { ARTIST_INFO, type GraffitiArtist, type Obstacle } from '../shared'
import { INTRO_TAG, INTRO_WALL, POWER_JUMP, POWER_LIGHTNING, SPRAY_FRAMES, TRAIN_FRAMES } from '../sprites'
import PixelPerson from './PixelPerson'
import { ConesArt, DuckBarArt, RampArt } from './StreetArt'

interface ObstacleSpriteProps {
  obstacle: Obstacle
  clock: number
  /** How much of the intro wall's tag is painted (0..1). */
  tagProgress?: number
  /** Who a graffiti artist on the street is (picked by the game screen; the engine's draw otherwise). */
  artist?: GraffitiArtist
}

const at = (x: number, y: number, width: number, height: number) =>
  ({ position: 'absolute', left: x, top: y, width, height }) as const

/** Obstacles sit 8px above the ground line; what stands on the street is drawn down to it. */
const GROUND_GAP = 8

// Positions mirror the web's Obstacle.css so hitboxes and drawings line up the same way.
export default function ObstacleSprite({ obstacle: o, clock, tagProgress = 1, artist }: ObstacleSpriteProps) {
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

    case 'train': {
      // A car as long as its box, its drawn roof (10% down the image) at the box top.
      const width = o.width * 1.12
      return (
        <Image
          source={TRAIN_FRAMES[Math.floor(clock / 120) % TRAIN_FRAMES.length]}
          fadeDuration={0}
          style={at(o.x + o.width / 2 - width / 2, o.y - width * 0.05, width, width / 2)}
        />
      )
    }

    case 'ramp':
      // The slope is the box's diagonal (where the player walks); the base reaches the street.
      return (
        <View style={at(o.x, o.y, o.width, o.height + GROUND_GAP)}>
          <RampArt id={o.id} width={o.width} height={o.height + GROUND_GAP} />
        </View>
      )

    case 'cone':
      return (
        <View style={at(o.x, o.y + GROUND_GAP, o.width, o.height)}>
          <ConesArt width={o.width} height={o.height} />
        </View>
      )

    case 'duck-bar':
      // The chains go up out of the box, toward the top of the screen.
      return (
        <View style={at(o.x, o.y - 400, o.width, o.height + 400)}>
          <DuckBarArt width={o.width} height={o.height} />
        </View>
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
      // A little pixel-art person standing on the street, bobbing, with a puff of paint from the
      // can; once met, they wave as the player runs past.
      const id = artist ?? o.graffitiArtist ?? 'remo'
      const color = ARTIST_INFO[id].color
      const bob = Math.floor(clock / 550) % 2 === 0 ? 0 : -2
      const puff = (clock % 900) / 900
      const left = o.x + o.width / 2 - 31
      const top = o.y + o.height + GROUND_GAP - 89 + bob
      return (
        <View style={at(left, top, 62, 89)}>
          <PixelPerson id={id} color={color} width={62} height={89} />
          {o.met && <Text style={{ position: 'absolute', left: 17, top: -30, fontSize: 24 }}>👋</Text>}
          <View
            style={{
              position: 'absolute',
              left: 56 + 6 * puff,
              top: 6 - 6 * puff,
              width: 16,
              height: 16,
              borderRadius: 8,
              backgroundColor: color,
              opacity: 0.85 * (1 - puff),
              transform: [{ scale: 0.4 + 1.2 * puff }],
            }}
          />
        </View>
      )
    }

    case 'skate': {
      // Skate pickup: a board floating over the street with a pulsing ring (the web's .obstacle-skate glows).
      const wheel = { position: 'absolute', top: '56%', width: o.width * 0.18, height: o.width * 0.18, borderRadius: 999, backgroundColor: '#1f1f1f' } as const
      return (
        <View testID="skate-pickup" style={at(o.x, o.y - 3 + 3 * Math.sin(clock / 150), o.width, o.height)}>
          <View style={{ position: 'absolute', left: -8, right: -8, top: -6, bottom: -8, borderRadius: 999, borderWidth: 2, borderColor: '#ffd23f', opacity: 0.35 + 0.55 * (0.5 + 0.5 * Math.sin(clock / 143)) }} />
          <View style={{ position: 'absolute', left: '7%', width: '86%', top: '24%', height: '30%', borderRadius: 999, borderWidth: 2, borderColor: '#1f1f1f', backgroundColor: '#f48c28' }} />
          <View style={[wheel, { left: '20%' }]} />
          <View style={[wheel, { right: '20%' }]} />
        </View>
      )
    }

    default:
      // cactus is never spawned by the engine today.
      return null
  }
}
