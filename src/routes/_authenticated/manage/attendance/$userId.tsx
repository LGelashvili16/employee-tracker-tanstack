import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { recordIdSchema } from '#/lib/route-schemas'
import { pageHead } from '#/lib/page-head'
import { companyAttendanceUserSearchSchema } from '#/features/attendance/company-attendance.schemas'
import { CompanyAttendanceUserPage } from '#/features/attendance/pages/company-attendance-user-page'

export const Route = createFileRoute(
  '/_authenticated/manage/attendance/$userId',
)({
  params: {
    parse: (params) => z.object({ userId: recordIdSchema }).parse(params),
  },
  validateSearch: companyAttendanceUserSearchSchema,
  head: () =>
    pageHead(
      'თანამშრომლის დასწრებები და სამუშაო საათები',
      'თანამშრომლის დასწრების ისტორია და სამუშაო საათების შეჯამება.',
    ),
  component: CompanyAttendanceUserPage,
})
