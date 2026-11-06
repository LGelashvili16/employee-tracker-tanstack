import '@tanstack/react-start/server-only'
import {
  createJobSchema,
  editJobSchema,
  jobLookupSchema,
  jobSearchSchema,
  jobTransitionSchema,
} from '../jobs.schemas'
import {
  hasJobCoordinates,
  JobConflictError,
  JobWorkflowError,
} from '../jobs.rules'
import {
  assertJobManager,
  assertJobTransition,
  requireJobActor,
} from './jobs.policy.server'
import * as repository from './jobs.repository.server'
import { resolveJobStreet } from './job-locations.service.server'
import type { ResolvedLocation } from '../job-locations.types'
import type { Actor } from '#/lib/authorization/actor'
import type { JobDetail, JobsWorkspace } from '../jobs.types'

function validateInput<T>(
  schema: {
    safeParse: (
      input: unknown,
    ) => { success: true; data: T } | { success: false }
  },
  input: unknown,
): T {
  const parsed = schema.safeParse(input)
  if (!parsed.success)
    throw new JobWorkflowError(
      'მოთხოვნა არასწორია. გადაამოწმეთ შეყვანილი მონაცემები.',
    )
  return parsed.data
}
export async function listCompanyJobs(
  actor: Actor | null,
  input: unknown,
): Promise<JobsWorkspace> {
  const search = validateInput(jobSearchSchema, input)
  return repository.transactJobs(
    async (tx) => {
      const current = await requireJobActor(tx, actor)
      const result = await repository.listJobs(tx, current.id, search)
      return {
        ...result,
        items: result.items.map((item) => ({
          ...item,
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
        })),
      }
    },
    { isolationLevel: 'repeatable read', accessMode: 'read only' },
  )
}
export async function getCompanyJob(
  actor: Actor | null,
  input: unknown,
): Promise<JobDetail> {
  const { id } = validateInput(jobLookupSchema, input)
  return repository.transactJobs(
    async (tx) => {
      await requireJobActor(tx, actor)
      const record = await repository.readJob(tx, id)
      if (!record) throw new JobWorkflowError('სამუშაო ვერ მოიძებნა.')
      return {
        ...record,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
        locationResolvedAt: record.locationResolvedAt?.toISOString() ?? null,
        history: record.history.map((event) => ({
          ...event,
          createdAt: event.createdAt.toISOString(),
        })),
      }
    },
    { isolationLevel: 'repeatable read', accessMode: 'read only' },
  )
}
export async function createCompanyJob(actor: Actor | null, input: unknown) {
  const data = validateInput(createJobSchema, input)
  await repository.transactJobs(async (tx) => {
    assertJobManager(await requireJobActor(tx, actor))
  })
  const location = hasJobCoordinates(data) ? await resolveJobStreet(data) : null
  return repository.transactJobs(async (tx) => {
    const current = await requireJobActor(tx, actor, true)
    assertJobManager(current)
    const record = await repository.insertJob(tx, {
      title: data.title,
      notes: data.notes,
      address: data.address,
      kind: data.kind,
      deadline: data.deadline,
      longitude: data.longitude,
      latitude: data.latitude,
      requestId: data.requestId,
      createdBy: current.id,
      ...locationFields(location),
    })
    if (record.inserted)
      await repository.appendJobEvent(tx, {
        jobId: record.id,
        actorId: current.id,
        action: 'created',
        status: 'pending',
      })
    return {
      id: record.id,
      streetNamesAvailable:
        !hasJobCoordinates(data) ||
        Boolean(location?.streetNameKa && location.streetNameEn),
    }
  })
}
async function currentJob(
  tx: repository.JobsTransaction,
  id: string,
  version: number,
) {
  const record = await repository.lockJob(tx, id)
  if (!record) throw new JobWorkflowError('სამუშაო ვერ მოიძებნა.')
  if (record.version !== version)
    throw new JobConflictError(
      'სამუშაო უკვე შეიცვალა. განაახლეთ მონაცემები და სცადეთ ხელახლა.',
    )
  return record
}
export async function editCompanyJob(actor: Actor | null, input: unknown) {
  const data = validateInput(editJobSchema, input)
  const before = await repository.transactJobs(async (tx) => {
    assertJobManager(await requireJobActor(tx, actor))
    const record = await currentJob(tx, data.id, data.version)
    if (record.status === 'completed' || record.status === 'rejected')
      throw new JobWorkflowError('რედაქტირებამდე სამუშაო თავიდან დაგეგმეთ.')
    return record
  })
  const needsLookup =
    before.longitude !== data.longitude ||
    before.latitude !== data.latitude ||
    !before.locationResolvedAt
  const location =
    needsLookup && hasJobCoordinates(data) ? await resolveJobStreet(data) : null
  return repository.transactJobs(async (tx) => {
    const current = await requireJobActor(tx, actor, true)
    assertJobManager(current)
    const record = await currentJob(tx, data.id, data.version)
    if (record.status === 'completed' || record.status === 'rejected')
      throw new JobWorkflowError('რედაქტირებამდე სამუშაო თავიდან დაგეგმეთ.')
    await repository.updateJob(tx, record.id, {
      title: data.title,
      notes: data.notes,
      address: data.address,
      kind: data.kind,
      deadline: data.deadline,
      longitude: data.longitude,
      latitude: data.latitude,
      version: record.version + 1,
      ...(needsLookup ? locationFields(location) : {}),
    })
    await repository.appendJobEvent(tx, {
      jobId: record.id,
      actorId: current.id,
      action: 'edited',
      status: record.status,
    })
    return {
      id: record.id,
      streetNamesAvailable:
        !hasJobCoordinates(data) ||
        (needsLookup
          ? Boolean(location?.streetNameKa && location.streetNameEn)
          : Boolean(record.streetNameKa && record.streetNameEn)),
    }
  })
}
function locationFields(location: ResolvedLocation | null) {
  return {
    streetNameKa: location?.streetNameKa ?? null,
    streetNameEn: location?.streetNameEn ?? null,
    locationLabelKa: location?.labelKa ?? null,
    locationLabelEn: location?.labelEn ?? null,
    locationResolvedAt: location ? new Date() : null,
  }
}
export async function transitionCompanyJob(
  actor: Actor | null,
  input: unknown,
) {
  const data = validateInput(jobTransitionSchema, input)
  return repository.transactJobs(async (tx) => {
    const current = await requireJobActor(tx, actor, true)
    const record = await currentJob(tx, data.id, data.version)
    assertJobTransition(current, record, data.status)
    const assigneeId =
      data.status === 'pending'
        ? null
        : record.status === 'pending' && data.status === 'en_route'
          ? current.id
          : record.assigneeId
    await repository.updateJob(tx, record.id, {
      status: data.status,
      assigneeId,
      version: record.version + 1,
    })
    await repository.appendJobEvent(tx, {
      jobId: record.id,
      actorId: current.id,
      action: 'status_changed',
      status: data.status,
      note: data.note,
    })
    return { id: record.id }
  })
}
