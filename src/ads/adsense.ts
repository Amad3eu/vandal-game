import type { AdsProvider, RewardResult } from './ads'

/**
 * Google H5 Games Ads (AdSense for games) with the Ad Placement API: adConfig/adBreak.
 * https://developers.google.com/ad-placement/apis/adbreak
 * Needs an approved AdSense account on your own domain; `test` shows Google's test ads.
 * Not used by portals (CrazyGames, Poki, GX.games), which bring their own SDK or no ads.
 */
interface AdBreakDoneInfo {
  breakStatus?: string
}

interface AdBreakOptions {
  type: 'reward'
  name: string
  beforeAd?: () => void
  afterAd?: () => void
  beforeReward?: (showAdFn: () => void) => void
  adDismissed?: () => void
  adViewed?: () => void
  adBreakDone?: (info: AdBreakDoneInfo) => void
}

type AdPlacementWindow = Window & {
  adsbygoogle?: unknown[]
  adBreak?: (options: AdBreakOptions) => void
  adConfig?: (options: Record<string, unknown>) => void
}

function loadScript(client: string, test: boolean) {
  const w = window as AdPlacementWindow
  if (w.adBreak) return
  const script = document.createElement('script')
  script.async = true
  script.crossOrigin = 'anonymous'
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`
  if (test) script.dataset.adbreakTest = 'on'
  document.head.appendChild(script)
  // Official bootstrap: calls are queued until the library loads.
  w.adsbygoogle = w.adsbygoogle || []
  const push = (options: object) => (w.adsbygoogle as unknown[]).push(options)
  w.adBreak = push
  w.adConfig = push
  w.adConfig({ preloadAdBreaks: 'on', sound: 'on' })
}

export function createAdsenseProvider(client: string, test: boolean): AdsProvider {
  loadScript(client, test)
  return {
    name: 'adsense',
    rewardedEnabled: true,
    showRewarded: (placement) =>
      new Promise<RewardResult>((resolve) => {
        let settled = false
        const settle = (result: RewardResult) => {
          if (settled) return
          settled = true
          resolve(result)
        }
        const w = window as AdPlacementWindow
        if (!w.adBreak) return settle('unavailable')
        w.adBreak({
          type: 'reward',
          name: placement,
          beforeReward: (showAdFn) => showAdFn(), // the player already chose to watch
          adDismissed: () => settle('skipped'),
          adViewed: () => settle('rewarded'),
          // No ad (not ready, capped, blocked): no reward was offered.
          adBreakDone: (info) => settle(info?.breakStatus === 'viewed' ? 'rewarded' : 'unavailable'),
        })
      }),
  }
}
