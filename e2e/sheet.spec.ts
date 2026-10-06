import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

// Links work before hydration, but the dialog only opens once React has hydrated.
async function openMerge(page: Page) {
  await page.goto('/')
  // a pre-hydration click is a full page load and loses the opener for focus return
  await page.waitForLoadState('networkidle')
  await expect(async () => {
    await page.locator('[data-game="merge"]').click()
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 800 })
  }).toPass()
}

test('opens from a card, shows details, Esc closes and returns focus', async ({ page }) => {
  await openMerge(page)
  await expect(page).toHaveURL(/game=merge/)
  const dialog = page.getByRole('dialog', { name: 'Merge' })
  await expect(dialog.getByText('Session')).toBeVisible()
  await expect(dialog.getByText('Your best')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(page).not.toHaveURL(/game=/)
  await expect(page.locator('[data-game="merge"]')).toBeFocused()
})

test('× button and backdrop click close the sheet', async ({ page }) => {
  await openMerge(page)
  await page.getByRole('button', { name: 'Close' }).click()
  await expect(page.getByRole('dialog')).toBeHidden()

  await page.locator('[data-game="merge"]').click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.mouse.click(5, 5)
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page).not.toHaveURL(/game=/)
})

test('browser Back closes the sheet', async ({ page }) => {
  await openMerge(page)
  await page.goBack()
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page).not.toHaveURL(/game=/)
})

test('deep link opens the sheet; Play navigates to the play route', async ({ page }) => {
  await page.goto('/?game=recall')
  const dialog = page.getByRole('dialog', { name: 'Recall' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('link', { name: 'Play' }).click()
  await expect(page).toHaveURL(/\/play\/recall/)
})

test('unknown game param is ignored', async ({ page }) => {
  await page.goto('/?game=bogus')
  await expect(page.getByRole('dialog')).toHaveCount(0)
})
