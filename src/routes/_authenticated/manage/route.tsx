import { createFileRoute, notFound, Outlet } from '@tanstack/react-router'
import { requirePagePermission } from '#/lib/auth/auth.functions'

export const Route = createFileRoute('/_authenticated/manage')({
  beforeLoad: async ({ location }) => {
    await requirePagePermission({ data: { permission: 'manage.access' } })
    if (location.pathname.replace(/\/$/, '') === '/manage') throw notFound()
  },
  component: Outlet,
})
