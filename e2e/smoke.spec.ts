import { expect, test } from '@playwright/test'

test('app shell loads with dark theme tokens', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('body')).toBeVisible()
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  expect(bg).toBe('rgb(14, 13, 18)')
})
