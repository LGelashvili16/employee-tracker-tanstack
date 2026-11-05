import { queryOptions } from '@tanstack/react-query'
import { getOwnProfile } from './account.functions'

/** Keyed by account so one person's profile can never be served to the next user of the same browser. */
export const ownProfileQueryOptions = (actorId: string) =>
  queryOptions({
    queryKey: ['own-profile', actorId],
    queryFn: () => getOwnProfile(),
  })
