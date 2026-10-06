import { useRef } from 'react'
import type { PointerEvent } from 'react'
import type { Dir } from '#/hooks/useKeyDirection'

const THRESHOLD = 24

/** Spread the returned handlers on the swipe surface. Pure handlers, no Effect needed. */
export function useSwipe(onDir: (dir: Dir) => void) {
  const start = useRef<{ x: number; y: number } | null>(null)
  return {
    onPointerDown: (e: PointerEvent) => {
      start.current = { x: e.clientX, y: e.clientY }
    },
    onPointerUp: (e: PointerEvent) => {
      const s = start.current
      start.current = null
      if (!s) return
      const dir = swipeDirection(e.clientX - s.x, e.clientY - s.y)
      if (dir) onDir(dir)
    },
    onPointerCancel: () => {
      start.current = null
    },
  }
}

export function swipeDirection(dx: number, dy: number): Dir | null {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < THRESHOLD) return null
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left'
  return dy > 0 ? 'down' : 'up'
}
