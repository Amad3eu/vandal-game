/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Ads network for the site: 'none' (default), 'dev' (fake test ad) or 'adsense' (H5 Games Ads). */
  readonly VITE_ADS?: string
  /** AdSense publisher id (ca-pub-...), needed by VITE_ADS=adsense. */
  readonly VITE_ADSENSE_CLIENT?: string
  /** 'on' shows Google's test ads instead of real ones (use it on localhost and in previews). */
  readonly VITE_ADSENSE_TEST?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
