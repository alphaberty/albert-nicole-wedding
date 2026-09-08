import { useRef } from 'react'
import { chimeInput } from '../lib/hooks'

/**
 * Invisible pad over the landing chime. Horizontal drags spin the chime and
 * pointer movement stirs the air. `touch-action: pan-y` keeps ordinary vertical
 * scrolling working on phones because the browser still owns vertical pans.
 */
export function ChimeHitArea() {
  const last = useRef<{ x: number; y: number; t: number } | null>(null)
  const dragging = useRef(false)

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = true
    chimeInput.dragging = true
    last.current = { x: e.clientX, y: e.clientY, t: e.timeStamp }
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const prev = last.current
    last.current = { x: e.clientX, y: e.clientY, t: e.timeStamp }
    if (!prev) return
    const dx = (e.clientX - prev.x) / window.innerWidth
    const dy = (e.clientY - prev.y) / window.innerHeight
    if (dragging.current) {
      chimeInput.spinImpulse += dx * 9
      chimeInput.impulseX += dx * 2.2
      chimeInput.impulseZ += -dy * 1.2
    } else if (e.pointerType !== 'touch') {
      chimeInput.impulseX += dx * 1.4
      chimeInput.impulseZ += -dy * 0.7
    }
  }

  const end = (e: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = false
    chimeInput.dragging = false
    last.current = null
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
  }

  return (
    <div
      className="chime-hit"
      aria-hidden="true"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={end}
      onPointerLeave={(e) => {
        if (!dragging.current) last.current = null
        else end(e)
      }}
    />
  )
}
