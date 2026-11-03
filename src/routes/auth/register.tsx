import { createFileRoute } from '@tanstack/react-router'
import { RegisterPage } from '#/features/auth/pages/register-page'
import { authContent } from '#/features/auth/auth.content'
import { pageHead } from '#/lib/page-head'
import { authLinkSearchSchema } from '#/lib/route-schemas'

export const Route = createFileRoute('/auth/register')({
  validateSearch: authLinkSearchSchema,
  head: () =>
    pageHead(authContent.register.title, authContent.register.description),
  component: RegisterPage,
})
