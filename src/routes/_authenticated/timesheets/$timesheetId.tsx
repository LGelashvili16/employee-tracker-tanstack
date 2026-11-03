import { createFileRoute } from '@tanstack/react-router'
import { TimesheetDetailPage } from '#/features/timesheets/pages/timesheet-detail-page'
import { timesheetsContent } from '#/features/timesheets/timesheets.content'
import { pageHead } from '#/lib/page-head'
import { z } from 'zod'
import { recordIdSchema } from '#/lib/route-schemas'

export const Route = createFileRoute('/_authenticated/timesheets/$timesheetId')(
  {
    params: {
      parse: (params) =>
        z.object({ timesheetId: recordIdSchema }).parse(params),
    },
    head: () =>
      pageHead(
        timesheetsContent.timesheetDetail.title,
        timesheetsContent.timesheetDetail.description,
      ),
    component: TimesheetDetailPage,
  },
)
