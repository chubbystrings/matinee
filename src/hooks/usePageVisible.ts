import { useSyncExternalStore } from 'react'

function subscribe(cb: () => void) {
  document.addEventListener('visibilitychange', cb)
  return () => document.removeEventListener('visibilitychange', cb)
}

/** True while the tab is visible. */
export function usePageVisible() {
  return useSyncExternalStore(
    subscribe,
    () => document.visibilityState !== 'hidden',
    () => true,
  )
}
