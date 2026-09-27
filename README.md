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

### 2.1 Widget de Feedback + SendGrid

O projeto agora inclui um widget de feedback no canto inferior direito com:

- seleção de tipo (`Problem`, `Idea`, `Other`)
- campo de mensagem
- upload opcional de imagem
- envio para e-mail via SendGrid

Para configurar:

1. Copie o arquivo de exemplo de variáveis de ambiente:

```bash
cp .env.example .env
```

2. Preencha no `.env`:

- `SENDGRID_API_KEY`
- `FEEDBACK_TO_EMAIL`
- `FEEDBACK_FROM_EMAIL` (domínio remetente validado no SendGrid)

3. Rode API + frontend:

```bash
npm run dev:full
```

Obs: se preferir, rode em terminais separados:

```bash
npm run api
npm run dev
```

### 2.2 Deploy Serverless na Vercel

Para produção na Vercel, use a função serverless em [api/feedback.js](api/feedback.js).

- A rota ficará disponível como `/api/feedback` automaticamente.
- Defina no painel da Vercel as variáveis:
  - `SENDGRID_API_KEY`
  - `FEEDBACK_TO_EMAIL`
  - `FEEDBACK_FROM_EMAIL`

Importante:

- O arquivo [server/feedback-server.mjs](server/feedback-server.mjs) pode continuar no projeto para desenvolvimento local.
- Em produção na Vercel, quem processa o envio é a função serverless em [api/feedback.js](api/feedback.js), não o servidor Express persistente.

### 3. Build para Produção

```bash
npm run build
```

ou com yarn:

```bash
yarn build
```

Os arquivos otimizados será gerados na pasta `dist/`

### 4. App nativo (Expo)

A versão para Android e iOS fica em `mobile/` (Expo SDK 57 + React Native). Ela usa a mesma engine do site (`src/game`), os mesmos modos (`src/data/gameModes.ts`) e as mesmas chaves de recorde e moedas.

```bash
cd mobile
npm install
npx expo start
```

Abra o app **Expo Go** no celular e escaneie o QR code (celular e computador na mesma rede). Também dá para rodar no navegador com `npm run web`.

- O Metro do app observa a pasta `../src` (`mobile/metro.config.js`), então mudanças na engine valem para os dois.
- Os sprites do app são cópias ampliadas 4x (pixel art nítida) dos arquivos em `src/assets/sprites`. Depois de mexer neles, rode `npm run sprites` dentro de `mobile/` (precisa de Python 3 com Pillow).
- `npm run typecheck` confere os tipos do app.

#### Gerar um APK de teste (Android)

