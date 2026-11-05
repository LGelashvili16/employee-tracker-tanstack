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
export interface EmployeeAccountRecord {
  userId: string
  name: string
  code: string
  contactEmail: string | null
  jobTitle: string | null
  phone: string | null
  roles: string
  state: string
  employmentStatus: string
}
