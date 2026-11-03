import { createFileRoute } from '@tanstack/react-router'
import { AcceptInvitationPage } from '#/features/auth/pages/accept-invitation-page'
import { authContent } from '#/features/auth/auth.content'
import { pageHead } from '#/lib/page-head'
import { authLinkSearchSchema } from '#/lib/route-schemas'

export const Route = createFileRoute('/auth/accept-invitation')({
  validateSearch: authLinkSearchSchema,
  head: () =>
    pageHead(
      authContent.acceptInvitation.title,
      authContent.acceptInvitation.description,
    ),
  component: AcceptInvitationPage,
})
