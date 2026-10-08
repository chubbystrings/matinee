import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HELP_CLOSE_MS, pauseNote, useHelp } from './help'

const state = () => useHelp.getState()

beforeEach(() => {
  vi.useFakeTimers()
  useHelp.setState({ id: null, tab: 'rules', closing: false, pausedText: null })
  pauseNote.current = null
})
afterEach(() => vi.useRealTimers())

describe('help store', () => {
  it('opens for a game on the Rules tab', () => {
    state().open('whot')
    expect(state()).toMatchObject({ id: 'whot', tab: 'rules', closing: false })
  })

  it('always reopens on Rules, even after another tab was used', () => {
    state().open('merge')
    state().setTab('tips')
    state().close()
    vi.advanceTimersByTime(HELP_CLOSE_MS)
    state().open('merge')
    expect(state().tab).toBe('rules')
  })

  it('ignores open while a sheet is already open', () => {
    state().open('snake')
    state().open('whot')
    expect(state().id).toBe('snake')
  })

  it("captures the game's pause note at the moment of opening", () => {
    pauseNote.current = 'Paused · resumes when you close this'
    state().open('snake')
    pauseNote.current = null // the game changed afterwards (e.g. Quickdraw went idle)
    expect(state().pausedText).toBe('Paused · resumes when you close this')
  })

  it('has no footer text when nothing was paused', () => {
    state().open('merge')
    expect(state().pausedText).toBeNull()
  })

  it('close plays the exit first, then unmounts after 180 ms', () => {
    state().open('recall')
    state().close()
    expect(state()).toMatchObject({ id: 'recall', closing: true })
    vi.advanceTimersByTime(HELP_CLOSE_MS - 1)
    expect(state().id).toBe('recall')
    vi.advanceTimersByTime(1)
    expect(state()).toMatchObject({
      id: null,
      closing: false,
      pausedText: null,
    })
  })

  it('close is idempotent and does nothing when closed', () => {
    state().close()
    expect(state().id).toBeNull()
    state().open('popup')
    state().close()
    state().close()
    vi.advanceTimersByTime(HELP_CLOSE_MS)
    expect(state().id).toBeNull()
  })

  it('toggle opens, then closes', () => {
    state().toggle('noughts')
    expect(state().id).toBe('noughts')
    state().toggle('noughts')
    expect(state().closing).toBe(true)
  })

  it('stays "paused" through the closing animation and resumes only after the unmount', () => {
    state().open('popup')
    state().close()
    expect(state().id).not.toBeNull() // usePaused() = id !== null
    vi.advanceTimersByTime(HELP_CLOSE_MS)
    expect(state().id).toBeNull()
  })
})
