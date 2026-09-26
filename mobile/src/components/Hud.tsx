import { StyleSheet, Text, View } from 'react-native'
import { RUNNER_TUNING, type GameMode, type GameView } from '../shared'
import { PHASE_TAGS } from '../theme'

interface HudProps {
  view: GameView
  mode: GameMode
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.item}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  )
}

function Tag({ text, background, color }: { text: string; background: string; color: string }) {
  return <Text style={[styles.tag, { backgroundColor: background, color }]}>{text}</Text>
}

const seconds = (ms: number) => `${(ms / 1000).toFixed(1)}s`

/** Compact strip with the essentials, like the web HUD on phones. */
export default function Hud({ view, mode }: HudProps) {
  const phase = PHASE_TAGS[view.phase]
  const dashReady = view.dashCooldownMs <= 0
  return (
    <View pointerEvents="none" style={styles.hud}>
      <Item label="FASE">
        <Tag text={phase.label} background={phase.background} color={phase.color} />
      </Item>
      <Item label="PONTOS">
        <Text testID="hud-score" style={styles.value}>{view.score}</Text>
      </Item>
      <Item label="MOEDAS">
        <Text style={styles.value}>{view.coins}</Text>
      </Item>
      {mode === 'runner' && (
        <Item label="VELOCIDADE">
          <View style={styles.speedBar}>
            <View style={[styles.speedFill, { width: `${Math.min(100, (view.speed / RUNNER_TUNING.maxSpeed) * 100)}%` }]} />
          </View>
        </Item>
      )}
      <Item label="DASH">
        <Tag
          text={dashReady ? 'PRONTO' : seconds(view.dashCooldownMs)}
          background={dashReady ? '#dcfce7' : '#e2e8f0'}
          color={dashReady ? '#166534' : '#475569'}
        />
      </Item>
      {view.lightningMs > 0 && (
        <Item label="RAIO">
          <Tag text={seconds(view.lightningMs)} background="#dfe7ff" color="#223b9b" />
        </Item>
      )}
      {view.jumpBoostMs > 0 && (
        <Item label="SUPER PULO">
          <Tag text={seconds(view.jumpBoostMs)} background="#ffe8c2" color="#8f4a00" />
        </Item>
      )}
      {view.grindCombo > 1 && (
        <Item label="GRIND">
          <Tag text={`x${view.grindCombo}`} background="#ffd23f" color="#1f1147" />
        </Item>
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
    alignItems: 'center',
    columnGap: 12,
    rowGap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    maxWidth: 480,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: '#666',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
  },
  tag: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
  },
  speedBar: {
    width: 56,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e0e0e0',
    overflow: 'hidden',
  },
  speedFill: {
    height: '100%',
    backgroundColor: '#667eea',
  },
})
