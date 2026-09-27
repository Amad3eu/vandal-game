import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import './Menu.css'
import type { MusicOption } from '../App'
import type { Checkpoint, GameMode } from '../types/game'
import { GAME_MODES, GAME_MODE_ORDER } from '../data/gameModes'
import { CHECKPOINT_TIP, PHASES } from '../data/phases'
import TitleScene from './TitleScene'

interface MenuProps {
  gameOver?: boolean
  finalScore?: number
  /** The run that just ended beat the record. */
  isNewRecord?: boolean
  highScore: number
  selectedMode: GameMode
  onModeChange: (mode: GameMode) => void
  selectedMusic: MusicOption
  onMusicChange: (music: MusicOption) => void
  onStart: () => void
  /** Checkpoint reached in the run that just ended: offers to continue from it. */
  checkpoint?: Checkpoint | null
  onContinue?: () => void
  onReturnToMenu?: () => void
  blackbookCount?: number
  onOpenBlackbook?: () => void
}

function readTotalCoins() {
  try {
    const saved = localStorage.getItem('dinoGameTotalCoins')
    return saved ? parseInt(saved, 10) : 0
  } catch {
    return 0
  }
}

/** ↑/↓ move between the menu's buttons, like a console title screen. */
function moveFocus(event: KeyboardEvent<HTMLElement>) {
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
  const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not([disabled])'))
  if (items.length === 0) return
  event.preventDefault()
  const current = items.indexOf(document.activeElement as HTMLButtonElement)
  const step = event.key === 'ArrowDown' ? 1 : -1
  const next = current === -1 ? 0 : (current + step + items.length) % items.length
  items[next].focus()
}

