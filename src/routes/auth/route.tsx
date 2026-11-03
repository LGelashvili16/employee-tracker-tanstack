import {
  createFileRoute,
  Link,
  Outlet,
  useMatchRoute,
} from '@tanstack/react-router'
import { APP_NAME } from '#/lib/app'
import { AuthWelcome } from '#/features/auth/components/auth-welcome'
import { RouteError } from '#/components/common/route-feedback'
import ThemeToggle from '#/components/ThemeToggle'
import { PwaInstallButton } from '#/components/common/pwa-install-button'

export const Route = createFileRoute('/auth')({
  component: AuthLayout,
  errorComponent: RouteError,
})
function AuthLayout() {
  const matchRoute = useMatchRoute()
  return (
    <main className="relative grid min-h-svh lg:grid-cols-2">
      <div className="absolute top-5 right-5 z-10 flex items-center gap-2 sm:top-8 sm:right-8">
        <PwaInstallButton />
        <ThemeToggle />
      </div>
      <AuthWelcome
        animateBrand={Boolean(
          matchRoute({ to: '/auth/login' }) ||
          matchRoute({ to: '/auth/register' }),
        )}
      />
      <section className="flex min-w-0 flex-col justify-center px-5 py-24 sm:px-10 lg:px-16">
        <div className="mx-auto flex w-full max-w-md flex-col gap-6">
          <Link
            to="/auth/login"
            className="mb-2 text-sm font-semibold lg:hidden"
          >
            {APP_NAME}
          </Link>
          <Outlet />
          <p className="text-center text-xs leading-6 text-muted-foreground">
            ერთი სივრცე თქვენი სამუშაო დღის სამართავად.
          </p>
        </div>
      </section>
    </main>
  )
}
