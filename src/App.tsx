import { Component, Suspense, lazy, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ResponseProvider, useResponse } from './lib/store'
import { chimeInput, useReducedMotion, webglAvailable } from './lib/hooks'
import { SECTION } from './scene/sections'
import { StaticChime } from './scene/StaticChime'
import { Botanicals } from './components/Botanicals'
import { chimeAudio } from './lib/audio'
import { Progress } from './components/Progress'
import { SoundHint } from './components/SoundHint'
import {
  AfterPartyStep,
  EmailStep,
  Landing,
  MealStep,
  NameStep,
  ReviewStep,
  ThankYou,
} from './components/Sections'

// The 3D layer is loaded after the form so guests can start immediately.
const Scene = lazy(() => import('./scene/Scene').then((m) => ({ default: m.Scene })))

class SceneBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    this.props.onError()
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

export type GoTo = (index: number) => void

function Experience() {
  const reduced = useReducedMotion()
  const [webgl, setWebgl] = useState(() => webglAvailable())
  const [active, setActive] = useState(0)
  const [typing, setTyping] = useState(false)
  const mainRef = useRef<HTMLElement>(null)
  const sectionRefs = useRef<(HTMLElement | null)[]>([])
  const { status, saved } = useResponse()
  const success = status === 'success' && saved !== null

  const register = useCallback((index: number) => (el: HTMLElement | null) => {
    sectionRefs.current[index] = el
  }, [])

  const goTo = useCallback<GoTo>(
    (index) => {
      const el = sectionRefs.current[index]
      if (!el) return
      el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
      const heading = el.querySelector<HTMLElement>('h1, h2')
      heading?.focus({ preventScroll: true })
    },
    [reduced],
  )

  // Track which full-page scene is in view.
  useEffect(() => {
    const root = mainRef.current
    if (!root) return
    const sections = sectionRefs.current.filter(Boolean) as HTMLElement[]
    const observer = new IntersectionObserver(
      (entries) => {
        let best: { index: number; ratio: number } | null = null
        for (const entry of entries) {
          const index = Number((entry.target as HTMLElement).dataset.index)
          if (entry.isIntersecting && (!best || entry.intersectionRatio > best.ratio)) {
            best = { index, ratio: entry.intersectionRatio }
          }
        }
        if (best && best.ratio >= 0.45) setActive(best.index)
      },
      { root, threshold: [0.45, 0.6, 0.8] },
    )
    sections.forEach((s) => observer.observe(s))
    return () => observer.disconnect()
  }, [success])

  // Faint breeze from any pointer movement, plus parallax input.
  useEffect(() => {
    let lastX = 0
    let lastY = 0
    let has = false
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      const nx = (e.clientX / window.innerWidth) * 2 - 1
      const ny = -((e.clientY / window.innerHeight) * 2 - 1)
      chimeInput.pointerX = nx
      chimeInput.pointerY = ny
      if (has && !chimeInput.dragging) {
        const dx = (e.clientX - lastX) / window.innerWidth
        const dy = (e.clientY - lastY) / window.innerHeight
        chimeInput.impulseX += dx * 0.5
        chimeInput.impulseZ += -dy * 0.25
      }
      lastX = e.clientX
      lastY = e.clientY
      has = true
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  // Sound is on by default. Browsers only allow audio after a user gesture, so
  // it starts silently on the first tap, click or key press anywhere.
  useEffect(() => {
    const unlock = () => {
      void chimeAudio.enable()
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
      window.removeEventListener('touchend', unlock)
    }
    window.addEventListener('pointerdown', unlock, { passive: true })
    window.addEventListener('keydown', unlock)
    window.addEventListener('touchend', unlock, { passive: true })
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
      window.removeEventListener('touchend', unlock)
    }
  }, [])

  // After a confirmed save, reveal the thank-you scene and move to it.
  useEffect(() => {
    if (!success) return
    chimeInput.celebrate = true
    const id = window.requestAnimationFrame(() => goTo(SECTION.thanks))
    return () => window.cancelAnimationFrame(id)
  }, [success, goTo])

  const onFocusIn = (e: React.FocusEvent) => {
    const t = e.target as HTMLElement
    if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') setTyping(true)
  }
  const onFocusOut = (e: React.FocusEvent) => {
    const t = e.target as HTMLElement
    if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') setTyping(false)
  }

  return (
    <div className="app" data-section={active} data-webgl={webgl ? 'on' : 'off'}>
      <div className="scene" aria-hidden="true">
        {webgl ? (
          <SceneBoundary onError={() => setWebgl(false)}>
            <Suspense fallback={null}>
              <Scene section={active} reduced={reduced} onError={() => setWebgl(false)} />
            </Suspense>
          </SceneBoundary>
        ) : (
          <StaticChime />
        )}
      </div>
      <Botanicals />
      <Progress active={active} goTo={goTo} />
      <SoundHint />

      <main className="flow" ref={mainRef} data-typing={typing} onFocus={onFocusIn} onBlur={onFocusOut}>
        <Landing register={register(SECTION.landing)} goTo={goTo} />
        <MealStep register={register(SECTION.meal)} goTo={goTo} />
        <AfterPartyStep register={register(SECTION.afterParty)} goTo={goTo} />
        <NameStep register={register(SECTION.name)} goTo={goTo} />
        <EmailStep register={register(SECTION.email)} goTo={goTo} />
        <ReviewStep register={register(SECTION.review)} goTo={goTo} />
        {success && <ThankYou register={register(SECTION.thanks)} goTo={goTo} reduced={reduced} />}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <ResponseProvider>
      <Experience />
    </ResponseProvider>
  )
}
