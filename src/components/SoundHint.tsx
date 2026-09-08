import { useEffect, useState } from 'react'

const SEEN_KEY = 'wedding-sound-hint-seen'

/**
 * A quiet, self-dismissing note on touch devices: sound starts on the first
 * tap, but phones on silent will still play nothing. It is not a modal; it
 * never blocks anything and fades away on its own.
 */
export function SoundHint() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!window.matchMedia('(pointer: coarse)').matches) return
    try {
      if (sessionStorage.getItem(SEEN_KEY)) return
    } catch {
      /* ignore */
    }
    const show = window.setTimeout(() => setVisible(true), 900)
    const hide = window.setTimeout(() => setVisible(false), 9000)
    return () => {
      window.clearTimeout(show)
      window.clearTimeout(hide)
    }
  }, [])

  useEffect(() => {
    if (!visible) return
    try {
      sessionStorage.setItem(SEEN_KEY, '1')
    } catch {
      /* ignore */
    }
  }, [visible])

  return (
    <div className={`sound-hint ${visible ? 'is-visible' : ''}`} role="status" aria-live="polite" aria-hidden={!visible}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 9.5v5h3.5L13 19V5L7.5 9.5H4z" />
        <path d="M16.5 8.8a4.5 4.5 0 0 1 0 6.4" />
        <path d="M19 6.2a8 8 0 0 1 0 11.6" />
      </svg>
      <span>Best with sound on. Switch your phone off silent for the chimes.</span>
      <button type="button" className="sound-hint__close" aria-label="Dismiss" onClick={() => setVisible(false)}>
        ×
      </button>
    </div>
  )
}
