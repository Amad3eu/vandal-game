import { useEffect, useState, type ReactNode } from 'react'
import { Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { CHECKPOINT_TIP, GAME_MODES, GAME_MODE_ORDER, PHASES, type Checkpoint, type GameMode } from '../shared'
import type { SavedProgress } from '../storage'
import { NIGHT_BACKGROUND, RUN_FRAMES } from '../sprites'
import { COLORS, FONTS, UI } from '../theme'
import StickerButton from '../components/StickerButton'

interface MenuScreenProps {
  progress: SavedProgress
  /** Score of the run that just ended, or null when opening the app. */
  lastScore: number | null
  /** The run that just ended beat the record. */
  newRecord: boolean
  /** Checkpoint reached in the run that just ended: offers to continue from it. */
  checkpoint: Checkpoint | null
  onModeChange: (mode: GameMode) => void
  onMusicChange: (enabled: boolean) => void
  onStart: () => void
  onContinue: () => void
}

const PARTNERS = [
  {
    name: 'amad3eu',
    network: 'GitHub',
    handle: 'github.com/amad3eu',
    url: 'https://github.com/amad3eu',
    avatar: 'https://avatars.githubusercontent.com/u/85834483?v=4',
  },
  {
    name: 'guimeujovem',
    network: 'Instagram',
    handle: '@guimeujovem',
    url: 'https://www.instagram.com/guimeujovem',
    avatar:
      'https://dcdn-us.mitiendanube.com/stores/004/582/404/themes/new_linkedman/img-1536637303-1721126500-b79ee06e5b3ebdec680dc7074b9194f61721126501.png?3034011912706762975',
  },
]
const STORE_URL = 'https://guimegraffitiartwork.lojavirtualnuvem.com.br/'

/** The city at night, the street and the player running on it (the web's TitleScene). */
function TitleBackdrop() {
  const { width, height } = useWindowDimensions()
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setFrame((f) => f + 1), 90)
    return () => clearInterval(timer)
  }, [])

  const streetHeight = Math.round(height * 0.14)
  const laneOffset = (frame * 12) % 110
  const runner = Math.min(150, height * 0.2)

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Image source={NIGHT_BACKGROUND} resizeMode="cover" style={{ position: 'absolute', left: 0, top: 0, width, height }} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(20, 15, 31, 0.62)' }]} />
      <View style={[styles.street, { height: streetHeight }]}>
        {Array.from({ length: Math.ceil(width / 110) + 2 }, (_, i) => (
          <View key={i} style={[styles.lane, { left: i * 110 - laneOffset }]} />
        ))}
      </View>
      <Image
        source={RUN_FRAMES[frame % RUN_FRAMES.length]}
        fadeDuration={0}
        style={{ position: 'absolute', right: width * 0.08, bottom: streetHeight - 4, width: runner, height: runner }}
      />
    </View>
  )
}

/** Paper panel with a hard shadow. */
function Paper({ children, style }: { children: ReactNode; style?: object }) {
  return (
    <View style={[{ paddingRight: 6, paddingBottom: 6 }, style]}>
      <View style={styles.paperShadow} />
      <View style={styles.paper}>{children}</View>
    </View>
  )
}

function Sheet({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: ReactNode }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheetWrap} onPress={() => {}}>
          <Paper>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{title}</Text>
              <StickerButton label="✕" size="small" onPress={onClose} />
            </View>
            {children}
          </Paper>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

