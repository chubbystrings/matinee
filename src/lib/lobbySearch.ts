import { GENRES, isGameId } from '#/games/registry'
import type { GenreFilter } from '#/games/registry'
import type { GameId } from '#/games/types'

export type LobbySearch = { genre?: Exclude<GenreFilter, 'All'>; game?: GameId }

export function validateLobbySearch(search: Record<string, unknown>): LobbySearch {
  const genre = typeof search.genre === 'string' ? search.genre : undefined
  const game = typeof search.game === 'string' ? search.game : undefined
  return {
    genre: genre && genre !== 'All' && (GENRES as ReadonlyArray<string>).includes(genre) ? (genre as LobbySearch['genre']) : undefined,
    game: game && isGameId(game) ? game : undefined,
  }
}
