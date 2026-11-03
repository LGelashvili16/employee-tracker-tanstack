import { createFileRoute } from '@tanstack/react-router'
import { VerifyEmailPage } from '#/features/auth/pages/verify-email-page'
import { authContent } from '#/features/auth/auth.content'
import { pageHead } from '#/lib/page-head'
import { authLinkSearchSchema } from '#/lib/route-schemas'

export const Route = createFileRoute('/auth/verify-email')({
  validateSearch: authLinkSearchSchema,
  head: () =>
    pageHead(
      authContent.verifyEmail.title,
      authContent.verifyEmail.description,
    ),
  component: VerifyEmailPage,
})
