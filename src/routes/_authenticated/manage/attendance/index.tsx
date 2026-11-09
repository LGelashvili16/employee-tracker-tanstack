import { createFileRoute, redirect } from '@tanstack/react-router'
import { CompanyAttendancePage } from '#/features/attendance/pages/company-attendance-page'
import { companyAttendanceSearchSchema } from '#/features/attendance/company-attendance.schemas'
import { pageHead } from '#/lib/page-head'

export const Route = createFileRoute('/_authenticated/manage/attendance/')({
  validateSearch: companyAttendanceSearchSchema,
  beforeLoad: ({ search }) => {
    if (search.userId)
      throw redirect({
        to: '/manage/attendance/$userId',
        params: { userId: search.userId },
        search: {},
      })
  },
  head: () =>
    pageHead('დასწრებები', 'თანამშრომლები და მათი დასწრების ისტორია.'),
  component: CompanyAttendancePage,
})
