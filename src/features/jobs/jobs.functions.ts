import { createServerFn } from '@tanstack/react-start'
import { setResponseHeader } from '@tanstack/react-start/server'
import { authenticatedMiddleware } from '#/lib/auth/auth.middleware'
import { enforcePolicy } from '#/lib/authorization/guards.server'
import { AuthorizationError } from '#/lib/authorization/authorization-error'
import {
  createJobSchema,
  editJobSchema,
  jobLookupSchema,
  jobLocationSchema,
  jobSearchSchema,
  jobTransitionSchema,
} from './jobs.schemas'
import { JobConflictError, JobWorkflowError } from './jobs.rules'
import { locationSearchSchema } from './job-locations.schemas'
import {
  searchJobLocations,
  suggestCompanyJobAddress,
} from './server/job-locations.service.server'
import {
  createCompanyJob,
  editCompanyJob,
  getCompanyJob,
  listCompanyJobs,
  transitionCompanyJob,
} from './server/jobs.service.server'

async function safely<T>(action: () => Promise<T>) {
  setResponseHeader('Cache-Control', 'private, no-store')
  try {
    return { ok: true as const, value: await enforcePolicy(action) }
  } catch (error) {
    if (error instanceof AuthorizationError) throw error
    return {
      ok: false as const,
      code:
        error instanceof JobConflictError
          ? ('conflict' as const)
          : ('failed' as const),
      message:
        error instanceof JobWorkflowError
          ? error.message
          : 'სამუშაოს მონაცემები ვერ დამუშავდა. სცადეთ ხელახლა.',
    }
  }
}
export const readJobs = createServerFn({ method: 'GET' })
  .middleware([authenticatedMiddleware])
  .validator(jobSearchSchema)
  .handler(({ context, data }) =>
    safely(() => listCompanyJobs(context.actor, data)),
  )
// Search may populate a shared cache and reserve provider capacity, so it is an explicit POST action.
export const findJobLocations = createServerFn({ method: 'POST' })
  .middleware([authenticatedMiddleware])
  .validator(locationSearchSchema)
  .handler(({ context, data }) =>
    safely(() => searchJobLocations(context.actor, data)),
  )
export const suggestJobAddress = createServerFn({ method: 'POST' })
  .middleware([authenticatedMiddleware])
  .validator(jobLocationSchema)
  .handler(({ context, data }) =>
    safely(() => suggestCompanyJobAddress(context.actor, data)),
  )
export const readJob = createServerFn({ method: 'GET' })
  .middleware([authenticatedMiddleware])
  .validator(jobLookupSchema)
  .handler(({ context, data }) =>
    safely(() => getCompanyJob(context.actor, data)),
  )
export const createJob = createServerFn({ method: 'POST' })
  .middleware([authenticatedMiddleware])
  .validator(createJobSchema)
  .handler(({ context, data }) =>
    safely(() => createCompanyJob(context.actor, data)),
  )
export const editJob = createServerFn({ method: 'POST' })
  .middleware([authenticatedMiddleware])
  .validator(editJobSchema)
  .handler(({ context, data }) =>
    safely(() => editCompanyJob(context.actor, data)),
  )
export const changeJobStatus = createServerFn({ method: 'POST' })
  .middleware([authenticatedMiddleware])
  .validator(jobTransitionSchema)
  .handler(({ context, data }) =>
    safely(() => transitionCompanyJob(context.actor, data)),
  )
