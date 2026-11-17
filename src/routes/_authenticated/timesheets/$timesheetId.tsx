import { createFileRoute } from '@tanstack/react-router'
import { TimesheetDetailPage } from '#/features/timesheets/pages/timesheet-detail-page'
import { timesheetsContent } from '#/features/timesheets/timesheets.content'
import { pageHead } from '#/lib/page-head'
import { z } from 'zod'
import {
  timesheetMonthSchema,
  timesheetSearchSchema,
} from '#/features/timesheets/timesheets.schemas'

export const Route = createFileRoute('/_authenticated/timesheets/$timesheetId')(
  {
    validateSearch: timesheetSearchSchema.omit({ userId: true, month: true }),
    params: {
      parse: (params) =>
        z.object({ timesheetId: timesheetMonthSchema }).parse(params),
    },
    head: () =>
      pageHead(
        timesheetsContent.timesheetDetail.title,
        timesheetsContent.timesheetDetail.description,
      ),
    component: TimesheetDetailPage,
  },
)
