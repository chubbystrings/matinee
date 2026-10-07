import { useState } from 'react'
import type { ReactNode } from 'react'
import { Button } from '#/components/Button'
import { useInterval } from '#/hooks/useInterval'
import { usePageVisible } from '#/hooks/usePageVisible'
import { play } from '#/lib/sound'
import type { SoundName } from '#/lib/sound'
import { useWhotLevel, useWhotStats } from '#/store/whot'
import {
  SHAPES,
  SHAPE_NAME,
  callShape,
  canPlay,
  cardName,
  cpuMove,
  drawFromMarket,
  newGame,
  playCard,
  sortHand,
} from './engine'
import type { Card, Level, Shape, WhotState } from './engine'
import { PLAY_LOG_ID, PlayLog } from './PlayLog'
import { DEFAULT_RULES, legendEntries } from './rules'
import { whotSounds } from './sounds'
import { CARD_BACK_BG, MARKET_BACK_BG, SHAPE_COLOR } from './shapes'
import { CardFace, ShapeMark } from './WhotCard'

const CPU_DELAY_MS = 800
const LEVELS: ReadonlyArray<Level> = ['Easy', 'Hard']

const MONO_LABEL = 'font-mono text-[11px] uppercase tracking-[.12em]'
const BACK_STYLE = { background: CARD_BACK_BG }
const MARKET_BACK_STYLE = { background: MARKET_BACK_BG }
const MARKET_GLOW =
  '0 0 0 4px rgba(200,240,49,.18), 0 0 28px rgba(200,240,49,.35)'

function TableOverlay({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`absolute -inset-px z-10 flex animate-fade flex-col items-center justify-center rounded-3xl bg-(--mt-overlay) text-center backdrop-blur-[4px] ${className}`}
    >
      {children}
    </div>
  )
}

function CpuHand({
  cards,
  revealed,
}: {
  cards: ReadonlyArray<Card>
  revealed: boolean
}) {
  return (
    <div
      className="flex min-h-[54px] justify-center pl-[22px]"
      data-testid="whot-cpu-hand"
    >
      {cards.map((c) => (
        <div
          key={c.id}
          className="relative -ml-[22px] aspect-[5/7] w-[clamp(36px,min(7vw,7vh),50px)] flex-none rounded-[7px] border border-ink-450 text-on-accent shadow-poster [container-type:inline-size]"
          style={revealed ? { backgroundColor: SHAPE_COLOR[c.s] } : BACK_STYLE}
        >
          {revealed ? <CardFace card={c} variant="cpu" /> : null}
        </div>
      ))}
    </div>
  )
}

function GameOver({
  game,
  streak,
  best,
  onAgain,
}: {
  game: WhotState
  streak: number
  best: number
  onAgain: () => void
}) {
  const over = game.over
  if (!over) return null
  const kicker =
    over.reason === 'count'
      ? 'Market empty · lowest total wins'
      : over.result === 'win'
        ? 'Last card played'
        : 'CPU emptied its hand'
  const headline =
    over.result === 'win'
      ? 'You win'
      : over.result === 'loss'
        ? 'CPU wins'
        : 'Draw'
  return (
    <TableOverlay className="gap-2 p-4">
      <div className="font-mono text-xs uppercase tracking-[.14em] text-muted">
        {kicker}
      </div>
      <div
        className={`font-display text-[clamp(26px,5vw,40px)] font-extrabold uppercase ${over.result === 'win' ? 'text-link' : 'text-paper'}`}
      >
        {headline}
      </div>
      {over.reason === 'count' ? (
        <div className="font-mono text-[13px] text-text-2">
          Your hand {over.yourTotal} · CPU hand {over.cpuTotal}
        </div>
      ) : null}
      <div className="font-mono text-xs uppercase tracking-[.08em] text-muted">
        Win streak {streak} · best {best}
      </div>
      <Button compact className="mt-1.5" onClick={onAgain}>
        Play again
      </Button>
    </TableOverlay>
  )
}

function ShapePicker({ onPick }: { onPick: (shape: Shape) => void }) {
  return (
    <TableOverlay className="gap-[18px] p-5">
      <div className="font-mono text-xs uppercase tracking-[.14em] text-muted">
        WHOT · call a shape
      </div>
      <div className="flex flex-wrap justify-center gap-2.5">
        {SHAPES.map((shape, i) => (
          <button
            key={shape}
            type="button"
            aria-label={SHAPE_NAME[shape]}
            title={SHAPE_NAME[shape]}
            autoFocus={i === 0}
            onClick={() => onPick(shape)}
            className="group flex cursor-pointer flex-col items-center gap-2 text-paper"
          >
            <span
              className="grid size-[60px] place-items-center rounded-[14px] transition-transform duration-150 group-hover:-translate-y-1"
              style={{ backgroundColor: SHAPE_COLOR[shape] }}
            >
              <ShapeMark shape={shape} size="32px" />
            </span>
            <span className="text-[13px] font-medium">{SHAPE_NAME[shape]}</span>
          </button>
        ))}
      </div>
    </TableOverlay>
  )
}

