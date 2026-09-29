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
- É uma segunda chance por bandeira (`CONTINUES_PER_CHECKPOINT` em `src/data/phases.ts`). Depois de usar, o menu só oferece recomeçar, o que mantém o recorde com sentido. Com anúncios ligados, a segunda chance custa um anúncio recompensado (veja abaixo).

### 🛹 Skate e SLAM

A partir de 300 pontos pode aparecer um **skate** no chão. Pegando, você anda nele por 15 segundos (o HUD mostra "Turbo skate"). Se bater enquanto está no skate, você não perde: é um **SLAM**.

- O personagem cai de costas num fogo no estilo do Doom, o obstáculo sai voando e aparece o adesivo "SLAM!".
- Depois ele levanta e volta piscando, meio transparente, sem poder se machucar por 1,6 s.
- O skate se perde na queda.

Os tempos ficam em `src/game/config.ts` (`SKATE_SPAWN_SCORE`, `SKATE_SPAWN_CHANCE`, `SLAM_MS`, `RECOVER_MS`). O desenho da queda fica em `src/data/slam.ts`, que a web e o app usam igual.

### 🗺️ Mapa da rota

No canto de cima fica um mapinha no estilo GPS: a rota desenhada à mão do START até as bandeiras do Metrô e dos Telhados.

- O trecho já corrido fica rosa e a bolinha amarela é você.
- Em cima aparece a distância percorrida.
- Quando a escada de uma bandeira vai aparecer, a bandeira pisca "SUBA!".

A distância também aparece no Fim de Jogo e no placar do aparelho. A rota (`src/data/routeMap.ts`) é a mesma na web e no app.

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
│   ├── phases.ts          # Nomes das fases e dica do checkpoint
│   ├── routeMap.ts        # Rota do mapinha, bandeiras e distância (web e app)
│   └── slam.ts            # Queda do SLAM: pose, fogo e tempos (web e app)
├── game/                  # Regras do jogo, sem React nem DOM (reaproveitável no app Expo)
│   ├── engine.ts          # Estado da partida, passo por frame, ações e eventos
│   ├── physics.ts         # Gravidade, colisões e paredes
│   ├── spawn.ts           # Geração de obstáculos e da escada do checkpoint
│   ├── replay.ts          # Replay e verificação de uma partida gravada
│   ├── random.ts          # Números aleatórios com semente (mesma semente, mesmos obstáculos)
│   ├── submission.ts      # Conferência das partidas do placar global (usada pelo servidor)
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
src/components/RouteMap.tsx    # Mapinha da rota no canto da tela
src/components/SlamEffect.tsx  # Fogo, skate voando e adesivo "SLAM!"
src/ads/                       # Anúncios: interface AdsProvider, anúncio de teste e AdSense H5
src/online/                    # Placar global: servidor próprio, Supabase ou placar falso (?online=dev); desligado sem configuração
src/data/scoreBoard.ts         # Placar deste aparelho (melhores partidas por modo)
server/leaderboard/            # Servidor do placar global (Node + Postgres), feito para o Railway (railway.json)
src/admin/                     # Painel admin (/admin): roadmap, moderação do placar, grafiteiros e DJs (shadcn/ui)
tests/                         # Testes: Vitest (engine, servidor) e Playwright (tests/e2e)
.github/workflows/ci.yml       # Testes automáticos em todo PR
supabase/migrations/           # Banco do placar: tabelas, RLS e funções SQL
supabase/functions/            # start-run (semente) e submit-run (replay e placar), em Deno
scripts/make-intro-sprites.py  # Gera os sprites provisórios do policial e do muro pichado
scripts/import-sprite-sheet.py # Converte uma folha de sprites (ex.: gerada por IA) para 50×50
scripts/make-fx-sprites.py     # Gera os quadros do fogo do SLAM (fogo do Doom)

mobile/                    # App Expo (React Native) que reaproveita src/game e src/data
├── App.tsx                # Menu, música, recordes e fontes
├── src/screens/           # Menu e tela do jogo
├── src/components/        # Cenário, personagem, obstáculos, HUD, mapa, SLAM e botões de toque
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

