import { createFileRoute } from '@tanstack/react-router'
import { TimesheetsPage } from '#/features/timesheets/pages/timesheets-page'
import { timesheetsContent } from '#/features/timesheets/timesheets.content'
import { pageHead } from '#/lib/page-head'

export const Route = createFileRoute('/_authenticated/timesheets/')({
  head: () =>
    pageHead(
      timesheetsContent.timesheets.title,
      timesheetsContent.timesheets.description,
    ),
  component: TimesheetsPage,
})
