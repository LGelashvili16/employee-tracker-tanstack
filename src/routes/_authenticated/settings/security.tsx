import { createFileRoute } from '@tanstack/react-router'
import { SecurityPage } from '#/features/account/pages/security-page'
import { accountContent } from '#/features/account/account.content'
import { pageHead } from '#/lib/page-head'
import { ownSecuritySearchSchema } from '#/features/attendance-security/attendance-security.schemas'

export const Route = createFileRoute('/_authenticated/settings/security')({
  validateSearch: ownSecuritySearchSchema,
  head: () =>
    pageHead(
      accountContent.security.title,
      accountContent.security.description,
    ),
  component: SecurityPage,
})
