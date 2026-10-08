import { useSyncExternalStore } from 'react'

// Chiptune effects synthesised with Web Audio. No audio files.
// Client only: every window / AudioContext access is guarded because routes render on the server.

export type SoundName =
  'win' | 'lose' | 'tie' | 'special' | 'draw' | 'last' | 'low' | 'coin' | 'buzz'
export type SoundState = { readonly vol: number; readonly muted: boolean }

export const SOUND_KEY = 'matinee.sound.v1'
const DEFAULT_STATE: SoundState = { vol: 60, muted: false }

const clampVol = (v: number) => Math.max(0, Math.min(100, Math.round(v) || 0))

function load(): SoundState {
  if (typeof window === 'undefined') return DEFAULT_STATE
  try {
    const s: unknown = JSON.parse(localStorage.getItem(SOUND_KEY) ?? 'null')
    if (s && typeof s === 'object') {
      const { vol, muted } = s as { vol?: unknown; muted?: unknown }
      return { vol: clampVol(Number(vol)), muted: !!muted }
    }
  } catch {
    // unreadable storage: fall back to the default
  }
  return DEFAULT_STATE
}

let state: SoundState = load()
const subs = new Set<(s: SoundState) => void>()
let ctx: AudioContext | null = null
let master: GainNode | null = null

const gainFor = (s: SoundState) =>
  s.muted ? 0 : Math.pow(s.vol / 100, 1.6) * 0.5

function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const w = window as {
      AudioContext?: typeof AudioContext
      webkitAudioContext?: typeof AudioContext
    }
    const A = w.AudioContext ?? w.webkitAudioContext
    if (!A) return null
    ctx = new A()
    master = ctx.createGain()
    master.gain.value = gainFor(state)
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

// Browsers only allow audio after a user gesture; unlock on the first one.
if (typeof window !== 'undefined') {
  for (const ev of ['pointerdown', 'keydown'])
    window.addEventListener(ev, () => void ac(), { once: true, capture: true })
}

type ToneOpts = {
  type?: OscillatorType
  g?: number
  to?: number
  vib?: number
  /** Output node; defaults to the master gain. */
  out?: AudioNode
}

function tone(
  c: AudioContext,
  fallback: AudioNode,
  f: number,
  t0: number,
  d: number,
  o: ToneOpts = {},
) {
  const t = c.currentTime + t0
  const os = c.createOscillator()
  const g = c.createGain()
  const v = o.g ?? 0.16
  os.type = o.type ?? 'square'
  os.frequency.setValueAtTime(f, t)
  if (o.to) os.frequency.exponentialRampToValueAtTime(o.to, t + d)
  if (o.vib) {
    const l = c.createOscillator()
    const lg = c.createGain()
    l.frequency.value = o.vib
    lg.gain.value = f * 0.03
    l.connect(lg)
    lg.connect(os.frequency)
    l.start(t)
    l.stop(t + d + 0.05)
  }
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(v, t + 0.008)
  g.gain.setValueAtTime(v, t + Math.max(0.01, d - 0.04))
  g.gain.linearRampToValueAtTime(0, t + d)
  os.connect(g)
  g.connect(o.out ?? fallback)
  os.start(t)
  os.stop(t + d + 0.02)
}

let noise: AudioBuffer | null = null

function hat(c: AudioContext, t0: number, out: AudioNode, v: number) {
  if (!noise) {
    noise = c.createBuffer(1, c.sampleRate * 0.05, c.sampleRate)
    const d = noise.getChannelData(0)
    // Own generator, so the sound engine never consumes Math.random (games seed and replay it).
    let x = 0x9e3779b9
    for (let i = 0; i < d.length; i++) {
      x ^= x << 13
      x ^= x >>> 17
      x ^= x << 5
      d[i] = (x >>> 0) / 0x80000000 - 1
    }
  }
  const t = c.currentTime + t0
  const src = c.createBufferSource()
  const f = c.createBiquadFilter()
  const g = c.createGain()
  src.buffer = noise
  f.type = 'highpass'
  f.frequency.value = 7000
  g.gain.setValueAtTime(v, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.04)
  src.connect(f)
  f.connect(g)
  g.connect(out)
  src.start(t)
  src.stop(t + 0.05)
}

