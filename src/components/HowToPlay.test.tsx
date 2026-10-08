import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GAMES } from '#/games/registry'
import { HELP, HELP_KEYS } from '#/games/help'
import { HELP_CLOSE_MS, useHelp } from '#/store/help'
import { useWhotLevel } from '#/store/whot'
import { HowToPlaySheet, handleHelpKey, helpContext } from './HowToPlay'

// jsdom has no modal <dialog> yet.
beforeEach(() => {
  const dialog = HTMLDialogElement.prototype as Partial<HTMLDialogElement>
  dialog.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  dialog.close ??= function (this: HTMLDialogElement) {
    this.removeAttribute('open')
  }
  vi.useFakeTimers()
  useHelp.setState({ id: null, tab: 'rules', closing: false, pausedText: null })
  useWhotLevel.setState({ level: 'Easy' })
})
afterEach(() => vi.useRealTimers())

const tab = (name: string) => screen.getByRole('button', { name })

describe('HowToPlaySheet', () => {
  it('shows the game, its number and the goal, opening on Rules', () => {
    render(<HowToPlaySheet gameId="recall" />)
    expect(screen.getByText('How to play · No. 03')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Recall' })).toBeInTheDocument()
    expect(tab('Rules')).toHaveAttribute('aria-pressed', 'true')
    expect(
      screen.getByText('Find all eight pairs in as few moves as you can.'),
    ).toBeInTheDocument()
    expect(screen.getByText('01')).toBeInTheDocument()
    expect(screen.getByText('05')).toBeInTheDocument()
  })

  it.each(GAMES.map((g) => [g.title, g.id] as const))(
    '%s shows its own rules',
    (_, id) => {
      render(<HowToPlaySheet gameId={id} />)
      for (const rule of HELP[id].rules)
        expect(screen.getByText(rule)).toBeInTheDocument()
    },
  )

  it('special cards and levels appear only for Whot', () => {
    const { unmount } = render(<HowToPlaySheet gameId="merge" />)
    expect(screen.queryByTestId('help-specials')).toBeNull()
    expect(screen.queryByTestId('help-levels')).toBeNull()
    unmount()
    render(<HowToPlaySheet gameId="whot" />)
    const specials = screen.getByTestId('help-specials')
    for (const name of [
      'Hold on',
      'Pick two',
      'Pick three',
      'Suspension',
      'General market',
      'WHOT',
    ])
      expect(within(specials).getByText(name)).toBeInTheDocument()
    const levels = screen.getByTestId('help-levels')
    for (const l of ['Easy', 'Hard', 'Expert'])
      expect(within(levels).getByText(l)).toBeInTheDocument()
  })

  it('marks only the active Whot level as Current', () => {
    useWhotLevel.setState({ level: 'Expert' })
    render(<HowToPlaySheet gameId="whot" />)
    const levels = screen.getByTestId('help-levels')
    expect(within(levels).getAllByText('Current')).toHaveLength(1)
    expect(
      within(
        levels.querySelectorAll('div.flex.items-center')[2] as HTMLElement,
      ).getByText('Current'),
    ).toBeInTheDocument()
  })

  it('Controls lists the game controls, then Restart, ? and Esc', () => {
    render(<HowToPlaySheet gameId="snake" />)
    fireEvent.click(tab('Controls'))
    expect(tab('Controls')).toHaveAttribute('aria-pressed', 'true')
    expect(
      screen.getByText('On-screen buttons under the board'),
    ).toBeInTheDocument()
    const body = screen.getByTestId('how-to-play-body')
    const actions = HELP_KEYS.map(([, a]) => a)
    const text = body.textContent
    expect(actions.every((a) => text.includes(a))).toBe(true)
    expect(text.indexOf('Restart')).toBeGreaterThan(
      text.indexOf('On-screen buttons'),
    )
    expect(
      text.indexOf('Close this sheet, then back to the lobby'),
    ).toBeGreaterThan(text.indexOf('Open or close this sheet'))
  })

  it('Tips puts the loader tip first, then the extras, numbered', () => {
    render(<HowToPlaySheet gameId="quickdraw" />)
    fireEvent.click(tab('Tips'))
    const body = screen.getByTestId('how-to-play-body')
    const text = body.textContent
    const loaderTip = GAMES.find((g) => g.id === 'quickdraw')!.tip
    expect(text.indexOf(loaderTip)).toBeLessThan(
      text.indexOf(HELP.quickdraw.tips[0]),
    )
    expect(text).toContain('01')
    expect(text).toContain('02')
  })

  it('shows the paused footer only when something was paused', () => {
    const { unmount } = render(<HowToPlaySheet gameId="snake" />)
    expect(screen.queryByTestId('how-to-play-paused')).toBeNull()
    unmount()
    useHelp.setState({ pausedText: 'Paused · resumes when you close this' })
    render(<HowToPlaySheet gameId="snake" />)
    expect(screen.getByTestId('how-to-play-paused')).toHaveTextContent(
      'Paused · resumes when you close this',
    )
  })

  it('× and the scrim close it (exit animation first)', () => {
    useHelp.getState().open('merge')
    const { container } = render(<HowToPlaySheet gameId="merge" />)
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(useHelp.getState().closing).toBe(true)
    act(() => void vi.advanceTimersByTime(HELP_CLOSE_MS))
    expect(useHelp.getState().id).toBeNull()

    useHelp.getState().open('merge')
    fireEvent.click(container.querySelector('[aria-hidden].fixed.inset-0')!)
    expect(useHelp.getState().closing).toBe(true)
  })

  it('uses the panel and sheet classes for desktop and phone', () => {
    render(<HowToPlaySheet gameId="merge" />)
    const panel = screen.getByTestId('how-to-play-panel')
    expect(panel.className).toContain('w-[min(460px,calc(100vw-24px))]')
    expect(panel.className).toContain('max-sm:max-h-[88vh]')
    expect(panel.className).toContain('animate-help-in')
    expect(panel.className).toContain('max-sm:animate-help-up')
  })
})

describe('helpContext', () => {
  it('uses the played or booting game on the play route', () => {
    expect(helpContext({ pathname: '/play/whot', search: {} })).toBe('whot')
  })
  it('uses the open detail sheet in the lobby', () => {
    expect(helpContext({ pathname: '/', search: { game: 'merge' } })).toBe(
      'merge',
    )
  })
  it('is null in the plain lobby and for unknown ids', () => {
    expect(helpContext({ pathname: '/', search: {} })).toBeNull()
    expect(helpContext({ pathname: '/', search: { game: 'bogus' } })).toBeNull()
    expect(helpContext({ pathname: '/play/bogus', search: {} })).toBeNull()
  })
  it('prefers the play route over a stale search param', () => {
    expect(
      helpContext({ pathname: '/play/snake', search: { game: 'merge' } }),
    ).toBe('snake')
  })
})

describe('handleHelpKey', () => {
  const press = (key: string, target?: EventTarget) => {
    const e = new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
    })
    if (target) Object.defineProperty(e, 'target', { value: target })
    const swallowed = vi.spyOn(e, 'stopImmediatePropagation')
    return { e, swallowed }
  }
  const play = { pathname: '/play/whot', search: {} }
  const lobby = { pathname: '/', search: {} }

  it('? opens the sheet for the playing game and swallows the key', () => {
    const { e, swallowed } = press('?')
    handleHelpKey(e, play)
    expect(useHelp.getState().id).toBe('whot')
    expect(swallowed).toHaveBeenCalled()
    expect(e.defaultPrevented).toBe(true)
  })

  it('? does nothing in the plain lobby and lets the key through', () => {
    const { e, swallowed } = press('?')
    handleHelpKey(e, lobby)
    expect(useHelp.getState().id).toBeNull()
    expect(swallowed).not.toHaveBeenCalled()
  })

  it('? closes an open sheet', () => {
    useHelp.getState().open('whot')
    handleHelpKey(press('?').e, play)
    expect(useHelp.getState().closing).toBe(true)
  })

  it('Esc closes the open sheet and nothing else sees it', () => {
    useHelp.getState().open('whot')
    const { e, swallowed } = press('Escape')
    handleHelpKey(e, play)
    expect(useHelp.getState().closing).toBe(true)
    expect(swallowed).toHaveBeenCalled()
  })

  it('while open, every other key is swallowed (no Press Start, no game input)', () => {
    useHelp.getState().open('snake')
    for (const key of ['Enter', ' ', 'ArrowUp', 'w', 'x']) {
      const { e, swallowed } = press(key)
      handleHelpKey(e, play)
      expect(swallowed, key).toHaveBeenCalled()
    }
    expect(useHelp.getState().closing).toBe(false)
  })

  it('with the sheet closed, other keys pass through untouched', () => {
    for (const key of ['Enter', 'Escape', 'ArrowUp']) {
      const { e, swallowed } = press(key)
      handleHelpKey(e, play)
      expect(swallowed, key).not.toHaveBeenCalled()
    }
  })

  it('? is ignored while typing in a text field', () => {
    const input = document.createElement('input')
    input.type = 'text'
    const { e } = press('?', input)
    handleHelpKey(e, play)
    expect(useHelp.getState().id).toBeNull()
  })
})
