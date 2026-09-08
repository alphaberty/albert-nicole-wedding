import { useRef } from 'react'
import { chimeInput } from '../lib/hooks'

/**
 * Invisible pad over the landing chime.
 *  - Moving the pointer across it stirs the air (hover).
 *  - Dragging sideways spins the chime; dragging vertically swings it.
 *  - A plain click nudges it into a spin in the direction of the click.
 * `touch-action: pan-y` keeps ordinary vertical scrolling working on phones
 * because the browser still owns vertical pans.
 */
export function ChimeHitArea() {
  const last = useRef<{ x: number; y: number } | null>(null)
  const start = useRef<{ x: number; y: number } | null>(null)
  const dragging = useRef(false)
  const travelled = useRef(0)

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = true
    chimeInput.dragging = true
    last.current = { x: e.clientX, y: e.clientY }
    start.current = { x: e.clientX, y: e.clientY }
    travelled.current = 0
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const prev = last.current
    last.current = { x: e.clientX, y: e.clientY }
    if (!prev) return
    const dx = (e.clientX - prev.x) / window.innerWidth
    const dy = (e.clientY - prev.y) / window.innerHeight
    if (dragging.current) {
      travelled.current += Math.abs(e.clientX - prev.x) + Math.abs(e.clientY - prev.y)
      chimeInput.spinImpulse += dx * 5
      chimeInput.impulseX += dx * 2.4
      chimeInput.impulseZ += -dy * 1.8
    } else if (e.pointerType !== 'touch') {
      // Hover: a soft gust that follows the cursor.
      chimeInput.impulseX += dx * 2.2
      chimeInput.impulseZ += -dy * 1.1
    }
  }

  const end = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragging.current && start.current && travelled.current < 8) {
      // A click rather than a drag: push the whole chime away from the click so it sways, with a little spin.
      const rect = e.currentTarget.getBoundingClientRect()
      const side = (e.clientX - rect.left) / rect.width < 0.5 ? -1 : 1
      chimeInput.impulseX += side * 1.1
      chimeInput.impulseZ += 0.2
      chimeInput.spinImpulse += side * 0.7
    }
    dragging.current = false
    chimeInput.dragging = false
    last.current = null
    start.current = null
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