function statusText(game: WhotState, myTurn: boolean, noMove: boolean) {
  if (game.over)
    return game.over.result === 'win'
      ? 'You win'
      : game.over.result === 'loss'
        ? 'CPU wins'
        : 'Draw'
  if (game.picking) return 'Call a shape'
  if (!myTurn) return 'CPU is thinking…'
  if (noMove) return 'No match · draw from the market'
  return game.req
    ? `Your turn · play ${SHAPE_NAME[game.req]} or WHOT`
    : 'Your turn'
}

/** Plays the sounds for one transition: the first at once, the rest staggered. */
function playSounds(names: ReadonlyArray<SoundName>) {
  names.forEach((n, i) => (i ? setTimeout(() => play(n), i * 180) : play(n)))
}

function WhotBoard({ onAgain }: { onAgain: () => void }) {
  const level = useWhotLevel((s) => s.level)
  const setLevel = useWhotLevel((s) => s.setLevel)
  const record = useWhotStats((s) => s.record)
  const streak = useWhotStats((s) => s.streak)
  const bestStreak = useWhotStats((s) => s.best)
  // Rules are fixed per game. A future rules setting passes its stored `Rules` here instead of the defaults.
  const [game, setGame] = useState(() =>
    newGame(Math.random, level, DEFAULT_RULES),
  )
  const visible = usePageVisible()
  // Resets with the board: Play again and restart both remount it.
  const [logOpen, setLogOpen] = useState(false)

  // Every transition goes through here so the result is recorded exactly once, from a handler or timer.
  const commit = (next: WhotState) => {
    if (next === game) return
    playSounds(whotSounds(game, next))
    setGame(next)
    if (next.over && !game.over) record(next.over.result)
  }

  // The CPU's 800 ms pause is a declarative interval that only runs on its turn (and while the tab is visible).
  const cpuToMove = game.turn === 'cpu' && !game.picking && !game.over
  useInterval(
    () => commit(cpuMove(game, level, Math.random)),
    cpuToMove && visible ? CPU_DELAY_MS : null,
  )

  const myTurn = game.turn === 'you' && !game.picking && !game.over
  const noMove = myTurn && !game.hand.some((c) => canPlay(c, game))
  const top = game.pile[game.pile.length - 1]
  const prev = game.pile.length > 1 ? game.pile[game.pile.length - 2] : null
  const hand = sortHand(game.hand)
  const statusLime = myTurn || game.picking

  return (
    <div className="my-auto flex w-[min(96vw,760px)] flex-col items-center gap-[clamp(14px,2.4vh,22px)]">
      <div className="flex flex-col items-center gap-2.5">
        <CpuHand cards={game.cpu} revealed={game.over !== null} />
        <div
          className={`${MONO_LABEL} text-muted`}
          data-testid="whot-cpu-count"
        >
          CPU · {game.cpu.length} {game.cpu.length === 1 ? 'card' : 'cards'}
        </div>
      </div>

      <div className="relative flex min-h-[250px] items-center justify-center gap-[clamp(28px,7vw,64px)] rounded-3xl border border-ink-600 bg-ink-800 px-[clamp(24px,6vw,56px)] py-[clamp(16px,2.6vh,28px)]">
        <button
          type="button"
          aria-label="Draw from market"
          disabled={!myTurn}
          onClick={() => commit(drawFromMarket(game, 'you'))}
          className="flex cursor-pointer flex-col items-center gap-3 disabled:cursor-default"
        >
          <span className="relative block aspect-[5/7] w-[clamp(60px,min(15vw,13vh),100px)]">
            <span className="absolute inset-0 translate-x-[5px] translate-y-[5px] rounded-[11px] border border-ink-500 bg-ink-750" />
            <span
              className="absolute inset-0 rounded-[11px] border-2 transition-[border-color,box-shadow] duration-200"
              style={{
                ...MARKET_BACK_STYLE,
                borderColor: noMove ? '#C8F031' : 'var(--mt-line2)',
                boxShadow: noMove ? MARKET_GLOW : 'none',
              }}
            />
          </span>
          <span
            className={`${MONO_LABEL} text-text-2`}
            data-testid="whot-market"
          >
            Market · {game.deck.length}
          </span>
        </button>

        <div className="flex flex-col items-center gap-3">
          <div className="relative aspect-[5/7] w-[clamp(72px,min(17vw,15vh),116px)]">
            {prev ? (
              <span
                aria-hidden
                className="absolute inset-0 rounded-xl opacity-50"
                style={{
                  backgroundColor: SHAPE_COLOR[prev.s],
                  transform: 'rotate(-9deg) translate(-8px, 2px)',
                }}
              />
            ) : null}
            <div
              key={top.id}
              data-testid="whot-pile-top"
              aria-label={`Top card: ${cardName(top)}`}
              className="absolute inset-0 animate-pop rounded-xl text-on-accent shadow-poster-lg [container-type:inline-size]"
              style={{ backgroundColor: SHAPE_COLOR[top.s] }}
            >
              <CardFace card={top} variant="pile" />
            </div>
          </div>
          {game.req ? (
            <span
              data-testid="whot-request"
              className="flex h-7 items-center gap-2 rounded-pill pl-1.5 pr-3 font-mono text-[11px] tracking-[.1em] whitespace-nowrap text-on-accent uppercase"
              style={{ backgroundColor: SHAPE_COLOR[game.req] }}
            >
              <ShapeMark shape={game.req} size="16px" />
              Asks for {SHAPE_NAME[game.req]}
            </span>
          ) : (
            <span className={`flex h-7 items-center ${MONO_LABEL} text-text-2`}>
              Played · {game.pile.length}
            </span>
          )}
        </div>

        {game.picking && !game.over ? (
          <ShapePicker onPick={(shape) => commit(callShape(game, shape))} />
        ) : null}
        <GameOver
          game={game}
          streak={streak}
          best={bestStreak}
          onAgain={onAgain}
        />
      </div>

      <div className="flex min-h-[84px] flex-col items-center gap-1.5 text-center sm:min-h-[50px]">
        <div
          data-testid="whot-status"
          aria-live="polite"
          className={`font-display text-[clamp(16px,2.4vw,20px)] font-semibold tracking-[.02em] uppercase ${statusLime ? 'text-link' : 'text-text-2'}`}
        >
          {statusText(game, myTurn, noMove)}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
          <div
            data-testid="whot-msg"
            aria-live="polite"
            className="max-w-[46ch] text-sm leading-[1.45] text-muted [text-wrap:pretty]"
          >
            {game.msg}
          </div>
          <button
            type="button"
            data-testid="whot-log-pill"
            aria-expanded={logOpen}
            aria-controls={PLAY_LOG_ID}
            onClick={() => setLogOpen((open) => !open)}
            className="h-[30px] flex-none cursor-pointer rounded-pill border border-ink-500 px-3 font-mono text-[11px] tracking-[.1em] text-paper uppercase hover:border-paper"
          >
            Log · {game.log.length}
          </button>
        </div>
      </div>

      <div
        className="flex flex-wrap justify-center gap-[clamp(6px,1.2vw,10px)] pt-2"
        data-testid="whot-hand"
      >
        {hand.map((c) => {
          const playable = myTurn && canPlay(c, game)
          return (
            <button
              key={c.id}
              type="button"
              data-testid="whot-card"
              data-playable={playable}
              aria-label={cardName(c)}
              disabled={!playable}
              onClick={() =>
                commit(playCard(game, 'you', c.id, level, Math.random))
              }
              className={`relative aspect-[5/7] w-[clamp(50px,min(10.5vw,11vh),80px)] flex-none rounded-[10px] p-0 text-on-accent transition-[transform,opacity,box-shadow] duration-150 [container-type:inline-size] disabled:cursor-default ${
                playable ? '-translate-y-2 cursor-pointer' : 'shadow-poster'
              }`}
              style={{
                backgroundColor: SHAPE_COLOR[c.s],
                opacity: myTurn && !playable ? 0.38 : 1,
                boxShadow: playable
                  ? `0 14px 26px -12px ${SHAPE_COLOR[c.s]}`
                  : undefined,
              }}
            >
              <CardFace card={c} variant="hand" />
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2.5">
        <ul className="flex flex-wrap justify-center gap-1.5">
          {legendEntries(game.rules).map((l) => (
            <li
              key={l.n}
              className="flex h-7 items-center gap-1.5 rounded-pill border border-ink-600 px-2.5 font-mono text-[11px] tracking-[.06em] text-text-2 uppercase"
            >
              <span className="font-medium text-paper">{l.n}</span>
              <span>{l.name}</span>
            </li>
          ))}
        </ul>
        <div
          role="group"
          aria-label="CPU difficulty"
          className="flex rounded-pill border border-ink-600 p-[3px]"
        >
          {LEVELS.map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={level === l}
              onClick={() => setLevel(l)}
              className={`h-7 cursor-pointer rounded-pill px-3.5 text-[13px] font-medium ${
                level === l ? 'bg-paper text-ink-900' : 'text-text-2'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
      {logOpen ? (
        <PlayLog
          log={game.log}
          gameOver={game.over !== null}
          onClose={() => setLogOpen(false)}
        />
      ) : null}
    </div>
  )
}

export default function Whot() {
  // Play again = remount the board (fresh deal, fresh state).
  const [round, setRound] = useState(0)
  return <WhotBoard key={round} onAgain={() => setRound((r) => r + 1)} />
}
