import { useState } from 'react'
import './Menu.css'
import type { MusicOption } from '../App'

interface MenuProps {
  gameOver?: boolean
  finalScore?: number
  highScore: number
  selectedMusic: MusicOption
  onMusicChange: (music: MusicOption) => void
  onStart: () => void
  onReturnToMenu?: () => void
}

export default function Menu({
  gameOver = false,
  finalScore = 0,
  highScore,
  selectedMusic,
  onMusicChange,
  onStart,
  onReturnToMenu
}: MenuProps) {
  const [isInfoOpen, setIsInfoOpen] = useState(false)

  const totalCoins = (() => {
    const saved = localStorage.getItem('dinoGameTotalCoins')
    return saved ? parseInt(saved, 10) : 0
  })()

  return (
    <div className="menu-container">
      <div className="menu-card">
        <div className="menu-header">
          <h1 className="game-title">VANDAL GAME</h1>
          {!gameOver && <p className="subtitle">Pule os obstáculos e sobreviva o máximo possível!</p>}
          <button
            type="button"
            className="collab-info-button menu-collab-button"
            onClick={() => setIsInfoOpen(true)}
          >
            Sobre a parceria
          </button>
        </div>

        {gameOver && (
          <div className="game-over-section">
            <h2>Fim de Jogo!</h2>
            <div className="score-display">
              <div className="score-item">
                <span>Sua Pontuação</span>
                <strong>{finalScore}</strong>
              </div>
              <div className="score-item">
                <span>Recorde</span>
                <strong>{highScore}</strong>
              </div>
            </div>
          </div>
        )}

        <div className="menu-stats">
          <div className="stat">
            <span className="stat-label">Recorde</span>
            <span className="stat-value">{highScore}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Moedas Totais</span>
            <span className="stat-value">{totalCoins}</span>
          </div>
        </div>

        <div className="music-picker">
          <h3>Musica</h3>
          <select
            value={selectedMusic}
            onChange={(e) => onMusicChange(e.target.value as MusicOption)}
            className="music-select"
          >
            <option value="theme">Trilha Principal</option>
            <option value="none">Sem Musica</option>
          </select>
        </div>

        <div className="menu-buttons">
          <button className="btn btn-primary" onClick={onStart}>
            {gameOver ? 'Jogar Novamente' : 'Iniciar Jogo'}
          </button>
          {gameOver && onReturnToMenu && (
            <button className="btn btn-secondary" onClick={onReturnToMenu}>
              Menu Principal
            </button>
          )}
        </div>

        <div className="menu-instructions">
          <h3>Como Jogar</h3>
          <ul>
            <li><strong>ESPAÇO</strong> ou <strong>SETA PARA CIMA</strong> - Pular</li>
            <li><strong>SETA PARA BAIXO</strong> ou <strong>S</strong> - Abaixar</li>
            <li><strong>CLIQUE/TOQUE</strong> - Pular (no celular)</li>
            <li>Desvie dos obstáculos para marcar pontos</li>
            <li>Pegue o <strong>SKATE</strong> para ganhar velocidade por 15 segundos</li>
            <li>A velocidade aumenta com o tempo</li>
          </ul>
        </div>
      </div>

      {isInfoOpen && (
        <div className="info-modal-overlay" onClick={() => setIsInfoOpen(false)}>
          <div className="info-modal" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="info-modal-close"
              onClick={() => setIsInfoOpen(false)}
              aria-label="Fechar informações"
            >
              ×
            </button>
            <h3>Colaboração</h3>
            <p>Este jogo está sendo criado em colaboração com <strong>guimeujovem</strong> e <strong>amad3eu</strong>.</p>
            <div className="info-modal-top">
              <div className="partner-card">
                <img
                  src="https://avatars.githubusercontent.com/u/85834483?v=4"
                  alt="Avatar do Amad3eu"
                  className="partner-avatar"
                />
                <div>
                  <h4>amad3eu</h4>
                  <p>GitHub</p>
                  <a href="https://github.com/amad3eu" target="_blank" rel="noreferrer">github.com/amad3eu</a>
                </div>
              </div>
              <div className="partner-card">
                <img
                  src="https://dcdn-us.mitiendanube.com/stores/004/582/404/themes/new_linkedman/img-1536637303-1721126500-b79ee06e5b3ebdec680dc7074b9194f61721126501.png?3034011912706762975"
                  alt="Avatar do guimeujovem"
                  className="partner-avatar partner-avatar-crop"
                />
                <div>
                  <h4>guimeujovem</h4>
                  <p>Instagram</p>
                  <a href="https://www.instagram.com/guimeujovem" target="_blank" rel="noreferrer">@guimeujovem</a>
                </div>
              </div>
            </div>
            <div className="info-card-grid">
              <div className="info-card info-card-wide">
                <h4>Sobre a parceria</h4>
                <p>Este jogo está sendo criado em colaboração com <strong>guimeujovem</strong> e <strong>amad3eu</strong>.</p>
                <p>Os dois trabalham juntos para deixar o Vandal Game mais criativo, divertido e cheio de estilo.</p>
              </div>
            </div>
            <div className="info-store">
              <p>Visite a loja oficial do Guime</p>
              <a
                className="store-link"
                href="https://guimegraffitiartwork.lojavirtualnuvem.com.br/"
                target="_blank"
                rel="noreferrer"
              >
                guimegraffitiartwork.lojavirtualnuvem.com.br
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
