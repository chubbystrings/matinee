import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const loader = (page: Page) => page.getByTestId('game-loader')
const start = (page: Page) => page.getByRole('button', { name: 'PRESS START' })

test('Play opens the loader, Start appears after loading and opens the game', async ({
  page,
}) => {
  await page.goto('/?game=merge')
  await page.getByRole('dialog').getByRole('link', { name: /play/i }).click()
  await expect(loader(page)).toBeVisible()
  await expect(page.getByText('Cartridge MERGE.02')).toBeVisible()
  await expect(
    page.getByText('Keep your biggest tile in one corner and build toward it.'),
  ).toBeVisible()
  await expect(start(page)).toHaveCount(0)
  await page.keyboard.press('Enter') // ignored until 100%
  await expect(loader(page)).toBeVisible()
  await expect(start(page)).toBeVisible({ timeout: 6000 })
  await page.keyboard.press('Space')
  await expect(loader(page)).toHaveCount(0)
  await expect(page.getByText('Score', { exact: true })).toBeVisible()
})

test('Esc and × cancel back to the lobby', async ({ page }) => {
  await page.goto('/play/recall')
  await expect(loader(page)).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page).toHaveURL(/localhost:3000\/$/)

  await page.goto('/play/recall')
  await page.getByRole('button', { name: 'Back to lobby' }).click()
  await expect(page).toHaveURL(/localhost:3000\/$/)
})

test('Restart inside a game does not show the loader', async ({ page }) => {
  await page.goto('/play/popup')
  await start(page).click({ timeout: 6000 })
  await page.getByRole('button', { name: 'Restart' }).click()
  await expect(loader(page)).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Pop-Up' })).toBeVisible()
})
