import type { GamePhase } from '../types/game'

/** Nome e ícone de cada fase, usados no HUD, no aviso de nova fase e no botão de continuar. */
export const PHASES: Record<GamePhase, { name: string; emoji: string }> = {
  1: { name: 'Rua', emoji: '🌇' },
  2: { name: 'Metrô', emoji: '🚇' },
  3: { name: 'Telhados', emoji: '🌃' },
}

/** Dica do checkpoint mostrada em "Como Jogar". */
export const CHECKPOINT_TIP =
  'Com 1200 pontos aparece uma escada de plataformas: suba até a bandeira 🚩 para abrir a próxima fase e salvar o checkpoint'