export default function Menu({
  gameOver = false,
  finalScore = 0,
  isNewRecord = false,
  highScore,
  selectedMode,
  onModeChange,
  selectedMusic,
  onMusicChange,
  onStart,
  checkpoint = null,
  onContinue,
  onReturnToMenu,
  blackbookCount = 0,
  onOpenBlackbook,
}: MenuProps) {
  const [openPanel, setOpenPanel] = useState<'how-to' | 'about' | null>(null)
  const modeInfo = GAME_MODES[selectedMode]
  const totalCoins = readTotalCoins()
  const canContinue = gameOver && checkpoint !== null && onContinue !== undefined
  const primaryRef = useRef<HTMLButtonElement>(null)

  // Ready for the keyboard: Enter/Space plays straight away.
  useEffect(() => {
    primaryRef.current?.focus({ preventScroll: true })
  }, [])

  // Esc closes the open panel.
  useEffect(() => {
    if (!openPanel) return
    const onKey = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && setOpenPanel(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openPanel])

  return (
    <div className={`title-screen ${gameOver ? 'is-gameover' : ''}`}>
      <TitleScene />

      <div className="title-stats" aria-label="Seu progresso">
        <span className="stat-sticker">
          <small>Recorde</small>
          <strong>{highScore}</strong>
        </span>
        <span className="stat-sticker is-coin">
          <small>Moedas</small>
          <strong>{totalCoins}</strong>
        </span>
      </div>

      <div className="title-layout">
        <header className="title-logo">
          <h1 className="logo-tag">
            <span className="logo-line">Vandal</span>
            <span className="logo-line logo-line-2">Game</span>
          </h1>
          <span className="beta-sticker">Beta</span>
          {!gameOver && <p className="logo-tagline">corra · pule · deixe sua marca</p>}
        </header>

        {gameOver && (
          <section className="result-card paper-panel" aria-labelledby="result-title">
            <h2 id="result-title" className="result-title">Fim de jogo!</h2>
            {isNewRecord && <span className="record-sticker">Novo recorde!</span>}
            <div className="result-scores">
              <div>
                <small>Pontos</small>
                <strong data-testid="final-score">{finalScore}</strong>
              </div>
              <div>
                <small>Recorde</small>
                <strong>{highScore}</strong>
              </div>
            </div>
          </section>
        )}

        <nav className="title-menu" aria-label="Menu principal" onKeyDown={moveFocus}>
          {canContinue && checkpoint && (
            <button ref={primaryRef} className="sticker-btn is-green menu-main btn-continue" onClick={onContinue}>
              <span>
                🚩 Continuar da fase {checkpoint.phase} · {PHASES[checkpoint.phase].name}
              </span>
              <span className="btn-note">{checkpoint.score} pontos</span>
            </button>
          )}
          <button
            ref={canContinue ? undefined : primaryRef}
            className={`sticker-btn menu-main ${canContinue ? 'is-yellow' : 'is-pink'}`}
            onClick={onStart}
          >
            ▶ {gameOver ? (canContinue ? 'Recomeçar da fase 1' : 'Jogar de novo') : 'Jogar'}
          </button>

          <div className="mode-switch" role="radiogroup" aria-label="Modo de jogo">
            {GAME_MODE_ORDER.map((mode) => {
              const info = GAME_MODES[mode]
              const selected = mode === selectedMode
              return (
                <button
                  key={mode}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={`sticker-btn is-small mode-chip ${selected ? 'active' : ''}`}
                  onClick={() => onModeChange(mode)}
                >
                  <span aria-hidden="true">{info.icon}</span> {info.title}
                </button>
              )
            })}
          </div>
          <p className="mode-tagline">{modeInfo.tagline}</p>

          {onOpenBlackbook && (
            <button className="sticker-btn is-cyan" onClick={onOpenBlackbook}>
              🎨 Blackbook{blackbookCount > 0 ? ` (${blackbookCount})` : ''}
            </button>
          )}

          <div className="menu-row">
            <button
              className="sticker-btn is-small"
              aria-pressed={selectedMusic === 'theme'}
              onClick={() => onMusicChange(selectedMusic === 'theme' ? 'none' : 'theme')}
            >
              {selectedMusic === 'theme' ? '♪ Música: on' : '♪ Música: off'}
            </button>
            <button className="sticker-btn is-small" onClick={() => setOpenPanel('how-to')}>
              ? Como jogar
            </button>
          </div>

          <div className="menu-row">
            <button className="sticker-btn is-small is-ghost menu-link" onClick={() => setOpenPanel('about')}>
              ★ Sobre a parceria
            </button>
            {gameOver && onReturnToMenu && (
              <button className="sticker-btn is-small is-ghost menu-link" onClick={onReturnToMenu}>
                ⌂ Menu principal
              </button>
            )}
          </div>
        </nav>
      </div>

      <footer className="title-hints only-keyboard" aria-hidden="true">
        <span>
          <kbd>↑</kbd>
          <kbd>↓</kbd> escolher
        </span>
        <span>
          <kbd>Enter</kbd> confirmar
        </span>
        {modeInfo.controls.slice(0, 3).map(([keys, action]) => (
          <span key={keys}>
            <kbd>{keys}</kbd> {action.split(' (')[0].split(' ·')[0]}
          </span>
        ))}
      </footer>

      {openPanel === 'how-to' && (
        <div className="street-backdrop" onClick={() => setOpenPanel(null)}>
          <div
            className="title-panel paper-panel"
            role="dialog"
            aria-labelledby="how-to-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button className="sticker-btn is-small panel-close" onClick={() => setOpenPanel(null)} aria-label="Fechar">
              ✕
            </button>
            <h2 id="how-to-title" className="panel-title">
              Como jogar · {modeInfo.title}
            </h2>
            <ul className="controls-list">
              {modeInfo.controls.map(([keys, action]) => (
                <li key={keys} className="only-keyboard">
                  <kbd>{keys}</kbd> <span>{action}</span>
                </li>
              ))}
              {modeInfo.touchControls.map(([keys, action]) => (
                <li key={`touch-${keys}`} className="only-touch">
                  <kbd>{keys}</kbd> <span>{action}</span>
                </li>
              ))}
            </ul>
            <ul className="tips-list">
              <li>Desvie dos obstáculos para marcar pontos.</li>
              <li>{CHECKPOINT_TIP}.</li>
              <li>Encontre grafiteiros para trocar assinaturas no seu blackbook.</li>
              <li>{modeInfo.tip}.</li>
            </ul>
          </div>
        </div>
      )}

      {openPanel === 'about' && (
        <div className="street-backdrop" onClick={() => setOpenPanel(null)}>
          <div
            className="title-panel paper-panel"
            role="dialog"
            aria-labelledby="about-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button className="sticker-btn is-small panel-close" onClick={() => setOpenPanel(null)} aria-label="Fechar">
              ✕
            </button>
            <h2 id="about-title" className="panel-title">
              Colaboração
            </h2>
            <p className="panel-text">
              Este jogo está sendo criado em colaboração com <strong>guimeujovem</strong> e <strong>amad3eu</strong>. Os
              dois trabalham juntos para deixar o Vandal Game mais criativo, divertido e cheio de estilo.
            </p>
            <div className="partner-cards">
              <a className="partner-card" href="https://github.com/amad3eu" target="_blank" rel="noreferrer">
                <img src="https://avatars.githubusercontent.com/u/85834483?v=4" alt="" className="partner-avatar" />
                <span>
                  <strong>amad3eu</strong>
                  <small>GitHub · github.com/amad3eu</small>
                </span>
              </a>
              <a className="partner-card" href="https://www.instagram.com/guimeujovem" target="_blank" rel="noreferrer">
                <img
                  src="https://dcdn-us.mitiendanube.com/stores/004/582/404/themes/new_linkedman/img-1536637303-1721126500-b79ee06e5b3ebdec680dc7074b9194f61721126501.png?3034011912706762975"
                  alt=""
                  className="partner-avatar partner-avatar-crop"
                />
                <span>
                  <strong>guimeujovem</strong>
                  <small>Instagram · @guimeujovem</small>
                </span>
              </a>
            </div>
            <a
              className="sticker-btn is-yellow store-link"
              href="https://guimegraffitiartwork.lojavirtualnuvem.com.br/"
              target="_blank"
              rel="noreferrer"
            >
              Visite a loja oficial do Guime ↗
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
