import { FeaturePage } from '#/components/common/feature-page'
import { employeesContent } from '../employees.content'

export function EmployeeDetailPage() {
  return <FeaturePage {...employeesContent.employeeDetail} />
}