### 💰 Anúncios (beta)

O único anúncio é o **recompensado da segunda chance**: assistir até o fim continua do checkpoint, e fechar antes não dá nada. Se não houver anúncio disponível, a segunda chance fica grátis. Os anúncios ficam atrás da interface `AdsProvider` (`src/ads/`), e o jogo não depende de nenhuma rede. A rede é escolhida pela variável `VITE_ADS` no `.env.local`:

| `VITE_ADS` | O que faz |
| --- | --- |
| `none` (padrão) | Sem anúncios; a segunda chance é grátis |
| `dev` | Anúncio de teste falso (3 s), para testar o fluxo; também dá para abrir o jogo com `?ads=dev` na URL |
| `adsense` | Google H5 Games Ads (AdSense para jogos), no seu próprio domínio |

Para o AdSense: `VITE_ADS=adsense`, `VITE_ADSENSE_CLIENT=ca-pub-...` e, para ver anúncios de teste do Google, `VITE_ADSENSE_TEST=on`. É preciso ter a conta aprovada no programa de jogos. Não use AdSense em portais (CrazyGames, Poki, GX.games): eles usam o SDK próprio ou não têm anúncios, e cada um entra como um novo provedor em `src/ads/`. No app, anúncios (AdMob) só funcionam num build de desenvolvimento do EAS, não no Expo Go. Antes de ligar anúncios de verdade, confira consentimento, privacidade e anúncios não personalizados para menores (LGPD).

### 🏆 Placar

**Neste aparelho (já funciona, sem servidor):** as 10 melhores partidas de cada modo ficam guardadas no próprio aparelho (`localStorage` no site, `AsyncStorage` no app), com a fase alcançada, a data e a marca "continuou" quando a partida veio de um checkpoint. O Fim de Jogo mostra a posição, por exemplo "#2 neste aparelho". A lógica fica em `src/data/scoreBoard.ts` e é a mesma no site e no app.

**Global:** um placar único para todos, num servidor. Há duas versões prontas, as duas **desligadas** até você configurar uma: o servidor próprio em `server/leaderboard` (Node + Postgres, feito para o Railway) e uma com Supabase. As duas usam a mesma conferência de partidas (`src/game/submission.ts`). Com uma delas ligada, o painel "🏆 Placar" ganha a aba "🌎 Global", com apelido.

#### Como o servidor confere as partidas

O placar só aceita pontuação que o servidor confirmou jogando a partida de novo:

1. Ao apertar **Jogar**, o jogo pede ao servidor a semente da partida. Assim ninguém escolhe uma semente "boa" testando offline.
2. No fim, o jogo envia a gravação: a semente e os comandos de cada tick.
3. O servidor refaz a partida com a mesma engine (`src/game`). Se o resultado não bater com o que o jogo mandou, a partida é recusada. A pontuação que vale é a do replay.
4. Cada semente vale uma vez. A partida não pode ter durado mais que o tempo desde que a semente saiu, e partidas continuadas do checkpoint não entram no placar (v1).
5. Os jogadores são anônimos: cada aparelho ganha uma conta na primeira partida ranqueada e pode escolher um apelido. Partidas sem pontos são conferidas, mas não aparecem na lista.

Sem configuração o jogo fica offline, como antes. Se o servidor cair, o jogo começa a partida offline depois de no máximo 2,5 s. Para ver o fluxo sem servidor, abra com `?online=dev`: é um placar falso, guardado no navegador, que também confere o replay.

#### Placar global no Railway

O servidor (`server/leaderboard/`) é um Node com Express e Postgres. O `railway.json` na raiz já diz ao Railway como montar (`npm run build:leaderboard`), como ligar (`npm run start:leaderboard`) e onde ele responde que está no ar (`/health`). As tabelas são criadas sozinhas na primeira vez.

