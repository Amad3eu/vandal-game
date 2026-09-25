import { GraffitiArtist } from '../types/game'
import './HUD.css'

interface HUDProps {
  score: number
  coins: number
  totalCoins?: number
  highScore: number
  gameSpeed: number
  isNight?: boolean
  skateTimeLeftMs?: number
  lightningTimeLeftMs?: number
  jumpBoostTimeLeftMs?: number
  signatures?: GraffitiArtist[]
  blackbookCount?: number
  onOpenBlackbook?: () => void
  phase?: 1 | 2 | 3
  dashCooldownMs?: number
  grindCombo?: number
}

const PHASE_INFO: Record<1 | 2 | 3, { name: string; emoji: string }> = {
  1: { name: 'Rua', emoji: '🌇' },
  2: { name: 'Metrô', emoji: '🚇' },
  3: { name: 'Telhados', emoji: '🌃' },
}

export default function HUD({
  score,
  coins,
  totalCoins = 0,
  highScore,
  gameSpeed,
  isNight = false,
  skateTimeLeftMs = 0,
  lightningTimeLeftMs = 0,
  jumpBoostTimeLeftMs = 0,
  signatures = [],
  blackbookCount = 0,
  onOpenBlackbook,
  phase = 1,
  dashCooldownMs = 0,
  grindCombo = 0,
}: HUDProps) {
  const dashReady = dashCooldownMs <= 0
  const GRAFFITI_ARTISTS: Record<string, { name: string; color: string }> = {
    remo: { name: 'Remo', color: '#FF6B6B' },
    pixo: { name: 'Pixo', color: '#4ECDC4' },
    nina: { name: 'Nina', color: '#FFE66D' },
  }
  return (
    <div className="hud">
      <div className="hud-item">
        <span className="hud-label">Fase</span>
        <span className={`hud-tag phase-tag phase-tag-${phase}`}>
          {PHASE_INFO[phase].emoji} {phase} · {PHASE_INFO[phase].name}
        </span>
      </div>
      <div className="hud-item">
        <span className="hud-label">Pontos</span>
        <span className="hud-value">{score}</span>
      </div>
      <div className="hud-item">
        <span className="hud-label">Recorde</span>
        <span className="hud-value">{highScore}</span>
      </div>
      <div className="hud-item">
        <span className="hud-label">Moedas</span>
        <span className="hud-value">{coins}</span>
      </div>
      <div className="hud-item">
        <span className="hud-label">Moedas Totais</span>
        <span className="hud-value">{totalCoins}</span>
      </div>
      <div className="hud-item">
        <span className="hud-label">Velocidade</span>
        <div className="speed-bar">
          <div className="speed-fill" style={{ width: `${gameSpeed}%` }} />
        </div>
      </div>
      <div className="hud-item">
        <span className="hud-label">Ambiente</span>
        <span className={`hud-tag ${isNight ? 'night' : 'day'}`}>
          {isNight ? 'Noite' : 'Dia'}
        </span>
      </div>
      <div className="hud-item">
        <span className="hud-label">Dash</span>
        <span className={`hud-tag dash-tag ${dashReady ? 'ready' : 'cooling'}`}>
          {dashReady ? 'Pronto' : `${(dashCooldownMs / 1000).toFixed(1)}s`}
        </span>
      </div>
      {grindCombo > 1 && (
        <div className="hud-item">
          <span className="hud-label">Grind</span>
          <span className="hud-tag grind-tag">x{grindCombo}</span>
        </div>
      )}
      {skateTimeLeftMs > 0 && (
        <div className="hud-item">
          <span className="hud-label">Turbo Skate</span>
          <span className="hud-tag turbo">{(skateTimeLeftMs / 1000).toFixed(1)}s</span>
        </div>
      )}
      {lightningTimeLeftMs > 0 && (
        <div className="hud-item">
          <span className="hud-label">Raio</span>
          <span className="hud-tag lightning">{(lightningTimeLeftMs / 1000).toFixed(1)}s</span>
        </div>
      )}
      {jumpBoostTimeLeftMs > 0 && (
        <div className="hud-item">
          <span className="hud-label">Super Pulo</span>
          <span className="hud-tag jump">{(jumpBoostTimeLeftMs / 1000).toFixed(1)}s</span>
        </div>
      )}
      {signatures.length > 0 && (
        <div className="hud-item">
          <span className="hud-label">Assinaturas</span>
          <div className="signatures-container">
            {['remo', 'pixo', 'nina'].map((artist) => (
              <div
                key={artist}
                className={`signature-badge ${signatures.includes(artist as any) ? 'collected' : ''}`}
                style={{ borderColor: GRAFFITI_ARTISTS[artist].color }}
              >
                {GRAFFITI_ARTISTS[artist].name}
              </div>
            ))}
          </div>
        </div>
      )}
      {blackbookCount > 0 && (
        <div className="hud-item">
          <span className="hud-label">Blackbook</span>
          <button className="btn-blackbook" onClick={onOpenBlackbook}>
            📖 {blackbookCount} obra{blackbookCount !== 1 ? 's' : ''}
          </button>
        </div>
      )}
    </div>
  )
}
