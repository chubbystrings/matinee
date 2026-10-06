import { expect, test } from '@playwright/test'

test('grid shows seven posters and filters by genre via URL', async ({
  page,
}) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await expect(page.locator('[data-game]')).toHaveCount(7)
  await page.getByRole('link', { name: /^Puzzle/ }).click()
  await expect(page).toHaveURL(/genre=Puzzle/)
  await expect(page.locator('[data-game]')).toHaveCount(2)
  await expect(page.getByText('2 features')).toBeVisible()
  await page.getByRole('link', { name: /^All/ }).click()
  await expect(page.locator('[data-game]')).toHaveCount(7)
})

test('Classic filter lists Noughts and Whot', async ({ page }) => {
  await page.goto('/?genre=Classic')
  await expect(page.locator('[data-game]')).toHaveCount(2)
  await expect(page.locator('[data-game="whot"]')).toBeVisible()
  await expect(page.locator('[data-game="noughts"]')).toBeVisible()
})

test('deep link with genre filter', async ({ page }) => {
  await page.goto('/?genre=Reflex')
  await expect(page.locator('[data-game]')).toHaveCount(2)
})

test('grid column count follows viewport', async ({ page }, info) => {
  await page.goto('/')
  const cols = await page
    .getByTestId('grid')
    .evaluate(
      (el) => getComputedStyle(el).gridTemplateColumns.split(' ').length,
    )
  expect(cols).toBe(info.project.name === 'mobile' ? 2 : 6)
})

test('hero auto-rotates every 7s and dots select a feature', async ({
  page,
}) => {
  await page.clock.install()
  await page.goto('/')
  const title = page.getByTestId('hero-title')
  await expect(title).toHaveText('Serpent')
  // the interval only exists once React has hydrated, so retry until it fires
  await expect(async () => {
    await page.clock.runFor(7100)
    await expect(title).not.toHaveText('Serpent', { timeout: 500 })
  }).toPass()
  await page.getByRole('button', { name: 'Show Quickdraw' }).click()
  await expect(title).toHaveText('Quickdraw')
})

test('hero pauses while a game detail is open', async ({ page }) => {
  await page.clock.install()
  await page.goto('/?game=merge')
  await expect(page.getByTestId('hero-title')).toHaveText('Serpent')
  await page.clock.runFor(15000)
  await expect(page.getByTestId('hero-title')).toHaveText('Serpent')
})

test('filtering and opening/closing the sheet do not jump to the top', async ({
  page,
}) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => window.scrollTo(0, 400))
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(300)

  // Filtering may shorten the page (browser clamps), but must not reset to the top.
  await expect(async () => {
    await page.getByRole('link', { name: /^Puzzle/ }).click()
    await expect(page).toHaveURL(/genre=Puzzle/, { timeout: 500 })
  }).toPass()
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(100)

  // Opening and closing the sheet leaves the scroll position exactly as it was.
  const card = page.locator('[data-game="merge"]')
  await card.scrollIntoViewIfNeeded()
  const before = await page.evaluate(() => window.scrollY)
  await card.click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()
  expect(
    Math.abs((await page.evaluate(() => window.scrollY)) - before),
  ).toBeLessThan(5)
})

for (const [iso, label] of [
  ['2026-10-06T09:00:00', 'This morning’s feature'],
  ['2026-10-06T14:00:00', 'This afternoon’s feature'],
  ['2026-10-06T19:00:00', 'This evening’s feature'],
  ['2026-10-06T23:30:00', 'Tonight’s feature'],
] as const) {
  test(`hero kicker follows the viewer's local time (${label})`, async ({
    page,
  }) => {
    await page.clock.setFixedTime(new Date(iso))
    await page.goto('/')
    await expect(page.getByText(label)).toBeVisible()
  })
}
