import './Menu.css'
import type { DinoColor } from '../App'

const dinoColors: Array<{ id: DinoColor; label: string; hex: string }> = [
  { id: 'verde', label: 'Verde', hex: '#2e9b42' },
  { id: 'azul', label: 'Azul', hex: '#3b6fe0' },
  { id: 'laranja', label: 'Laranja', hex: '#de7b28' },
  { id: 'rosa', label: 'Rosa', hex: '#d84f86' },
  { id: 'cinza', label: 'Cinza', hex: '#667085' },
]

interface MenuProps {
  gameOver?: boolean
  finalScore?: number
  highScore: number
  selectedColor: DinoColor
  onColorChange: (color: DinoColor) => void
  onStart: () => void
  onReturnToMenu?: () => void
}

export default function Menu({
  gameOver = false,
  finalScore = 0,
  highScore,
  selectedColor,
  onColorChange,
  onStart,
  onReturnToMenu
}: MenuProps) {
  return (
    <div className="menu-container">
      <div className="menu-card">
        <div className="collab-banner">
          <img
            src="https://dcdn-us.mitiendanube.com/stores/004/582/404/themes/common/logo-2090414351-1760441299-98f8b62c8dfe57d2998ff2085c3427e61760441299-640-0.webp"
            alt="Logo do Vandal Game"
            className="collab-logo"
            loading="lazy"
          />
          <p>Jogo em construção • Fase de testes beta</p>
        </div>

        <div className="menu-header">
          <h1 className="game-title">VANDAL GAME</h1>
          {!gameOver && <p className="subtitle">Pule os obstáculos e sobreviva o máximo possível!</p>}
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
        </div>

        <div className="color-picker">
          <h3>Cor do Personagem</h3>
          <div className="color-options">
            {dinoColors.map((color) => (
              <button
                key={color.id}
                type="button"
                className={`color-option ${selectedColor === color.id ? 'active' : ''}`}
                style={{ backgroundColor: color.hex }}
                aria-label={`Escolher cor ${color.label}`}
                title={color.label}
                onClick={() => onColorChange(color.id)}
              />
            ))}
          </div>
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
    </div>
  )
}
