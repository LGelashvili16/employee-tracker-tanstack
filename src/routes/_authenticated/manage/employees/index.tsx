import { createFileRoute } from '@tanstack/react-router'
import { EmployeesPage } from '#/features/employees/pages/employees-page'
import { employeesContent } from '#/features/employees/employees.content'
import { pageHead } from '#/lib/page-head'
import { requirePagePermission } from '#/lib/auth/auth.functions'

export const Route = createFileRoute('/_authenticated/manage/employees/')({
  beforeLoad: () =>
    requirePagePermission({ data: { permission: 'employees.read' } }),
  head: () =>
    pageHead(
      employeesContent.employees.title,
      employeesContent.employees.description,
    ),
  component: EmployeesPage,
})
