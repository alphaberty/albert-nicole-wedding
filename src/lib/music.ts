import { music as musicConfig } from '../config/wedding'

/**
 * Optional looping background track. It only starts from the same tap that
 * enables sound (browsers require a user gesture), fades in gently, and
 * follows the mute toggle. With no `src` configured it does nothing.
 */
class BackgroundMusic {
  private el: HTMLAudioElement | null = null
  private fadeTimer: number | null = null

  get configured(): boolean {
    return Boolean(musicConfig.src)
  }

  private url(): string {
    const src = musicConfig.src
    if (/^(https?:)?\/\//.test(src) || src.startsWith('/')) return src
    return import.meta.env.BASE_URL + src.replace(/^\.?\//, '')
  }

  /** Call synchronously inside a click/tap handler. */
  start() {
    if (!this.configured) return
    if (!this.el) {
      this.el = new Audio(this.url())
      this.el.loop = true
      this.el.preload = 'auto'
      this.el.volume = 0
    }
    const el = this.el
    el.muted = false
    el.play()
      .then(() => this.fadeTo(musicConfig.volume, 2500))
      .catch(() => {
        /* autoplay refused; the mute toggle will try again */
      })
  }

  /** Briefly lower the music so a chime strike rings through, then recover. */
  duck(strength: number) {
    const el = this.el
    if (!el || el.paused) return
    const floor = musicConfig.volume * (0.45 - 0.2 * Math.min(1, strength))
    if (el.volume > floor) el.volume = floor
    this.fadeTo(musicConfig.volume, 1400)
  }

  setMuted(muted: boolean) {
    if (!this.el) {
      if (!muted) this.start()
      return
    }
    this.el.muted = muted
    if (!muted && this.el.paused) void this.el.play().catch(() => {})
  }

  private fadeTo(target: number, ms: number) {
    const el = this.el
    if (!el) return
    if (this.fadeTimer) window.clearInterval(this.fadeTimer)
    const startVol = el.volume
    const startAt = performance.now()
    this.fadeTimer = window.setInterval(() => {
      const t = Math.min(1, (performance.now() - startAt) / ms)
      el.volume = startVol + (target - startVol) * t
      if (t >= 1 && this.fadeTimer) {
        window.clearInterval(this.fadeTimer)
        this.fadeTimer = null
      }
    }, 50)
  }
}

export const backgroundMusic = new BackgroundMusic()
