import { Link, useNavigate } from '@tanstack/react-router'
import { useRef } from 'react'
import { Poster } from '#/components/Poster'
import { preloadGame } from '#/games/registry'
import type { GameMeta } from '#/games/types'
import { useBestLabel } from '#/games/useBestLabel'

export function GameDetailSheet({ game }: { game: GameMeta }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const navigate = useNavigate()
  const bestLabel = useBestLabel(game)

  // Native <dialog>: modal focus trap, inert page, Esc, and focus return to the opener.
  const openModal = (el: HTMLDialogElement | null) => {
    if (el && !el.open) el.showModal()
  }

  // Esc, the × button and backdrop clicks all end up here via the dialog's close event.
  const handleClose = () => {
    void navigate({
      to: '/',
      search: (prev) => ({ ...prev, game: undefined }),
      replace: true,
      resetScroll: false,
    })
  }

  const specs = [
    ['Session', game.time],
    ['Players', game.players],
    ['Controls', game.controls],
    ['Your best', bestLabel],
  ] as const

  return (
    <dialog
      ref={(el) => {
        dialogRef.current = el
        openModal(el)
      }}
      onClose={handleClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) e.currentTarget.close()
      }}
      aria-labelledby="sheet-title"
      className="m-auto max-h-[calc(100dvh-32px)] w-[calc(100%-32px)] max-w-[880px] animate-in overflow-auto rounded-sheet border border-ink-600 bg-ink-800 p-0 text-paper backdrop:animate-fade backdrop:bg-(--mt-backdrop) backdrop:backdrop-blur-[8px]"
    >
      <div className="relative flex flex-wrap gap-[clamp(20px,3vw,32px)] p-[clamp(18px,3vw,30px)]">
        <button
          type="button"
          aria-label="Close"
          onClick={() => dialogRef.current?.close()}
          className="absolute right-4 top-4 z-10 grid size-10 cursor-pointer place-items-center rounded-full border border-ink-500 bg-ink-800 text-xl"
        >
          ×
        </button>
        <div className="max-w-[260px] flex-[1_1_200px]">
          <Poster game={game} variant="sheet" />
        </div>
        <div className="flex flex-[1_1_320px] flex-col gap-[18px]">
          <div
            className="font-mono text-xs uppercase tracking-[.14em] text-(--accent) light:text-on-accent"
            style={{ '--accent': game.color } as React.CSSProperties}
          >
            No. {game.no} · {game.genre}
          </div>
          <h2
            id="sheet-title"
            className="font-display text-[clamp(30px,4.4vw,48px)] font-extrabold uppercase leading-none"
          >
            {game.title}
          </h2>
          <p className="text-[17px] leading-[1.6] text-text-2">
            {game.synopsis}
          </p>
          <dl className="grid gap-px overflow-hidden rounded-xl bg-ink-600 [grid-template-columns:repeat(auto-fit,minmax(130px,1fr))]">
            {specs.map(([label, value]) => (
              <div key={label} className="bg-ink-800 p-3.5">
                <dt className="font-mono text-[11px] uppercase tracking-[.1em] text-dim">
                  {label}
                </dt>
                <dd className="mt-1 text-[15px] font-medium">{value}</dd>
              </div>
            ))}
          </dl>
          <div>
            <Link
              to="/play/$gameId"
              params={{ gameId: game.id }}
              onPointerEnter={() => preloadGame(game.id)}
              className="inline-flex h-[52px] items-center justify-center gap-2.5 rounded-pill bg-lime px-[26px] font-display text-[13px] font-semibold uppercase tracking-[.06em] text-on-accent hover:bg-lime-hover hover:shadow-cta"
            >
              <span
                aria-hidden
                className="border-y-[6px] border-l-[10px] border-y-transparent border-l-current"
              />
              Play
            </Link>
          </div>
        </div>
      </div>
    </dialog>
  )
}
