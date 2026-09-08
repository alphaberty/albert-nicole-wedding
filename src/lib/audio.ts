import { useSyncExternalStore } from 'react'

/**
 * Synthesised wind-chime tones (no audio files). Each strike layers a few
 * inharmonic partials, the way a struck tube rings, with a fast attack and a
 * long natural decay. Voices are limited so gusts never become a wall of sound.
 */

export interface AudioState {
  enabled: boolean
  muted: boolean
}

// Pentatonic tuning (C5 D5 E5 G5 A5): any two tubes sound pleasant together.
const TUBE_FREQUENCIES = [523.25, 587.33, 659.25, 783.99, 880.0]
const PARTIALS = [
  { ratio: 1, gain: 1, decay: 3.2 },
  { ratio: 2.76, gain: 0.32, decay: 1.6 },
  { ratio: 5.4, gain: 0.1, decay: 0.8 },
  { ratio: 8.93, gain: 0.04, decay: 0.45 },
]
const MASTER_LEVEL = 0.38
const MAX_VOICES = 6
const GLOBAL_MIN_GAP = 0.06
const TUBE_MIN_GAP = 0.16

class ChimeAudio {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private listeners = new Set<() => void>()
  private state: AudioState = { enabled: false, muted: false }
  private lastStrike = -1
  private lastTubeStrike: number[] = []
  private activeVoices = 0

  getState = () => this.state

  subscribe = (fn: () => void) => {
    this.listeners.add(fn)
    return () => {
      this.listeners.delete(fn)
    }
  }

  private emit(next: Partial<AudioState>) {
    this.state = { ...this.state, ...next }
    this.listeners.forEach((fn) => fn())
  }

  /** Must be called from a user gesture (click / tap). */
  async enable() {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return
      this.ctx = new Ctor()
      const compressor = this.ctx.createDynamicsCompressor()
      compressor.threshold.value = -18
      compressor.knee.value = 12
      compressor.ratio.value = 4
      compressor.attack.value = 0.003
      compressor.release.value = 0.25
      this.master = this.ctx.createGain()
      this.master.gain.value = MASTER_LEVEL
      this.master.connect(compressor)
      compressor.connect(this.ctx.destination)
    }
    try {
      await this.ctx.resume()
    } catch {
      /* ignore */
    }
    this.emit({ enabled: true, muted: false })
    // A small greeting so guests hear that sound is on.
    this.strike(2, 0.5)
    window.setTimeout(() => this.strike(4, 0.35), 180)
  }

  toggleMute() {
    if (!this.ctx || !this.master) return
    const muted = !this.state.muted
    this.master.gain.setTargetAtTime(muted ? 0 : MASTER_LEVEL, this.ctx.currentTime, 0.03)
    this.emit({ muted })
  }

  /**
   * @param tube     index of the tube that was hit
   * @param velocity 0..1 how hard it was hit
   */
  strike(tube: number, velocity: number) {
    const ctx = this.ctx
    const master = this.master
    if (!ctx || !master || !this.state.enabled || this.state.muted) return
    if (ctx.state !== 'running') return
    const now = ctx.currentTime
    if (now - this.lastStrike < GLOBAL_MIN_GAP) return
    if (now - (this.lastTubeStrike[tube] ?? -1) < TUBE_MIN_GAP) return
    if (this.activeVoices >= MAX_VOICES) return

    this.lastStrike = now
    this.lastTubeStrike[tube] = now
    this.activeVoices += 1

    const base = TUBE_FREQUENCIES[tube % TUBE_FREQUENCIES.length]
    const v = Math.min(1, Math.max(0, velocity))
    const level = 0.06 + 0.3 * v
    const voice = ctx.createGain()
    voice.gain.value = 1
    voice.connect(master)

    let longest = 0
    PARTIALS.forEach((p, i) => {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = base * p.ratio
      osc.detune.value = i === 0 ? 0 : (Math.random() - 0.5) * 6
      const g = ctx.createGain()
      const peak = level * p.gain * (i === 0 ? 1 : 0.6 + 0.4 * v)
      const decay = p.decay * (0.7 + 0.3 * v)
      g.gain.setValueAtTime(0.0001, now)
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), now + 0.006)
      g.gain.exponentialRampToValueAtTime(0.0001, now + decay)
      osc.connect(g)
      g.connect(voice)
      osc.start(now)
      osc.stop(now + decay + 0.05)
      longest = Math.max(longest, decay)
    })

    window.setTimeout(
      () => {
        this.activeVoices = Math.max(0, this.activeVoices - 1)
        voice.disconnect()
      },
      (longest + 0.1) * 1000,
    )
  }
}

export const chimeAudio = new ChimeAudio()

export function useChimeAudio(): AudioState {
  return useSyncExternalStore(chimeAudio.subscribe, chimeAudio.getState, chimeAudio.getState)
}
