import type { Page } from '@playwright/test'

/** Opens a play URL and gets through the game loader (3.5 s, no skip) to the game itself. */
export async function launch(page: Page, path: string) {
  await page.goto(path)
  await page
    .getByRole('button', { name: 'PRESS START' })
    .click({ timeout: 10_000 })
  await page
    .getByText('Loading…', { exact: true })
    .waitFor({ state: 'detached' })
  // Let the loader's exit and the play screen's fade-in settle so later checks see final colours.
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every(
        (a) =>
          a.playState !== 'running' ||
          a.effect?.getComputedTiming().iterations === Infinity,
      ),
  )
}
