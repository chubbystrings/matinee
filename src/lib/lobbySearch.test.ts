import { describe, expect, it } from 'vitest'
import { validateLobbySearch } from './lobbySearch'

describe('validateLobbySearch', () => {
  it('accepts known genre and game', () => {
    expect(validateLobbySearch({ genre: 'Puzzle', game: 'merge' })).toEqual({ genre: 'Puzzle', game: 'merge' })
  })
  it('drops All, unknown genre and unknown game', () => {
    expect(validateLobbySearch({ genre: 'All', game: 'nope' })).toEqual({ genre: undefined, game: undefined })
    expect(validateLobbySearch({ genre: 'Bogus' })).toEqual({ genre: undefined, game: undefined })
    expect(validateLobbySearch({ genre: 3, game: 4 })).toEqual({ genre: undefined, game: undefined })
  })
})
