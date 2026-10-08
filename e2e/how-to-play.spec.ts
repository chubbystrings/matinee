import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { launch } from './launch'

const sheet = (page: Page) => page.getByRole('dialog', { name: 'How to play' })
const startBtn = (page: Page) =>
  page.getByRole('button', { name: 'PRESS START' })

/** Clicks before hydration are no-ops, so retry until the sheet is up. */
async function openVia(page: Page, open: () => Promise<void>) {
  await expect(async () => {
    await open()
    await expect(sheet(page)).toBeVisible({ timeout: 500 })
  }).toPass()
}
const closeSheet = async (page: Page) => {
  await page.keyboard.press('Escape')
  await expect(sheet(page)).toHaveCount(0)
}

async function seed(page: Page, s = 5) {
  await page.addInitScript((init) => {
    let a = init
    Math.random = () => {
      a = (a + 0x6d2b79f5) | 0
      let t = Math.imul(a ^ (a >>> 15), 1 | a)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }, s)
}

test.describe('entry points', () => {
  test('the ? button in the game header', async ({ page }) => {
    await launch(page, '/play/merge')
    const btn = page.getByRole('button', { name: 'How to play' })
    await expect(btn).toHaveAttribute('title', 'How to play (?)')
    const box = (await btn.boundingBox())!
    const restart = (await page
      .getByRole('button', { name: 'Restart' })
      .boundingBox())!
    expect(box.x + box.width).toBeLessThanOrEqual(restart.x)
    expect(Math.round(box.width)).toBe(40)
    await openVia(page, () => btn.click())
    await expect(
      sheet(page).getByRole('heading', { name: 'Merge' }),
    ).toBeVisible()
  })

  test('the lobby detail sheet has a How to play pill beside Play', async ({
    page,
  }) => {
    await page.goto('/?game=recall')
    const detail = page.getByRole('dialog').first()
    const pill = detail.getByRole('button', { name: 'How to play' })
    await expect(detail.getByRole('link', { name: /play/i })).toBeVisible()
    expect(Math.round((await pill.boundingBox())!.height)).toBe(52)
    await openVia(page, () => pill.click())
    await expect(sheet(page).getByText('How to play · No. 03')).toBeVisible()
    // the detail sheet stays open underneath
    await closeSheet(page)
    await expect(page).toHaveURL(/game=recall/)
  })

  test('the loader has a How to play pill left of the × button', async ({
    page,
  }) => {
    await page.goto('/play/whot')
    const pill = page
      .getByTestId('game-loader')
      .getByRole('button', { name: 'How to play' })
    const x = (await page
      .getByRole('button', { name: 'Back to lobby' })
      .boundingBox())!
    const p = (await pill.boundingBox())!
    expect(p.x + p.width).toBeLessThanOrEqual(x.x)
    await openVia(page, () => pill.click())
    await expect(
      sheet(page).getByRole('heading', { name: 'Whot' }),
    ).toBeVisible()
  })

  test('? toggles it in the game, on the loader and over the detail sheet, but not in the plain lobby', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(
      page.getByRole('heading', { name: 'Now showing' }),
    ).toBeVisible()
    await page.keyboard.press('?')
    await expect(sheet(page)).toHaveCount(0)

    await page.goto('/?game=noughts')
    await expect(page.getByRole('dialog').first()).toBeVisible()
    await openVia(page, () => page.keyboard.press('?'))
    await expect(
      sheet(page).getByRole('heading', { name: 'Noughts' }),
    ).toBeVisible()
    await page.keyboard.press('?')
    await expect(sheet(page)).toHaveCount(0)

    await page.goto('/play/popup')
    await expect(page.getByTestId('game-loader')).toBeVisible()
    await openVia(page, () => page.keyboard.press('?'))
    await expect(
      sheet(page).getByRole('heading', { name: 'Pop-Up' }),
    ).toBeVisible()
    await page.keyboard.press('?')
    await expect(sheet(page)).toHaveCount(0)
    await startBtn(page).click({ timeout: 10_000 })

    await openVia(page, () => page.keyboard.press('?'))
    await expect(
      sheet(page).getByRole('heading', { name: 'Pop-Up' }),
    ).toBeVisible()
  })
})