1. Em [railway.com](https://railway.com): **New Project → Deploy from GitHub repo** e escolha este repositório.
2. No mesmo projeto: **+ New → Database → PostgreSQL**.
3. No serviço do jogo, em **Variables**, coloque o banco e o endereço do site (mais de um: separe por vírgula):

   ```bash
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   ALLOWED_ORIGINS=https://vandal-game-guimeujovem.vercel.app
   ```

4. Em **Settings → Networking → Generate Domain**, gere o endereço público. Abra `https://<endereço>/health` para conferir: deve aparecer `{"ok":true,...}`.
5. Na Vercel, em **Settings → Environment Variables** do site, coloque `VITE_LEADERBOARD_URL=https://<endereço do Railway>` e faça um novo deploy.

Limites contra abuso: 40 partidas ranqueadas por jogador a cada 10 minutos e 60 contas novas por endereço IP por hora (`PLAYERS_PER_HOUR`; operadoras de celular põem muitos aparelhos atrás do mesmo IP). O Railway cobra pelo uso depois do período de teste; confira os planos no site deles.

Para rodar no seu computador, com um Postgres local:

```bash
npm run build:leaderboard
DATABASE_URL=postgres://usuario:senha@localhost:5432/vandal npm run start:leaderboard   # responde em http://localhost:8788
```

E no `.env.local` do site: `VITE_LEADERBOARD_URL=http://localhost:8788`.

#### Placar global com Supabase

A mesma ideia com as funções `start-run` e `submit-run` (Deno) e tabelas com RLS: o jogo lê o placar e edita o próprio apelido, mas não grava partidas; só as funções do servidor gravam (`supabase/migrations/`). A engine e a conferência vão empacotadas em `supabase/functions/_shared/vandal-engine.js`.

1. Crie um projeto em [supabase.com](https://supabase.com) e ative **Anonymous sign-ins** em Authentication → Sign In / Providers. Os jogadores entram sem cadastro e escolhem um apelido. Vale ativar também um CAPTCHA contra abuso.
2. No terminal, na raiz do projeto:

   ```bash
   npx supabase login
   npx supabase init                                # cria supabase/config.toml (mantém migrations/ e functions/)
   npx supabase link --project-ref <id-do-projeto>
   npx supabase db push                             # tabelas, regras (RLS) e funções do placar
   npm run build:server-engine                      # empacota a engine para o servidor
   npx supabase functions deploy start-run submit-run
   ```

3. No `.env.local` do site, coloque as chaves públicas (Project Settings → API). A chave `service_role` nunca vai no jogo:

   ```bash
   VITE_SUPABASE_URL=https://<id-do-projeto>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon public key>
   ```

Se as duas estiverem configuradas, o site usa o servidor próprio (`VITE_LEADERBOARD_URL`).

Sempre que mudar as regras do jogo, aumente o `ENGINE_VERSION`, para o servidor não comparar partidas com regras diferentes. No Railway, o deploy seguinte já leva as regras novas. No Supabase, rode `npm run build:server-engine` e publique as funções de novo.

### 🛠️ Painel admin (`/admin`)

Uma página só para o time, em `https://<site>/admin` (fora do menu do jogo e dos buscadores). Ela tem quatro abas:

- **Roadmap:** para onde o jogo vai, o que já foi entregue (com os PRs) e as decisões tomadas. Os dados ficam em `src/admin/roadmap.ts`. Atualize esse arquivo no mesmo PR de cada entrega.
- **Placar:** os jogadores do placar global. Dá para trocar ou apagar um apelido, esconder um jogador do placar (ele continua jogando, só não aparece) e apagar uma partida suspeita.
- **Grafiteiros & DJs:** o cadastro dos artistas reais (grafite, DJ, MC e breaking), com cidade, Instagram, bio, cor, assinatura (PNG, WebP ou JPEG de até 300 KB), fase e pontuação mínima para aparecer. Os ativos saem em `GET /v1/artists`, que o jogo vai usar na próxima etapa.
- **Registro:** cada ação feita no painel, com o nome de quem fez.

Para entrar, cada pessoa do time usa a sua chave de admin, conferida pelo servidor do placar. Para criar as chaves:

1. Gere uma chave por pessoa (uma sequência aleatória longa, de 24 caracteres ou mais):

   ```bash
   node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
   ```

2. No Railway, no serviço do servidor, crie a variável `ADMIN_TOKENS` com `nome:chave`, separados por vírgula, e faça o deploy:

   ```bash
   ADMIN_TOKENS=luiz:<chave-do-luiz>,guime:<chave-do-guime>
   ```

3. Mande a chave para cada pessoa por um canal privado. A chave fica só na aba do navegador (fecha a aba, sai). Para tirar o acesso de alguém, remova a chave da variável.

Depois de 20 chaves erradas em 10 minutos, o mesmo endereço fica bloqueado por um tempo.

O painel usa [shadcn/ui](https://ui.shadcn.com) com Tailwind, só nele: é uma página separada (`admin.html`, código em `src/admin/`), e o CSS do jogo não muda. Para adicionar um componente, use `npx shadcn@latest add <componente>` (o `components.json` já aponta para `src/admin/components/ui`).

### Sprites do policial, do muro e do fogo

O policial (`src/assets/sprites/cop/`) veio de uma folha de sprites gerada por IA, convertida com o importador abaixo. O muro com a tag (`src/assets/sprites/intro/`) ainda é provisório: sai de `python3 scripts/make-intro-sprites.py` (precisa do Pillow), na mesma grade 50×50 do personagem. Esse script só recria o policial provisório antigo com `--placeholder-cop`, e isso apaga a arte atual. Para trocar qualquer sprite, desenhe por cima mantendo os nomes dos arquivos e rode `npm run sprites` dentro de `mobile/`.

Se a arte vier numa folha de sprites grande (por exemplo, gerada por IA), o importador converte para o formato do jogo. Ele tira o fundo chapado, recorta os quadros, reduz para 50×50 com os pés na mesma linha do personagem e limita a paleta:

```bash
python3 scripts/import-sprite-sheet.py ~/Downloads/policial.png   # 6 quadros lado a lado: correndo 1-4, gritando, agarrando
cd mobile && npm run sprites                                        # atualiza o app
```

O fogo do SLAM (`src/assets/sprites/fx/`) sai de `python3 scripts/make-fx-sprites.py`. O script usa o algoritmo do fogo do Doom (versão de PlayStation) com semente fixa, então gera sempre os mesmos quadros. Depois de mudar, rode `npm run sprites` dentro de `mobile/`.

## ✅ Testes

Todo PR é testado sozinho no GitHub (aba **Actions**, workflow `CI`). Se algo quebrar, o PR fica com um ✗ vermelho. O workflow roda:

- os tipos do site, dos testes e do app;
- o build do site e o do servidor do placar;
- as regras do jogo e o servidor do placar, com um Postgres de verdade;
- o site num navegador: celulares, um navegador que finge ter mouse (como o da Samsung), uma partida inteira e o painel admin.

No seu computador:

```bash
npm test                          # regras do jogo e dados (os testes do servidor pulam sem banco)
npx playwright install chromium   # só na primeira vez
npm run test:e2e                  # o site no navegador (monta o site e abre em http://127.0.0.1:4173)
```

Para incluir os testes do servidor, suba um Postgres de teste e passe o endereço dele. O nome do banco precisa ter "test", porque os testes apagam as tabelas:

```bash
docker run -d --name vandal-test-db -e POSTGRES_PASSWORD=test -e POSTGRES_DB=vandal_test -p 55432:5432 postgres:16-alpine
TEST_DATABASE_URL=postgres://postgres:test@localhost:55432/vandal_test npm test
```

- `tests/*.test.ts` (Vitest): engine, conferência das partidas, dados compartilhados, servidor do placar e o cliente do site.
- `tests/e2e/` (Playwright): botões de toque, navegador tipo Samsung, uma partida e o painel admin com um servidor simulado.
- Um robô (`tests/helpers/bot.ts`) joga partidas de verdade para os testes da engine e do servidor.

Para o GitHub só aceitar merge com os testes passando: **Settings → Branches → Add branch ruleset** na `main`, com "Require status checks to pass" marcando `Site e servidor` e `App Expo`.

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
