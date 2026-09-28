import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { RUNNER_TUNING, type GameMode, type GameView } from '../shared'
import { FONTS, PHASE_TAGS, UI } from '../theme'

interface HudProps {
  view: GameView
  mode: GameMode
  highScore: number
}

const seconds = (ms: number) => `${(ms / 1000).toFixed(1)}s`

function Sticker({ label, children, color = UI.paper, tilt = 0, testID }: { label: string; children: ReactNode; color?: string; tilt?: number; testID?: string }) {
  return (
    <View style={[styles.sticker, { backgroundColor: color, transform: [{ rotate: `${tilt}deg` }] }]}>
      <Text style={styles.label}>{label}</Text>
      {typeof children === 'string' || typeof children === 'number' ? (
        <Text testID={testID} style={styles.value}>
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  )
}

/** In-run HUD as a strip of stickers, like the web version. */
export default function Hud({ view, mode, highScore }: HudProps) {
  const phase = PHASE_TAGS[view.phase]
  const dashReady = view.dashCooldownMs <= 0
  const beatingRecord = highScore > 0 && view.score > highScore
  return (
    <View pointerEvents="none" style={styles.hud}>
      <Sticker label="Fase" color={phase.background} tilt={-1}>
        <Text style={[styles.value, { color: phase.color }]}>{phase.label}</Text>
      </Sticker>
      <Sticker label={beatingRecord ? 'Recorde!' : 'Pontos'} color={beatingRecord ? UI.pink : UI.paper} tilt={1}>
        <Text testID="hud-score" style={[styles.value, styles.score, beatingRecord && { color: '#fff' }]}>
          {view.score}
        </Text>
      </Sticker>
      <Sticker label="Moedas" color={UI.yellow} tilt={-1}>
        {view.coins}
      </Sticker>
      {mode === 'runner' && (
        <Sticker label="Velocidade" tilt={1}>
          <View style={styles.speedBar}>
            <View style={[styles.speedFill, { width: `${Math.min(100, (view.speed / RUNNER_TUNING.maxSpeed) * 100)}%` }]} />
          </View>
        </Sticker>
      )}
      <Sticker label="Dash" color={dashReady ? UI.green : '#d7d2e4'} tilt={-1}>
        {dashReady ? 'Pronto' : seconds(view.dashCooldownMs)}
      </Sticker>
      {view.lightningMs > 0 && (
        <Sticker label="Raio" color="#9cc4ff" tilt={1}>
          {seconds(view.lightningMs)}
        </Sticker>
      )}
      {view.skateMs > 0 && (
        <Sticker label="Turbo skate" color={UI.cyan} tilt={1}>
          {seconds(view.skateMs)}
        </Sticker>
      )}
      {view.jumpBoostMs > 0 && (
        <Sticker label="Super pulo" color="#ffc27a" tilt={-1}>
          {seconds(view.jumpBoostMs)}
        </Sticker>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  hud: {
    flexShrink: 1, // wrap into two rows on narrow screens instead of running off the edge
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    alignItems: 'stretch',
    gap: 6,
    maxWidth: 520,
  },
  sticker: {
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingTop: 3,
    paddingBottom: 4,
    borderWidth: 2,
    borderColor: UI.ink,
    borderRadius: 8,
  },
  label: {
    fontFamily: FONTS.pixel,
    fontSize: 9,
    color: UI.ink,
    opacity: 0.8,
    textTransform: 'uppercase',
  },
  value: {
    fontFamily: FONTS.display,
    fontSize: 14,
    color: UI.ink,
  },
  score: {
    fontSize: 18,
  },
  speedBar: {
    width: 64,
    height: 10,
    marginTop: 3,
    borderWidth: 2,
    borderColor: UI.ink,
    borderRadius: 5,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  speedFill: {
    height: '100%',
    backgroundColor: UI.pink,
  },
})
