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
}: HUDProps) {
  return (
    <div className="hud">
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
    </div>
  )
}
