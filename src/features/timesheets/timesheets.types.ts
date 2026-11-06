import type { z } from 'zod'
import type { timesheetSearchSchema } from './timesheets.schemas'
import type { getTeamTimesheets } from './timesheets.functions'

export type TimesheetSearch = z.infer<typeof timesheetSearchSchema>
export type TimesheetResult = Extract<
  Awaited<ReturnType<typeof getTeamTimesheets>>,
  { ok: true }
>['value']
export type TimesheetDay = TimesheetResult['rows'][number]
