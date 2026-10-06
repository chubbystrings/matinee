import { createFileRoute, redirect } from '@tanstack/react-router'
import { Suspense, useState } from 'react'
import { PlayTopBar } from '#/components/PlayTopBar'
import { GAME_BY_ID, GAME_COMPONENTS, isGameId } from '#/games/registry'
import { defaultStats } from '#/games/stats'
import type { GameMeta, GameStats } from '#/games/types'
import { useEscapeToLobby } from '#/hooks/useEscapeToLobby'
import { useScores } from '#/store/scores'

export const Route = createFileRoute('/play/$gameId')({
  beforeLoad: ({ params }) => {
    if (!isGameId(params.gameId)) throw redirect({ to: '/' })
  },
  component: PlayRoute,
})

function PlayRoute() {
  const { gameId } = Route.useParams()
  const game = GAME_BY_ID.get(gameId as GameMeta['id'])
  // key resets all per-game state when navigating between games
  return game ? <PlayScreen key={game.id} game={game} /> : null
}

function PlayScreen({ game }: { game: GameMeta }) {
  useEscapeToLobby()
  const best = useScores((s) => s.best[game.id])
  const recordBest = useScores((s) => s.recordBest)
  const { snakeSpeed, cpuLevel } = useScores((s) => s.settings)
  const [reported, setReported] = useState<GameStats | null>(null)
  const [round, setRound] = useState(0)

  const Game = GAME_COMPONENTS[game.id]
  const stats = reported ?? defaultStats(game, best)

  // Restart = remount via key, which resets every piece of game state.
  const restart = () => {
    setReported(null)
    setRound((r) => r + 1)
  }

  return (
    <div className="fixed inset-0 flex animate-fade flex-col bg-ink-900 text-paper">
      <PlayTopBar game={game} stats={stats} onRestart={restart} />
      <div className="flex flex-1 touch-none select-none flex-col items-center justify-center gap-[18px] overflow-hidden px-4 py-[18px]">
        <Suspense
          fallback={
            <div className="rounded-[10px] bg-ink-800 px-4 py-2 font-mono text-xs uppercase tracking-[.1em] text-dim">
              Loading…
            </div>
          }
        >
          <Game
            key={`${round}-${snakeSpeed}-${cpuLevel}`}
            onStats={setReported}
            onResult={(score) => recordBest(game.id, score)}
            settings={{ snakeSpeed, cpuLevel }}
          />
        </Suspense>
      </div>
      <div className="px-4 pb-3.5 text-center font-mono text-[11px] uppercase tracking-[.1em] text-dim">
        {game.controls} · Esc to exit
      </div>
    </div>
  )
}
