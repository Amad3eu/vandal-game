import type { Checkpoint, GamePhase } from '../types/game'

/** Nome e ícone de cada fase, usados no HUD, no aviso de nova fase e no botão de continuar. */
export const PHASES: Record<GamePhase, { name: string; emoji: string }> = {
  1: { name: 'Rua', emoji: '🌇' },
  2: { name: 'Metrô', emoji: '🚇' },
  3: { name: 'Telhados', emoji: '🌃' },
}

/**
 * Segundas chances por bandeira: depois de continuar essa quantidade de vezes da mesma bandeira, o menu só
 * oferece recomeçar. Mantém o recorde com sentido e o anúncio recompensado raro (1 por bandeira).
 */
export const CONTINUES_PER_CHECKPOINT = 1

/** Identifica uma bandeira alcançada (fase + pontos no momento). */
export const checkpointKey = (checkpoint: Checkpoint) => `${checkpoint.phase}:${checkpoint.score}`

/** Dica do checkpoint mostrada em "Como Jogar". */
export const CHECKPOINT_TIP =
  'Com 1200 pontos aparece uma escada de plataformas: suba até a bandeira 🚩 para abrir a próxima fase e salvar o checkpoint'
