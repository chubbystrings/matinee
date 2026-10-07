import { ACTOR_LABEL, displayText } from './log'
import { SHAPE_COLOR } from './shapes'
import { CardFace } from './WhotCard'
import type { LogEntry } from './engine'

export const PLAY_LOG_ID = 'whot-play-log'

const ACTOR_CLASS: Record<LogEntry['who'], string> = {
  you: 'text-link',
  cpu: 'text-(--mt-o)',
  sys: 'text-dim',
}

function LogRow({ entry, gameOver }: { entry: LogEntry; gameOver: boolean }) {
  return (
    <li
      data-testid="whot-log-row"
      className="grid grid-cols-[26px_24px_minmax(0,1fr)] items-center gap-2.5 border-b border-ink-hair px-4 py-2.5"
    >
      <span className="font-mono text-[11px] text-dim">{entry.n}</span>
      {/* The column stays reserved when there is no card, so text always lines up. */}
      <div
        aria-hidden
        className="relative aspect-[5/7] w-6 rounded-[4px] text-on-accent [container-type:inline-size]"
        style={
          entry.card
            ? { backgroundColor: SHAPE_COLOR[entry.card.s] }
            : undefined
        }
      >
        {entry.card ? <CardFace card={entry.card} variant="log" /> : null}
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span
          className={`font-mono text-[10px] tracking-[.12em] uppercase ${ACTOR_CLASS[entry.who]}`}
        >
          {ACTOR_LABEL[entry.who]}
        </span>
        <span className="text-[13px] leading-[1.4] text-text-2 [text-wrap:pretty]">
          {displayText(entry, gameOver)}
        </span>
      </div>
    </li>
  )
}

/**
 * Every action in order, newest first. It never pauses the game: new rows simply appear at the top.
 * From sm up: fixed to the right edge under the play top bar (61px), 380px wide.
 * On phones: a bottom sheet (half the screen), so the market and pile stay in view.
 */
export function PlayLog({
  log,
  gameOver,
  onClose,
}: {
  log: ReadonlyArray<LogEntry>
  gameOver: boolean
  onClose: () => void
}) {
  return (
    <aside
      id={PLAY_LOG_ID}
      aria-label="Play log"
      data-testid="whot-log"
      className="fixed inset-x-0 bottom-0 z-20 flex h-[min(50dvh,460px)] animate-sheet touch-pan-y flex-col rounded-t-2xl border-t border-ink-600 bg-ink-800 shadow-poster-lg sm:inset-x-auto sm:top-[61px] sm:right-0 sm:h-auto sm:w-[380px] sm:animate-fade sm:rounded-none sm:border-t-0 sm:border-l"
    >
      {/* Phones: a bottom sheet that leaves the table visible. From sm up it is the right-edge panel. */}
      <div
        aria-hidden
        className="mx-auto mt-2 h-1 w-10 flex-none rounded-full bg-ink-500 sm:hidden"
      />
      <div className="flex flex-none items-center justify-between gap-3 border-b border-ink-600 px-4 py-3.5">
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-sm font-semibold tracking-[.04em] uppercase">
            Play log
          </h2>
          <p className="font-mono text-[10px] tracking-[.1em] text-dim uppercase">
            Newest first · CPU draws hidden until the end
          </p>
        </div>
        <button
          type="button"
          aria-label="Close log"
          onClick={onClose}
          className="size-9 flex-none cursor-pointer rounded-full border border-ink-500 text-lg leading-none text-paper hover:border-paper"
        >
          ×
        </button>
      </div>
      <ol
        className="min-h-0 flex-1 overflow-y-auto"
        data-testid="whot-log-list"
      >
        {log.toReversed().map((entry) => (
          <LogRow key={entry.n} entry={entry} gameOver={gameOver} />
        ))}
      </ol>
    </aside>
  )
}
