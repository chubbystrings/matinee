import { useEffect, useEffectEvent } from 'react'

/** Calls `callback` every `delay` ms; pass `null` to pause. Always cleans up. */
export function useInterval(callback: () => void, delay: number | null) {
  const tick = useEffectEvent(callback)
  useEffect(() => {
    if (delay === null) return
    const id = setInterval(tick, delay)
    return () => clearInterval(id)
  }, [delay])
}
