import type { GameMode } from '../types/game'

export interface GameModeInfo {
  id: GameMode
  icon: string
  title: string
  tagline: string
  /** Pares [teclas, ação] mostrados no menu e na dica do início da partida. */
  controls: Array<[string, string]>
  tip: string
  /** Chave do recorde no localStorage: cada modo tem o seu. */
  highScoreKey: string
}

export const GAME_MODE_ORDER: GameMode[] = ['runner', 'free']

export const GAME_MODES: Record<GameMode, GameModeInfo> = {
  runner: {
    id: 'runner',
    icon: '🏃',
    title: 'Corrida',
    tagline: 'Estilo dino do Google: o cenário vem até você e você reage.',
    controls: [
      ['ESPAÇO / W / ↑', 'Pular (segure para ir mais alto)'],
      ['S / ↓', 'Abaixar · no ar, desce mais rápido'],
      ['SHIFT / X', 'Dash: fica invencível por um instante'],
      ['CLIQUE / TOQUE', 'Pular (no celular)'],
    ],
    tip: 'A velocidade aumenta com o tempo',
    // Chave original do jogo: quem já jogava mantém o recorde.
    highScoreKey: 'dinoGameHighScore',
  },
  free: {
    id: 'free',
    icon: '🕹️',
    title: 'Livre (WASD)',
    tagline: 'Você controla a caminhada: ande, pare e escolha a hora de pular.',
    controls: [
      ['A / D ou ← / →', 'Andar'],
      ['W / ESPAÇO / ↑', 'Pular (segure para ir mais alto)'],
      ['S / ↓', 'Abaixar e andar agachado · no ar, desce mais rápido'],
      ['SHIFT / X', 'Dash na direção em que está olhando'],
    ],
    tip: 'O cenário só avança quando você anda (precisa de teclado)',
    highScoreKey: 'dinoGameHighScoreFree',
  },
}

/** Corrida: o cenário rola sozinho e acelera com o tempo. Velocidades em px por frame (60fps). */
export const RUNNER_TUNING = {
  initialSpeed: 6,
  maxSpeed: 10,
  /** ~53s para ir de 6 a 10. Antes a velocidade máxima chegava em ~8s. */
  accelerationPerMs: 0.000075,
  /** Velocidade extra liberada nas fases 1, 2 e 3. */
  phaseSpeedBonus: [0, 0.6, 1.3],
  /** Tempo entre obstáculos em ms, sorteado entre min e max: [no início, na velocidade máxima]. */
  minGapMs: [1050, 880],
  maxGapMs: [1900, 1400],
}

/** Livre: o jogador anda com A/D e a câmera acompanha. Velocidades em px por frame (60fps). */
export const FREE_TUNING = {
  walkSpeed: 5.4,
  crouchSpeedFactor: 0.45,
  groundAcceleration: 0.7,
  groundDeceleration: 0.9,
  /** Menos controle no ar do que no chão, mas sem perder o embalo. */
  airAcceleration: 0.4,
  airDeceleration: 0.08,
  dashSpeed: 12,
  /** Empurrão para longe da parede no wall-jump. */
  wallKick: 2.5,
  /** Fração da largura da tela a partir da qual a câmera passa a andar junto. */
  cameraLine: 0.42,
  leftLimit: 8,
  /** Distância em px entre obstáculos, sorteada entre min e max. */
  minGap: 380,
  maxGap: 680,
  /** Pássaros continuam voando devagar em direção ao jogador. */
  birdDrift: 1.3,
}
