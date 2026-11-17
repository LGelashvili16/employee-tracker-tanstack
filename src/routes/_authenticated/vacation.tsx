import { createFileRoute, redirect } from '@tanstack/react-router'
import { leaveSearchSchema } from '#/features/leave/leave.schemas'

export const Route = createFileRoute('/_authenticated/vacation')({
  validateSearch: leaveSearchSchema,
  beforeLoad: ({ search }) => {
    throw redirect({ to: '/leave', search, replace: true })
  },
})
