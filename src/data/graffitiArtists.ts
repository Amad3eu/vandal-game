import type { GraffitiArtist, GraffitiArtistInfo } from '../types/game'

// Shared by the web and mobile versions.
export const ARTIST_INFO: Record<GraffitiArtist, GraffitiArtistInfo> = {
  remo: {
    name: 'Remo',
    color: '#FF6B6B',
    description: 'Yo! Eu sou o Remo, mestre das cores quentes. Meu estilo é agressivo e vibrante!',
  },
  pixo: {
    name: 'Pixo',
    color: '#4ECDC4',
    description: 'Opa! Sou o Pixo, artista das formas clean. Meu traço é preciso e geométrico.',
  },
  nina: {
    name: 'Nina',
    color: '#FFE66D',
    description: 'E aí? Eu sou a Nina, rainha dos detalhes. Minha arte é pura criatividade!',
  },
}
