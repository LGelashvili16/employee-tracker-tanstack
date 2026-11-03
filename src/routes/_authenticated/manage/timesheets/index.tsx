import { createFileRoute } from '@tanstack/react-router'
import { TeamTimesheetsPage } from '#/features/timesheets/pages/team-timesheets-page'
import { timesheetsContent } from '#/features/timesheets/timesheets.content'
import { pageHead } from '#/lib/page-head'
import { requirePagePermission } from '#/lib/auth/auth.functions'

export const Route = createFileRoute('/_authenticated/manage/timesheets/')({
  beforeLoad: () =>
    requirePagePermission({ data: { permission: 'timesheets.review.team' } }),
  head: () =>
    pageHead(
      timesheetsContent.teamTimesheets.title,
      timesheetsContent.teamTimesheets.description,
    ),
  component: TeamTimesheetsPage,
})
