import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const bg = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.body).backgroundColor)

test('dark by default, toggle persists across reload', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'light')
  expect(await bg(page)).toBe('rgb(14, 13, 18)')

  // clicks before hydration are no-ops, so retry until the handler is attached
  await expect(async () => {
    await page.getByRole('button', { name: /Switch to (light|dark) mode/ }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light', { timeout: 500 })
  }).toPass()
  expect(await bg(page)).toBe('rgb(244, 243, 247)')

  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect(page.getByRole('button', { name: 'Switch to dark mode' })).toBeVisible()
})

test('saved light theme is applied before hydration (no flash)', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('matinee.theme', 'light'))
  await page.route('**/*.js', (r) => r.abort()) // block hydration entirely
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
})
