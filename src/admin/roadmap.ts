/**
 * The project roadmap shown in the admin page (/admin → Roadmap). Update it in the same PR as
 * each change: mark items done with the PR number and date, add what comes next.
 */

export type Status = 'feito' | 'andamento' | 'proximo' | 'ideia'

export interface RoadmapItem {
  title: string
  status: Status
  detail?: string
  /** GitHub pull request that delivered it. */
  pr?: number
  /** When it was delivered (YYYY-MM-DD). */
  date?: string
}

export interface RoadmapPhase {
  id: string
  title: string
  goal: string
  items: RoadmapItem[]
}

export interface Decision {
  date: string
  title: string
  choice: string
  why: string
}

export const REPO_URL = 'https://github.com/Amad3eu/vandal-game'
export const ROADMAP_UPDATED = '2026-09-28'

export const VISION =
  'Um runner de plataforma em pixel art com a cultura hip-hop brasileira: grafite, DJs, MCs e breaking. Referência de ritmo no Subway Surfers, com cara de jogo indie. Primeiro um beta caprichado e monetizável com anúncios; depois jogadores de verdade, placar e artistas reais dentro do jogo.'

export const PHASES: RoadmapPhase[] = [
  {
    id: 'fundacao',
    title: 'Fundação',
    goal: 'Um runner jogável no navegador',
    items: [
      { title: 'Escudo de skate, contador de moedas e estatísticas no menu', status: 'feito', pr: 1, date: '2026-04-05' },
      { title: 'Plataformas de trem, animação de abaixar, power-ups e modal de parceria', status: 'feito', pr: 3, date: '2026-05-18' },
      {
        title: 'Modos Corrida e Livre (WASD), botões de toque e grafiteiros',
        status: 'feito',
        detail: 'Com rebalanceamento da dificuldade.',
        pr: 4,
        date: '2026-09-26',
      },
    ],
  },
  {
    id: 'app',
    title: 'App nativo',
    goal: 'O mesmo jogo no celular, como app',
    items: [
      { title: 'App com Expo (React Native) usando a mesma engine do site', status: 'feito', pr: 5, date: '2026-09-26' },
      { title: 'APK de teste para Android (EAS)', status: 'feito', detail: 'Passo a passo no README.', pr: 6, date: '2026-09-27' },
      { title: 'Placar global no app', status: 'proximo', detail: 'O cliente do servidor já está pronto para reaproveitar.' },
      { title: 'Anúncio recompensado no app (AdMob)', status: 'ideia', detail: 'Precisa de um build de desenvolvimento do EAS.' },
      { title: 'Publicar na Play Store', status: 'ideia' },
    ],
  },
  {
    id: 'beta',
    title: 'Beta indie',
    goal: 'Um beta caprichado, que dá para mostrar e monetizar',
    items: [
      {
        title: 'Checkpoint nas plataformas, abertura com o policial e visual Vandal UI',
        status: 'feito',
        pr: 6,
        date: '2026-09-27',
      },
      {
        title: 'Física em ticks fixos, replay de partidas e HUD novo',
        status: 'feito',
        detail: 'A mesma partida em qualquer tela: base do placar conferido pelo servidor.',
        pr: 7,
        date: '2026-09-27',
      },
      {
        title: 'Segunda chance com anúncio recompensado',
        status: 'feito',
        detail: 'Uma vez por bandeira; anúncios atrás de uma interface (nenhum, teste ou AdSense H5).',
        pr: 9,
        date: '2026-09-28',
      },
      { title: 'Importador de sprites e arte final do policial', status: 'feito', pr: 9, date: '2026-09-28' },
      {
        title: 'Mapa da rota estilo GPS e SLAM de skate com fogo do Doom',
        status: 'feito',
        detail: 'No site e no app.',
        pr: 10,
        date: '2026-09-28',
      },
      { title: 'Placar neste aparelho (10 melhores por modo)', status: 'feito', pr: 10, date: '2026-09-28' },
      {
        title: 'Botões de toque em qualquer celular',
        status: 'feito',
        detail: 'Corrigiu o navegador da Samsung e os botões atrás da barra do navegador.',
        pr: 10,
        date: '2026-09-28',
      },
      { title: 'Arte final do muro da abertura', status: 'proximo', detail: 'Hoje é provisória (scripts/make-intro-sprites.py).' },
    ],
  },
  {
    id: 'online',
    title: 'Online',
    goal: 'Jogadores de verdade, placar e cultura hip-hop vinda do servidor',
    items: [
      {
        title: 'Placar global no Railway',
        status: 'feito',
        detail: 'O servidor refaz cada partida com a mesma engine antes de ranquear.',
        pr: 12,
        date: '2026-09-28',
      },
      {
        title: 'Painel admin: roadmap, moderação do placar e registro',
        status: 'feito',
        detail: 'Renomear, esconder jogadores e apagar partidas; cada ação fica registrada com o nome do admin.',
        date: '2026-09-28',
      },
      {
        title: 'Cadastro de grafiteiros e DJs reais, com assinatura',
        status: 'feito',
        detail: 'Grafite, DJ, MC e breaking, com fase e pontuação mínima. O jogo passa a usar na próxima etapa.',
        date: '2026-09-28',
      },
      {
        title: 'O jogo encontra os artistas do servidor pela pontuação e fase',
        status: 'proximo',
        detail: 'Muda a engine (os encontros entram no replay), então vem numa versão nova das regras.',
      },
      { title: 'Conta que não se perde ao trocar de celular', status: 'ideia', detail: 'Ligar a conta anônima a um e-mail ou ao Google.' },
      {
        title: 'Jogar com gente de verdade',
        status: 'ideia',
        detail: 'Desafios entre amigos e "fantasmas": o servidor já guarda o replay de cada partida.',
      },
    ],
  },
  {
    id: 'publicacao',
    title: 'Publicação e monetização',
    goal: 'Levar o jogo para mais gente e pagar os custos',
    items: [
      { title: 'Anúncios AdSense H5 no site', status: 'proximo', detail: 'Depende da aprovação da conta no programa de jogos do Google.' },
      { title: 'Consentimento e privacidade (LGPD) antes dos anúncios de verdade', status: 'proximo' },
      { title: 'Versão para GX.games (Opera GX)', status: 'ideia' },
      { title: 'Portais de jogos (CrazyGames, Poki)', status: 'ideia', detail: 'Cada um com o SDK de anúncios próprio.' },
    ],
  },
  {
    id: 'conteudo',
    title: 'Conteúdo',
    goal: 'Mais cultura hip-hop dentro do jogo',
    items: [
      { title: 'Fases novas depois dos Telhados', status: 'ideia' },
      { title: 'Trilha com DJs por fase', status: 'ideia' },
      { title: 'Batalhas de MCs e rodas de breaking como eventos', status: 'ideia' },
      { title: 'Visual do personagem: bonés, tênis e latas', status: 'ideia' },
    ],
  },
]

