import { PHASES } from './shared'

// Colors from the web version's CSS.
export const COLORS = {
  sky: '#87ceeb',
  primary: '#667eea',
  primaryDark: '#764ba2',
  text: '#333333',
  muted: '#666666',
  card: '#ffffff',
  panel: '#f5f5f5',
  danger: '#ff6b6b',
  ground: '#676d78',
  groundEdge: '#b6bcc6',
  groundNight: '#3f4653',
  groundEdgeNight: '#8f98aa',
}

// Vandal UI (same as the web's :root in index.css): street stickers over pixel art.
export const UI = {
  ink: '#140f1f',
  night: '#1f1147',
  night2: '#2d1b63',
  paper: '#fff6e5',
  pink: '#ff4d9d',
  yellow: '#ffd23f',
  cyan: '#4ecdc4',
  green: '#34d399',
  mutedInk: '#5b5170',
  chip: '#3b3150',
  lilac: '#d9d2ea',
}

// Loaded in App.tsx with expo-font; until then (or if loading fails) the system font shows.
export const FONTS = {
  tag: 'SedgwickAveDisplay_400Regular',
  display: 'Bungee_400Regular',
  pixel: 'Silkscreen_400Regular',
}

const phaseLabel = (phase: 1 | 2 | 3) => `${PHASES[phase].emoji} ${phase} · ${PHASES[phase].name}`

export const PHASE_TAGS: Record<1 | 2 | 3, { label: string; background: string; color: string }> = {
  1: { label: phaseLabel(1), background: '#ffedd5', color: '#9a3412' },
  2: { label: phaseLabel(2), background: '#dbeafe', color: '#1e3a8a' },
  3: { label: phaseLabel(3), background: '#2e1065', color: '#f5d0fe' },
}
