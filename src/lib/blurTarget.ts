import type { MouseEvent } from 'react'

/** Drop focus from the pressed control so a later Enter/Space can't re-trigger it (e.g. behind the loader). */
export function blurTarget(e: MouseEvent<HTMLElement>) {
  e.currentTarget.blur()
}
