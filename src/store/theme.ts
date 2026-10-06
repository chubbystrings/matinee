import { useSyncExternalStore } from 'react'

export type Theme = 'dark' | 'light'
export const THEME_KEY = 'matinee.theme'

const listeners = new Set<() => void>()

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

// The inline <head> script sets data-theme before hydration; the DOM is the source of truth.
export function getTheme(): Theme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}

export function setTheme(next: Theme) {
  document.documentElement.dataset.theme = next
  try {
    localStorage.setItem(THEME_KEY, next)
  } catch {
    // storage unavailable (private mode): theme still applies for this session
  }
  listeners.forEach((l) => l())
}

export function toggleTheme() {
  setTheme(getTheme() === 'dark' ? 'light' : 'dark')
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, getTheme, () => 'dark')
}

/** Runs before hydration. Dark by default; never follows prefers-color-scheme. */
export const THEME_INIT_SCRIPT = `try{if(localStorage.getItem('${THEME_KEY}')==='light')document.documentElement.dataset.theme='light'}catch(e){}`
