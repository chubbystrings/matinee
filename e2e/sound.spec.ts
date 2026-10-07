import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const KEY = 'matinee.sound.v1'
const speaker = (page: Page) =>
  page.getByRole('button', { name: 'Sound settings' })
const popover = (page: Page) => page.getByRole('group', { name: 'Sound' })
const stored = (page: Page) =>
  page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? 'null'), KEY)

/** Records every GainNode the engine creates; the first is the master bus. */
async function spyOnAudio(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __gains: Array<GainNode> }
    w.__gains = []
    const orig = AudioContext.prototype.createGain
    AudioContext.prototype.createGain = function () {
      const g = orig.call(this)
      w.__gains.push(g)
      return g
    }
  })
}
const masterGain = (page: Page) =>
  page.evaluate(
    () =>
      (window as unknown as { __gains: Array<GainNode> }).__gains[0]?.gain
        .value,
  )

async function openPopover(page: Page) {
  // clicks before hydration are no-ops, so retry until the handler is attached
  await expect(async () => {
    await speaker(page).click()
    await expect(popover(page)).toBeVisible({ timeout: 500 })
  }).toPass()
}

test('first visit: sound on at 60%, popover opens below the speaker', async ({
  page,
}) => {
  await page.goto('/')
  await openPopover(page)
  await expect(popover(page).getByText('60%')).toBeVisible()
  await expect(page.getByRole('slider', { name: 'Volume' })).toHaveValue('60')
  await expect(
    page.getByRole('button', { name: 'Mute', exact: true }),
  ).toBeVisible()
  const s = (await speaker(page).boundingBox())!
  const p = (await popover(page).boundingBox())!
  expect(p.y).toBeGreaterThan(s.y + s.height)
  expect(p.width).toBeCloseTo(248, 0)
})

test('volume and mute persist across a reload', async ({ page }) => {
  await page.goto('/')
  await openPopover(page)
  await page.getByRole('slider', { name: 'Volume' }).press('ArrowRight')
  await expect(popover(page).getByText('65%')).toBeVisible()
  expect(await stored(page)).toEqual({ vol: 65, muted: false })

  await page.getByRole('button', { name: 'Mute', exact: true }).click()
  await expect(popover(page).getByText('Muted')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Unmute' })).toBeVisible()

  await page.reload()
  await openPopover(page)
  await expect(popover(page).getByText('Muted')).toBeVisible()
  expect(await stored(page)).toEqual({ vol: 65, muted: true })

  await page.getByRole('button', { name: 'Unmute' }).click()
  await expect(popover(page).getByText('65%')).toBeVisible()
})

test('dragging the volume to 0 shows Muted, and raising it unmutes', async ({
  page,
}) => {
  await page.goto('/')
  await openPopover(page)
  const slider = page.getByRole('slider', { name: 'Volume' })
  await slider.press('Home')
  await expect(slider).toHaveValue('0')
  await slider.press('ArrowRight')
  await expect(popover(page).getByText('5%')).toBeVisible()
  expect(await stored(page)).toEqual({ vol: 5, muted: false })
})

test('closes on an outside click and on Escape', async ({ page }) => {
  await page.goto('/')
  await openPopover(page)
  await page.mouse.click(5, 300)
  await expect(popover(page)).toHaveCount(0)

  await openPopover(page)
  await page.keyboard.press('Escape')
  await expect(popover(page)).toHaveCount(0)
})

test('the speaker icon swaps its waves for an × when muted', async ({
  page,
}) => {
  await page.goto('/')
  await openPopover(page)
  const paths = speaker(page).locator('svg path')
  await expect(paths).toHaveCount(3)
  await page.getByRole('button', { name: 'Mute', exact: true }).click()
  await expect(paths).toHaveCount(2)
})

test('the loader music is audible at the stored volume', async ({ page }) => {
  await spyOnAudio(page)
  await page.goto('/play/merge')
  await expect(page.getByTestId('game-loader')).toBeVisible()
  await expect
    .poll(() => masterGain(page))
    .toBeCloseTo(Math.pow(0.6, 1.6) * 0.5, 3)
})

test('muted: the loader is silent', async ({ page }) => {
  await spyOnAudio(page)
  await page.addInitScript(
    (k) => localStorage.setItem(k, JSON.stringify({ vol: 60, muted: true })),
    KEY,
  )
  await page.goto('/play/merge')
  await expect(page.getByTestId('game-loader')).toBeVisible()
  await expect.poll(() => masterGain(page)).toBe(0)
})

test('the loader stays dark in light mode and passes axe', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('matinee.theme', 'light'))
  await page.goto('/play/whot')
  const loader = page.getByTestId('game-loader')
  await expect(loader).toBeVisible()
  await expect(loader).toHaveCSS('background-color', 'rgb(11, 10, 15)')
  await page
    .getByRole('button', { name: 'PRESS START' })
    .waitFor({ timeout: 10_000 })
  const results = await new AxeBuilder({ page })
    .include('[data-testid="game-loader"]')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  expect(results.violations.map((v) => v.id)).toEqual([])
})
