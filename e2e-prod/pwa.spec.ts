import { expect, test } from '@playwright/test'
import type { BrowserContext, Page } from '@playwright/test'

/** Installs the worker, waits for it to control the page, and returns the controlled page. */
async function installWorker(page: Page) {
  await page.goto('/')
  await page.evaluate(() => navigator.serviceWorker.ready)
  // clientsClaim makes the first load controlled once activation finishes.
  await expect
    .poll(() =>
      page.evaluate(() => navigator.serviceWorker.controller !== null),
    )
    .toBe(true)
  // wait until the install-time precache is complete
  await expect
    .poll(async () => page.evaluate(async () => (await caches.keys()).length), {
      timeout: 20_000,
    })
    .toBeGreaterThan(0)
}

const goOffline = (context: BrowserContext) => context.setOffline(true)

test('manifest is linked, valid, and its icons load', async ({
  page,
  request,
}) => {
  await page.goto('/')
  const href = await page.locator('link[rel=manifest]').getAttribute('href')
  expect(href).toBe('/manifest.webmanifest')
  const manifest = await (await request.get(href!)).json()
  expect(manifest).toMatchObject({
    name: 'Matinee',
    short_name: 'Matinee',
    start_url: '/',
    display: 'standalone',
    background_color: '#0E0D12',
    theme_color: '#0E0D12',
  })
  const sizes = manifest.icons.map(
    (i: { sizes: string; purpose?: string }) =>
      `${i.sizes}${i.purpose ? `:${i.purpose}` : ''}`,
  )
  expect(sizes).toEqual(['192x192', '512x512', '512x512:maskable'])
  for (const icon of manifest.icons)
    expect((await request.get(icon.src)).status()).toBe(200)
  expect((await request.get('/apple-touch-icon.png')).status()).toBe(200)
  await expect(page.locator('meta[name=theme-color]')).toHaveAttribute(
    'content',
    '#0E0D12',
  )
})

test('favicon is served (no more 404 noise)', async ({ page, request }) => {
  await page.goto('/')
  const href = await page.locator('link[rel=icon]').getAttribute('href')
  expect((await request.get(href!)).status()).toBe(200)
})

test('the service worker registers, activates, and is never long-cached', async ({
  page,
}) => {
  await installWorker(page)
  const reg = await page.evaluate(async () => {
    const r = await navigator.serviceWorker.getRegistration()
    return {
      scope: r?.scope,
      active: r?.active?.state,
      cache: r?.updateViaCache,
    }
  })
  expect(reg.active).toBe('activated')
  expect(reg.cache).toBe('none')
  expect(reg.scope).toMatch(/\/$/)
})

test('the lobby and every game open offline after one visit', async ({
  page,
  context,
}) => {
  await installWorker(page)
  await goOffline(context)

  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Now showing' })).toBeVisible()
  await expect(page.locator('[data-game]')).toHaveCount(7)

  for (const [id, title] of [
    ['snake', 'Serpent'],
    ['merge', 'Merge'],
    ['recall', 'Recall'],
    ['noughts', 'Noughts'],
    ['quickdraw', 'Quickdraw'],
    ['popup', 'Pop-Up'],
    ['whot', 'Whot'],
  ] as const) {
    await page.goto(`/play/${id}`)
    await expect(page.getByRole('heading', { name: title })).toBeVisible()
  }
})

test('an offline game is actually playable (game code is precached)', async ({
  page,
  context,
}) => {
  await installWorker(page)
  await goOffline(context)
  await page.goto('/play/whot')
  await expect(page.getByTestId('whot-card').first()).toBeVisible()
  await expect(page.getByTestId('whot-market')).toContainText('Market')
})

test('theme and scores keep working offline (localStorage)', async ({
  page,
  context,
}) => {
  await installWorker(page)
  await goOffline(context)
  await page.goto('/')
  await expect(async () => {
    await page.getByRole('button', { name: /Switch to light mode/ }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light', {
      timeout: 500,
    })
  }).toPass()
})

test('a visited query URL falls back to its last copy offline', async ({
  page,
  context,
}) => {
  await installWorker(page)
  await page.goto('/?genre=Puzzle')
  await expect(page.locator('[data-game]')).toHaveCount(2)
  await goOffline(context)
  await page.goto('/?genre=Puzzle')
  await expect(page.locator('[data-game]')).toHaveCount(2)
})

test('query URLs are not answered by the precached "/" (no hydration mismatch)', async ({
  page,
}) => {
  const errors: Array<string> = []
  page.on('pageerror', (e) => errors.push(e.message))
  await installWorker(page)
  await page.goto('/?genre=Reflex')
  await expect(page.locator('[data-game]')).toHaveCount(2)
  await page.goto('/?game=whot')
  await expect(page.getByRole('dialog', { name: 'Whot' })).toBeVisible()
  expect(errors.filter((e) => /hydrat/i.test(e))).toEqual([])
})
