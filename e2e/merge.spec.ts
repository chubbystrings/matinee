import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { launch } from './launch'

/** Deterministic Math.random (mulberry32) so the board is reproducible. */
async function seed(page: Page, s = 12345) {
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

async function open(page: Page) {
  await launch(page, '/play/merge')
  await page.waitForLoadState('networkidle')
  await expect(page.getByTestId('merge-cell')).toHaveCount(16)
}

const values = (page: Page) =>
  page.getByTestId('merge-cell').evaluateAll((els) => els.map((e) => Number((e as HTMLElement).dataset.value)))

test('renders 16 cells and 2 starting tiles', async ({ page }) => {
  await seed(page)
  await open(page)
  expect((await values(page)).filter(Boolean)).toHaveLength(2)
})

test('arrow keys move tiles and swiping works', async ({ page }) => {
  await seed(page)
  await open(page)
  const before = await values(page)
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('ArrowDown')
  await expect.poll(async () => (await values(page)).join()).not.toBe(before.join())
  expect((await values(page)).filter(Boolean).length).toBeGreaterThanOrEqual(2)

  const box = (await page.getByTestId('merge-cell').first().boundingBox())!
  const mid = await values(page)
  await page.mouse.move(box.x + 10, box.y + 10)
  await page.mouse.down()
  await page.mouse.move(box.x + 120, box.y + 10)
  await page.mouse.up()
  await page.mouse.move(box.x + 120, box.y + 10)
  await page.mouse.down()
  await page.mouse.move(box.x + 10, box.y + 10)
  await page.mouse.up()
  await expect.poll(async () => (await values(page)).join()).not.toBe(mid.join())
})

test('score updates after merges', async ({ page }) => {
  await seed(page)
  await open(page)
  const score = page.locator('text=Score').locator('xpath=..')
  for (let i = 0; i < 30; i++) {
    await page.keyboard.press(['ArrowLeft', 'ArrowDown', 'ArrowRight', 'ArrowUp'][i % 4])
  }
  await expect(score).not.toContainText(/\b0\b$/)
})

test('game over overlay appears and Play again resets', async ({ page }) => {
  test.setTimeout(90_000)
  await seed(page)
  await open(page)
  const overlay = page.getByRole('status').filter({ hasText: 'No moves left' })
  const dirs = ['ArrowLeft', 'ArrowDown', 'ArrowRight', 'ArrowUp']
  for (let i = 0; i < 3000 && !(await overlay.isVisible()); i++) {
    // cycle all four directions so the board fills and eventually locks
    await page.keyboard.press(dirs[i % 4])
  }
  await expect(overlay).toBeVisible()
  await expect(overlay).toContainText(/Score \d+/)
  await page.getByRole('button', { name: 'Play again' }).click()
  await expect(overlay).toBeHidden()
  expect((await values(page)).filter(Boolean)).toHaveLength(2)
})

test('light theme uses light tile colors', async ({ page }) => {
  await seed(page)
  await page.addInitScript(() => localStorage.setItem('matinee.theme', 'light'))
  await open(page)
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'))
  const tile = page.locator('[data-testid=merge-cell]:not([data-value="0"])').first()
  await expect(tile).toHaveCSS('background-color', 'rgb(216, 213, 223)')
  await expect(tile).toHaveCSS('color', 'rgb(18, 17, 23)')
})
