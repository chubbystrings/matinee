import { expect, test } from '@playwright/test'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { gzipSync } from 'node:zlib'

const ASSETS = '.output/public/assets'
const files = existsSync(ASSETS) ? readdirSync(ASSETS) : []
const read = (name: string) => readFileSync(`${ASSETS}/${name}`, 'utf8')
const gzKb = (name: string) =>
  gzipSync(readFileSync(`${ASSETS}/${name}`)).length / 1024
const chunk = (prefix: string) =>
  files.find((f) => f.startsWith(`${prefix}-`) && f.endsWith('.js'))

const GAME_CHUNKS = [
  'Serpent',
  'Merge',
  'Recall',
  'Noughts',
  'Quickdraw',
  'PopUp',
  'Whot',
]

test.describe('bundle', () => {
  test('every game is its own chunk', () => {
    for (const g of GAME_CHUNKS) expect(chunk(g), `${g} chunk`).toBeTruthy()
  })

  test('the lobby entry chunks contain no game code', () => {
    // Strings that only exist inside game implementations.
    const gameOnly = [
      'Suspension',
      'General market',
      'Board cleared',
      'Too soon',
      'No moves left',
    ]
    for (const prefix of ['index', 'routes', 'registry']) {
      const name = chunk(prefix)
      expect(name, `${prefix} chunk`).toBeTruthy()
      for (const marker of gameOnly)
        expect(read(name!), `${prefix} has "${marker}"`).not.toContain(marker)
    }
  })

  test('size budgets (gzip)', () => {
    expect(gzKb(chunk('index')!)).toBeLessThan(110)
    for (const g of GAME_CHUNKS) expect(gzKb(chunk(g)!), g).toBeLessThan(15)
  })

  test('only latin font subsets ship in the stylesheet', () => {
    const css = read(files.find((f) => /^styles-.*\.css$/.test(f))!)
    expect(css).not.toMatch(/cyrillic|vietnamese|greek/i)
    expect(css).toMatch(/font-display:\s*swap/)
  })

  test('the service worker precaches every game and page', () => {
    const sw = readFileSync('.output/public/sw.js', 'utf8')
    for (const g of GAME_CHUNKS) expect(sw).toContain(`assets/${g}-`)
    for (const id of [
      'snake',
      'merge',
      'recall',
      'noughts',
      'quickdraw',
      'popup',
      'whot',
    ]) {
      expect(sw).toContain(`/play/${id}`)
    }
  })
})

test.describe('fonts', () => {
  test('the hero font is preloaded and loads with an immutable cache header', async ({
    page,
  }) => {
    const preload = page.locator('link[rel=preload][as=font]')
    await page.goto('/')
    await expect(preload).toHaveCount(1)
    const href = await preload.getAttribute('href')
    expect(href).toMatch(/unbounded-latin-800-normal.*\.woff2$/)
    const res = await page.request.get(href!)
    expect(res.headers()['cache-control']).toContain('immutable')
    await page.waitForLoadState('networkidle')
    expect(
      await page.evaluate(() => document.fonts.check('800 20px Unbounded')),
    ).toBe(true)
  })
})

test.describe('caching headers', () => {
  test('hashed assets are immutable', async ({ request }) => {
    const css = files.find((f) => /^styles-.*\.css$/.test(f))!
    const res = await request.get(`/assets/${css}`)
    expect(res.headers()['cache-control']).toContain('immutable')
  })
  test('sw.js is served', async ({ request }) => {
    const res = await request.get('/sw.js')
    expect(res.status()).toBe(200)
    expect(res.headers()['content-type']).toContain('javascript')
  })
})
