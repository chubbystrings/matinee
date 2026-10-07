import { useEffect, useRef, useState } from 'react'
import { useSound } from '#/lib/sound'

function SpeakerIcon({ on }: { on: boolean }) {
  return (
    <svg
      aria-hidden
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11 5 6 9H3v6h3l5 4z" fill="currentColor" />
      {on ? (
        <>
          <path d="M15.5 8.5a5 5 0 0 1 0 7" />
          <path d="M18.5 5.5a9 9 0 0 1 0 13" />
        </>
      ) : (
        <path d="m16 9 5 6m0-6-5 6" />
      )}
    </svg>
  )
}

/** App-wide volume control: speaker button + popover. */
export function SoundControl() {
  const { vol, on, muted, play, setVolume, toggleMute } = useSound()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Light dismiss: window listeners are an external system, so an Effect is right here.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (e.target instanceof Node && !ref.current?.contains(e.target))
        setOpen(false)
    }
    // Capture + stopPropagation: Escape closes the popover before it leaves the game.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      setOpen(false)
    }
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKey, true)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Sound settings"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
        className="grid size-9 cursor-pointer place-items-center rounded-full border border-ink-500 text-paper hover:border-paper"
      >
        <SpeakerIcon on={on} />
      </button>
      {open ? (
        <div
          role="group"
          aria-label="Sound"
          className="absolute right-0 top-[calc(100%+10px)] z-30 flex w-[248px] animate-fade flex-col gap-3.5 rounded-2xl border border-ink-600 bg-ink-800 p-4 shadow-poster-lg"
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-[.12em] text-muted">
              Sound
            </span>
            <span className="font-mono text-[13px] text-paper">
              {muted ? 'Muted' : `${vol}%`}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={vol}
            aria-label="Volume"
            onChange={(e) => setVolume(Number(e.target.value))}
            onPointerUp={() => play('draw')}
            onKeyUp={() => play('draw')}
            className="w-full cursor-pointer accent-[#C8F031]"
          />
          <button
            type="button"
            onClick={toggleMute}
            className="h-10 w-full cursor-pointer rounded-pill border border-ink-500 text-sm font-semibold text-paper hover:border-paper"
          >
            {muted ? 'Unmute' : 'Mute'}
          </button>
        </div>
      ) : null}
    </div>
  )
}
