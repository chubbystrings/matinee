import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

async function open(page: Page) {
  await page.goto('/play/snake')
  await page.waitForLoadState('networkidle')
  await expect(page.locator('canvas')).toBeVisible()
}

const pixel = (page: Page) =>
  page.evaluate(() => {
    const cv = document.querySelector('canvas')!
    return Array.from(cv.getContext('2d')!.getImageData(2, 2, 1, 1).data).slice(0, 3).join(',')
  })

test('canvas is DPR-scaled and starts in Ready', async ({ page }) => {
  await open(page)
  const size = () =>
    page.evaluate(() => {
      const cv = document.querySelector('canvas')!
      return { w: cv.width, h: cv.height, expected: Math.round(cv.clientWidth * (window.devicePixelRatio || 1)) }
    })
  await expect.poll(async () => (await size()).w).toBe((await size()).expected)
  const m = await size()
  expect(m.w).toBeGreaterThan(0)
  expect(m.h).toBe(m.w)
  await expect(page.getByText('Ready', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Start', exact: true })).toBeVisible()
})

test('arrow key starts the game and the snake moves', async ({ page }) => {
  await open(page)
  await page.keyboard.press('ArrowUp')
  await expect(page.getByText('Ready', { exact: true })).toBeHidden()
  await page.waitForTimeout(2875)
  await expect(page.getByText('Game over')).toBeVisible()
})

test('D-pad starts the game', async ({ page }) => {
  await open(page)
  await page.getByRole('button', { name: 'Down' }).dispatchEvent('pointerdown')
  await expect(page.getByText('Ready', { exact: true })).toBeHidden()
})

test('wall death shows Game over and Play again restarts', async ({ page }) => {
  await open(page)
  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(2300)
  await expect(page.getByText('Game over')).toBeVisible()
  await expect(page.getByText('0 eaten')).toBeVisible()
  await page.getByRole('button', { name: 'Play again' }).click()
  await expect(page.getByText('Ready', { exact: true })).toBeVisible()
})

test('reverse direction is ignored', async ({ page }) => {
  await open(page)
  await page.keyboard.press('ArrowLeft') // reverse of initial heading: starts but keeps going right
  await page.waitForTimeout(345)
  await expect(page.getByText('Game over')).toBeHidden()
})

test('canvas redraws on theme toggle', async ({ page }) => {
  await open(page)
  const before = await pixel(page)
  // The play view has no theme button; drive the same store the header uses (dev server module).
  const modulePath = '/src/store/theme.ts'
  await page.evaluate(async (path) => {
    const mod = (await import(/* @vite-ignore */ path)) as { toggleTheme: () => void }
    mod.toggleTheme()
  }, modulePath)
  await expect.poll(() => pixel(page)).not.toBe(before)
})

test('pauses while the tab is hidden', async ({ page }) => {
  await open(page)
  await page.keyboard.press('ArrowRight')
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await page.waitForTimeout(3450)
  await expect(page.getByText('Game over')).toBeHidden()
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await page.waitForTimeout(3450)
  await expect(page.getByText('Game over')).toBeVisible()
})
