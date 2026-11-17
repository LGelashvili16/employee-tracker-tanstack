import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/attendance/corrections')({
  beforeLoad: () => {
    throw redirect({ to: '/attendance', replace: true })
  },
})
