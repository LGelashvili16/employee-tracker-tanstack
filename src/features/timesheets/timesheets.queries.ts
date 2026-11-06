import { queryOptions } from '@tanstack/react-query'
import { getCompanyTimesheets } from './timesheets.functions'
import { timesheetRequestSchema } from './timesheets.schemas'
import type { TimesheetSearch } from './timesheets.types'

export function companyTimesheetsQuery(
  actorId: string,
  search: TimesheetSearch,
) {
  const data = timesheetRequestSchema.parse({
    ...search,
    sort: search.sort ?? 'date-desc',
  })
  return queryOptions({
    queryKey: ['company-timesheets', actorId, data],
    queryFn: async () => {
      const result = await getCompanyTimesheets({ data })
      if (!result.ok) throw new Error(result.message)
      return result.value
    },
    retry: false,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  })
}
