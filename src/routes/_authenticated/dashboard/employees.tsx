import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/dashboard/employees')({
  beforeLoad: () => {
    throw redirect({ to: '/manage/employees' })
  },
})