O `mobile/eas.json` tem o perfil `preview`, que gera um `.apk` na nuvem da Expo (EAS Build). Precisa de uma conta gratuita em [expo.dev](https://expo.dev):

```bash
cd mobile
npx eas-cli@latest login
npx eas-cli@latest build -p android --profile preview
```

Na primeira vez ele pede para criar o projeto EAS e gerar a keystore (responda sim nos dois; o `projectId` que ele grava no `app.json` deve ir para o repositório). No fim aparece um link/QR code: abra no celular, baixe o `.apk` e instale (permitindo "instalar apps desconhecidos"). O pacote Android é `com.amad3eu.vandalgame`.

Ainda não tem no app: o canvas para desenhar o graffiti e a tela do blackbook (as assinaturas aceitas já ficam salvas no aparelho). Os ícones e a splash ainda são os padrões do Expo.

## 🎮 Como Jogar

Na tela de título, escolha o **modo** e aperte **Jogar** (no teclado: `↑`/`↓` para escolher e `Enter` para confirmar). Cada modo guarda o seu próprio recorde.

**Objetivo**: desvie dos obstáculos o máximo possível para ganhar pontos.

**Abertura:** o personagem está pichando "VANDAL" num muro quando um policial aparece gritando "PARA AÍ!". Ele leva um susto, pula e a fuga começa. O policial corre atrás nos primeiros segundos até ficar para trás (no modo Livre, ele desiste). Pular durante a abertura pula direto para a corrida. Quando você bate, o policial chega correndo e te pega ("PEGO!") antes do menu. Continuando de um checkpoint, o personagem já chega caindo do alto, sem a abertura.

### 🏃 Corrida (estilo dino do Google)

O cenário vem até você e a velocidade aumenta com o tempo.

| Tecla | Ação |
| --- | --- |
| `ESPAÇO` / `W` / `↑` | Pular (segure para ir mais alto) |
| `S` / `↓` | Abaixar · no ar, desce mais rápido |
| `SHIFT` / `X` | Dash: fica invencível por um instante |
| `CLIQUE` | Pular com o mouse |

### 🕹️ Livre (WASD)

Você controla a caminhada: o cenário só avança quando você anda.

| Tecla | Ação |
| --- | --- |
| `A` / `D` ou `←` / `→` | Andar |
| `W` / `ESPAÇO` / `↑` | Pular (segure para ir mais alto) |
| `S` / `↓` | Abaixar e andar agachado · no ar, desce mais rápido |
| `SHIFT` / `X` | Dash na direção em que está olhando |

Na fase 3 (Telhados), encoste na parede de um prédio no ar e pule de novo para fazer o wall-jump.

### 🚩 Fases e checkpoint

As fases (1 Rua, 2 Metrô, 3 Telhados) não mudam mais só com os pontos. Com **1200 pontos** aparece uma escada de plataformas subindo até uma **bandeira de checkpoint**; com **3500 pontos** na fase 2 aparece a escada para os telhados, um degrau mais alta.

- Pule de degrau em degrau (as plataformas deixam passar por baixo) e encoste na bandeira: abre a próxima fase, cai a noite e você ganha +250 pontos.
- A câmera sobe junto com você nas plataformas altas.
- Se errar a escada, nada acontece: ela volta depois de alguns obstáculos.
- A bandeira salva o checkpoint: no Fim de Jogo aparece **Continuar da Fase N**, que começa de novo daquela fase com os pontos, as moedas e a velocidade de quando você pegou a bandeira.

### 📱 No celular

Aparecem botões na tela: `◀` `▶` para andar (modo Livre), `▲` pular, `▼` abaixar e `⚡` dash. No modo Corrida, tocar em qualquer lugar da tela também pula. Em telas pequenas o cenário é reduzido para dar tempo de ver o que vem pela frente.

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
├── data/
│   ├── gameModes.ts       # Modos de jogo (Corrida / Livre) e ajustes de dificuldade
│   └── phases.ts          # Nomes das fases e dica do checkpoint
├── game/                  # Regras do jogo, sem React nem DOM (reaproveitável no app Expo)
│   ├── engine.ts          # Estado da partida, passo por frame, ações e eventos
│   ├── physics.ts         # Gravidade, colisões e paredes
│   ├── spawn.ts           # Geração de obstáculos e da escada do checkpoint
│   ├── replay.ts          # Replay e verificação de uma partida gravada
│   ├── random.ts          # Números aleatórios com semente (mesma semente, mesmos obstáculos)
│   └── config.ts          # Constantes do jogo (pulo, power-ups, fases...)
├── hooks/
│   └── useGameInput.ts    # Tratamento de input (teclado, mouse, touch)
├── types/
│   └── game.ts            # Tipos TypeScript do jogo
├── App.tsx                # Componente raiz
├── App.css
├── main.tsx               # Ponto de entrada
└── index.css              # Estilos globais

src/styles/ui.css          # Botões adesivo, painéis e fundo dos diálogos (visual "Vandal UI")
src/components/TitleScene.tsx  # Cidade à noite com o personagem correndo, no fundo da tela de título
src/components/Chaser.tsx      # O policial da abertura e a cena do "PEGO!"
scripts/make-intro-sprites.py  # Gera os sprites provisórios do policial e do muro pichado

mobile/                    # App Expo (React Native) que reaproveita src/game e src/data
├── App.tsx                # Menu, música, recordes e fontes
├── src/screens/           # Menu e tela do jogo
├── src/components/        # Cenário, personagem, obstáculos, HUD e botões de toque
├── src/input.ts           # Multi-toque e posição dos botões
├── src/storage.ts         # Recordes, moedas e blackbook (AsyncStorage)
└── scripts/build-sprites.py
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

Os números de cada modo ficam em `src/data/gameModes.ts`:

- `RUNNER_TUNING` (Corrida): velocidade inicial e máxima, aceleração e o tempo mínimo entre obstáculos
- `FREE_TUNING` (Livre): velocidade de caminhada, aceleração, controle no ar e distância entre obstáculos

O pulo (força e gravidade na subida/descida) fica em `BASE_CONFIG`, em `src/game/config.ts`, e as hitboxes em `src/game/physics.ts`.

A escada do checkpoint também fica em `src/game/config.ts`: `PHASE_2_SCORE`/`PHASE_3_SCORE` (a partir de quantos pontos ela aparece), `CLIMB_STEPS` (degraus por fase), `CLIMB_STEP_RISE` (altura de cada degrau) e `CLIMB_STEP_FRAMES`/`CLIMB_GAP_FRAMES` (largura dos degraus e dos vãos em frames de corrida: ela acompanha a velocidade para o tempo de reação ser o mesmo). A câmera usa `CAMERA_TOP_MARGIN`.

### Usando a engine em outro front end (ex.: Expo)

`src/game/engine.ts` não depende de React nem do navegador. O fluxo é:

```typescript
const state = createGameState({ mode: 'runner', width, height, intro: true, record: true })  // tamanho do mundo: fitWorld()
// a cada frame, com o tempo real desde o frame anterior:
const events = advanceGame(state, { left, right, down }, elapsedMs)  // 'coin' | 'artist' | 'checkpoint' | 'gameOver'
desenhar(getView(state))                                             // chão, obstáculos e jogador deslocados em view.cameraY
// botões:
pressJump(state) / releaseJump(state) / pressDash(state)
// continuar do checkpoint (vem no evento gameOver):
createGameState({ mode, width, height, checkpoint: evento.checkpoint })
```

- **Passo fixo:** `advanceGame` simula sempre em ticks de 60 Hz (`TICK_MS`), seja a tela de 30, 60, 120 ou 144 Hz. O pulo e a velocidade saem iguais em qualquer aparelho. Com o tempo do frame como passo, telas de 120 Hz pulavam uns 2% mais alto.
- **Replay:** com `record: true`, `state.log` guarda a semente dos sorteios e o que o jogador fez em cada tick (pulos, direções, dash, redimensionamentos, grafiteiros). `replayRun(log)` e `verifyRun(log)` (em `src/game/replay.ts`) jogam a partida de novo e conferem a pontuação. É a base para um servidor validar recordes sem confiar no cliente. A última partida fica salva em `dinoGameLastRun`.
- **Versão das regras:** o `ENGINE_VERSION` (em `src/game/config.ts`) vai junto no log. Aumente o número quando uma mudança alterar como uma partida acontece, para replays antigos não serem comparados com regras novas.

### Visual (Vandal UI)

A tela de título, os diálogos dos grafiteiros e o blackbook seguem um visual de adesivo de rua sobre pixel art. As referências são Jet Set Radio e Bomb Rush Cyberfunk (tags, adesivos), Katana ZERO (cidade em pixel art à noite) e Tony Hawk's Pro Skater 1+2 (menus de adesivo).

- Cores e fontes: variáveis em `:root` (`src/index.css`) no site e `UI`/`FONTS` em `mobile/src/theme.ts` no app.
  - `--ink` `#140f1f` · `--paper` `#fff6e5` · `--spray-pink` `#ff4d9d` · `--spray-yellow` `#ffd23f` · `--spray-cyan` `#4ecdc4` · `--spray-green` `#34d399`
- Fontes (Google Fonts, carregadas no `index.html`; no app via `@expo-google-fonts`):
  - **Sedgwick Ave Display**: logo e nomes (letra de pichação);
  - **Bungee**: botões e títulos (letreiro de rua);
  - **Silkscreen**: rótulos pequenos em pixel.
- Peças prontas: `.sticker-btn` (com `.is-pink`, `.is-yellow`, `.is-green`, `.is-cyan`, `.is-ghost` e `.is-small`), `.paper-panel`, `.tape` e `.street-backdrop`, em `src/styles/ui.css`.

### Sprites do policial e do muro

Os sprites do policial (`src/assets/sprites/cop/`) e do muro com a tag (`src/assets/sprites/intro/`) são provisórios. Eles são gerados por `python3 scripts/make-intro-sprites.py` (precisa do Pillow), na mesma grade 50×50 do personagem. Para trocar pela arte final, basta desenhar por cima mantendo os nomes dos arquivos e rodar `npm run sprites` dentro de `mobile/`.

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
