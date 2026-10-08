import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { GAME_BY_ID } from '#/games/registry'
import { EMPTY_STATS, useWhotStats } from '#/store/whot'
import { Poster } from './Poster'

const whot = GAME_BY_ID.get('whot')!
const snake = GAME_BY_ID.get('snake')!

describe('Poster Expert badge', () => {
  beforeEach(() => useWhotStats.setState(EMPTY_STATS))

  it('is hidden until you have won on Expert', () => {
    render(<Poster game={whot} />)
    expect(screen.queryByTestId('poster-expert-badge')).toBeNull()
  })

  it('shows on the Whot poster once expertWins > 0', () => {
    useWhotStats.setState({ expertWins: 1 })
    render(<Poster game={whot} />)
    expect(screen.getByTestId('poster-expert-badge')).toHaveTextContent(
      'Expert',
    )
  })

  it('never shows on another game poster', () => {
    useWhotStats.setState({ expertWins: 3 })
    render(<Poster game={snake} />)
    expect(screen.queryByTestId('poster-expert-badge')).toBeNull()
  })
})