const N = {
  F2: 87.31,
  G2: 98,
  A2: 110,
  D3: 146.83,
  A4: 440,
  B4: 493.88,
  F5: 698.46,
  B5: 987.77,
  C3: 130.81,
  E3: 164.81,
  G3: 196,
  C4: 261.63,
  E4: 329.63,
  F4: 349.23,
  Fs4: 369.99,
  G4: 392,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  G5: 783.99,
  A5: 880,
  C6: 1046.5,
  D6: 1174.66,
  E6: 1318.51,
  G6: 1567.98,
} as const
const T: ToneOpts = { type: 'triangle', g: 0.24 }

type Play = (f: number, t0: number, d: number, o?: ToneOpts) => void

const SOUNDS: Record<SoundName, (p: Play) => void> = {
  // Game won · ~2.5s fanfare
  win(p) {
    for (const [f, t, d] of [
      [N.C5, 0, 0.12],
      [N.E5, 0.12, 0.12],
      [N.G5, 0.24, 0.12],
      [N.C6, 0.36, 0.26],
      [N.G5, 0.66, 0.12],
      [N.C6, 0.8, 0.12],
    ] as const)
      p(f, t, d, { g: 0.13 })
    p(N.E6, 0.94, 0.52, { g: 0.13, vib: 6 })
    for (const [f, t, d] of [
      [N.D6, 1.5, 0.12],
      [N.E6, 1.62, 0.12],
    ] as const)
      p(f, t, d, { g: 0.13 })
    p(N.G6, 1.76, 0.72, { g: 0.12, vib: 6 })
    p(N.E5, 0.94, 0.52, { g: 0.06 })
    p(N.C6, 1.76, 0.72, { g: 0.06 })
    for (const [f, t, d] of [
      [N.C3, 0, 0.34],
      [N.G3, 0.36, 0.28],
      [N.C4, 0.66, 0.8],
      [N.G3, 1.5, 0.24],
      [N.C4, 1.76, 0.72],
    ] as const)
      p(f, t, d, T)
  },
  // Game lost · ~2.5s descending "wah-wah"
  lose(p) {
    for (const [f, t, d] of [
      [N.G4, 0, 0.42],
      [N.Fs4, 0.48, 0.42],
      [N.F4, 0.96, 0.42],
    ] as const) {
      p(f, t, d, { g: 0.12, vib: 5 })
      p(f / 2, t, d, T)
    }
    p(N.E4, 1.44, 1.05, { g: 0.12, vib: 7, to: 300 })
    p(N.E4 / 2, 1.44, 1.05, { ...T, to: 150 })
  },
  // Game drawn (equal totals) · ~1.2s
  tie(p) {
    p(N.E5, 0, 0.14, { g: 0.12 })
    p(N.C5, 0.18, 0.14, { g: 0.12 })
    p(N.D5, 0.36, 0.6, { g: 0.12, vib: 5 })
    p(N.G3, 0, 0.96, T)
  },
  // Any special card (1, 2, 5, 8, 14, WHOT) · ~0.3s
  special(p) {
    p(N.G5, 0, 0.06, { g: 0.12 })
    p(N.C6, 0.06, 0.06, { g: 0.12 })
    p(N.E6, 0.12, 0.06, { g: 0.12 })
    p(N.G6, 0.18, 0.14, { g: 0.11 })
  },
  // Card taken from the market · ~0.1s
  draw(p) {
    p(900, 0, 0.09, { type: 'triangle', g: 0.28, to: 420 })
  },
  // A hand drops to one card · ~0.35s
  last(p) {
    p(N.A5, 0, 0.09, { g: 0.11 })
    p(N.D6, 0.12, 0.22, { g: 0.11, vib: 16 })
  },
  // Market has 5 or fewer cards · ~0.15s tick-tock
  low(p) {
    p(1568, 0, 0.04, { g: 0.08 })
    p(1175, 0.08, 0.05, { g: 0.08 })
  },
  // Illegal card in Expert · ~0.3s low buzz
  buzz(p) {
    p(N.G3, 0, 0.1, { type: 'sawtooth', g: 0.1 })
    p(N.D3, 0.12, 0.18, { type: 'sawtooth', g: 0.1 })
  },
  // Press Start on the game loader · ~0.45s coin insert
  coin(p) {
    p(N.B5, 0, 0.08, { g: 0.12 })
    p(N.E6, 0.08, 0.38, { g: 0.12 })
  },
}

export type LoopName = 'boot'

const E = 0.2 // eighth note at 150 bpm