export default function MenuScreen({
  progress,
  lastScore,
  newRecord,
  checkpoint,
  onModeChange,
  onMusicChange,
  onStart,
  onContinue,
}: MenuScreenProps) {
  const insets = useSafeAreaInsets()
  const { height } = useWindowDimensions()
  const [panel, setPanel] = useState<'how-to' | 'about' | null>(null)
  const modeInfo = GAME_MODES[progress.mode]
  const highScore = progress.highScores[progress.mode]
  const gameOver = lastScore !== null
  const canContinue = gameOver && checkpoint !== null

  return (
    <View style={styles.screen}>
      <TitleBackdrop />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + Math.round(height * 0.14) + 24 },
        ]}
      >
        <View style={styles.stats}>
          <View style={[styles.stat, { transform: [{ rotate: '2deg' }] }]}>
            <Text style={styles.statLabel}>Recorde</Text>
            <Text testID="high-score" style={styles.statValue}>{highScore}</Text>
          </View>
          <View style={[styles.stat, { backgroundColor: UI.yellow, transform: [{ rotate: '-2deg' }] }]}>
            <Text style={styles.statLabel}>Moedas</Text>
            <Text style={styles.statValue}>{progress.totalCoins}</Text>
          </View>
        </View>

        <View style={styles.logo}>
          <Text style={styles.logoLine}>Vandal</Text>
          <Text style={[styles.logoLine, styles.logoLine2]}>Game</Text>
          <Text style={styles.beta}>BETA</Text>
        </View>
        {!gameOver && <Text style={styles.tagline}>corra · pule · deixe sua marca</Text>}

        {gameOver && (
          <Paper style={{ marginTop: 8 }}>
            <Text style={styles.resultTitle}>FIM DE JOGO!</Text>
            {newRecord && <Text style={styles.recordSticker}>NOVO RECORDE!</Text>}
            <View style={styles.resultScores}>
              <View style={styles.resultBox}>
                <Text style={styles.resultLabel}>Pontos</Text>
                <Text testID="final-score" style={styles.resultValue}>{lastScore}</Text>
              </View>
              <View style={styles.resultBox}>
                <Text style={styles.resultLabel}>Recorde</Text>
                <Text style={styles.resultValue}>{highScore}</Text>
              </View>
            </View>
          </Paper>
        )}

        <View style={styles.menu}>
          {canContinue && checkpoint && (
            <StickerButton
              testID="continue"
              size="big"
              color={UI.green}
              label={`🚩 Continuar da fase ${checkpoint.phase} · ${PHASES[checkpoint.phase].name}`}
              note={`${checkpoint.score} pontos`}
              onPress={onContinue}
            />
          )}
          <StickerButton
            testID="start"
            size="big"
            color={canContinue ? UI.yellow : UI.pink}
            textColor={canContinue ? UI.ink : '#fff'}
            label={`▶ ${gameOver ? (canContinue ? 'Recomeçar da fase 1' : 'Jogar de novo') : 'Jogar'}`}
            onPress={onStart}
          />

          <View style={styles.row}>
            {GAME_MODE_ORDER.map((mode) => {
              const selected = mode === progress.mode
              return (
                <StickerButton
                  key={mode}
                  testID={`mode-${mode}`}
                  accessibilityRole="radio"
                  selected={selected}
                  size="small"
                  color={selected ? UI.yellow : UI.chip}
                  textColor={selected ? UI.ink : '#fff'}
                  label={`${GAME_MODES[mode].icon} ${GAME_MODES[mode].title}`}
                  onPress={() => onModeChange(mode)}
                  style={styles.rowItem}
                />
              )
            })}
          </View>
          <Text style={styles.modeTagline}>{modeInfo.tagline}</Text>

          <View style={styles.row}>
            <StickerButton
              size="small"
              label={progress.music ? '♪ Música: on' : '♪ Música: off'}
              onPress={() => onMusicChange(!progress.music)}
              style={styles.rowItem}
            />
            <StickerButton size="small" label="? Como jogar" onPress={() => setPanel('how-to')} style={styles.rowItem} />
          </View>
          <StickerButton size="small" ghost textColor="#fff" label="★ Sobre a parceria" onPress={() => setPanel('about')} />
        </View>
      </ScrollView>

      <Sheet visible={panel === 'how-to'} title={`Como jogar · ${modeInfo.title}`} onClose={() => setPanel(null)}>
        {modeInfo.touchControls.map(([keys, action]) => (
          <View key={keys} style={styles.controlRow}>
            <Text style={styles.key}>{keys}</Text>
            <Text style={styles.controlText}>{action}</Text>
          </View>
        ))}
        <View style={styles.tips}>
          {['Desvie dos obstáculos para marcar pontos.', `${CHECKPOINT_TIP}.`, 'Encontre grafiteiros para trocar assinaturas.', `${modeInfo.tip}.`].map(
            (tip) => (
              <Text key={tip} style={styles.tip}>
                • {tip}
              </Text>
            )
          )}
        </View>
      </Sheet>

      <Sheet visible={panel === 'about'} title="Colaboração" onClose={() => setPanel(null)}>
        <Text style={styles.aboutText}>
          Este jogo está sendo criado em colaboração com <Text style={styles.bold}>guimeujovem</Text> e{' '}
          <Text style={styles.bold}>amad3eu</Text>. Os dois trabalham juntos para deixar o Vandal Game mais criativo,
          divertido e cheio de estilo.
        </Text>
        {PARTNERS.map((partner) => (
          <Pressable key={partner.name} style={styles.partner} onPress={() => Linking.openURL(partner.url)}>
            <Image source={{ uri: partner.avatar }} style={styles.avatar} />
            <View style={{ flexShrink: 1 }}>
              <Text style={styles.partnerName}>{partner.name}</Text>
              <Text style={styles.partnerNetwork}>
                {partner.network} · {partner.handle}
              </Text>
            </View>
          </Pressable>
        ))}
        <StickerButton color={UI.yellow} label="Loja oficial do Guime ↗" onPress={() => Linking.openURL(STORE_URL)} />
      </Sheet>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: UI.ink,
  },
  content: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingHorizontal: 16,
    gap: 14,
  },
  street: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.groundNight,
    borderTopWidth: 6,
    borderTopColor: COLORS.groundEdgeNight,
    overflow: 'hidden',
  },
  lane: {
    position: 'absolute',
    top: '42%',
    width: 48,
    height: 6,
    backgroundColor: 'rgba(255, 210, 63, 0.75)',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  stat: {
    minWidth: 108,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 3,
    borderColor: UI.ink,
    borderRadius: 12,
    backgroundColor: UI.paper,
  },
  statLabel: {
    fontFamily: FONTS.pixel,
    fontSize: 11,
    color: UI.ink,
    textTransform: 'uppercase',
  },
  statValue: {
    fontFamily: FONTS.display,
    fontSize: 26,
    color: UI.ink,
  },
  logo: {
    alignItems: 'center',
    marginTop: 8,
    transform: [{ rotate: '-6deg' }],
  },
  logoLine: {
    fontFamily: FONTS.tag,
    fontSize: 68,
    lineHeight: 70,
    color: '#fff',
    textShadowColor: UI.pink,
    textShadowOffset: { width: 5, height: 5 },
    textShadowRadius: 1,
  },
  logoLine2: {
    marginLeft: 70,
    color: UI.yellow,
    textShadowColor: UI.night2,
  },
  beta: {
    position: 'absolute',
    right: 12,
    top: 0,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 3,
    borderColor: UI.ink,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: UI.cyan,
    color: UI.ink,
    fontFamily: FONTS.display,
    fontSize: 13,
    transform: [{ rotate: '18deg' }],
  },
  tagline: {
    textAlign: 'center',
    fontFamily: FONTS.pixel,
    fontSize: 13,
    letterSpacing: 1.5,
    color: '#e9e2ff',
    textTransform: 'uppercase',
  },
  paperShadow: {
    position: 'absolute',
    left: 6,
    top: 6,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    backgroundColor: '#000',
  },
  paper: {
    padding: 16,
    borderWidth: 3,
    borderColor: UI.ink,
    borderRadius: 16,
    backgroundColor: UI.paper,
  },
  resultTitle: {
    fontFamily: FONTS.display,
    fontSize: 26,
    color: UI.pink,
    textShadowColor: UI.ink,
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 1,
    transform: [{ rotate: '-2deg' }],
  },
  recordSticker: {
    position: 'absolute',
    right: 12,
    top: -14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 3,
    borderColor: UI.ink,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: UI.yellow,
    fontFamily: FONTS.display,
    fontSize: 12,
    color: UI.ink,
    transform: [{ rotate: '8deg' }],
  },
  resultScores: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  resultBox: {
    flex: 1,
    padding: 10,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(20, 15, 31, 0.3)',
    borderRadius: 10,
  },
  resultLabel: {
    fontFamily: FONTS.pixel,
    fontSize: 11,
    color: UI.mutedInk,
    textTransform: 'uppercase',
  },
  resultValue: {
    fontFamily: FONTS.display,
    fontSize: 30,
    color: UI.ink,
  },
  menu: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  rowItem: {
    flex: 1,
  },
  modeTagline: {
    marginTop: -2,
    color: UI.lilac,
    fontSize: 14,
    lineHeight: 20,
  },
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: 'rgba(12, 8, 22, 0.8)',
  },
  sheetWrap: {
    width: '100%',
    maxWidth: 520,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  sheetTitle: {
    flexShrink: 1,
    fontFamily: FONTS.display,
    fontSize: 19,
    color: UI.ink,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  key: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: UI.ink,
    color: UI.yellow,
    fontFamily: FONTS.pixel,
    fontSize: 12,
  },
  controlText: {
    flexShrink: 1,
    color: UI.ink,
    fontSize: 15,
  },
  tips: {
    marginTop: 6,
    padding: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(20, 15, 31, 0.3)',
    borderRadius: 12,
    gap: 6,
  },
  tip: {
    color: UI.mutedInk,
    fontSize: 14,
    lineHeight: 20,
  },
  aboutText: {
    color: UI.ink,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  bold: {
    fontWeight: '800',
  },
  partner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    marginBottom: 10,
    borderWidth: 3,
    borderColor: UI.ink,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
    borderColor: UI.ink,
    backgroundColor: UI.paper,
  },
  partnerName: {
    fontFamily: FONTS.display,
    fontSize: 15,
    color: UI.ink,
  },
  partnerNetwork: {
    color: UI.mutedInk,
    fontSize: 13,
  },
})
