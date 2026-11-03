import { createFileRoute, Link, Outlet } from '@tanstack/react-router'
import { APP_NAME } from '#/lib/app'
import { AuthWelcome } from '#/features/auth/components/auth-welcome'
import { RouteError } from '#/components/common/route-feedback'

export const Route = createFileRoute('/auth')({
  component: AuthLayout,
  errorComponent: RouteError,
})
function AuthLayout() {
  return (
    <main className="grid min-h-svh lg:grid-cols-2">
      <AuthWelcome />
      <section className="flex min-w-0 flex-col justify-center px-5 py-10 sm:px-10 lg:px-16">
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
