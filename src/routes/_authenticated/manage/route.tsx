import { createFileRoute, Outlet } from '@tanstack/react-router'
import { requirePagePermission } from '#/lib/auth/auth.functions'

export const Route = createFileRoute('/_authenticated/manage')({
  beforeLoad: () =>
    requirePagePermission({ data: { permission: 'manage.access' } }),
  component: Outlet,
})
