import { Link } from '@tanstack/react-router'
import { GENRES } from '#/games/registry'
import type { GenreFilter } from '#/games/registry'

export function GenreChips({ active, counts }: { active: GenreFilter; counts: Record<GenreFilter, number> }) {
  return (
    <nav aria-label="Filter by genre" className="flex flex-wrap gap-2">
      {GENRES.map((g) => {
        const on = g === active
        return (
          <Link
            key={g}
            to="/"
            search={(prev) => ({ ...prev, genre: g === 'All' ? undefined : g })}
            resetScroll={false}
            replace
            aria-current={on ? 'true' : undefined}
            className={`inline-flex h-[38px] items-center gap-2 rounded-pill border px-4 text-sm font-medium ${
              on ? 'border-paper bg-paper text-ink-900' : 'border-ink-600 text-text-2 hover:border-paper'
            }`}
          >
            {g}
            <span className="font-mono text-[11px] opacity-60">{counts[g]}</span>
          </Link>
        )
      })}
    </nav>
  )
}
