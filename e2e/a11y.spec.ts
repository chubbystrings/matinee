import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const GAME_IDS = [
  'snake',
  'merge',
  'recall',
  'noughts',
  'quickdraw',
  'popup',
  'whot',
] as const
const THEMES = ['dark', 'light'] as const

async function scan(page: Page) {
  // Mid fade-in the colours are blended, so wait for entry animations to settle first.
  await page.evaluate(() =>
    Promise.race([
      Promise.all(
        document
          .getAnimations()
          .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
          .map((a) => a.finished.catch(() => null)),
      ),
      new Promise((r) => setTimeout(r, 2000)),
    ]),
  )
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  return results.violations.map(
    (v) =>
      `${v.id} (${v.impact}): ${v.nodes
        .map((n) => n.target.join(' '))
        .slice(0, 4)
        .join(' | ')}`,
  )
}

for (const theme of THEMES) {
  test.describe(`axe · ${theme}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(
        (t) => localStorage.setItem('matinee.theme', t),
        theme,
      )
    })

    test('lobby', async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')
      expect(await scan(page)).toEqual([])
    })

    test('detail sheet', async ({ page }) => {
      await page.goto('/?game=merge')
      await expect(page.getByRole('dialog')).toBeVisible()
      expect(await scan(page)).toEqual([])
    })

    for (const id of GAME_IDS) {
      test(`play ${id}`, async ({ page }) => {
        await page.goto(`/play/${id}`)
        await page.waitForLoadState('networkidle')
        await expect(page.getByRole('heading').first()).toBeVisible()
        expect(await scan(page)).toEqual([])
      })
    }
  })
}

test('focus ring is visible, 2px, and uses the lime family in both themes', async ({
  page,
}) => {
  for (const [theme, expected] of [
    ['dark', 'rgb(200, 240, 49)'],
    ['light', 'rgb(76, 97, 11)'],
  ] as const) {
    await page.addInitScript(
      (t) => localStorage.setItem('matinee.theme', t),
      theme,
    )
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    const ring = await page.evaluate(() => {
      const s = getComputedStyle(document.activeElement as Element)
      return {
        width: s.outlineWidth,
        color: s.outlineColor,
        style: s.outlineStyle,
      }
    })
    expect(ring).toEqual({ width: '2px', color: expected, style: 'solid' })
  }
})

test('prefers-reduced-motion switches animations off', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  const ms = await page
    .getByTestId('hero-title')
    .evaluate((el) => parseFloat(getComputedStyle(el).animationDuration) * 1000)
  expect(ms).toBeLessThan(1)
})

test('play view has a main landmark and one h1', async ({ page }) => {
  await page.goto('/play/merge')
  await page.waitForLoadState('networkidle')
  await expect(page.getByRole('main')).toHaveCount(1)
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
})

test('quickdraw panel is a polite live region', async ({ page }) => {
  await page.goto('/play/quickdraw')
  await page.waitForLoadState('networkidle')
  await expect(page.getByTestId('qd-panel')).toHaveAttribute(
    'aria-live',
    'polite',
  )
})

test('light theme: accents used as text fall back to ink', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('matinee.theme', 'light'))
  await page.goto('/?game=merge')
  await page.waitForLoadState('networkidle')
  await expect(page.getByTestId('hero-title')).toHaveCSS(
    'color',
    'rgb(18, 17, 23)',
  )
  await expect(page.getByRole('dialog').getByText('No. 02 · Puzzle')).toHaveCSS(
    'color',
    'rgb(18, 17, 23)',
  )
})

test('dark theme: hero title uses the game accent', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await expect(page.getByTestId('hero-title')).toHaveCSS(
    'color',
    'rgb(200, 240, 49)',
  )
})

for (const theme of THEMES) {
  test(`axe · ${theme} · whot with the play log open`, async ({ page }) => {
    await page.addInitScript(
      (t) => localStorage.setItem('matinee.theme', t),
      theme,
    )
    await page.goto('/play/whot')
    await page.waitForLoadState('networkidle')
    await page.getByTestId('whot-log-pill').click()
    await expect(
      page.getByRole('complementary', { name: 'Play log' }),
    ).toBeVisible()
    expect(await scan(page)).toEqual([])
  })
}
