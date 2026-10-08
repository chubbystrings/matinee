import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { launch } from './launch'

/** Deterministic Math.random (mulberry32). Seed 5: you move first, the starter is a plain card, and 1 of your 4 cards matches it. */
async function seed(page: Page, s = 5) {
  await page.addInitScript((init) => {
    let a = init
    Math.random = () => {
      a = (a + 0x6d2b79f5) | 0
      let t = Math.imul(a ^ (a >>> 15), 1 | a)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }, s)
}

async function setLevel(page: Page, level: 'Easy' | 'Hard' | 'Expert') {
  await page.addInitScript(
    (l) =>
      localStorage.setItem(
        'matinee.whot.level',
        JSON.stringify({ state: { level: l }, version: 1 }),
      ),
    level,
  )
}

async function open(page: Page) {
  await launch(page, '/play/whot')
  await expect(page.getByTestId('whot-card').first()).toBeVisible()
}

const hand = (page: Page) => page.getByTestId('whot-card')
const status = (page: Page) => page.getByTestId('whot-status')
const market = (page: Page) =>
  page.getByRole('button', { name: 'Draw from market' })
const count = async (page: Page) => hand(page).count()

/** The hand cards that do not match the top card (or the called shape), judged from their labels. */
async function wrongCards(page: Page) {
  const top = (
    (await page.getByTestId('whot-pile-top').getAttribute('aria-label')) ?? ''
  ).replace('Top card: ', '')
  const request = page.getByTestId('whot-request')
  const asked = (await request.count())
    ? (await request.textContent())?.match(/Asks for (\w+)/)?.[1]
    : undefined
  const [topShape, topNum] = [top.split(' ')[0], top.split(' ')[1]]
  const labels = await hand(page).evaluateAll((els) =>
    els.map((e) => e.getAttribute('aria-label') ?? ''),
  )
  return labels.filter((l) => {
    if (l === 'WHOT') return false
    const [shape, n] = l.split(' ')
    return asked ? shape !== asked : shape !== topShape && n !== topNum
  })
}

test.describe('level picker', () => {
  test('offers Easy · Hard · Expert with a description for each', async ({
    page,
  }) => {
    await seed(page)
    await open(page)
    const group = page.getByRole('group', { name: 'CPU difficulty' })
    await expect(group.getByRole('button')).toHaveText([
      'Easy',
      'Hard',
      'Expert',
    ])
    const desc = page.getByTestId('whot-level-desc')
    await expect(desc).toHaveText('Easy · CPU plays any legal card.')
    await group.getByRole('button', { name: 'Hard' }).click()
    await expect(desc).toHaveText(
      'Hard · CPU leads with special cards and its longest suit.',
    )
    await group.getByRole('button', { name: 'Expert' }).click()
    await expect(desc).toHaveText(
      'Expert · CPU counts cards and simulates your hand. No card hints, and a wrong card costs you a draw and your turn.',
    )
  })

  test('the choice is saved to matinee.whot.level and survives a reload', async ({
    page,
  }) => {
    await seed(page)
    await open(page)
    await page.getByRole('button', { name: 'Expert' }).click()
    const stored = await page.evaluate(() =>
      localStorage.getItem('matinee.whot.level'),
    )
    expect(JSON.parse(stored ?? '{}').state.level).toBe('Expert')
    await page.reload()
    await page
      .getByRole('button', { name: 'PRESS START' })
      .click({ timeout: 10_000 })
    await expect(page.getByRole('button', { name: 'Expert' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })
})

test.describe('no hints on Expert', () => {
  test('switching to Expert mid-game removes every highlight, and back restores them', async ({
    page,
  }) => {
    await seed(page)
    await open(page)
    await expect(status(page)).toHaveText(/Your turn/)
    const playable = page.locator(
      '[data-testid="whot-card"][data-playable="true"]',
    )
    const dimmed = page.locator(
      '[data-testid="whot-card"][data-playable="false"]',
    )
    expect(await playable.count()).toBeGreaterThan(0)
    expect(await dimmed.count()).toBeGreaterThan(0)

    await page.getByRole('button', { name: 'Expert' }).click()
    await expect(
      page.locator('[data-testid="whot-card"][data-playable]'),
    ).toHaveCount(0)
    for (const card of await hand(page).all()) {
      await expect(card).toHaveCSS('opacity', '1')
      await expect(card).toHaveCSS('cursor', 'pointer')
      await expect(card).toBeEnabled()
    }
    // no lift: every card sits at the same height
    const tops = await hand(page).evaluateAll((els) =>
      els.map((e) => Math.round(e.getBoundingClientRect().top)),
    )
    expect(new Set(tops).size).toBe(1)

    await page.getByRole('button', { name: 'Easy' }).click()
    expect(await playable.count()).toBeGreaterThan(0)
    expect(await dimmed.count()).toBeGreaterThan(0)
  })

  test('no market glow and no "No match" status', async ({ page }) => {
    await seed(page)
    await setLevel(page, 'Expert')
    await open(page)
    await expect(status(page)).toHaveText('Your turn')
    await expect(status(page)).not.toHaveText(/No match/)
    const border = await market(page)
      .locator('span > span')
      .last()
      .evaluate((e) => getComputedStyle(e).boxShadow)
    expect(border).toBe('none')
  })
})

test.describe('wrong card', () => {
  test('on Easy a non-matching card cannot be clicked', async ({ page }) => {
    await seed(page)
    await setLevel(page, 'Easy')
    await open(page)
    const wrong = await wrongCards(page)
    expect(wrong.length).toBeGreaterThan(0)
    await expect(
      page.getByRole('button', { name: wrong[0], exact: true }).first(),
    ).toBeDisabled()
  })

  test('on Expert it shakes, draws one, logs it and passes the turn to the CPU', async ({
    page,
  }) => {
    await seed(page)
    await setLevel(page, 'Expert')
    await open(page)
    const before = await count(page)
    const wrong = await wrongCards(page)
    expect(wrong.length).toBeGreaterThan(0)
    const card = page
      .getByRole('button', { name: wrong[0], exact: true })
      .first()

    await card.click()
    await expect(status(page)).toHaveText('Wrong card · you draw 1')
    await expect(status(page)).toHaveCSS('color', 'rgb(255, 122, 92)')
    await expect(page.getByTestId('whot-msg')).toHaveText(
      `${wrong[0]} doesn't match. It goes back to your hand, you draw 1 and the CPU plays.`,
    )
    expect(await count(page)).toBe(before + 1)
    await expect(
      page.getByRole('button', { name: wrong[0], exact: true }).first(),
    ).toHaveAttribute('data-wrong', 'true')
    await expect(
      page.getByRole('button', { name: wrong[0], exact: true }).first(),
    ).toHaveCSS('animation-name', 'shake')

    await page.getByTestId('whot-log-pill').click()
    await expect(
      page
        .getByTestId('whot-log-row')
        .filter({ hasText: /Tried .*Not a match: card returned\./ }),
    ).toBeVisible()
    await expect(
      page
        .getByTestId('whot-log-row')
        .filter({ hasText: 'Drew 1 (wrong card).' }),
    ).toBeVisible()
  })

  test('the CPU then plays, within about a second, and the flag clears', async ({
    page,
  }) => {
    await seed(page)
    await setLevel(page, 'Expert')
    await open(page)
    const wrong = await wrongCards(page)
    const card = page
      .getByRole('button', { name: wrong[0], exact: true })
      .first()
    const t = Date.now()
    await card.click()
    await expect(page.getByTestId('whot-msg')).toHaveText(/^CPU /, {
      timeout: 2500,
    })
    expect(Date.now() - t).toBeLessThan(1500)
    await expect(status(page)).not.toHaveText(/Wrong card/)
    await expect(page.locator('[data-wrong]')).toHaveCount(0)
  })

  test('playing a card that matches works as normal on Expert', async ({
    page,
  }) => {
    await seed(page)
    await setLevel(page, 'Expert')
    await open(page)
    const wrong = await wrongCards(page)
    const labels = await hand(page).evaluateAll((els) =>
      els.map((e) => e.getAttribute('aria-label') ?? ''),
    )
    const right = labels.find((l) => !wrong.includes(l))!
    const pile = await page
      .getByTestId('whot-pile-top')
      .getAttribute('aria-label')
    await page.getByRole('button', { name: right, exact: true }).first().click()
    await expect(page.getByTestId('whot-pile-top')).not.toHaveAttribute(
      'aria-label',
      pile ?? '',
    )
    await expect(status(page)).not.toHaveText(/Wrong card/)
  })
})

test('the wrong-card buzz plays on Expert (and never on Easy)', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __osc: Array<string> }
    w.__osc = []
    const orig = AudioContext.prototype.createOscillator
    AudioContext.prototype.createOscillator = function () {
      const o = orig.call(this)
      w.__osc.push('x')
      const set = Object.getOwnPropertyDescriptor(
        OscillatorNode.prototype,
        'type',
      )!.set!
      Object.defineProperty(o, 'type', {
        set(v: OscillatorType) {
          if (v === 'sawtooth') w.__osc.push('saw')
          set.call(o, v)
        },
        get: () => 'square',
      })
      return o
    }
  })
  await seed(page)
  await setLevel(page, 'Expert')
  await open(page)
  const wrong = await wrongCards(page)
  const before = await page.evaluate(
    () =>
      (window as unknown as { __osc: Array<string> }).__osc.filter(
        (x) => x === 'saw',
      ).length,
  )
  await page
    .getByRole('button', { name: wrong[0], exact: true })
    .first()
    .click()
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { __osc: Array<string> }).__osc.filter(
            (x) => x === 'saw',
          ).length,
      ),
    )
    .toBe(before + 2)
})

test('the lobby Whot poster gets an Expert badge once you have an Expert win', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.getByTestId('poster-expert-badge')).toHaveCount(0)
  await page.evaluate(() =>
    localStorage.setItem(
      'matinee.whot.v1',
      JSON.stringify({
        state: {
          wins: 1,
          losses: 0,
          draws: 0,
          streak: 1,
          best: 1,
          expertWins: 1,
        },
        version: 1,
      }),
    ),
  )
  await page.reload()
  await expect(page.getByTestId('poster-expert-badge').first()).toHaveText(
    'Expert',
  )
  await page.reload()
  await expect(page.getByTestId('poster-expert-badge').first()).toBeVisible()
})
