import { createFileRoute, Link, Outlet } from '@tanstack/react-router'
import { RouteError } from '#/components/common/route-feedback'

export const Route = createFileRoute('/auth')({
  component: AuthLayout,
  errorComponent: RouteError,
})
function AuthLayout() {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-lg flex-col gap-8 px-5 py-12">
      <Link to="/auth/login" className="text-sm font-semibold">
        კომპანიის სამუშაო სივრცე
      </Link>
      <Outlet />
      <nav
        aria-label="ანგარიშზე წვდომა"
        className="flex flex-wrap gap-4 text-sm text-muted-foreground"
      >
        <Link to="/auth/login">შესვლა</Link>
        <Link to="/auth/forgot-password">პაროლის აღდგენა</Link>
      </nav>
    </main>
  )
}
