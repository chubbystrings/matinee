import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Outcome } from './engine'
import { table, real } from './testUtil'
import { GameOver } from './Whot'

function renderOver(over: Outcome) {
  const game = table({
    hand: [real('star', 1)],
    cpu: [real('circle', 7)],
    pile: [real('circle', 3)],
    over,
  })
  render(<GameOver game={game} streak={2} best={3} onAgain={() => {}} />)
}

describe('GameOver Expert pill', () => {
  it('shows "Expert win" above the headline on an Expert win', () => {
    renderOver({ result: 'win', reason: 'out', expert: true })
    const pill = screen.getByText('Expert win')
    expect(pill).toBeInTheDocument()
    expect(
      pill.compareDocumentPosition(screen.getByText('You win')) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it.each([
    ['a win on another level', { result: 'win', reason: 'out' }],
    ['an Expert loss', { result: 'loss', reason: 'out', expert: true }],
    [
      'an Expert draw',
      {
        result: 'draw',
        reason: 'count',
        expert: true,
        yourTotal: 4,
        cpuTotal: 4,
      },
    ],
  ] as const)('is hidden for %s', (_, over) => {
    renderOver(over)
    expect(screen.queryByText('Expert win')).toBeNull()
  })
})
