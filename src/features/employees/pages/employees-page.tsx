import { FeaturePage } from '#/components/common/feature-page'
import { employeesContent } from '../employees.content'

export function EmployeesPage() {
  return <FeaturePage {...employeesContent.employees} />
}
