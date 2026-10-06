// Renders public/icon.svg to the PNG sizes the web manifest and iOS need.
// Run with: pnpm icons   (uses the Chromium that Playwright already installed)
import { chromium } from '@playwright/test'
import { readFileSync, writeFileSync } from 'node:fs'

const svg = readFileSync(new URL('../public/icon.svg', import.meta.url), 'utf8')
// Maskable icons are cropped to a circle/squircle: shrink the art into the central safe zone on a full-bleed bg.
const maskable = svg
  .replace(/<rect width="512" height="512" rx="112" fill="#0E0D12"\/>/, '<rect width="512" height="512" fill="#0E0D12"/>')
  .replace(/<rect width="512" height="512" rx="112" fill="url\(#glow\)"\/>/, '<rect width="512" height="512" fill="url(#glow)"/>')
  .replace(/(<g fill="#FFC23D"[\s\S]*<\/g>\s*<circle[^>]*\/>)/, '<g transform="translate(51 51) scale(.8)">$1</g>')

const targets = [
  ['icon-192.png', 192, svg],
  ['icon-512.png', 512, svg],
  ['icon-maskable-512.png', 512, maskable],
  ['apple-touch-icon.png', 180, maskable],
]

const browser = await chromium.launch()
for (const [file, size, source] of targets) {
  const page = await browser.newPage({ viewport: { width: size, height: size } })
  await page.setContent(`<body style="margin:0;background:transparent">${source.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body>`)
  const png = await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } })
  writeFileSync(new URL(`../public/${file}`, import.meta.url), png)
  await page.close()
  console.log('wrote public/' + file)
}
await browser.close()
