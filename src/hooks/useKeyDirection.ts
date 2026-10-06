import { useEffect, useEffectEvent } from 'react'

export type Dir = 'up' | 'down' | 'left' | 'right'

const KEYS: Partial<Record<string, Dir>> = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  w: 'up', s: 'down', a: 'left', d: 'right',
  W: 'up', S: 'down', A: 'left', D: 'right',
}

/** Arrows / WASD → direction. Prevents page scroll for handled keys. */
export function useKeyDirection(onDir: (dir: Dir) => void) {
  const handle = useEffectEvent(onDir)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const dir = KEYS[e.key]
      if (!dir || e.metaKey || e.ctrlKey || e.altKey) return
      e.preventDefault()
      handle(dir)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
