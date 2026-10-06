// Generates the service worker from a finished client build, so the precache list is complete.
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { generateSW } from 'workbox-build'
import { GAME_IDS } from '../src/games/ids.ts'

/** Files in public/ are copied into the output after the client bundle closes, so list them explicitly. */
function publicFiles(root: string) {
  const dir = join(root, 'public')
  return readdirSync(dir, { withFileTypes: true })
    .filter((f) => f.isFile())
    .map((f) => ({
      url: `/${f.name}`,
      revision: createHash('md5')
        .update(readFileSync(join(dir, f.name)))
        .digest('hex'),
    }))
}

/** @param dir the client build output directory (assets already written) */
export async function buildServiceWorker(root: string, dir: string) {
  // Exact URLs only: a precached '/' must never answer '/?genre=…', whose server HTML differs.
  const revision = Date.now().toString(36)
  const pages = ['/', ...GAME_IDS.map((id) => `/play/${id}`)].map((url) => ({
    url,
    revision,
  }))

  const { count, size, warnings } = await generateSW({
    globDirectory: dir,
    swDest: `${dir}/sw.js`,
    // woff2 only: the .woff fallbacks are never requested by modern browsers.
    globPatterns: ['**/*.{js,css,woff2}'],
    globIgnores: ['sw.js', 'workbox-*.js'],
    additionalManifestEntries: [...pages, ...publicFiles(root)],
    cleanupOutdatedCaches: true,
    clientsClaim: true,
    skipWaiting: true,
    navigateFallbackDenylist: [/./],
    runtimeCaching: [
      // Anything not precached (for example '/?genre=Puzzle') is network-first and falls back to the last copy.
      {
        urlPattern: ({ request }: { request: Request }) =>
          request.mode === 'navigate',
        handler: 'NetworkFirst',
        options: { cacheName: 'pages', networkTimeoutSeconds: 4 },
      },
    ],
  })

  for (const w of warnings) console.warn(w)
  console.log(
    `service worker: ${dir}/sw.js (${count} precached files, ${(size / 1024).toFixed(0)} KiB)`,
  )
}
