import { createFileRoute } from '@tanstack/react-router'
import { SecurityPage } from '#/features/account/pages/security-page'
import { accountContent } from '#/features/account/account.content'
import { pageHead } from '#/lib/page-head'

export const Route = createFileRoute('/_authenticated/settings/security')({
  head: () =>
    pageHead(
      accountContent.security.title,
      accountContent.security.description,
    ),
  component: SecurityPage,
})
