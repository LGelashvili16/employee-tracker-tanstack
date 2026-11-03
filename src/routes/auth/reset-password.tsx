import { createFileRoute } from '@tanstack/react-router'
import { ResetPasswordPage } from '#/features/auth/pages/reset-password-page'
import { authContent } from '#/features/auth/auth.content'
import { pageHead } from '#/lib/page-head'
import { authLinkSearchSchema } from '#/lib/route-schemas'

export const Route = createFileRoute('/auth/reset-password')({
  validateSearch: authLinkSearchSchema,
  head: () =>
    pageHead(
      authContent.resetPassword.title,
      authContent.resetPassword.description,
    ),
  component: ResetPasswordPage,
})
