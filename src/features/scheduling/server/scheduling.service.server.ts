import '@tanstack/react-start/server-only'
import { assertPermission } from '#/lib/authorization/access'
import { AuthorizationError } from '#/lib/authorization/authorization-error'
import {
  hasPermission,
  currentAuthorization,
} from '#/lib/authorization/permissions'
import {
  companyScheduleSchema,
  saveCompanyScheduleSchema,
  employeeWorkingWeekSchema,
} from '../scheduling.schemas'
import { companyLocalDate, earliestScheduleDate } from '../scheduling.rules'
import * as repository from './scheduling.repository.server'
import type { Actor } from '#/lib/authorization/actor'
import type { OwnSchedule, ScheduleSettings } from '../scheduling.types'

export class ScheduleWorkflowError extends Error {}

/** Provisioning owns the account transaction; only current schedule administrators can assign a custom week. */
async function requireScheduleAdministrator(
  tx: repository.ScheduleTransaction,
  actorId: string,
) {
  const { identity, person } = await repository.currentAccount(tx, actorId)
  if (
    !identity ||
    identity.state !== 'active' ||
    (person && person.status !== 'active')
  )
    throw new AuthorizationError()
  if (!hasPermission(currentAuthorization(identity), 'attendance.configure'))
    throw new AuthorizationError()
}

async function parseCustomWeek(
  days: unknown,
  tx: repository.ScheduleTransaction,
) {
  const parsed = employeeWorkingWeekSchema.safeParse(days)
  if (!parsed.success)
    throw new ScheduleWorkflowError('გადაამოწმეთ თანამშრომლის სამუშაო კვირა.')
  const current = await repository.companyWorkdayAt(new Date(), tx)
  if (!current.effectiveFrom)
    throw new ScheduleWorkflowError(
      'ჯერ განსაზღვრეთ კომპანიის მოქმედი სამუშაო განრიგი.',
    )
  return parsed.data
}

export async function assignInitialEmployeeWeek(
  employeeId: string,
  days: unknown,
  actorId: string,
  tx: repository.ScheduleTransaction,
) {
  await requireScheduleAdministrator(tx, actorId)
  const week = await parseCustomWeek(days, tx)
  await repository.insertEmployeeWeek(tx, employeeId, week, actorId)
}

/**
 * Replaces an employee's recurring week, or returns them to the company schedule when `days` is null.
 * Open attendance sessions keep the expectations they started with; later days use the new week.
 * Returns whether anything changed so callers audit real changes only.
 */
export async function replaceEmployeeWeek(
  employeeId: string,
  days: unknown,
  actorId: string,
  tx: repository.ScheduleTransaction,
) {
  await requireScheduleAdministrator(tx, actorId)
  const week = days === null ? null : await parseCustomWeek(days, tx)
  return repository.replaceEmployeeWeek(tx, employeeId, week, actorId)
}

/** Self-service read: the subject is always the authenticated actor, and only their effective week is returned. */
export function readOwnSchedule(actor: Actor): Promise<OwnSchedule> {
  return repository.transactSchedules(async (tx) => {
    const workday = await repository.companyWorkdayAt(new Date(), tx)
    const context = { timezone: workday.timezone, today: workday.date }
    const stored = await repository.readEmployeeWeekByUser(tx, actor.id)
    if (stored) {
      const own = employeeWorkingWeekSchema.safeParse(stored)
      return own.success
        ? { ...context, source: 'individual', week: own.data }
        : { ...context, source: 'none', week: null }
    }
    const company = await repository.readCurrentCompanyWeek(tx)
    return company
      ? { ...context, source: 'company', week: company }
      : { ...context, source: 'none', week: null }
  })
}

/** Read-only company week shown beside employees that inherit it; carries no administration or audit fields. */
export function readCompanyWeek() {
  return repository.transactSchedules((tx) =>
    repository.readCurrentCompanyWeek(tx),
  )
}

/** The attendance service establishes ownership and active employment before calling this interface. */
export function getEmployeeWorkday(
  now: Date,
  employeeId: string,
  tx: repository.ScheduleTransaction,
) {
  return repository.employeeWorkdayAt(now, employeeId, tx)
}

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
    { ...actor, ...currentAuthorization(identity) },
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

/** Internal vacation workflow interface. The caller checks current permissions and locks the target employee. */
export function getVacationWorkingDates(
  tx: repository.ScheduleTransaction,
  userId: string,
  startDate: string,
  endDate: string,
) {
  return repository.vacationWorkingDates(tx, userId, startDate, endDate)
}
