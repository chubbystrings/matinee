import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

async function open(page: Page) {
  await page.goto('/play/popup')
  await page.waitForLoadState('networkidle')
  // install the fake clock after hydration, then freeze time so runFor is exact
  await page.clock.install({ time: 0 })
  await page.clock.pauseAt(1000)
}

async function start(page: Page) {
  await expect(async () => {
    await page.getByRole('button', { name: 'Start', exact: true }).click({ timeout: 500 })
    await expect(page.getByRole('button', { name: 'Start', exact: true })).toHaveCount(0, { timeout: 500 })
  }).toPass()
}

const target = (page: Page) => page.getByTestId('target')

test('pre-round overlay shows copy and default stats', async ({ page }) => {
  await open(page)
  await expect(page.getByText('30 seconds')).toBeVisible()
  await expect(page.getByText('Hit the pink')).toBeVisible()
  await expect(page.getByText('30s', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Start', exact: true })).toBeVisible()
})

test('first target appears after 500 ms; hit scores and respawns after 160 ms', async ({ page }) => {
  await open(page)
  await start(page)
  await expect(target(page)).toHaveCount(0)
  await page.clock.runFor(500)
  await expect(target(page)).toHaveCount(1)
  await target(page).click()
  await expect(target(page)).toHaveCount(0)
  await expect(page.getByText('Hits', { exact: true })).toBeVisible()
  await expect(page.getByText('1', { exact: true })).toBeVisible()
  await page.clock.runFor(100)
  await expect(target(page)).toHaveCount(0)
  await page.clock.runFor(100)
  await expect(target(page)).toHaveCount(1)
})

test('empty holes do nothing and the next target is never the same hole', async ({ page }) => {
  await open(page)
  await start(page)
  await page.clock.runFor(500)
  const holes = page.getByRole('button', { name: /^Hole/ })
  const index = async () => holes.evaluateAll((els) => els.findIndex((e) => e.querySelector('[data-testid=target]')))
  let prev = await index()
  const empty = holes.nth((prev + 1) % 9)
  await empty.click()
  await expect(page.getByText('0', { exact: true }).first()).toBeVisible()
  for (let n = 0; n < 6; n++) {
    await page.clock.runFor(950)
    const cur = await index()
    expect(cur).not.toBe(prev)
    prev = cur
  }
})

test('countdown ticks and round ends with results overlay', async ({ page }) => {
  await open(page)
  await start(page)
  await page.clock.runFor(5000)
  await expect(page.getByText('25s', { exact: true })).toBeVisible()
  await page.clock.runFor(26000)
  await expect(page.getByText('0 hits')).toBeVisible()
  await expect(page.getByRole('status').getByText(/^(New best|Time)$/)).toBeVisible()
  await expect(target(page)).toHaveCount(0)
  await page.getByRole('button', { name: 'Play again' }).click()
  await expect(page.getByText('Hit the pink')).toBeVisible()
})

test('scoring a hit then finishing records the best', async ({ page }) => {
  await open(page)
  await start(page)
  await page.clock.runFor(500)
  await target(page).click()
  await page.clock.runFor(31000)
  await expect(page.getByText('1 hits')).toBeVisible()
  await expect(page.getByText('New best')).toBeVisible()
  const stored = await page.evaluate(() => localStorage.getItem('matinee.best.v1'))
  expect(JSON.parse(stored ?? '{}').state.best.popup).toBe(1)
})