test.describe('content', () => {
  test('always opens on Rules, with Controls and Tips tabs', async ({
    page,
  }) => {
    await launch(page, '/play/snake')
    await openVia(page, () =>
      page.getByRole('button', { name: 'How to play' }).click(),
    )
    const s = sheet(page)
    await expect(s.getByRole('button', { name: 'Rules' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(
      s.getByText('Eat as many dots as you can without crashing.'),
    ).toBeVisible()
    await expect(
      s.getByText(
        'Hitting a wall or your own body ends the run. Your best score is saved.',
      ),
    ).toBeVisible()

    await s.getByRole('button', { name: 'Controls' }).click()
    await expect(s.getByText('On-screen buttons under the board')).toBeVisible()
    await expect(
      s.getByText('Close this sheet, then back to the lobby'),
    ).toBeVisible()
    await expect(s.getByText('Open or close this sheet')).toBeVisible()

    await s.getByRole('button', { name: 'Tips' }).click()
    await expect(
      s.getByText('Hug the edges early. The middle gets crowded as you grow.'),
    ).toBeVisible()
    await expect(
      s.getByText(
        'Leave yourself a way out before you follow a dot into a corner.',
      ),
    ).toBeVisible()

    await closeSheet(page)
    await openVia(page, () => page.keyboard.press('?'))
    await expect(
      sheet(page).getByRole('button', { name: 'Rules' }),
    ).toHaveAttribute('aria-pressed', 'true')
  })

  test('Whot shows special cards and levels (with the current one marked); other games do not', async ({
    page,
  }) => {
    await page.addInitScript(() =>
      localStorage.setItem(
        'matinee.whot.level',
        JSON.stringify({ state: { level: 'Hard' }, version: 1 }),
      ),
    )
    await launch(page, '/play/whot')
    await openVia(page, () => page.keyboard.press('?'))
    const s = sheet(page)
    const specials = s.getByTestId('help-specials')
    for (const t of [
      'Hold on',
      'Pick two',
      'Pick three',
      'Suspension',
      'General market',
      'WHOT',
    ])
      await expect(specials.getByText(t, { exact: true })).toBeVisible()
    const levels = s.getByTestId('help-levels')
    await expect(levels.getByText('Current')).toHaveCount(1)
    await expect(
      levels
        .locator('div.items-center')
        .filter({ hasText: 'Hard' })
        .getByText('Current'),
    ).toBeVisible()
    await expect(
      levels.getByText('CPU leads with special cards and its longest suit.'),
    ).toBeVisible()
    await closeSheet(page)

    await page.goto('/play/merge')
    await startBtn(page).click({ timeout: 10_000 })
    await openVia(page, () => page.keyboard.press('?'))
    await expect(sheet(page).getByTestId('help-specials')).toHaveCount(0)
    await expect(sheet(page).getByTestId('help-levels')).toHaveCount(0)
  })

  test('Tips lists the loader tip first', async ({ page }) => {
    await launch(page, '/play/recall')
    await openVia(page, () => page.keyboard.press('?'))
    await sheet(page).getByRole('button', { name: 'Tips' }).click()
    const tips = sheet(page).getByTestId('how-to-play-body')
    await expect(tips).toContainText(
      'Flip the corners first. They are easier to remember.',
    )
    const text = await tips.innerText()
    expect(text.indexOf('Flip the corners first')).toBeLessThan(
      text.indexOf('Match by symbol'),
    )
  })
})

test.describe('keyboard', () => {
  test('Esc closes the sheet first and only then leaves the game', async ({
    page,
  }) => {
    await launch(page, '/play/merge')
    await openVia(page, () => page.keyboard.press('?'))
    await page.keyboard.press('Escape')
    await expect(sheet(page)).toHaveCount(0)
    await expect(page).toHaveURL(/\/play\/merge$/)
    await page.keyboard.press('Escape')
    await expect(page).toHaveURL(/localhost:3000\/$/)
  })

  test('game keys are ignored while the sheet is open', async ({ page }) => {
    await launch(page, '/play/merge')
    const score = () =>
      page.getByText('Score', { exact: true }).locator('..').innerText()
    const before = await score()
    await openVia(page, () => page.keyboard.press('?'))
    for (const k of ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown'])
      await page.keyboard.press(k)
    await closeSheet(page)
    expect(await score()).toBe(before)
  })

  test('the × button and a click on the backdrop close it', async ({
    page,
  }) => {
    await launch(page, '/play/merge')
    await openVia(page, () => page.keyboard.press('?'))
    await sheet(page).getByRole('button', { name: 'Close' }).click()
    await expect(sheet(page)).toHaveCount(0)
    await openVia(page, () => page.keyboard.press('?'))
    await page.mouse.click(20, 300)
    await expect(sheet(page)).toHaveCount(0)
  })
})

test.describe('loader', () => {
  test('keeps loading behind the sheet and Enter does not press Start until it is closed', async ({
    page,
  }) => {
    await page.goto('/play/merge')
    await expect(page.getByTestId('boot-pct')).toBeVisible()
    await openVia(page, () => page.keyboard.press('?'))
    // loading finishes behind the open sheet
    await expect(
      page
        .getByTestId('game-loader')
        .getByRole('button', { name: 'PRESS START' }),
    ).toBeAttached({ timeout: 6000 })
    await page.keyboard.press('Enter')
    await page.keyboard.press('Space')
    await expect(page.getByTestId('game-loader')).toBeAttached()
    await closeSheet(page)
    await expect(page.getByTestId('game-loader')).toBeVisible()
    await page.keyboard.press('Enter')
    await expect(page.getByTestId('game-loader')).toHaveCount(0)
  })

  test('its pill stays dark in light mode while the sheet follows the theme', async ({
    page,
  }) => {
    await page.addInitScript(() =>
      localStorage.setItem('matinee.theme', 'light'),
    )
    await page.goto('/play/merge')
    const pill = page
      .getByTestId('game-loader')
      .getByRole('button', { name: 'How to play' })
    await expect(pill).toHaveCSS('border-top-color', 'rgb(58, 56, 70)')
    await openVia(page, () => pill.click())
    await expect(page.getByTestId('how-to-play-panel')).toHaveCSS(
      'background-color',
      'rgb(253, 252, 254)',
    )
  })
})

test.describe('layout', () => {
  test('desktop: a right side sheet inset 12px, 460px wide', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1100, height: 800 })
    await launch(page, '/play/merge')
    await openVia(page, () => page.keyboard.press('?'))
    await expect
      .poll(
        async () =>
          (await page.getByTestId('how-to-play-panel').boundingBox())?.x,
      )
      .toBe(1100 - 12 - 460)
    const box = (await page.getByTestId('how-to-play-panel').boundingBox())!
    expect(box.y).toBe(12)
    expect(box.height).toBe(800 - 24)
    expect(box.width).toBe(460)
  })

  test('below 640px it is a full-width bottom sheet with a grab handle', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 600, height: 800 })
    await launch(page, '/play/merge')
    await openVia(page, () => page.keyboard.press('?'))
    await expect
      .poll(async () =>
        Math.round(
          (await page.getByTestId('how-to-play-panel').boundingBox())?.y ?? 0,
        ),
      )
      .toBeGreaterThan(0)
    await page.waitForTimeout(400) // slide-up finished
    const box = (await page.getByTestId('how-to-play-panel').boundingBox())!
    expect(box.x).toBe(0)
    expect(box.width).toBe(600)
    expect(box.y + box.height).toBe(800)
    expect(box.height).toBeLessThanOrEqual(800 * 0.88 + 1)
  })

  test('narrowing the window with the sheet open switches it to a bottom sheet', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1100, height: 800 })
    await launch(page, '/play/merge')
    await openVia(page, () => page.keyboard.press('?'))
    await page.waitForTimeout(400)
    await page.setViewportSize({ width: 500, height: 800 })
    await expect
      .poll(async () => {
        const b = (await page.getByTestId('how-to-play-panel').boundingBox())!
        return [
          Math.round(b.x),
          Math.round(b.width),
          Math.round(b.y + b.height),
        ]
      })
      .toEqual([0, 500, 800])
  })
})

