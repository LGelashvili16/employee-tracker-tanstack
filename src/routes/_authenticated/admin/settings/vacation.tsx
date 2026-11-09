import { createFileRoute, redirect } from '@tanstack/react-router'
import { requirePagePermission } from '#/lib/auth/auth.functions'

export const Route = createFileRoute('/_authenticated/admin/settings/vacation')(
  {
    beforeLoad: async () => {
      await requirePagePermission({ data: { permission: 'leave.configure' } })
      throw redirect({ to: '/admin/settings/leave', replace: true })
    },
  },
)
