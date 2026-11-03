import { createFileRoute, redirect } from '@tanstack/react-router'
import { getSession } from '#/lib/auth/auth.functions'
import { pageHead } from '#/lib/page-head'

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    throw redirect({ to: (await getSession()) ? '/dashboard' : '/auth/login' })
  },
  head: () =>
    pageHead('სამუშაო სივრცე', 'კომპანიის თანამშრომლების სამუშაო სივრცე.'),
})
