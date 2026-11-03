import { createFileRoute } from '@tanstack/react-router'
import { ForgotPasswordPage } from '#/features/auth/pages/forgot-password-page'
import { authContent } from '#/features/auth/auth.content'
import { pageHead } from '#/lib/page-head'
import { authLinkSearchSchema } from '#/lib/route-schemas'

export const Route = createFileRoute('/auth/forgot-password')({
  validateSearch: authLinkSearchSchema,
  head: () =>
    pageHead(
      authContent.forgotPassword.title,
      authContent.forgotPassword.description,
    ),
  component: ForgotPasswordPage,
})
