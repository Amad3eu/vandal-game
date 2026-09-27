import type { CSSProperties } from 'react'
import { GameMode, GraffitiArtist } from '../types/game'
import { ARTIST_INFO } from '../data/graffitiArtists'
import { PHASES } from '../data/phases'
import './HUD.css'

interface HUDProps {
  mode?: GameMode
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

const seconds = (ms: number) => `${(ms / 1000).toFixed(1)}s`

/**
 * In-run HUD as a strip of stickers (same look as the title screen): phase, points with the
 * record, coins, speed and dash, plus power-up timers and signatures only while they matter.
 */
export default function HUD({
  mode = 'runner',
  score,
  coins,
  highScore,
  gameSpeed,
  skateTimeLeftMs = 0,
  lightningTimeLeftMs = 0,
  jumpBoostTimeLeftMs = 0,
  signatures = [],
  blackbookCount = 0,
  onOpenBlackbook,
  phase = 1,
  dashCooldownMs = 0,
}: HUDProps) {
  const dashReady = dashCooldownMs <= 0
  const beatingRecord = highScore > 0 && score > highScore

  return (
    <div className="hud" role="status" aria-label="Placar">
      <div className={`hud-sticker hud-phase phase-${phase}`}>
        <small>Fase</small>
        <strong>
          {PHASES[phase].emoji} {phase} · {PHASES[phase].name}
        </strong>
      </div>

      <div className={`hud-sticker hud-score ${beatingRecord ? 'is-record' : ''}`}>
        <small>{beatingRecord ? 'Novo recorde!' : 'Pontos'}</small>
        <strong>{score}</strong>
        {!beatingRecord && highScore > 0 && <em>rec {highScore}</em>}
      </div>

      <div className="hud-sticker hud-coins">
        <small>Moedas</small>
        <strong>{coins}</strong>
      </div>

      {/* In the free mode the player sets the pace, so there is no scroll speed to show. */}
      {mode === 'runner' && (
        <div className="hud-sticker hud-speed">
          <small>Velocidade</small>
          <span className="speed-bar">
            <span className="speed-fill" style={{ width: `${Math.min(100, gameSpeed)}%` }} />
          </span>
        </div>
      )}

      <div className={`hud-sticker hud-dash ${dashReady ? 'ready' : 'cooling'}`}>
        <small>Dash</small>
        <strong>{dashReady ? 'Pronto' : seconds(dashCooldownMs)}</strong>
      </div>

      {lightningTimeLeftMs > 0 && (
        <div className="hud-sticker hud-power is-lightning">
          <small>Raio</small>
          <strong>{seconds(lightningTimeLeftMs)}</strong>
        </div>
      )}
      {jumpBoostTimeLeftMs > 0 && (
        <div className="hud-sticker hud-power is-jump">
          <small>Super pulo</small>
          <strong>{seconds(jumpBoostTimeLeftMs)}</strong>
        </div>
      )}
      {skateTimeLeftMs > 0 && (
        <div className="hud-sticker hud-power is-skate">
          <small>Turbo skate</small>
          <strong>{seconds(skateTimeLeftMs)}</strong>
        </div>
      )}

      {signatures.length > 0 && (
        <div className="hud-sticker hud-signatures hud-optional" aria-label="Assinaturas desta corrida">
          <small>Assinaturas</small>
          <span className="signature-dots">
            {(Object.keys(ARTIST_INFO) as GraffitiArtist[]).map((artist) => (
              <span
                key={artist}
                title={ARTIST_INFO[artist].name}
                className={`signature-dot ${signatures.includes(artist) ? 'collected' : ''}`}
                style={{ '--artist': ARTIST_INFO[artist].color } as CSSProperties}
              />
            ))}
          </span>
        </div>
      )}

      {blackbookCount > 0 && onOpenBlackbook && (
        <button type="button" className="hud-sticker hud-blackbook" onClick={onOpenBlackbook} aria-label={`Abrir blackbook (${blackbookCount} obras)`}>
          <small>Blackbook</small>
          <strong>🎨 {blackbookCount}</strong>
        </button>
      )}
    </div>
  )
}
