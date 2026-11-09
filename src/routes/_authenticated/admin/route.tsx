import { createFileRoute, notFound, Outlet } from '@tanstack/react-router'
import { requirePagePermission } from '#/lib/auth/auth.functions'

export const Route = createFileRoute('/_authenticated/admin')({
  beforeLoad: async ({ location }) => {
    await requirePagePermission({ data: { permission: 'admin.access' } })
    // This layout protects admin pages; it has no standalone landing page.
    if (location.pathname.replace(/\/$/, '') === '/admin') throw notFound()
  },
  component: Outlet,
})
