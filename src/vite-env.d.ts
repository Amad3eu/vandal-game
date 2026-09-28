/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Ads network for the site: 'none' (default), 'dev' (fake test ad) or 'adsense' (H5 Games Ads). */
  readonly VITE_ADS?: string
  /** AdSense publisher id (ca-pub-...), needed by VITE_ADS=adsense. */
  readonly VITE_ADSENSE_CLIENT?: string
  /** 'on' shows Google's test ads instead of real ones (use it on localhost and in previews). */
  readonly VITE_ADSENSE_TEST?: string
  /** Online leaderboard on our own server (server/leaderboard, e.g. on Railway): its address. */
  readonly VITE_LEADERBOARD_URL?: string
  /** Or on Supabase: project URL and public anon key. Without either the game is offline. */
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  /** 'dev' uses a fake, local leaderboard instead (also `?online=dev` in the URL). */
  readonly VITE_ONLINE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
