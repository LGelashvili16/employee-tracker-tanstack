import { queryOptions } from '@tanstack/react-query'
import { readTeams } from './teams.functions'
import type { TeamSearch } from './teams.schemas'

export const teamsKey = (actorId: string) => ['teams', actorId] as const
export const teamsQuery = (actorId: string, search: TeamSearch) =>
  queryOptions({
    queryKey: [...teamsKey(actorId), search],
    queryFn: async () => {
      const result = await readTeams({ data: search })
      if (!result.ok) throw new Error(result.message)
      return result.value
    },
    retry: false,
  })
