import '@tanstack/react-start/server-only'
import { assertPermission } from '#/lib/authorization/access'
import { AuthorizationError } from '#/lib/authorization/authorization-error'
import { parseRoles } from '#/lib/authorization/permissions'
import {
  companyScheduleSchema,
  saveCompanyScheduleSchema,
} from '../scheduling.schemas'
import { companyLocalDate, earliestScheduleDate } from '../scheduling.rules'
import * as repository from './scheduling.repository.server'
import type { Actor } from '#/lib/authorization/actor'
import type { ScheduleSettings } from '../scheduling.types'

export class ScheduleWorkflowError extends Error {}

/** Internal attendance interface; the caller establishes the active employee before reading expectations. */
export function getCompanyWorkday(
  now: Date,
  transaction?: repository.ScheduleTransaction,
) {
  if (transaction) return repository.companyWorkdayAt(now, transaction)
  return repository.transactSchedules((tx) =>
    repository.companyWorkdayAt(now, tx),
  )
}

async function authorize(
  tx: repository.ScheduleTransaction,
  actor: Actor | null,
) {
  if (!actor) throw new AuthorizationError()
  const { identity, person } = await repository.currentAccount(tx, actor.id)
  if (
    !identity ||
    identity.state !== 'active' ||
    (person && person.status !== 'active')
  )
    throw new AuthorizationError()
  assertPermission(
    { ...actor, roles: parseRoles(identity.roles) },
    'attendance.configure',
  )
  return actor
}

export async function readScheduleSettings(
  actor: Actor | null,
): Promise<ScheduleSettings> {
  return repository.transactSchedules(async (tx) => {
    await authorize(tx, actor)
    const latest = await repository.latestVersion(tx)
    const today = companyLocalDate(
      new Date(),
      latest?.timezone ?? 'Asia/Tbilisi',
    )
    const versions = await repository.readVersions(tx, today)
    const records = await repository.hydrateVersions(tx, [
      ...(versions.current ? [versions.current] : []),
      ...versions.upcoming.slice(0, 20),
      ...(latest ? [latest] : []),
    ])
    return {
      current:
        records.find(
          (record) => record.effectiveFrom === versions.current?.effectiveFrom,
        ) ?? null,
      latest:
        records.find(
          (record) => record.effectiveFrom === latest?.effectiveFrom,
        ) ?? null,
      upcoming: versions.upcoming
        .slice(0, 20)
        .map((record) =>
          records.find((value) => value.effectiveFrom === record.effectiveFrom),
        )
        .filter((record) => record !== undefined),
      hasMoreUpcoming: versions.upcoming.length > 20,
      today,
      minimumEffectiveFrom: earliestScheduleDate(
        today,
        latest?.effectiveFrom ?? null,
      ),
      timezone: latest?.timezone ?? null,
    }
  })
}

export async function saveScheduleVersion(actor: Actor | null, input: unknown) {
  return repository.transactSchedules(async (tx) => {
    const administrator = await authorize(tx, actor)
    const parsed = saveCompanyScheduleSchema.safeParse(input)
    if (!parsed.success)
      throw new ScheduleWorkflowError(
        'გადაამოწმეთ განრიგის ველები და სცადეთ ხელახლა.',
      )
    await repository.lockScheduleTimeline(tx)
    const latest = await repository.latestVersion(tx)
    const timezone = new Intl.DateTimeFormat('ka-GE', {
      timeZone: parsed.data.timezone,
    }).resolvedOptions().timeZone
    // A company timezone change needs its own transition policy to avoid moving historical date boundaries.
    if (latest && latest.timezone !== timezone)
      throw new ScheduleWorkflowError(
        'კომპანიის დროის სარტყლის შეცვლა ამ ეტაპზე მიუწვდომელია.',
      )
    const today = companyLocalDate(new Date(), timezone)
    const minimum = earliestScheduleDate(today, latest?.effectiveFrom ?? null)
    if (parsed.data.effectiveFrom < minimum)
      throw new ScheduleWorkflowError(
        `ახალი განრიგის პირველი შესაძლო თარიღია ${minimum}. განაახლეთ გვერდის მონაცემები.`,
      )
    const schedule = companyScheduleSchema.parse({ ...parsed.data, timezone })
    await repository.insertVersion(
      tx,
      schedule,
      administrator.id,
      // Schedule creation has a fixed audit action; administrators do not enter a free-text reason.
      'კომპანიის სამუშაო განრიგის შენახვა.',
    )
    return { effectiveFrom: schedule.effectiveFrom }
  })
}
