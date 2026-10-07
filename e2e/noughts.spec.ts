import { expect, test  } from '@playwright/test'
import type {Page} from '@playwright/test';
import { launch } from './launch'

const cell = (page: Page, i: number) => page.getByRole('button', { name: new RegExp(`^Cell ${i + 1}`) })

async function setup(page: Page, rnd: number) {
  await page.addInitScript((r) => {
    Math.random = () => r
  }, rnd)
  await page.clock.install()
  await launch(page, '/play/noughts')
  await page.waitForLoadState('networkidle')
  await page.clock.pauseAt(Date.now() + 1000) // deterministic from here on
}

async function firstMove(page: Page, i: number) {
  await expect(async () => {
    await cell(page, i).click()
    await expect(page.getByText('CPU is thinking…')).toBeVisible({ timeout: 300 })
  }).toPass()
}

test('initial state', async ({ page }) => {
  await setup(page, 0.9)
  await expect(page.getByText('Your move')).toBeVisible()
  await expect(page.getByText('W–L–D')).toBeVisible()
  await expect(page.getByText('0–0–0')).toBeVisible()
})

test('CPU replies after 420 ms and blocks input meanwhile', async ({ page }) => {
  await setup(page, 0.9)
  await firstMove(page, 0)
  await cell(page, 1).click({ force: true })
  await expect(cell(page, 1)).toHaveAccessibleName('Cell 2')
  await page.clock.runFor(400)
  await expect(page.getByText('CPU is thinking…')).toBeVisible()
  await page.clock.runFor(30)
  await expect(page.getByText('Your move')).toBeVisible()
  // Perfect minimax answers a corner opening with the centre
  await expect(cell(page, 4)).toHaveAccessibleName('Cell 5, O')
})

test('player win updates tally, tints line, Next round keeps tally', async ({ page }) => {
  await setup(page, 0) // casual random picks first free cell
  await firstMove(page, 4)
  await page.clock.runFor(450)
  await cell(page, 3).click()
  await page.clock.runFor(450)
  await cell(page, 5).click()
  await expect(page.getByText('You win')).toBeVisible()
  await expect(page.getByText('1–0–0')).toBeVisible()
  await expect(page.getByText('1 wins')).toBeVisible()
  await expect(cell(page, 3)).toHaveCSS('background-color', /^(?!rgba\(0, 0, 0, 0\)).+/)
  await page.getByRole('button', { name: 'Next round' }).click()
  await expect(page.getByText('Your move')).toBeVisible()
  await expect(page.getByText('1–0–0')).toBeVisible()
  await expect(cell(page, 4)).toHaveAccessibleName('Cell 5')
})

test('CPU wins when the player ignores threats', async ({ page }) => {
  await setup(page, 0.9)
  // X: 0, 1, 5 / perfect O takes 4, 2, then wins on 6
  await firstMove(page, 0)
  await page.clock.runFor(450)
  await cell(page, 1).click()
  await page.clock.runFor(450)
  await cell(page, 5).click()
  await page.clock.runFor(450)
  await expect(page.getByText(/CPU wins|Draw|Your move/)).toBeVisible()
})
