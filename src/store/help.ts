import { useEffect } from 'react'
import { create } from 'zustand'
import type { GameId } from '#/games/types'

export type HelpTab = 'rules' | 'controls' | 'tips'

/** Matches the closing animation (.18s). The game resumes after the sheet has unmounted. */
export const HELP_CLOSE_MS = 180

type HelpState = {
  /** The game the sheet is about; null = closed (the sheet unmounts, and a paused game resumes). */
  id: GameId | null
  tab: HelpTab
  closing: boolean
  /** Footer line, set when opening paused something. */
  pausedText: string | null
  open: (id: GameId) => void
  close: () => void
  toggle: (id: GameId) => void
  setTab: (tab: HelpTab) => void
}

/**
 * What a game would say if the sheet opened right now and paused something, or null.
 * Games keep it current with `usePauseNote`; `open` reads it, so the footer reflects the moment of opening.
 */
export const pauseNote: { current: string | null } = { current: null }

let closeTimer: ReturnType<typeof setTimeout> | undefined

export const useHelp = create<HelpState>()((set, get) => ({
  id: null,
  tab: 'rules',
  closing: false,
  pausedText: null,
  open: (id) => {
    if (get().id) return
    clearTimeout(closeTimer)
    // Always opens on Rules.
    set({ id, tab: 'rules', closing: false, pausedText: pauseNote.current })
  },
  close: () => {
    const { id, closing } = get()
    if (!id || closing) return
    set({ closing: true })
    clearTimeout(closeTimer)
    closeTimer = setTimeout(
      () => set({ id: null, closing: false, pausedText: null }),
      HELP_CLOSE_MS,
    )
  },
  toggle: (id) => (get().id ? get().close() : get().open(id)),
  setTab: (tab) => set({ tab }),
}))

/** True from the moment the sheet opens until it has unmounted: timed play holds still. */
export function usePaused(): boolean {
  return useHelp((s) => s.id !== null)
}

/** Keeps `pauseNote` current while a game is mounted (see `pauseNote`). Cleared on unmount. */
export function usePauseNote(note: string | null) {
  useEffect(() => {
    pauseNote.current = note
    return () => {
      pauseNote.current = null
    }
  }, [note])
}
