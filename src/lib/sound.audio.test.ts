import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// A tiny AudioContext double: records nodes so tests can see what was scheduled.
class Param {
  value = 0
  setValueAtTime = vi.fn()
  linearRampToValueAtTime = vi.fn()
  exponentialRampToValueAtTime = vi.fn()
}
class Node {
  connect = vi.fn()
  disconnect = vi.fn()
  start = vi.fn()
  stop = vi.fn()
  gain = new Param()
  frequency = new Param()
  type = ''
  buffer: unknown = null
}
const made = { ctx: 0, oscillators: 0, gains: [] as Array<Node> }
let now = 0
class FakeAudioContext {
  state = 'running'
  sampleRate = 8000
  destination = new Node()
  get currentTime() {
    return now
  }
  constructor() {
    made.ctx++
  }
  resume = vi.fn()
  createGain() {
    const n = new Node()
    made.gains.push(n)
    return n
  }
  createOscillator() {
    made.oscillators++
    return new Node()
  }
  createBiquadFilter() {
    return new Node()
  }
  createBufferSource() {
    return new Node()
  }
  createBuffer(_ch: number, len: number) {
    return { getChannelData: () => new Float32Array(len) }
  }
}

async function load() {
  vi.resetModules()
  return import('./sound')
}

beforeEach(() => {
  vi.useFakeTimers()
  localStorage.clear()
  now = 0
  made.ctx = 0
  made.oscillators = 0
  made.gains = []
  vi.stubGlobal('AudioContext', FakeAudioContext)
  window.AudioContext = FakeAudioContext as unknown as typeof AudioContext
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

/** Advance both the fake clock and the audio clock, so the 150 ms scheduler sees time pass. */
const advance = (ms: number) => {
  now += ms / 1000
  vi.advanceTimersByTime(ms)
}

describe('audio engine', () => {
  it('creates no AudioContext until a sound is requested', async () => {
    await load()
    expect(made.ctx).toBe(0)
  })

  it('master gain is (vol/100)^1.6 × 0.5, and 0 when muted', async () => {
    const s = await load()
    s.play('draw')
    const master = made.gains[0]
    expect(master.gain.value).toBeCloseTo(Math.pow(0.6, 1.6) * 0.5, 5)
    s.setVolume(100)
    expect(master.gain.value).toBeCloseTo(0.5, 5)
    s.setMuted(true)
    expect(master.gain.value).toBe(0)
  })

  it('play does nothing while muted or at volume 0', async () => {
    const s = await load()
    s.setMuted(true)
    s.play('special')
    s.setMuted(false)
    s.setVolume(0)
    s.play('special')
    expect(made.oscillators).toBe(0)
  })

  it('coin is two square notes', async () => {
    const s = await load()
    s.play('coin')
    expect(made.oscillators).toBe(2)
  })

  it('a loop keeps scheduling ahead, and stop ramps out, disconnects and stops scheduling', async () => {
    const s = await load()
    const stop = s.loop('boot')
    const first = made.oscillators
    expect(first).toBeGreaterThan(0)
    const bus = made.gains[1]
    advance(3200)
    expect(made.oscillators).toBeGreaterThan(first)

    stop()
    expect(bus.gain.linearRampToValueAtTime).toHaveBeenCalledWith(
      0,
      expect.any(Number),
    )
    expect(bus.disconnect).not.toHaveBeenCalled()
    advance(250)
    expect(bus.disconnect).toHaveBeenCalledTimes(1)

    const after = made.oscillators
    advance(3200)
    expect(made.oscillators).toBe(after)
    stop() // idempotent
    expect(bus.disconnect).toHaveBeenCalledTimes(1)
  })

  it('a loop keeps running silently while muted, and unmuting brings it back', async () => {
    const s = await load()
    s.play('draw') // creates the context and master bus
    const master = made.gains[0]
    s.setMuted(true)
    const stop = s.loop('boot')
    const before = made.oscillators
    advance(3200)
    expect(made.oscillators).toBeGreaterThan(before)
    expect(master.gain.value).toBe(0)
    s.setMuted(false)
    expect(master.gain.value).toBeGreaterThan(0)
    stop()
  })
})
