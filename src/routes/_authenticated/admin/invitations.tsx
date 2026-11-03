import { createFileRoute } from '@tanstack/react-router'
import { InvitationsPage } from '#/features/invitations/pages/invitations-page'
import { invitationsContent } from '#/features/invitations/invitations.content'
import { pageHead } from '#/lib/page-head'
import { requirePagePermission } from '#/lib/auth/auth.functions'

export const Route = createFileRoute('/_authenticated/admin/invitations')({
  beforeLoad: () =>
    requirePagePermission({ data: { permission: 'invitations.manage' } }),
  head: () =>
    pageHead(
      invitationsContent.invitations.title,
      invitationsContent.invitations.description,
    ),
  component: InvitationsPage,
})
