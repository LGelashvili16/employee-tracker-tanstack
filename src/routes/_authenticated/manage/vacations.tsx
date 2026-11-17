import { createFileRoute, redirect } from '@tanstack/react-router'
import { leaveSearchSchema } from '#/features/leave/leave.schemas'
import { requirePagePermission } from '#/lib/auth/auth.functions'

export const Route = createFileRoute('/_authenticated/manage/vacations')({
  validateSearch: leaveSearchSchema,
  beforeLoad: async ({ search }) => {
    await requirePagePermission({ data: { permission: 'leave.review' } })
    throw redirect({ to: '/manage/leave', search, replace: true })
  },
})
