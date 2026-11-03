import { createFileRoute } from '@tanstack/react-router'
import { MfaPage } from '#/features/auth/pages/mfa-page'
import { authContent } from '#/features/auth/auth.content'
import { pageHead } from '#/lib/page-head'
import { authLinkSearchSchema } from '#/lib/route-schemas'

export const Route = createFileRoute('/auth/mfa')({
  validateSearch: authLinkSearchSchema,
  head: () => pageHead(authContent.mfa.title, authContent.mfa.description),
  component: MfaPage,
})
