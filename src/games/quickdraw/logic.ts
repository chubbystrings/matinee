export type Phase = 'idle' | 'wait' | 'go' | 'early' | 'result'

export const MIN_WAIT_MS = 1200
export const MAX_WAIT_MS = 3800
export const MAX_TRIES = 5

/** Random wait before the panel turns lime (1.2–3.8 s). */
export const waitDelay = (rng: () => number = Math.random) => MIN_WAIT_MS + rng() * (MAX_WAIT_MS - MIN_WAIT_MS)

export function rating(ms: number): string {
  return ms < 200 ? 'Lightning.' : ms < 260 ? 'Sharp.' : ms < 340 ? 'Solid.' : 'Warming up.'
}

export const resultCopy = (ms: number, newBest: boolean) =>
  `${newBest ? 'New best. ' : ''}${rating(ms)} Tap to go again.`

export const pushTry = (tries: readonly number[], ms: number) => [ms, ...tries].slice(0, MAX_TRIES)

export type PhaseView = { bg: string; fg: string; big: string; small: string }

export const PHASE_VIEW: Record<Exclude<Phase, 'result'>, PhaseView> = {
  idle: { bg: 'var(--mt-surface)', fg: 'var(--mt-text)', big: 'Tap to start', small: 'When the panel turns lime, tap as fast as you can.' },
  wait: { bg: 'var(--mt-raised)', fg: 'var(--mt-text)', big: 'Wait for it…', small: 'Don’t tap yet.' },
  go: { bg: '#C8F031', fg: '#121117', big: 'Tap!', small: '' },
  early: { bg: '#FF7A5C', fg: '#121117', big: 'Too soon', small: 'Tap to try again.' },
}

export function phaseView(phase: Phase, ms: number, newBest: boolean): PhaseView {
  if (phase !== 'result') return PHASE_VIEW[phase]
  return { bg: 'var(--mt-surface)', fg: 'var(--mt-text)', big: `${ms} ms`, small: resultCopy(ms, newBest) }
}
