import type { z } from 'zod'
import type { timesheetSearchSchema } from './timesheets.schemas'
import type { getOwnTimesheets } from './timesheets.functions'

export type TimesheetSearch = z.infer<typeof timesheetSearchSchema>
export type TimesheetResult = Extract<
  Awaited<ReturnType<typeof getOwnTimesheets>>,
  { ok: true }
>['value']
export type TimesheetDay = TimesheetResult['rows'][number]
