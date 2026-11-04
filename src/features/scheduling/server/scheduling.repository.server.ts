import '@tanstack/react-start/server-only'
import { and, asc, desc, eq, gt, inArray, lte, sql } from 'drizzle-orm'
import { db } from '#/db'
import {
  companySchedule,
  companyScheduleDay,
  companyScheduleAudit,
  user,
  employee,
} from '#/db/schema'
import type { CompanySchedule } from '../scheduling.schemas'
import { companyLocalDate } from '../scheduling.rules'
import type { CompanyWorkday } from '../scheduling.types'

export type ScheduleTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0]
export const transactSchedules = db.transaction.bind(db)

/** Shared singleton lock also serializes the first write, when there is no schedule row to lock. */
export async function lockScheduleTimeline(tx: ScheduleTransaction) {
  await tx.execute(sql`select pg_advisory_xact_lock(812734, 1)`)
}

export async function currentAccount(tx: ScheduleTransaction, actorId: string) {
  // Share locks keep suspension/role and employment changes from racing this transaction.
  const identity = (
    await tx
      .select({ roles: user.roles, state: user.accessState })
      .from(user)
      .where(eq(user.id, actorId))
      .for('share')
  ).at(0)
  const person = (
    await tx
      .select({ status: employee.status })
      .from(employee)
      .where(eq(employee.userId, actorId))
      .for('share')
  ).at(0)
  return { identity, person }
}

export async function latestVersion(tx: ScheduleTransaction) {
  return (
    (
      await tx
        .select()
        .from(companySchedule)
        .orderBy(desc(companySchedule.effectiveFrom))
        .limit(1)
    ).at(0) ?? null
  )
}

export async function readVersions(tx: ScheduleTransaction, today: string) {
  const current =
    (
      await tx
        .select()
        .from(companySchedule)
        .where(lte(companySchedule.effectiveFrom, today))
        .orderBy(desc(companySchedule.effectiveFrom))
        .limit(1)
    ).at(0) ?? null
  const upcoming = await tx
    .select()
    .from(companySchedule)
    .where(gt(companySchedule.effectiveFrom, today))
    .orderBy(asc(companySchedule.effectiveFrom))
    .limit(21)
  return { current, upcoming }
}

export async function hydrateVersions(
  tx: ScheduleTransaction,
  versions: Array<typeof companySchedule.$inferSelect>,
): Promise<Array<CompanySchedule>> {
  if (!versions.length) return []
  const days = await tx
    .select()
    .from(companyScheduleDay)
    .where(
      inArray(
        companyScheduleDay.effectiveFrom,
        versions.map((version) => version.effectiveFrom),
      ),
    )
    .orderBy(asc(companyScheduleDay.weekday))
  return versions.map(({ createdAt: _, ...version }) => ({
    ...version,
    days: days
      .filter((day) => day.effectiveFrom === version.effectiveFrom)
      .map((day) => ({
        weekday: day.weekday,
        hours:
          day.startTime !== null && day.endTime !== null
            ? { start: day.startTime.slice(0, 5), end: day.endTime.slice(0, 5) }
            : null,
      })),
  }))
}

export async function insertVersion(
  tx: ScheduleTransaction,
  schedule: CompanySchedule,
  actorId: string,
  reason: string,
) {
  const { days, ...version } = schedule
  await tx.insert(companySchedule).values(version)
  await tx.insert(companyScheduleDay).values(
    days.map((day) => ({
      effectiveFrom: version.effectiveFrom,
      weekday: day.weekday,
      startTime: day.hours?.start ?? null,
      endTime: day.hours?.end ?? null,
    })),
  )
  await tx
    .insert(companyScheduleAudit)
    .values({ effectiveFrom: version.effectiveFrom, actorId, reason })
}

/** Private read interface for attendance; no administration or audit fields leave this boundary. */
export async function companyWorkdayAt(
  now: Date,
  connection: ScheduleTransaction,
): Promise<CompanyWorkday> {
  // Match the schedule writer's exclusive lock so first-time configuration cannot change timezone/date between these reads.
  await connection.execute(sql`select pg_advisory_xact_lock_shared(812734, 1)`)
  const latest = (
    await connection
      .select({ timezone: companySchedule.timezone })
      .from(companySchedule)
      .orderBy(desc(companySchedule.effectiveFrom))
      .limit(1)
  ).at(0)
  const timezone = latest?.timezone ?? 'Asia/Tbilisi'
  const date = companyLocalDate(now, timezone)
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay() || 7
  const start = sql`(${date}::date + ${companyScheduleDay.startTime}) at time zone ${companySchedule.timezone}`
  const end = sql`(${date}::date + ${companyScheduleDay.endTime}) at time zone ${companySchedule.timezone}`
  const record = (
    await connection
      .select({
        effectiveFrom: companySchedule.effectiveFrom,
        start: companyScheduleDay.startTime,
        end: companyScheduleDay.endTime,
        startsAt: sql<Date>`${start}`.mapWith(companySchedule.createdAt),
        endsAt: sql<Date>`${end}`.mapWith(companySchedule.createdAt),
        // Reject nonexistent local times on spring-forward days. Ambiguous fall-back times use PostgreSQL's standard-time choice.
        valid: sql<boolean>`to_char((${start}) at time zone ${companySchedule.timezone}, 'HH24:MI:SS') = ${companyScheduleDay.startTime}::text and to_char((${end}) at time zone ${companySchedule.timezone}, 'HH24:MI:SS') = ${companyScheduleDay.endTime}::text`,
      })
      .from(companySchedule)
      .innerJoin(
        companyScheduleDay,
        and(
          eq(companySchedule.effectiveFrom, companyScheduleDay.effectiveFrom),
          eq(companyScheduleDay.weekday, weekday),
        ),
      )
      .where(lte(companySchedule.effectiveFrom, date))
      .orderBy(desc(companySchedule.effectiveFrom))
      .limit(1)
  ).at(0)
  const empty: CompanyWorkday = {
    date,
    timezone,
    kind: 'unconfigured',
    effectiveFrom: null,
    start: null,
    end: null,
    startsAt: null,
    endsAt: null,
  }
  if (!record) return empty
  if (!record.start || !record.end)
    return { ...empty, kind: 'day_off', effectiveFrom: record.effectiveFrom }
  if (!record.valid || record.endsAt <= record.startsAt) return empty
  return {
    date,
    timezone,
    kind: 'scheduled',
    effectiveFrom: record.effectiveFrom,
    start: record.start.slice(0, 5),
    end: record.end.slice(0, 5),
    startsAt: record.startsAt.toISOString(),
    endsAt: record.endsAt.toISOString(),
  }
}
