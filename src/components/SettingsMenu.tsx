import { useEffect, useRef } from 'react'
import { Select } from '#/components/Select'
import type { Settings } from '#/games/types'
import { useScores } from '#/store/scores'

export function SettingsMenu() {
  const settings = useScores((s) => s.settings)
  const setSettings = useScores((s) => s.setSettings)
  const ref = useRef<HTMLDetailsElement>(null)

  // Light dismiss: document listeners are an external system, so an Effect is right here.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onPointerDown = (e: PointerEvent) => {
      if (el.open && e.target instanceof Node && !el.contains(e.target)) el.open = false
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && el.open) {
        el.open = false
        el.querySelector('summary')?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  return (
    <details ref={ref}>
      <summary className="cursor-pointer list-none rounded-pill border border-ink-500 px-3 py-2 text-muted hover:border-paper hover:text-paper">
        Settings
      </summary>
      <div
        role="group"
        aria-label="Settings"
        className="absolute bottom-full right-[clamp(16px,4vw,40px)] mb-2 flex w-72 max-w-[calc(100%-32px)] animate-fade flex-col gap-3 rounded-2xl border border-ink-600 bg-ink-800 p-4 text-paper shadow-poster"
      >
        <label className="flex items-center justify-between gap-4">
          Hero auto-rotate
          <input
            type="checkbox"
            checked={settings.heroAutoRotate}
            onChange={(e) => setSettings({ heroAutoRotate: e.target.checked })}
            className="size-4 accent-lime"
          />
        </label>
        <label className="flex items-center justify-between gap-4">
          Serpent speed
          <Select
            value={settings.snakeSpeed}
            onChange={(e) => setSettings({ snakeSpeed: e.target.value as Settings['snakeSpeed'] })}
          >
            <option>Chill</option>
            <option>Normal</option>
            <option>Fast</option>
          </Select>
        </label>
        <label className="flex items-center justify-between gap-4">
          CPU level
          <Select
            value={settings.cpuLevel}
            onChange={(e) => setSettings({ cpuLevel: e.target.value as Settings['cpuLevel'] })}
          >
            <option>Casual</option>
            <option>Perfect</option>
          </Select>
        </label>
      </div>
    </details>
  )
}
