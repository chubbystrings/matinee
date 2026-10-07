import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { launch } from './launch'

const SYMS = ['◆', '●', '▲', '■', '★', '✚', '◐', '✦']

// With Math.random() === 0 the Fisher-Yates shuffle is deterministic; mirror it here.
function deterministicDeck() {
  const d = SYMS.flatMap((s) => [s, s])
  for (let i = d.length - 1; i > 0; i--) [d[i], d[0]] = [d[0], d[i]]
  return d
}

function pairs() {
  const deck = deterministicDeck()
  const byS = new Map<string, number[]>()
  deck.forEach((s, i) => byS.set(s, [...(byS.get(s) ?? []), i]))
  return { deck, matches: [...byS.values()] }
}

async function open(page: Page) {
  await page.addInitScript(() => {
    Math.random = () => 0
  })
  await launch(page, '/play/recall')
  await page.waitForLoadState('networkidle')
  // install the fake clock after hydration, then freeze time so runFor is exact
  await page.clock.install({ time: 0 })
  await page.clock.pauseAt(1000)
  await expect(page.getByRole('button', { name: /^Card \d+/ })).toHaveCount(16)
}

const card = (page: Page, i: number) => page.getByRole('button', { name: new RegExp(`^Card ${i + 1}(,|:)`) })

async function flip(page: Page, i: number) {
  await expect(async () => {
    if ((await card(page, i).getAttribute('data-state')) === 'down') await card(page, i).click({ timeout: 500 })
    await expect(card(page, i)).not.toHaveAttribute('data-state', 'down', { timeout: 500 })
  }).toPass()
}

test('renders 16 face-down cards and starting stats', async ({ page }) => {
  await open(page)
  await expect(page.locator('[data-state="down"]')).toHaveCount(16)
  await expect(page.getByText('Moves', { exact: true })).toBeVisible()
})

test('mismatch flips back after 750 ms and locks input meanwhile', async ({ page }) => {
  await open(page)
  const { matches } = pairs()
  const a = matches[0][0]
  const b = matches[1][0]
  const c = matches[2][0]
  await flip(page, a)
  await flip(page, b)
  await expect(page.locator('[data-state="up"]')).toHaveCount(2)
  // locked: a third click does nothing
  await card(page, c).click()
  await expect(card(page, c)).toHaveAttribute('data-state', 'down')
  await page.clock.runFor(700)
  await expect(page.locator('[data-state="up"]')).toHaveCount(2)
  await page.clock.runFor(100)
  await expect(page.locator('[data-state="down"]')).toHaveCount(16)
})

test('matching pairs stay, moves count pairs flipped, clearing shows overlay', async ({ page }) => {
  await open(page)
  const { matches } = pairs()
  for (const [x, y] of matches) {
    await flip(page, x)
    await flip(page, y)
  }
  await expect(page.locator('[data-state="done"]')).toHaveCount(16)
  await expect(page.getByText('Board cleared').or(page.getByText('New best'))).toBeVisible()
  await expect(page.getByText('8 moves').first()).toBeVisible()

  // Play again reshuffles and resets
  await page.getByRole('button', { name: 'Play again' }).click()
  await expect(page.locator('[data-state="down"]')).toHaveCount(16)
  await expect(page.getByRole('button', { name: 'Play again' })).toHaveCount(0)
})

test('best is stored as fewest moves', async ({ page }) => {
  await open(page)
  const { matches } = pairs()
  for (const [x, y] of matches) {
    await flip(page, x)
    await flip(page, y)
  }
  await expect(page.getByText('8 moves').first()).toBeVisible()
  await expect(page.getByText('New best')).toBeVisible()
  const stored = await page.evaluate(() => localStorage.getItem('matinee.best.v1'))
  expect(JSON.parse(stored ?? '{}').state.best.recall).toBe(8)
})
