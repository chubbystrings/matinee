import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import unbounded800 from '@fontsource/unbounded/files/unbounded-latin-800-normal.woff2?url'
import appCss from '../styles.css?url'
import '#/lib/registerServiceWorker'
import { THEME_INIT_SCRIPT } from '#/store/theme'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Matinee',
      },
      { name: 'theme-color', content: '#0E0D12' },
      {
        name: 'description',
        content:
          'Short features, no downloads: a lobby of small browser games.',
      },
    ],
    scripts: [{ children: THEME_INIT_SCRIPT }],
    links: [
      { rel: 'icon', href: '/icon.svg', type: 'image/svg+xml' },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      { rel: 'manifest', href: '/manifest.webmanifest' },
      // Hero title and posters are Unbounded 800: fetch it before the CSS finishes parsing.
      {
        rel: 'preload',
        as: 'font',
        type: 'font/woff2',
        href: unbounded800,
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body suppressHydrationWarning>
        {children}
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
