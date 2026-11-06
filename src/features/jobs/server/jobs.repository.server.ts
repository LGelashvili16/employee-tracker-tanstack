import '@tanstack/react-start/server-only'
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  isNotNull,
  or,
  sql,
} from 'drizzle-orm'
import { jobsTimeZone } from '../jobs.dates'
import { alias } from 'drizzle-orm/pg-core'
import { db } from '#/db'
import { employee, job, jobEvent, user } from '#/db/schema'
import { jobsMapLimit, jobsPageSize } from '../jobs.schemas'
import { hasJobCoordinates } from '../jobs.rules'
import type { JobSearch } from '../jobs.types'

export type JobsTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0]
export const transactJobs = db.transaction.bind(db)
const assignee = alias(user, 'job_assignee')
const creator = alias(user, 'job_creator')
const summaryColumns = {
  id: job.id,
  title: job.title,
  address: job.address,
  kind: job.kind,
  deadline: job.deadline,
  status: job.status,
  longitude: job.longitude,
  latitude: job.latitude,
  assigneeId: job.assigneeId,
  assigneeName: assignee.name,
  version: job.version,
  createdAt: job.createdAt,
  updatedAt: job.updatedAt,
}

/** Lock current identity and employment on writes so suspension cannot race the authorization check. */
export async function currentIdentity(
  tx: JobsTransaction,
  id: string,
  lock: boolean,
) {
  const identityQuery = tx
    .select({ id: user.id, roles: user.roles, state: user.accessState })
    .from(user)
    .where(eq(user.id, id))
  const identity = (
    await (lock ? identityQuery.for('share') : identityQuery)
  ).at(0)
  const personQuery = tx
    .select({ status: employee.status })
    .from(employee)
    .where(eq(employee.userId, id))
  const person = (await (lock ? personQuery.for('share') : personQuery)).at(0)
  return { identity, person }
}

export async function listJobs(
  tx: JobsTransaction,
  actorId: string,
  search: JobSearch,
) {
  // Escape SQL wildcard characters so ordinary input is a literal substring search.
  const term = `%${search.q.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_')}%`
  const where = and(
    sql`${job.createdAt} >= (${search.from}::date::timestamp at time zone ${jobsTimeZone})`,
    sql`${job.createdAt} < ((${search.to}::date + 1)::timestamp at time zone ${jobsTimeZone})`,
    search.q
      ? or(
          ilike(job.title, term),
          ilike(job.address, term),
          ilike(job.notes, term),
          ilike(job.streetNameKa, term),
          ilike(job.streetNameEn, term),
          ilike(job.locationLabelKa, term),
          ilike(job.locationLabelEn, term),
        )
      : undefined,
    search.status !== 'all' ? eq(job.status, search.status) : undefined,
    search.kind !== 'all' ? eq(job.kind, search.kind) : undefined,
    search.scope === 'mine' ? eq(job.assigneeId, actorId) : undefined,
  )
  const order =
    search.sort === 'title'
      ? [asc(job.title), asc(job.id)]
      : search.sort === 'oldest'
        ? [asc(job.createdAt), asc(job.id)]
        : [desc(job.createdAt), desc(job.id)]
  const items = await tx
    .select(summaryColumns)
    .from(job)
    .leftJoin(assignee, eq(job.assigneeId, assignee.id))
    .where(where)
    .orderBy(...order)
    .limit(jobsPageSize)
    .offset((search.page - 1) * jobsPageSize)
  const markers = await tx
    .select({
      id: job.id,
      title: job.title,
      kind: job.kind,
      status: job.status,
      longitude: job.longitude,
      latitude: job.latitude,
    })
    .from(job)
    .where(and(where, isNotNull(job.longitude), isNotNull(job.latitude)))
    .orderBy(...order)
    .limit(jobsMapLimit)
  const [total] = await tx
    .select({ count: count(), mappedCount: count(job.longitude) })
    .from(job)
    .where(where)
  return {
    items,
    markers: markers.filter(hasJobCoordinates),
    total: total.count,
    mapTruncated: total.mappedCount > jobsMapLimit,
    unmappedTotal: total.count - total.mappedCount,
  }
}

export async function readJob(tx: JobsTransaction, id: string) {
  const record = (
    await tx
      .select({
        ...summaryColumns,
        notes: job.notes,
        creatorName: creator.name,
        streetNameKa: job.streetNameKa,
        streetNameEn: job.streetNameEn,
        locationLabelKa: job.locationLabelKa,
        locationLabelEn: job.locationLabelEn,
        locationResolvedAt: job.locationResolvedAt,
      })
      .from(job)
      .innerJoin(creator, eq(job.createdBy, creator.id))
      .leftJoin(assignee, eq(job.assigneeId, assignee.id))
      .where(eq(job.id, id))
  ).at(0)
  if (!record) return null
  const history = await tx
    .select({
      id: jobEvent.id,
      action: jobEvent.action,
      status: jobEvent.status,
      note: jobEvent.note,
      actorName: user.name,
      createdAt: jobEvent.createdAt,
    })
    .from(jobEvent)
    .innerJoin(user, eq(jobEvent.actorId, user.id))
    .where(eq(jobEvent.jobId, id))
    .orderBy(desc(jobEvent.createdAt), desc(jobEvent.id))
    .limit(26)
  return {
    ...record,
    history: history.slice(0, 25),
    hasMoreHistory: history.length > 25,
  }
}
export async function lockJob(tx: JobsTransaction, id: string) {
  return (await tx.select().from(job).where(eq(job.id, id)).for('update')).at(0)
}
export async function insertJob(
  tx: JobsTransaction,
  values: typeof job.$inferInsert,
) {
  const inserted = (
    await tx
      .insert(job)
      .values(values)
      .onConflictDoNothing({ target: [job.createdBy, job.requestId] })
      .returning({ id: job.id })
  ).at(0)
  if (inserted) return { ...inserted, inserted: true }
  const existing = (
    await tx
      .select({ id: job.id })
      .from(job)
      .where(
        and(
          eq(job.createdBy, values.createdBy),
          eq(job.requestId, values.requestId),
        ),
      )
      .limit(1)
  ).at(0)
  if (!existing) throw new Error('Job creation conflict')
  return { ...existing, inserted: false }
}
export async function updateJob(
  tx: JobsTransaction,
  id: string,
  values: Partial<
    Pick<
      typeof job.$inferInsert,
      | 'title'
      | 'notes'
      | 'address'
      | 'kind'
      | 'deadline'
      | 'longitude'
      | 'latitude'
      | 'status'
      | 'assigneeId'
      | 'version'
      | 'streetNameKa'
      | 'streetNameEn'
      | 'locationLabelKa'
      | 'locationLabelEn'
      | 'locationResolvedAt'
    >
  >,
) {
  await tx.update(job).set(values).where(eq(job.id, id))
}
export async function appendJobEvent(
  tx: JobsTransaction,
  values: typeof jobEvent.$inferInsert,
) {
  await tx.insert(jobEvent).values(values)
}
