import { beforeEach, describe, expect, it } from 'vitest'
import { get, setMuted, setVolume, toggleMute } from './sound'

describe('sound state', () => {
  beforeEach(() => {
    setMuted(false)
    setVolume(60)
  })

  it('setVolume above 0 unmutes', () => {
    setMuted(true)
    setVolume(30)
    expect(get()).toEqual({ vol: 30, muted: false })
  })

  it('clamps volume to 0–100', () => {
    setVolume(250)
    expect(get().vol).toBe(100)
    setVolume(-5)
    expect(get().vol).toBe(0)
  })

  it('toggleMute from volume 0 restores 60', () => {
    setVolume(0)
    setMuted(true)
    toggleMute()
    expect(get()).toEqual({ vol: 60, muted: false })
  })

  it('persists to localStorage', () => {
    setVolume(35)
    expect(JSON.parse(localStorage.getItem('matinee.sound.v1') ?? '')).toEqual({
      vol: 35,
      muted: false,
    })
  })
})
