import type { AdsProvider, RewardResult } from './ads'

const FAKE_AD_MS = 3000

/**
 * A fake rewarded ad for testing the flow without any ad account: a full-screen card with a
 * countdown. Watching to the end rewards, closing early doesn't. Plain DOM, no React needed.
 */
export function createDevProvider(): AdsProvider {
  return {
    name: 'dev',
    rewardedEnabled: true,
    showRewarded: () =>
      new Promise<RewardResult>((resolve) => {
        const overlay = document.createElement('div')
        overlay.className = 'street-backdrop dev-ad'
        overlay.setAttribute('role', 'dialog')
        overlay.setAttribute('aria-label', 'Anúncio de teste')
        overlay.innerHTML = `
          <div class="paper-panel dev-ad-card">
            <span class="dev-ad-kicker">Anúncio de teste</span>
            <strong class="dev-ad-title">Seu anúncio aqui</strong>
            <span class="dev-ad-count" data-testid="dev-ad-count">${Math.ceil(FAKE_AD_MS / 1000)}</span>
            <button type="button" class="sticker-btn is-small is-ghost dev-ad-close">Fechar anúncio</button>
          </div>`
        document.body.appendChild(overlay)
        const count = overlay.querySelector<HTMLElement>('.dev-ad-count')!
        const started = Date.now()
        const finish = (result: RewardResult) => {
          window.clearInterval(timer)
          overlay.remove()
          resolve(result)
        }
        const timer = window.setInterval(() => {
          const left = FAKE_AD_MS - (Date.now() - started)
          if (left <= 0) finish('rewarded')
          else count.textContent = String(Math.ceil(left / 1000))
        }, 100)
        overlay.querySelector('.dev-ad-close')!.addEventListener('click', () => finish('skipped'))
      }),
  }
}