export const DECISIONS: Decision[] = [
  {
    date: '2026-09-28',
    title: 'Painel admin separado do jogo',
    choice: 'Página /admin com shadcn/ui e Tailwind, só para o time.',
    why: 'O CSS do painel não encosta no visual do jogo, e a moderação passa pelo servidor com uma chave por pessoa.',
  },
  {
    date: '2026-09-28',
    title: 'Servidor do placar no Railway',
    choice: 'Node + Postgres próprio; a versão Supabase fica pronta e desligada como alternativa.',
    why: 'Um servidor simples, com custo previsível e a mesma conferência de partidas nas duas versões.',
  },
  {
    date: '2026-09-27',
    title: 'Placar do aparelho primeiro, global depois',
    choice: 'Melhores partidas guardadas no aparelho; o placar global veio em seguida.',
    why: 'Dava para lançar o beta sem depender de servidor.',
  },
  {
    date: '2026-09-27',
    title: 'O servidor refaz cada partida',
    choice: 'Física em ticks fixos, semente dada pelo servidor e replay das entradas.',
    why: 'O placar não pode confiar na pontuação que o aparelho manda.',
  },
  {
    date: '2026-09-27',
    title: 'Só um tipo de anúncio: o recompensado',
    choice: 'A segunda chance custa um anúncio; nada interrompe a partida.',
    why: 'Monetizar sem estragar o jogo.',
  },
  {
    date: '2026-09-26',
    title: 'App com Expo reaproveitando a engine',
    choice: 'As regras ficam em src/game, sem React nem navegador; site e app só desenham.',
    why: 'Um jogo, dois front ends, sem duplicar regras.',
  },
]
