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

export const PHASE_TAGS: Record<1 | 2 | 3, { label: string; background: string; color: string }> = {
  1: { label: '🌇 1 · Rua', background: '#ffedd5', color: '#9a3412' },
  2: { label: '🚇 2 · Metrô', background: '#dbeafe', color: '#1e3a8a' },
  3: { label: '🌃 3 · Telhados', background: '#2e1065', color: '#f5d0fe' },
}
