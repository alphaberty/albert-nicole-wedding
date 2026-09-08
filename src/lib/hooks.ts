import { useEffect, useState } from 'react'

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

export function webglAvailable(): boolean {
  try {
    if (new URLSearchParams(window.location.search).has('noWebGL')) return false
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
    return Boolean(gl)
  } catch {
    return false
  }
}

/** Shared, mutable pointer/drag input consumed by the 3D scene each frame. */
export const chimeInput = {
  /** Wind impulse accumulated since the last frame (scene units). */
  impulseX: 0,
  impulseZ: 0,
  /** Spin impulse from horizontal dragging. */
  spinImpulse: 0,
  /** Pointer position normalised to -1..1 (for parallax). */
  pointerX: 0,
  pointerY: 0,
  /** One-shot celebration nudge. */
  celebrate: false,
  dragging: false,
}
