import { createFileRoute } from '@tanstack/react-router'
import { ReviewTimesheetPage } from '#/features/timesheets/pages/review-timesheet-page'
import { timesheetsContent } from '#/features/timesheets/timesheets.content'
import { pageHead } from '#/lib/page-head'
import { requirePagePermission } from '#/lib/auth/auth.functions'
import { z } from 'zod'
import { recordIdSchema } from '#/lib/route-schemas'

export const Route = createFileRoute(
  '/_authenticated/manage/timesheets/$timesheetId',
)({
  params: {
    parse: (params) => z.object({ timesheetId: recordIdSchema }).parse(params),
  },
  beforeLoad: () =>
    requirePagePermission({ data: { permission: 'timesheets.review.team' } }),
  head: () =>
    pageHead(
      timesheetsContent.reviewTimesheet.title,
      timesheetsContent.reviewTimesheet.description,
    ),
  component: ReviewTimesheetPage,
})
