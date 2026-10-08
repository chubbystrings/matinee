import { useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'
import { GAME_BY_ID, isGameId } from '#/games/registry'
import { HELP, HELP_KEYS, HELP_SPECIALS } from '#/games/help'
import type { GameId, GameMeta } from '#/games/types'
import { LEVEL_COPY } from '#/games/whot/levels'
import type { Level } from '#/games/whot/engine'
import { SHAPE_COLOR } from '#/games/whot/shapes'
import { ShapeMark } from '#/games/whot/WhotCard'
import { useHelp } from '#/store/help'
import type { HelpTab } from '#/store/help'
import { LEVELS, useWhotLevel } from '#/store/whot'

const TABS: ReadonlyArray<{ id: HelpTab; label: string }> = [
  { id: 'rules', label: 'Rules' },
  { id: 'controls', label: 'Controls' },
  { id: 'tips', label: 'Tips' },
]

const LABEL = 'font-mono text-[11px] uppercase tracking-[.14em] text-dim'
const pad2 = (i: number) => String(i + 1).padStart(2, '0')

/** Modal <dialog> opened once on mount; closed again on unmount so focus returns to the opener. */
function modalRef(el: HTMLDialogElement | null) {
  if (!el) return
  if (!el.open) el.showModal()
  return () => el.close()
}

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement &&
  (t.isContentEditable ||
    t instanceof HTMLTextAreaElement ||
    t instanceof HTMLSelectElement ||
    (t instanceof HTMLInputElement && t.type !== 'range'))

/**
 * The game "?" refers to: the booting or played game (the play route), else the open detail sheet
 * (`?game=` on the lobby). Null in the plain lobby.
 */
export function helpContext(location: {
  pathname: string
  search: unknown
}): GameId | null {
  const played = /^\/play\/([^/]+)/.exec(location.pathname)?.[1]
  if (played) return isGameId(played) ? played : null
  const detail = (location.search as { game?: unknown } | undefined)?.game
  return typeof detail === 'string' && isGameId(detail) ? detail : null
}

/**
 * While the sheet is open it owns the keyboard: Esc closes it, ? toggles it, and every other key is
 * swallowed (default actions such as Tab and Enter on its own buttons still work).
 * With it closed, ? opens the sheet for the current context and everything else passes through.
 */
export function handleHelpKey(
  e: KeyboardEvent,
  location: { pathname: string; search: unknown },
) {
  const help = useHelp.getState()
  if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
    if (isTyping(e.target)) return
    const context = help.id ?? helpContext(location)
    if (!context) return
    e.preventDefault()
    e.stopImmediatePropagation()
    help.toggle(context)
    return
  }
  if (!help.id) return
  e.stopImmediatePropagation()
  if (e.key === 'Escape') {
    e.preventDefault()
    help.close()
  }
}

/**
 * Mounted once at the root. Its keyboard listener is attached first and in the capture phase, so while
 * the sheet is open it owns every key: the loader, the games and Esc-to-lobby never see them.
 */
export function HowToPlayHost() {
  const router = useRouter()
  const id = useHelp((s) => s.id)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => handleHelpKey(e, router.state.location)
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [router])

  return id ? <HowToPlaySheet gameId={id} /> : null
}

function Rules({ game }: { game: GameMeta }) {
  const help = HELP[game.id]
  const level = useWhotLevel((s) => s.level)
  return (
    <>
      <div className="flex flex-col gap-2">
        <div className={LABEL}>Goal</div>
        <p className="m-0 text-[17px] leading-normal text-paper [text-wrap:pretty]">
          {help.goal}
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <div className={LABEL}>Rules</div>
        {help.rules.map((text, i) => (
          <div
            key={text}
            className="grid grid-cols-[28px_minmax(0,1fr)] items-baseline gap-2"
          >
            <span className="font-mono text-xs text-dim">{pad2(i)}</span>
            <span className="text-[15px] leading-[1.55] text-text-2 [text-wrap:pretty]">
              {text}
            </span>
          </div>
        ))}
      </div>
      {game.id === 'whot' ? (
        <>
          <WhotSpecials />
          <WhotLevels current={level} />
        </>
      ) : null}
    </>
  )
}

