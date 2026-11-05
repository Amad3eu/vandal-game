import { PHASE_2_SCORE } from '../game/config'
import type { Checkpoint, GamePhase } from '../types/game'

/**
 * Nome, ícone e dica de cada fase, usados no HUD, no aviso de nova fase, no botão de continuar e
 * em "Como Jogar". A dica diz o que aquela fase tem de diferente (PHASE_MIX, em src/game/config.ts).
 */
export const PHASES: Record<GamePhase, { name: string; emoji: string; tip: string }> = {
  1: { name: 'Rua', emoji: '🌇', tip: 'pule cones, latas e pombos baixos; abaixe nos pombos altos e nos tapumes' },
  2: { name: 'Metrô', emoji: '🚇', tip: 'hora do rush: mais trens, e mais compridos. Suba pelas rampas e corra nos tetos' },
  3: { name: 'Telhados', emoji: '🌃', tip: 'prédios altos: grude na parede e pule de novo. E olho nos pombos' },
}

/** "🚇 Metrô: hora do rush…", para listas de dicas. */
export const phaseTip = (phase: GamePhase) => `${PHASES[phase].emoji} ${PHASES[phase].name}: ${PHASES[phase].tip}`

/** A dica sozinha, com maiúscula, para o aviso de nova fase. */
export const phaseBannerTip = (phase: GamePhase) => PHASES[phase].tip.charAt(0).toUpperCase() + PHASES[phase].tip.slice(1)

/** Quanto tempo o aviso de nova fase fica na tela depois de pegar a bandeira (site e app). */
export const PHASE_BANNER_MS = 4000

/**
 * Segundas chances por bandeira: depois de continuar essa quantidade de vezes da mesma bandeira, o menu só
 * oferece recomeçar. Mantém o recorde com sentido e o anúncio recompensado raro (1 por bandeira).
 */
export const CONTINUES_PER_CHECKPOINT = 1

/** Identifica uma bandeira alcançada (fase + pontos no momento). */
export const checkpointKey = (checkpoint: Checkpoint) => `${checkpoint.phase}:${checkpoint.score}`

/** Dica do checkpoint mostrada em "Como Jogar". */
export const CHECKPOINT_TIP = `Com ${PHASE_2_SCORE} pontos aparece uma escada de plataformas: suba até a bandeira 🚩 para abrir a próxima fase e salvar o checkpoint`
