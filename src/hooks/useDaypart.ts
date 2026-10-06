import { useSyncExternalStore } from 'react'
import { daypartForHour } from '#/lib/daypart'
import type { Daypart } from '#/lib/daypart'

// Re-check once a minute so the label flips when the clock crosses a boundary.
function subscribe(cb: () => void) {
  const id = setInterval(cb, 60_000)
  return () => clearInterval(id)
}

/**
 * Part of the day in the viewer's own time zone. The server doesn't know it, so SSR
 * and hydration use 'night' ("Tonight's feature"); the client then swaps in the real value.
 */
export function useDaypart(): Daypart {
  return useSyncExternalStore(
    subscribe,
    () => daypartForHour(new Date().getHours()),
    () => 'night',
  )
}
