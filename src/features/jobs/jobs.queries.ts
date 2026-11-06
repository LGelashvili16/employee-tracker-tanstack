import { queryOptions } from '@tanstack/react-query'
import {
  findJobLocations,
  readJob,
  readJobs,
  suggestJobAddress,
} from './jobs.functions'
import type { JobMapPosition, JobSearch } from './jobs.types'

export const jobsKeys = { all: (actorId: string) => ['jobs', actorId] as const }
export const jobsQueryOptions = (actorId: string, search: JobSearch) =>
  queryOptions({
    queryKey: [
      ...jobsKeys.all(actorId),
      'list',
      search.q,
      search.status,
      search.kind,
      search.scope,
      search.sort,
      search.page,
      search.from,
      search.to,
    ],
    queryFn: async () => {
      const result = await readJobs({ data: search })
      if (!result.ok) throw new Error(result.message)
      return result.value
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    retry: false,
  })
export const jobQueryOptions = (actorId: string, id: string) =>
  queryOptions({
    queryKey: [...jobsKeys.all(actorId), 'detail', id],
    queryFn: async () => {
      const result = await readJob({ data: { id } })
      if (!result.ok) throw new Error(result.message)
      return result.value
    },
    staleTime: 10_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    retry: false,
  })

export const jobLocationsQueryOptions = (actorId: string, q: string) =>
  queryOptions({
    queryKey: [...jobsKeys.all(actorId), 'locations', q],
    queryFn: async ({ signal }) => {
      const result = await findJobLocations({ data: { q }, signal })
      if (!result.ok) throw new Error(result.message)
      return result.value
    },
    staleTime: 10 * 60_000,
    gcTime: 15 * 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  })

export const jobAddressQueryOptions = (
  actorId: string,
  position?: Pick<JobMapPosition, 'longitude' | 'latitude'>,
) =>
  queryOptions({
    queryKey: [
      ...jobsKeys.all(actorId),
      'address-suggestion',
      2,
      position?.longitude,
      position?.latitude,
    ],
    queryFn: async ({ signal }) => {
      if (!position) throw new Error('მიუთითეთ მდებარეობა რუკაზე.')
      const result = await suggestJobAddress({
        data: { longitude: position.longitude, latitude: position.latitude },
        signal,
      })
      if (!result.ok) throw new Error(result.message)
      return result.value
    },
    staleTime: 10 * 60_000,
    gcTime: 15 * 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  })