function WhotSpecials() {
  return (
    <div className="flex flex-col gap-1" data-testid="help-specials">
      <div className={`${LABEL} pb-2`}>Special cards</div>
      {HELP_SPECIALS.map((sp) => (
        <div
          key={sp.n}
          className="grid grid-cols-[38px_minmax(0,1fr)] items-center gap-3.5 border-b border-ink-hair py-2"
        >
          <div
            className="flex h-[53px] w-[38px] flex-col items-center justify-center gap-1 rounded-md text-on-accent"
            style={{ backgroundColor: SHAPE_COLOR[sp.s] }}
          >
            <span className="font-display text-sm leading-none font-extrabold tracking-[-.03em]">
              {sp.n}
            </span>
            {sp.s === 'whot' ? null : <ShapeMark shape={sp.s} size="13px" />}
          </div>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[15px] font-semibold">{sp.t}</span>
            <span className="text-sm leading-[1.45] text-text-2 [text-wrap:pretty]">
              {sp.d}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

function WhotLevels({ current }: { current: Level }) {
  return (
    <div className="flex flex-col gap-1" data-testid="help-levels">
      <div className={`${LABEL} pb-2`}>Levels</div>
      {LEVELS.map((level) => (
        <div
          key={level}
          className="flex flex-col gap-1 border-b border-ink-hair py-2.5"
        >
          <div className="flex items-center gap-2.5">
            <span className="text-[15px] font-semibold">{level}</span>
            {level === current ? (
              <span className="flex h-[22px] items-center rounded-pill border border-lime-line px-[9px] font-mono text-[10px] tracking-[.12em] text-link uppercase">
                Current
              </span>
            ) : null}
          </div>
          <span className="text-sm leading-[1.45] text-text-2 [text-wrap:pretty]">
            {LEVEL_COPY[level]}
          </span>
        </div>
      ))}
    </div>
  )
}

function Controls({ game }: { game: GameMeta }) {
  return (
    <div className="flex flex-col">
      {[...HELP[game.id].controls, ...HELP_KEYS].map(([keys, action]) => (
        <div
          key={`${keys.join('')}-${action}`}
          className="grid grid-cols-[minmax(0,11fr)_minmax(0,13fr)] items-center gap-3.5 border-b border-ink-hair py-3"
        >
          <div className="flex flex-wrap gap-1.5">
            {keys.map((k) => (
              <span
                key={k}
                className="flex h-7 min-w-7 items-center justify-center rounded-lg border border-b-2 border-ink-500 bg-ink-700 px-[9px] font-mono text-xs whitespace-nowrap"
              >
                {k}
              </span>
            ))}
          </div>
          <span className="text-[15px] leading-[1.45] text-text-2 [text-wrap:pretty]">
            {action}
          </span>
        </div>
      ))}
    </div>
  )
}

function Tips({ game }: { game: GameMeta }) {
  return (
    <div className="flex flex-col gap-[18px]">
      {[game.tip, ...HELP[game.id].tips].map((text, i) => (
        <div
          key={text}
          className="grid grid-cols-[28px_minmax(0,1fr)] items-baseline gap-2"
        >
          <span className="font-mono text-xs text-link">{pad2(i)}</span>
          <span className="text-base leading-normal text-paper [text-wrap:pretty]">
            {text}
          </span>
        </div>
      ))}
    </div>
  )
}

export function HowToPlaySheet({ gameId }: { gameId: GameId }) {
  const game = GAME_BY_ID.get(gameId)!
  const tab = useHelp((s) => s.tab)
  const closing = useHelp((s) => s.closing)
  const pausedText = useHelp((s) => s.pausedText)
  const close = useHelp((s) => s.close)
  const setTab = useHelp((s) => s.setTab)

  return (
    <dialog
      ref={modalRef}
      aria-label="How to play"
      data-testid="how-to-play"
      onCancel={(e) => {
        e.preventDefault()
        close()
      }}
      className="fixed inset-0 m-0 size-full max-h-none max-w-none bg-transparent p-0 text-paper backdrop:bg-transparent"
    >
      <div
        aria-hidden
        onClick={close}
        className={`fixed inset-0 z-90 bg-(--mt-backdrop) backdrop-blur-[4px] ${closing ? 'animate-fade-out' : 'animate-fade'}`}
      />
      <div
        data-testid="how-to-play-panel"
        className={`fixed top-3 right-3 bottom-3 z-91 flex w-[min(460px,calc(100vw-24px))] flex-col overflow-hidden rounded-[20px] border border-ink-600 bg-ink-800 text-paper shadow-poster-lg max-sm:inset-x-0 max-sm:top-auto max-sm:right-0 max-sm:bottom-0 max-sm:left-0 max-sm:max-h-[88vh] max-sm:w-auto max-sm:rounded-[22px_22px_0_0] ${
          closing
            ? 'animate-help-out max-sm:animate-help-down'
            : 'animate-help-in max-sm:animate-help-up'
        }`}
      >
        <div className="hidden flex-none justify-center pt-2.5 max-sm:flex">
          <div className="h-1 w-10 rounded-sm bg-ink-500" />
        </div>
        <div className="flex flex-none items-start gap-3 px-5 pt-5 pb-4">
          <div className="flex min-w-0 flex-1 flex-col gap-2.5">
            <div className="flex items-center gap-2 font-mono text-[11px] tracking-[.14em] text-muted uppercase">
              <span
                aria-hidden
                className="size-2 flex-none rounded-full"
                style={{
                  backgroundColor: game.color,
                  boxShadow: `0 0 10px ${game.color}`,
                }}
              />
              <span>How to play · No. {game.no}</span>
            </div>
            <h2 className="font-display text-[clamp(26px,4vw,32px)] leading-none font-extrabold uppercase [overflow-wrap:anywhere]">
              {game.title}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close"
            title="Close (Esc)"
            onClick={close}
            className="grid size-10 flex-none cursor-pointer place-items-center rounded-full border border-ink-500 text-xl leading-none hover:border-paper"
          >
            ×
          </button>
        </div>
        <div className="flex-none border-b border-ink-hair px-5 pb-4">
          <div
            role="group"
            aria-label="Sections"
            className="flex rounded-pill border border-ink-600 p-[3px]"
          >
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-pressed={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`h-[34px] flex-1 cursor-pointer rounded-pill text-sm font-medium ${
                  tab === t.id ? 'bg-paper text-ink-900' : 'text-text-2'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div
          data-testid="how-to-play-body"
          className="flex min-h-0 flex-1 flex-col gap-[26px] overflow-y-auto px-5 pt-[22px] pb-7"
        >
          {tab === 'rules' ? (
            <Rules game={game} />
          ) : tab === 'controls' ? (
            <Controls game={game} />
          ) : (
            <Tips game={game} />
          )}
        </div>
        {pausedText ? (
          <div
            data-testid="how-to-play-paused"
            className="flex flex-none items-center gap-2.5 border-t border-ink-hair px-5 py-3.5 font-mono text-[11px] tracking-[.12em] text-muted uppercase"
          >
            <span aria-hidden className="flex flex-none gap-[3px]">
              <span className="h-[11px] w-[3px] rounded-[1px] bg-current" />
              <span className="h-[11px] w-[3px] rounded-[1px] bg-current" />
            </span>
            <span>{pausedText}</span>
          </div>
        ) : null}
      </div>
    </dialog>
  )
}
