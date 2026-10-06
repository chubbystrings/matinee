import { expect, test } from '@playwright/test'

test('settings persist to localStorage and drive hero auto-rotate', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.getByText('Settings', { exact: true }).click()
  await expect(async () => {
    await page.getByLabel('Serpent speed').selectOption('Fast')
    await page.getByLabel('CPU level').selectOption('Perfect')
    const raw = await page.evaluate(() => localStorage.getItem('matinee.best.v1'))
    expect(JSON.parse(raw ?? '{}').state.settings).toMatchObject({ snakeSpeed: 'Fast', cpuLevel: 'Perfect' })
  }).toPass()

  await page.reload()
  await page.getByText('Settings', { exact: true }).click()
  await expect(page.getByLabel('Serpent speed')).toHaveValue('Fast')
})

test('turning off hero auto-rotate stops rotation', async ({ page }) => {
  await page.clock.install()
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.getByText('Settings', { exact: true }).click()
  await expect(async () => {
    await page.getByLabel('Hero auto-rotate').uncheck()
    await expect(page.getByLabel('Hero auto-rotate')).not.toBeChecked({ timeout: 500 })
  }).toPass()
  await page.clock.runFor(20000)
  await expect(page.getByTestId('hero-title')).toHaveText('Serpent')
})

test('settings menu closes on outside click and Escape', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  const group = page.getByRole('group', { name: 'Settings' })
  const open = async () => {
    await expect(async () => {
      await page.getByText('Settings', { exact: true }).click()
      await expect(group).toBeVisible({ timeout: 500 })
    }).toPass()
  }

  await open()
  await page.mouse.click(4, 4) // outside the panel
  await expect(group).toBeHidden()

  await open()
  await group.click({ position: { x: 5, y: 5 } }) // inside the panel: stays open
  await expect(group).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(group).toBeHidden()
})

test('select chevron sits inset from the border', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.getByText('Settings', { exact: true }).click()
  const select = page.getByLabel('Serpent speed')
  const pad = await select.evaluate((el) => parseFloat(getComputedStyle(el).paddingRight))
  expect(pad).toBeGreaterThanOrEqual(32)
  expect(await select.evaluate((el) => getComputedStyle(el).appearance)).toBe('none')
})

test('open settings panel stays inside the viewport', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await expect(async () => {
    await page.getByText('Settings', { exact: true }).click()
    await expect(page.getByRole('group', { name: 'Settings' })).toBeVisible({ timeout: 500 })
  }).toPass()
  const box = await page.getByRole('group', { name: 'Settings' }).boundingBox()
  const vw = page.viewportSize()?.width ?? 0
  expect(box?.x).toBeGreaterThanOrEqual(0)
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(vw)
})
