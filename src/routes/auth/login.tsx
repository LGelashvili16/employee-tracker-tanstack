import { createFileRoute } from '@tanstack/react-router'
import { LoginPage } from '#/features/auth/pages/login-page'
import { authContent } from '#/features/auth/auth.content'
import { pageHead } from '#/lib/page-head'
import { authLinkSearchSchema } from '#/lib/route-schemas'

export const Route = createFileRoute('/auth/login')({
  validateSearch: authLinkSearchSchema,
  head: () => pageHead(authContent.login.title, authContent.login.description),
  component: LoginPage,
})
