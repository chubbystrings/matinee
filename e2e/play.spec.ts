import { expect, test } from '@playwright/test'

test('unknown game id redirects to the lobby', async ({ page }) => {
  await page.goto('/play/bogus')
  await expect(page).toHaveURL(/localhost:3000\/$/)
  await expect(page.getByRole('heading', { name: 'Now showing' })).toBeVisible()
})

test('play view shows title, stats, hint and loads the game', async ({ page }) => {
  await page.goto('/play/merge')
  await expect(page.getByRole('heading', { name: 'Merge' })).toBeVisible()
  await expect(page.getByText('Score', { exact: true })).toBeVisible()
  await expect(page.getByText('Best', { exact: true })).toBeVisible()
  await expect(page.getByText('Arrows · Swipe · Esc to exit')).toBeVisible()
})

test('Esc and ← Lobby both return to the lobby', async ({ page }) => {
  await page.goto('/play/recall')
  await page.waitForLoadState('networkidle')
  await expect(async () => {
    await page.keyboard.press('Escape')
    await expect(page).toHaveURL(/localhost:3000\/$/, { timeout: 500 })
  }).toPass()

  await page.goto('/play/recall')
  await page.getByRole('link', { name: '← Lobby' }).click()
  await expect(page).toHaveURL(/localhost:3000\/$/)
})

test('restart button is present and keeps the view', async ({ page }) => {
  await page.goto('/play/popup')
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: 'Restart' }).click()
  await expect(page.getByRole('heading', { name: 'Pop-Up' })).toBeVisible()
})

test('unknown URL renders the custom 404 page', async ({ page }) => {
  const res = await page.goto('/definitely-not-a-page')
  expect(res?.status()).toBe(404)
  await expect(page.getByRole('heading', { name: 'Not showing' })).toBeVisible()
  await page.getByRole('link', { name: 'Back to lobby' }).click()
  await expect(page.getByRole('heading', { name: 'Now showing' })).toBeVisible()
})
