import { createFileRoute, Outlet } from '@tanstack/react-router'
import { requirePagePermission } from '#/lib/auth/auth.functions'

export const Route = createFileRoute('/_authenticated/admin')({
  beforeLoad: () =>
    requirePagePermission({ data: { permission: 'admin.access' } }),
  component: Outlet,
})
