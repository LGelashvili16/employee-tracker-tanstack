import { createFileRoute } from '@tanstack/react-router'
import { TeamsPage } from '#/features/teams/pages/teams-page'
import { teamsContent } from '#/features/teams/teams.content'
import { pageHead } from '#/lib/page-head'
import { requirePagePermission } from '#/lib/auth/auth.functions'

export const Route = createFileRoute('/_authenticated/manage/teams')({
  beforeLoad: () =>
    requirePagePermission({ data: { permission: 'teams.manage' } }),
  head: () =>
    pageHead(teamsContent.teams.title, teamsContent.teams.description),
  component: TeamsPage,
})
