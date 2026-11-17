import type { WorkingWeek } from '#/features/scheduling/scheduling.types'

export interface IssuedAccountCode {
  code: string
  expiresAt: string
  purpose: 'activation' | 'reset'
}
export interface OwnEmployeeProfile {
  code: string
  jobTitle: string | null
  phone: string | null
}
/** Row of the lean account list. */
export interface EmployeeAccountSummary {
  userId: string
  name: string
  code: string
  jobTitle: string | null
  roles: string
  state: string
  employmentStatus: string
}
/** Everything shown on the single-account page. */
export interface EmployeeAccountRecord extends EmployeeAccountSummary {
  contactEmail: string | null
  phone: string | null
  /** Custom recurring week; null means the employee follows the company schedule. */
  workingWeek: WorkingWeek | null
}
export interface EmployeeAccountDetail {
  record: EmployeeAccountRecord
  /** Current company week shown when the employee inherits it; null while none is configured. */
  companyWeek: WorkingWeek | null
}
