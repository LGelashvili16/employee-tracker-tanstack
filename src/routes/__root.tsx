import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import {
  RouteError,
  RouteNotFound,
  RoutePending,
} from '#/components/common/route-feedback'

import { APP_NAME } from '#/lib/app'
import { pageHead } from '#/lib/page-head'
import { AppProviders } from '#/providers/app-providers'

import appCss from '../styles.css?url'

const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem('theme');var mode=(stored==='light'||stored==='dark'||stored==='auto')?stored:'auto';var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var resolved=mode==='auto'?(prefersDark?'dark':'light'):mode;var root=document.documentElement;root.classList.remove('light','dark');root.classList.add(resolved);if(mode==='auto'){root.removeAttribute('data-theme')}else{root.setAttribute('data-theme',mode)}root.style.colorScheme=resolved;}catch(e){}})();`

export const Route = createRootRoute({
  head: ({ matches }) => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: APP_NAME,
      },
      { name: 'application-name', content: APP_NAME },
      { name: 'theme-color', content: '#1c1c1c' },
      { name: 'apple-mobile-web-app-title', content: APP_NAME },
      // Router marks unmatched URLs with _notFound and missing resources by status.
      ...(matches.some(
        (match) => match._notFound || match.status === 'notFound',
      )
        ? pageHead(
            'გვერდი ვერ მოიძებნა',
            'მოთხოვნილი გვერდი არ არსებობს ან მისი მისამართი შეიცვალა.',
          ).meta
        : []),
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      { rel: 'manifest', href: '/manifest.webmanifest' },
      { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
      { rel: 'apple-touch-icon', href: '/icons/apple-touch-icon.png' },
    ],
  }),
  component: Outlet,
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  pendingComponent: RoutePending,
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ka" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body className="font-sans antialiased wrap-anywhere selection:bg-[rgba(115,115,115,0.24)]">
        <AppProviders>{children}</AppProviders>
        {import.meta.env.DEV && (
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
        )}
        <Scripts />
      </body>
    </html>
  )
}
