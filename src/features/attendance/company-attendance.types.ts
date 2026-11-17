import type { z } from 'zod'
import type { companyAttendanceSearchSchema } from './company-attendance.schemas'
import type {
  readCompanyAttendanceUsers,
  readCompanyUserAttendance,
} from './attendance.functions'

export type CompanyAttendanceSearch = z.infer<
  typeof companyAttendanceSearchSchema
>
export type CompanyAttendanceAccount = Extract<
  Awaited<ReturnType<typeof readCompanyAttendanceUsers>>,
  { ok: true }
>['value']['items'][number]
export type CompanyAttendanceUser = NonNullable<
  Extract<
    Awaited<ReturnType<typeof readCompanyUserAttendance>>,
    { ok: true }
  >['value']
>
export type CompanyAttendanceSession = CompanyAttendanceUser['sessions'][number]
