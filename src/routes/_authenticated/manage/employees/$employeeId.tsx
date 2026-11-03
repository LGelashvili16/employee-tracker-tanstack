import { createFileRoute } from '@tanstack/react-router'
import { EmployeeDetailPage } from '#/features/employees/pages/employee-detail-page'
import { employeesContent } from '#/features/employees/employees.content'
import { pageHead } from '#/lib/page-head'
import { requirePagePermission } from '#/lib/auth/auth.functions'
import { z } from 'zod'
import { recordIdSchema } from '#/lib/route-schemas'

export const Route = createFileRoute(
  '/_authenticated/manage/employees/$employeeId',
)({
  params: {
    parse: (params) => z.object({ employeeId: recordIdSchema }).parse(params),
  },
  beforeLoad: () =>
    requirePagePermission({ data: { permission: 'employees.read' } }),
  head: () =>
    pageHead(
      employeesContent.employeeDetail.title,
      employeesContent.employeeDetail.description,
    ),
  component: EmployeeDetailPage,
})
