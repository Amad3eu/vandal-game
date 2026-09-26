import { useState } from 'react'
import { Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { GAME_MODES, GAME_MODE_ORDER, type GameMode } from '../shared'
import type { SavedProgress } from '../storage'
import { COLORS } from '../theme'

interface MenuScreenProps {
  progress: SavedProgress
  /** Score of the run that just ended, or null when opening the app. */
  lastScore: number | null
  onModeChange: (mode: GameMode) => void
  onMusicChange: (enabled: boolean) => void
  onStart: () => void
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

export default function MenuScreen({ progress, lastScore, onModeChange, onMusicChange, onStart }: MenuScreenProps) {
  const insets = useSafeAreaInsets()
  const [infoOpen, setInfoOpen] = useState(false)
  const modeInfo = GAME_MODES[progress.mode]
  const highScore = progress.highScores[progress.mode]
  const gameOver = lastScore !== null

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}
    >
      <View style={styles.card}>
        <Text style={styles.title}>VANDAL GAME</Text>
        {!gameOver && <Text style={styles.subtitle}>Pule os obstáculos e sobreviva o máximo possível!</Text>}
        <Pressable style={styles.collabButton} onPress={() => setInfoOpen(true)}>
          <Text style={styles.collabButtonText}>Sobre a parceria</Text>
        </Pressable>

        {gameOver && (
          <View style={styles.gameOver}>
            <Text style={styles.gameOverTitle}>Fim de Jogo!</Text>
            <View style={styles.row}>
              <View style={styles.scoreItem}>
                <Text style={styles.scoreLabel}>Sua Pontuação</Text>
                <Text testID="final-score" style={styles.scoreValue}>{lastScore}</Text>
              </View>
              <View style={styles.scoreItem}>
                <Text style={styles.scoreLabel}>Recorde</Text>
                <Text style={styles.scoreValue}>{highScore}</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.row}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Recorde</Text>
            <Text testID="high-score" style={styles.statValue}>{highScore}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Moedas Totais</Text>
            <Text style={styles.statValue}>{progress.totalCoins}</Text>
          </View>
        </View>

        <View style={[styles.panel, { borderLeftColor: '#f59e0b' }]}>
          <Text style={styles.panelTitle}>Modo de Jogo</Text>
          <View style={styles.row}>
            {GAME_MODE_ORDER.map((mode) => {
              const info = GAME_MODES[mode]
              const selected = mode === progress.mode
              return (
                <Pressable
                  key={mode}
                  testID={`mode-${mode}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => onModeChange(mode)}
                  style={[styles.modeOption, selected && styles.modeOptionActive]}
                >
                  <Text style={styles.modeIcon}>{info.icon}</Text>
                  <Text style={styles.modeTitle}>{info.title}</Text>
                  <Text style={styles.modeTagline}>{info.tagline}</Text>
                </Pressable>
              )
            })}
          </View>
        </View>

        <View style={[styles.panel, { borderLeftColor: '#4f46e5' }]}>
          <Text style={styles.panelTitle}>Música</Text>
          <View style={styles.row}>
            {[true, false].map((enabled) => (
              <Pressable
                key={String(enabled)}
                onPress={() => onMusicChange(enabled)}
                style={[styles.chip, progress.music === enabled && styles.chipActive]}
              >
                <Text style={[styles.chipText, progress.music === enabled && styles.chipTextActive]}>
                  {enabled ? 'Trilha Principal' : 'Sem Música'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Pressable testID="start" style={styles.startButton} onPress={onStart}>
          <Text style={styles.startButtonText}>{gameOver ? 'JOGAR NOVAMENTE' : 'INICIAR JOGO'}</Text>
        </Pressable>

        <View style={[styles.panel, { borderLeftColor: COLORS.primaryDark }]}>
          <Text style={styles.panelTitle}>Como Jogar · {modeInfo.title}</Text>
          {modeInfo.touchControls.map(([keys, action]) => (
            <Text key={keys} style={styles.instruction}>
              <Text style={styles.instructionKeys}>{keys}</Text> - {action}
            </Text>
          ))}
          <Text style={styles.instruction}>Desvie dos obstáculos para marcar pontos</Text>
          <Text style={styles.instruction}>{modeInfo.tip}</Text>
        </View>
      </View>

      <Modal visible={infoOpen} transparent animationType="fade" onRequestClose={() => setInfoOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setInfoOpen(false)}>
          <Pressable style={styles.modal} onPress={() => {}}>
            <Text style={styles.modalTitle}>Colaboração</Text>
            <Text style={styles.modalText}>
              Este jogo está sendo criado em colaboração com <Text style={styles.bold}>guimeujovem</Text> e{' '}
              <Text style={styles.bold}>amad3eu</Text>. Os dois trabalham juntos para deixar o Vandal Game mais criativo,
              divertido e cheio de estilo.
            </Text>
            {PARTNERS.map((partner) => (
              <Pressable key={partner.name} style={styles.partner} onPress={() => Linking.openURL(partner.url)}>
                <Image source={{ uri: partner.avatar }} style={styles.avatar} />
                <View>
                  <Text style={styles.partnerName}>{partner.name}</Text>
                  <Text style={styles.partnerNetwork}>{partner.network}</Text>
                  <Text style={styles.link}>{partner.handle}</Text>
                </View>
              </Pressable>
            ))}
            <Pressable style={styles.store} onPress={() => Linking.openURL(STORE_URL)}>
              <Text style={styles.modalText}>Visite a loja oficial do Guime</Text>
              <Text style={styles.link}>guimegraffitiartwork.lojavirtualnuvem.com.br</Text>
            </Pressable>
            <Pressable style={styles.closeButton} onPress={() => setInfoOpen(false)}>
              <Text style={styles.closeText}>FECHAR</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.sky,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  card: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
    gap: 16,
  },
  title: {
    fontSize: 34,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.muted,
    textAlign: 'center',
  },
  collabButton: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 999,
    backgroundColor: COLORS.primaryDark,
  },
  collabButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  gameOver: {
    padding: 16,
    borderRadius: 10,
    backgroundColor: '#fff3cd',
    borderLeftWidth: 5,
    borderLeftColor: '#ffc107',
    gap: 12,
  },
  gameOverTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.danger,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  scoreItem: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
    gap: 4,
  },
  scoreLabel: {
    color: COLORS.muted,
    fontSize: 13,
  },
  scoreValue: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  stat: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: COLORS.panel,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  statLabel: {
    color: COLORS.muted,
    fontWeight: '600',
    fontSize: 13,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  panel: {
    padding: 14,
    borderRadius: 10,
    backgroundColor: COLORS.panel,
    borderLeftWidth: 4,
    gap: 10,
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  modeOption: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d6dcef',
    backgroundColor: '#fff',
    gap: 4,
  },
  modeOptionActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#eef2ff',
  },
  modeIcon: {
    fontSize: 22,
  },
  modeTitle: {
    fontWeight: '800',
    color: '#1f2937',
  },
  modeTagline: {
    fontSize: 12,
    color: '#6b7280',
  },
  chip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c6cbe0',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  chipActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#eef2ff',
  },
  chipText: {
    fontWeight: '600',
    color: '#1f2937',
  },
  chipTextActive: {
    color: '#3730a3',
  },
  startButton: {
    paddingVertical: 16,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 1,
  },
  instruction: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  instructionKeys: {
    color: COLORS.primaryDark,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  modal: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    gap: 14,
  },
  modalTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1f2937',
  },
  modalText: {
    color: '#4b5563',
    lineHeight: 22,
  },
  bold: {
    fontWeight: '700',
  },
  partner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f8fafc',
  },
  partnerName: {
    fontWeight: '700',
    color: '#1f2937',
  },
  partnerNetwork: {
    color: '#6b7280',
  },
  link: {
    color: '#4f46e5',
    fontWeight: '700',
  },
  store: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#eef2ff',
    gap: 4,
  },
  closeButton: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 999,
    backgroundColor: COLORS.panel,
  },
  closeText: {
    fontWeight: '700',
    color: COLORS.text,
  },
})