test.describe('pausing', () => {
  test('Serpent freezes while open and carries on afterwards', async ({
    page,
  }) => {
    await launch(page, '/play/snake')
    await page.waitForLoadState('networkidle')
    await page.keyboard.press('ArrowUp')
    await expect(page.getByText('Ready', { exact: true })).toBeHidden()
    await openVia(page, () => page.keyboard.press('?'))
    await expect(page.getByTestId('how-to-play-paused')).toHaveText(
      'Paused · resumes when you close this',
    )
    // the snake would have hit the wall within ~2.9 s
    await page.waitForTimeout(4500)
    await closeSheet(page)
    await expect(page.getByText('Game over')).toHaveCount(0)
    await expect(page.getByText('Game over')).toBeVisible({ timeout: 6000 })
  })

  test('Pop-Up keeps its remaining time', async ({ page }) => {
    await launch(page, '/play/popup')
    await page.getByRole('button', { name: 'Start', exact: true }).click()
    const time = () =>
      page
        .getByText(/^\d+s$/)
        .first()
        .innerText()
        .then((t) => parseInt(t))
    await expect.poll(time).toBeLessThanOrEqual(28)
    await openVia(page, () => page.keyboard.press('?'))
    await expect(page.getByTestId('how-to-play-paused')).toHaveText(
      'Paused · the timer resumes when you close this',
    )
    const before = await time()
    await page.waitForTimeout(3500)
    expect(await time()).toBe(before)
    await closeSheet(page)
    const after = await time()
    expect(after).toBeGreaterThanOrEqual(before - 1)
    await expect.poll(time, { timeout: 5000 }).toBeLessThan(after)
  })

  test('Quickdraw cancels an armed round', async ({ page }) => {
    await launch(page, '/play/quickdraw')
    const panel = page.getByTestId('qd-panel')
    await panel.dispatchEvent('pointerdown')
    await expect(panel).toHaveAttribute('data-phase', 'wait')
    await openVia(page, () => page.keyboard.press('?'))
    await expect(page.getByTestId('how-to-play-paused')).toHaveText(
      'Round cancelled · tap to arm a new one',
    )
    await closeSheet(page)
    await expect(panel).toHaveAttribute('data-phase', 'idle')
    await page.waitForTimeout(4500)
    await expect(panel).toHaveAttribute('data-phase', 'idle')
  })

  test('Merge has nothing to pause: no footer', async ({ page }) => {
    await launch(page, '/play/merge')
    await openVia(page, () => page.keyboard.press('?'))
    await expect(page.getByTestId('how-to-play-paused')).toHaveCount(0)
  })

  test('the Whot CPU waits while the sheet is open on its turn, then plays within about a second of closing', async ({
    page,
  }) => {
    await seed(page)
    await launch(page, '/play/whot')
    await expect(page.getByTestId('whot-status')).toHaveText('Your turn')
    const cpuCards = () => page.getByTestId('whot-cpu-count').innerText()
    const before = await cpuCards()
    const status = page.getByTestId('whot-status')
    await page.getByRole('button', { name: 'Draw from market' }).click() // hands the turn to the CPU
    await expect(status).toHaveText('CPU is thinking…')
    await openVia(page, () => page.keyboard.press('?'))
    await expect(page.getByTestId('how-to-play-paused')).toHaveText(
      'Paused · the CPU waits until you close this',
    )
    await page.waitForTimeout(2200)
    await expect(page.getByTestId('whot-msg')).toHaveText(
      'You drew from the market.',
    )
    expect(await cpuCards()).toBe(before)
    const t = Date.now()
    await closeSheet(page)
    await expect(page.getByTestId('whot-msg')).toHaveText(/^CPU /, {
      timeout: 2500,
    })
    expect(Date.now() - t).toBeLessThan(1700)
  })

  test('Whot on your own turn shows no paused footer', async ({ page }) => {
    await seed(page)
    await launch(page, '/play/whot')
    await expect(page.getByTestId('whot-status')).toHaveText('Your turn')
    await openVia(page, () => page.keyboard.press('?'))
    await expect(page.getByTestId('how-to-play-paused')).toHaveCount(0)
  })
})
