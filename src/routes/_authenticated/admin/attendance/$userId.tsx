import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { recordIdSchema } from '#/lib/route-schemas'
import { pageHead } from '#/lib/page-head'
import { companyAttendanceUserSearchSchema } from '#/features/attendance/company-attendance.schemas'
import { CompanyAttendanceUserPage } from '#/features/attendance/pages/company-attendance-user-page'

export const Route = createFileRoute(
  '/_authenticated/admin/attendance/$userId',
)({
  params: {
    parse: (params) => z.object({ userId: recordIdSchema }).parse(params),
  },
  validateSearch: companyAttendanceUserSearchSchema,
  head: () =>
    pageHead(
      'თანამშრომლის დასწრების ისტორია',
      'დასწრების სესიები სამუშაო დღეების მიხედვით.',
    ),
  component: CompanyAttendanceUserPage,
})
