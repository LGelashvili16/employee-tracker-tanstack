import { createFileRoute } from '@tanstack/react-router'
import { ProfilePage } from '#/features/account/pages/profile-page'
import { accountContent } from '#/features/account/account.content'
import { pageHead } from '#/lib/page-head'

export const Route = createFileRoute('/_authenticated/settings/profile')({
  head: () =>
    pageHead(accountContent.profile.title, accountContent.profile.description),
  component: ProfilePage,
})
