import { createFileRoute } from '@tanstack/react-router'
import { CompanyTimesheetsPage } from '#/features/timesheets/pages/company-timesheets-page'
import { timesheetSearchSchema } from '#/features/timesheets/timesheets.schemas'
import { requirePagePermission } from '#/lib/auth/auth.functions'
import { pageHead } from '#/lib/page-head'

export const Route = createFileRoute('/_authenticated/admin/timesheets')({
  validateSearch: timesheetSearchSchema,
  beforeLoad: () =>
    requirePagePermission({ data: { permission: 'attendance.read.all' } }),
  head: () =>
    pageHead(
      'ყველა თანამშრომლის სამუშაო საათები',
      'კომპანიის ყოველთვიური სამუშაო საათები.',
    ),
  component: CompanyTimesheetsPage,
})
