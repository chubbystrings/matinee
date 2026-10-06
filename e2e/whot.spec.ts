import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

/** Deterministic Math.random (mulberry32) so the deal is reproducible. */
// Seed 2: the player moves first and the starter is a plain card, so no timer exists before the fake clock is installed.
async function seed(page: Page, s = 2) {
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

async function open(page: Page, { fakeClock = true } = {}) {
  await page.goto('/play/whot')
  await page.waitForLoadState('networkidle')
  await expect(page.getByTestId('whot-card').first()).toBeVisible()
  if (!fakeClock) return
  // Fake time after hydration so each CPU pause can be stepped with runFor.
  await page.clock.install({ time: 0 })
  await page.clock.pauseAt(1000)
}

const status = (page: Page) => page.getByTestId('whot-status')
const num = async (page: Page, id: string) =>
  Number(((await page.getByTestId(id).textContent()) ?? '').match(/(\d+)/)?.[1])

test('renders the table: CPU hand, market, pile, status, legend and stats', async ({
  page,
}) => {
  await seed(page)
  await open(page)
  await expect(page.getByRole('heading', { name: 'Whot' })).toBeVisible()
  await expect(page.getByText('Wins', { exact: true })).toBeVisible()
  await expect(page.getByText('Streak', { exact: true })).toBeVisible()
  await expect(page.getByText('Arrows')).toHaveCount(0)
  await expect(
    page.getByText('Tap a card · Tap market to draw · Esc to exit'),
  ).toBeVisible()
  await expect(page.getByTestId('whot-pile-top')).toBeVisible()
  for (const t of [
    'Hold on',
    'Pick two',
    'Pick three',
    'Suspension',
    'General market',
    'WHOT',
  ]) {
    await expect(
      page.getByRole('listitem').filter({ hasText: t }),
    ).toBeVisible()
  }
  // 54 cards: hand + CPU + market + the one flipped starter (a penalty starter only moves cards between hands and market).
  const hand = await page.getByTestId('whot-card').count()
  expect(
    hand +
      (await num(page, 'whot-cpu-count')) +
      (await num(page, 'whot-market')) +
      1,
  ).toBe(54)
  await expect(status(page)).not.toBeEmpty()
  await expect(page.getByTestId('whot-msg')).toHaveText('You go first.')
  await expect(status(page)).toHaveText(/Your turn|No match/)
  expect(await num(page, 'whot-market')).toBe(45)
  expect(await num(page, 'whot-cpu-count')).toBe(4)
  expect(hand).toBe(4)
})

test('only legal cards are enabled on your turn; illegal cards are disabled', async ({
  page,
}) => {
  await seed(page)
  await open(page)
  // step until it is the player's move
  for (
    let i = 0;
    i < 6 &&
    !/Your turn|No match/.test((await status(page).textContent()) ?? '');
    i++
  ) {
    await page.clock.runFor(800)
  }
  await expect(status(page)).toHaveText(/Your turn|No match|Call a shape/)
  const cards = page.getByTestId('whot-card')
  const total = await cards.count()
  const playable = await page
    .locator('[data-testid=whot-card][data-playable=true]')
    .count()
  expect(playable).toBeLessThanOrEqual(total)
  await expect(
    page.locator('[data-testid=whot-card][data-playable=false]'),
  ).toHaveCount(total - playable)
  for (const el of await page
    .locator('[data-testid=whot-card][data-playable=false]')
    .all()) {
    await expect(el).toBeDisabled()
  }
})

test('drawing takes one card, ends your turn, and the CPU replies after 800 ms', async ({
  page,
}) => {
  await seed(page)
  await open(page)
  for (
    let i = 0;
    i < 6 &&
    !/Your turn|No match/.test((await status(page).textContent()) ?? '');
    i++
  ) {
    await page.clock.runFor(800)
  }
  const before = await page.getByTestId('whot-card').count()
  const market = await num(page, 'whot-market')
  await page.getByRole('button', { name: 'Draw from market' }).click()
  await expect(page.getByTestId('whot-card')).toHaveCount(before + 1)
  expect(await num(page, 'whot-market')).toBe(market - 1)
  await expect(status(page)).toHaveText('CPU is thinking…')
  await expect(
    page.getByRole('button', { name: 'Draw from market' }),
  ).toBeDisabled()
  await page.clock.runFor(700)
  await expect(status(page)).toHaveText('CPU is thinking…')
  await page.clock.runFor(150)
  // the CPU has acted (a special card can leave it on move, so check the message, not the status)
  await expect(page.getByTestId('whot-msg')).toHaveText(/^CPU /)
})

test('difficulty toggle persists in matinee.whot.level', async ({ page }) => {
  await open(page, { fakeClock: false })
  await expect(page.getByRole('button', { name: 'Easy' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page.getByRole('button', { name: 'Hard' }).click()
  await expect(page.getByRole('button', { name: 'Hard' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  const stored = await page.evaluate(() =>
    localStorage.getItem('matinee.whot.level'),
  )
  expect(JSON.parse(stored ?? '{}').state.level).toBe('Hard')
  await page.reload()
  await expect(page.getByRole('button', { name: 'Hard' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})

test('restart mid-game does not count as a result', async ({ page }) => {
  await seed(page)
  await open(page)
  await page.getByRole('button', { name: 'Restart' }).click()
  await expect(page.getByTestId('whot-card').first()).toBeVisible()
  expect(
    await page.evaluate(() => localStorage.getItem('matinee.whot.v1')),
  ).toBeNull()
})

/** Plays the whole game with a simple bot: play the first legal card, else draw. */
async function playToTheEnd(page: Page) {
  const again = page.getByRole('button', { name: 'Play again' })
  for (let step = 0; step < 600; step++) {
    if (await again.isVisible()) return
    const picker = page.getByRole('button', { name: 'Circle', exact: true })
    if (await picker.isVisible()) {
      await picker.click()
    } else if (
      /Your turn|No match/.test((await status(page).textContent()) ?? '')
    ) {
      const card = page
        .locator('[data-testid=whot-card][data-playable=true]')
        .first()
      if (await card.count()) await card.click()
      else await page.getByRole('button', { name: 'Draw from market' }).click()
    }
    await page.clock.runFor(800)
  }
  throw new Error('game did not finish')
}

test('a full game ends with a result, records exactly one outcome, and Play again redeals', async ({
  page,
}) => {
  test.setTimeout(120_000)
  await seed(page)
  await open(page)
  await playToTheEnd(page)

  await expect(status(page)).toHaveText(/You win|CPU wins|Draw/)
  await expect(page.getByText(/Win streak \d+ · best \d+/)).toBeVisible()
  const stored = JSON.parse(
    (await page.evaluate(() => localStorage.getItem('matinee.whot.v1'))) ??
      '{}',
  ).state
  expect(stored.wins + stored.losses + stored.draws).toBe(1)
  // the CPU hand is revealed at game over
  await expect(
    page.getByTestId('whot-cpu-hand').getByText(/\d+/).first(),
  ).toBeVisible()

  await page.getByRole('button', { name: 'Play again' }).click()
  await expect(page.getByRole('button', { name: 'Play again' })).toHaveCount(0)
  expect(await num(page, 'whot-market')).toBeGreaterThan(30)
  const after = JSON.parse(
    (await page.evaluate(() => localStorage.getItem('matinee.whot.v1'))) ??
      '{}',
  ).state
  expect(after.wins + after.losses + after.draws).toBe(1)
})

test('detail sheet shows wins and best streak from the whot store', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'matinee.whot.v1',
      JSON.stringify({
        state: { wins: 5, losses: 1, draws: 0, streak: 2, best: 3 },
        version: 1,
      }),
    ),
  )
  await page.goto('/?game=whot')
  const dialog = page.getByRole('dialog', { name: 'Whot' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('5 wins · best streak 3')).toBeVisible()
  await expect(
    dialog.locator('dd').filter({ hasText: 'You vs CPU' }),
  ).toBeVisible()
})

test('play view stat pills read from the stored wins and streak', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'matinee.whot.v1',
      JSON.stringify({
        state: { wins: 5, losses: 1, draws: 0, streak: 2, best: 3 },
        version: 1,
      }),
    ),
  )
  await page.goto('/play/whot')
  await page.waitForLoadState('networkidle')
  await expect(page.getByText('5', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('2', { exact: true }).first()).toBeVisible()
})