type LoopDef = {
  /** Seconds per repeat. */
  len: number
  /** Schedules one repeat starting `t0` seconds from now into `out`. */
  fn: (c: AudioContext, t0: number, out: AudioNode) => void
}

const LOOPS: Record<LoopName, LoopDef> = {
  // Game loader theme · 3.2s loop (C – Am – F – G)
  boot: {
    len: 16 * E,
    fn(c, t0, out) {
      const bass = [
        N.C3,
        N.C3,
        N.G3,
        N.C3,
        N.A2,
        N.A2,
        N.E3,
        N.A2,
        N.F2,
        N.F2,
        N.C3,
        N.F2,
        N.G2,
        N.G2,
        N.D3,
        N.G2,
      ]
      const arp = [
        N.C5,
        N.E5,
        N.G5,
        N.E5,
        N.A4,
        N.C5,
        N.E5,
        N.C5,
        N.F4,
        N.A4,
        N.C5,
        N.A4,
        N.G4,
        N.B4,
        N.D5,
        N.B4,
      ]
      const mel = [
        [0, N.G5, 2],
        [2, N.E5, 1],
        [3, N.G5, 1],
        [4, N.A5, 2],
        [6, N.G5, 1],
        [7, N.E5, 1],
        [8, N.F5, 2],
        [10, N.A5, 1],
        [11, N.C6, 1],
        [12, N.B5, 2],
        [14, N.D6, 1],
        [15, N.B5, 1],
      ] as const
      bass.forEach((f, i) =>
        tone(c, out, f, t0 + i * E, E * 0.8, {
          type: 'triangle',
          g: 0.26,
          out,
        }),
      )
      arp.forEach((f, i) =>
        tone(c, out, f, t0 + i * E, E * 0.5, { g: 0.04, out }),
      )
      mel.forEach(([step, f, len]) =>
        tone(c, out, f, t0 + step * E, len * E * 0.9, { g: 0.085, out }),
      )
      for (let i = 0; i < 16; i++)
        hat(c, t0 + i * E + E / 2, out, i % 4 === 3 ? 0.08 : 0.045)
    },
  },
}

/**
 * Starts looping music and returns its stop function. Schedules one pattern ahead on its own bus
 * under the master gain, so it keeps running silently while muted and volume changes apply live.
 */
export function loop(name: LoopName): () => void {
  const c = ac()
  if (!c || !master) return () => {}
  const out = master
  const def = LOOPS[name]
  const bus = c.createGain()
  bus.connect(out)
  let next = c.currentTime + 0.05
  let alive = true
  const sched = () => {
    if (!alive) return
    while (next < c.currentTime + 0.6) {
      def.fn(c, next - c.currentTime, bus)
      next += def.len
    }
  }
  sched()
  const iv = setInterval(sched, 150)
  return () => {
    if (!alive) return
    alive = false
    clearInterval(iv)
    const t = c.currentTime
    bus.gain.setValueAtTime(1, t)
    bus.gain.linearRampToValueAtTime(0, t + 0.08)
    setTimeout(() => bus.disconnect(), 200)
  }
}

function commit(next: SoundState) {
  state = next
  try {
    localStorage.setItem(SOUND_KEY, JSON.stringify(state))
  } catch {
    // storage unavailable (private mode): the setting still applies for this session
  }
  if (master) master.gain.value = gainFor(state)
  subs.forEach((f) => f(state))
}

export function play(name: SoundName) {
  if (state.muted || !state.vol) return
  const c = ac()
  if (!c || !master) return
  const out = master
  SOUNDS[name]((f, t0, d, o) => tone(c, out, f, t0, d, o))
}

export const get = () => state

export function setVolume(v: number) {
  const vol = clampVol(v)
  commit({ vol, muted: vol > 0 ? false : state.muted })
}

export function setMuted(muted: boolean) {
  commit({ ...state, muted })
}

export function toggleMute() {
  const muted = !state.muted
  commit({ vol: !muted && !state.vol ? 60 : state.vol, muted })
}

export function subscribe(fn: (s: SoundState) => void) {
  subs.add(fn)
  return () => void subs.delete(fn)
}

export function useSound() {
  const s = useSyncExternalStore(
    (cb) => subscribe(cb),
    get,
    () => DEFAULT_STATE,
  )
  return {
    ...s,
    on: !s.muted && s.vol > 0,
    play,
    setVolume,
    setMuted,
    toggleMute,
  }
}
