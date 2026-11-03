import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/dashboard/settings')({
  beforeLoad: () => {
    throw redirect({ to: '/settings/profile' })
  },
})
