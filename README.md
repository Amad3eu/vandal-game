# 🦖 Dino Game - React + TypeScript

Um jogo estilo dinossauro do Chrome, desenvolvido com as melhores práticas de mercado usando React, TypeScript, e Vite.

## 🎮 Características

✅ **Gameplay Divertido** - Pule sobre obstáculos e desvie deles
✅ **Sistema de Pontuação** - Ganhe pontos e acompanhe Record
✅ **Dificuldade Progressiva** - Velocidade aumenta conforme você progride
✅ **Responsivo** - Funciona em desktop e mobile
✅ **Componentizado** - Código bem organizado e reutilizável
✅ **TypeScript** - Tipagem segura em todo o projeto
✅ **Performance** - Otimizado com hooks e useRef

## 📋 Pré-requisitos

- Node.js 18+ 
- npm ou yarn

## 🚀 Como Instalar e Rodar

### 1. Instalar Dependências

```bash
npm install
```

ou com yarn:

```bash
yarn install
```

### 2. Iniciar o Servidor de Desenvolvimento

```bash
npm run dev
```

ou com yarn:

```bash
yarn dev
```

O jogo será aberto automaticamente em `http://localhost:3000`

### 3. Build para Produção

```bash
npm run build
```

ou com yarn:

```bash
yarn build
```

Os arquivos otimizados será gerados na pasta `dist/`

## 🎮 Como Jogar

- **Iniciar**: Clique em "Start Game" no menu
- **Pular**: Pressione `ESPAÇO` ou `SETA PARA CIMA` (desktop) ou `CLIQUE/TAP` (mobile)
- **Objetivo**: Desvie dos obstáculos o máximo de tempo possível para ganhar pontos

## 🏗️ Estrutura do Projeto

```
src/
├── components/
│   ├── Game.tsx           # Componente principal do jogo
│   ├── Game.css
│   ├── Dinosaur.tsx       # Componente do dinossauro
│   ├── Dinosaur.css
│   ├── Obstacle.tsx       # Componente dos obstáculos
│   ├── Obstacle.css
│   ├── Menu.tsx           # Menu inicial e Game Over
│   ├── Menu.css
│   ├── HUD.tsx            # Placar e informações
│   └── HUD.css
├── hooks/
│   ├── usePhysics.ts      # Lógica de física do jogo
│   └── useGameInput.ts    # Tratamento de input (teclado, mouse, touch)
├── types/
│   └── game.ts            # Tipos TypeScript do jogo
├── App.tsx                # Componente raiz
├── App.css
├── main.tsx               # Ponto de entrada
└── index.css              # Estilos globais
```

## 🛠️ Tecnologias Utilizadas

- **React 18** - Biblioteca UI
- **TypeScript** - Tipagem estática
- **Vite** - Build tool rápido
- **CSS3** - Estilização e animações
- **requestAnimationFrame** - Game loop otimizado

## 📱 Responsividade

O jogo se adapta automaticamente para:
- Desktop (1200px+)
- Tablets (768px - 1024px)
- Mobile (< 768px)

## 🎨 Customização

### Ajustar Dificuldade

Edite `src/components/Game.tsx` e modifique `GAME_CONFIG`:

```typescript
const GAME_CONFIG: GameConfig = {
  jumpPower: 20,      // Altura do pulo
  gravity: 0.8,       // Força da gravidade
  initialSpeed: 5,    // Velocidade inicial
  maxSpeed: 15,       // Velocidade máxima
  scrollSpeed: 5,     // Velocidade de movimento dos obstáculos
}
```

### Cores e Temas

Customizando as cores nos arquivos CSS:
- Primary: `#667eea`
- Secondary: `#764ba2`
- Danger: `#ff6b6b`

## 📊 Performance

- Otimizado com `useRef` para evitar re-renders desnecessários
- Game loop eficiente usando `requestAnimationFrame`
- Componentes memoizados onde apropriado
- CSS animations para máxima performance

## 🐛 Troubleshooting

### Jogo não abre
```bash
npm install
npm run dev
```

### Problemas de compilação TypeScript
```bash
npm run type-check
```

## 📝 Licença

MIT

## 🤝 Contribuições

Sugestões e melhorias são bem-vindas!

---

**Desenvolvido com ❤️ usando React + TypeScript + Vite**
