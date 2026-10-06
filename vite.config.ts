import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { nitro } from 'nitro/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'node:path'
import { buildServiceWorker } from './scripts/service-worker'

/**
 * Offline support. Runs when the *client* build has finished writing its files and before Nitro
 * snapshots them, so sw.js is both complete and served (generating it after Nitro would 404).
 */
const serviceWorker = (): Plugin => ({
  name: 'matinee:service-worker',
  apply: 'build',
  applyToEnvironment: (env) => env.name === 'client',
  async closeBundle() {
    const { root, build } = this.environment.config
    await buildServiceWorker(root, resolve(root, build.outDir))
  },
})

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    tailwindcss(),
    tanstackStart(),
    nitro({ compressPublicAssets: { gzip: true, brotli: true } }),
    viteReact(),
    serviceWorker(),
  ],
})

export default config
