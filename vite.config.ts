import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const path = (file: string) => fileURLToPath(new URL(file, import.meta.url))

/** /admin opens the admin page in `vite` and `vite preview` too (on Vercel it's a rewrite in vercel.json). */
const adminPage = (): Plugin => {
  const rewrite = (req: { url?: string }, _res: unknown, next: () => void) => {
    if (req.url === '/admin' || req.url?.startsWith('/admin?')) req.url = req.url.replace('/admin', '/admin.html')
    next()
  }
  return {
    name: 'admin-page',
    configureServer: (server) => void server.middlewares.use(rewrite),
    configurePreviewServer: (server) => void server.middlewares.use(rewrite),
  }
}

export default defineConfig({
  // Tailwind is only used by the admin page (src/admin/admin.css); the game keeps its own CSS.
  plugins: [react(), tailwindcss(), adminPage()],
  resolve: {
    alias: { '@': path('./src') },
  },
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      // The game, and the admin page (/admin: roadmap, leaderboard moderation, artists and DJs).
      input: { main: path('./index.html'), admin: path('./admin.html') },
    },
  },
})
