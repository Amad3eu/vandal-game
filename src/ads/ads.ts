/**
 * Ads behind one small interface, so the game doesn't depend on any network: the site can use
 * Google's H5 Games Ads (AdSense), a portal SDK later (CrazyGames, Poki), or nothing at all.
 * The only placement is a rewarded ad for the second chance: continuing from a checkpoint.
 *
 * Pick the network with VITE_ADS (see README); `?ads=dev` in the URL forces the fake test ad.
 */
import { createAdsenseProvider } from './adsense'
import { createDevProvider } from './dev'

/** How a rewarded ad ended: watched to the end, closed early, or no ad could be shown. */
export type RewardResult = 'rewarded' | 'skipped' | 'unavailable'

export type AdPlacement = 'continue-checkpoint'

export interface AdsProvider {
  readonly name: 'none' | 'dev' | 'adsense'
  /** Whether rewarded ads are set up (the menu then says the second chance costs an ad). */
  readonly rewardedEnabled: boolean
  /** Shows a rewarded ad; resolves when it's over. Never rejects. */
  showRewarded(placement: AdPlacement): Promise<RewardResult>
}

const noAds: AdsProvider = {
  name: 'none',
  rewardedEnabled: false,
  showRewarded: async () => 'unavailable',
}

let provider: AdsProvider | null = null

export function getAdsProvider(): AdsProvider {
  if (provider) return provider
  const forced = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('ads') : null
  const choice = forced ?? import.meta.env.VITE_ADS ?? 'none'
  if (choice === 'dev') provider = createDevProvider()
  else if (choice === 'adsense' && import.meta.env.VITE_ADSENSE_CLIENT) {
    provider = createAdsenseProvider(import.meta.env.VITE_ADSENSE_CLIENT, import.meta.env.VITE_ADSENSE_TEST === 'on')
  } else provider = noAds
  return provider
}
