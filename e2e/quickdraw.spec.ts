import { expect, test  } from '@playwright/test'
import type {Page} from '@playwright/test';
import { launch } from './launch'

const panel = (page: Page) => page.getByTestId('qd-panel')

async function setup(page: Page) {
  await page.addInitScript(() => {
    Math.random = () => 0 // wait = 1200 ms
  })
  await page.clock.install()
  await launch(page, '/play/quickdraw')
  await page.waitForLoadState('networkidle')
  await page.clock.pauseAt(Date.now() + 1000) // deterministic from here on
}

async function start(page: Page) {
  await expect(async () => {
    await panel(page).dispatchEvent('pointerdown')
    await expect(panel(page)).toHaveAttribute('data-phase', 'wait', { timeout: 300 })
  }).toPass()
}

test('idle copy and default stats', async ({ page }) => {
  await setup(page)
  await expect(page.getByText('Tap to start')).toBeVisible()
  await expect(page.getByText('When the panel turns lime, tap as fast as you can.')).toBeVisible()
  await expect(page.getByText('Last', { exact: true })).toBeVisible()
})

test('tapping early shows Too soon and retry works', async ({ page }) => {
  await setup(page)
  await start(page)
  await expect(page.getByText('Wait for it…')).toBeVisible()
  await panel(page).dispatchEvent('pointerdown')
  await expect(page.getByText('Too soon')).toBeVisible()
  await expect(page.getByText('Tap to try again.')).toBeVisible()
  await panel(page).dispatchEvent('pointerdown')
  await expect(panel(page)).toHaveAttribute('data-phase', 'wait')
})

test('full round: go, measured result, rating, pills, stats', async ({ page }) => {
  await setup(page)
  await start(page)
  await page.clock.runFor(1200)
  await expect(panel(page)).toHaveAttribute('data-phase', 'go')
  await expect(page.getByText('Tap!')).toBeVisible()
  await page.clock.runFor(243)
  await panel(page).dispatchEvent('pointerdown')
  await expect(page.getByText('243 ms').first()).toBeVisible()
  await expect(page.getByText('New best. Sharp. Tap to go again.')).toBeVisible()
  await expect(page.getByLabel('Recent tries').getByText('243 ms')).toBeVisible()
  await expect(page.getByText('Best', { exact: true })).toBeVisible()
})

test('keyboard Space starts a round', async ({ page }) => {
  await setup(page)
  await page.keyboard.press('Space')
  await expect(panel(page)).toHaveAttribute('data-phase', 'wait')
  await page.clock.runFor(1200)
  await expect(panel(page)).toHaveAttribute('data-phase', 'go')
  await page.clock.runFor(150)
  await page.keyboard.press('Enter')
  await expect(page.getByText('Lightning.', { exact: false })).toBeVisible()
})

test('hiding the tab voids an in-flight round', async ({ page }) => {
  await setup(page)
  await start(page)
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect(panel(page)).toHaveAttribute('data-phase', 'idle')
  await page.clock.runFor(5000)
  await expect(panel(page)).toHaveAttribute('data-phase', 'idle')
})
