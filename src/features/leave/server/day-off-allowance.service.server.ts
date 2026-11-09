import {
  availableVacationDays,
  chargeableVacationDays,
} from '../vacation-allowance.rules'
import '@tanstack/react-start/server-only'
import { AuthorizationError } from '#/lib/authorization/authorization-error'
import {
  currentAuthorization,
  hasPermission,
} from '#/lib/authorization/permissions'
import {
  getCompanyWorkday,
  getVacationWorkingDates,
} from '#/features/scheduling/server/scheduling.service.server'
import type { Actor } from '#/lib/authorization/actor'
import type { Permission } from '#/lib/authorization/permissions'
import {
  adjustDayOffBalanceSchema,
  allowanceTargetSchema,
  saveDayOffSettingSchema,
  dayOffDaysSchema,
} from '../day-off-allowance.schemas'
import type { DayOffBalanceView } from '../day-off-allowance.schemas'
import * as leaveRepository from './leave.repository.server'
import * as repository from './day-off-allowance.repository.server'

type Tx = leaveRepository.LeaveTransaction
export class DayOffAllowanceError extends Error {}

async function authorize(tx: Tx, actor: Actor | null, permission?: Permission) {
  if (!actor) throw new AuthorizationError()
  const account = await leaveRepository.currentAccount(tx, actor.id, true)
  if (
    !account ||
    account.state !== 'active' ||
    account.employment === 'inactive' ||
    (permission && !hasPermission(currentAuthorization(account), permission))
  )
    throw new AuthorizationError()
  return actor
}
/** Acquire the company policy before requester locks in every writer; settings changes take its exclusive lock. */
export async function prepareDayOffAllowance(tx: Tx, write = true) {
  const policy = await repository.settings(tx, write ? 'share' : false)
  if (!policy)
    throw new DayOffAllowanceError('დასვენების დღეების წესი ვერ მოიძებნა.')
  const workday = await getCompanyWorkday(new Date(), tx)
  return {
    policy,
    year: Number(workday.date.slice(0, 4)),
    timezone: workday.timezone,
  }
}
type Context = Awaited<ReturnType<typeof prepareDayOffAllowance>>
function effective(
  row: { annualDays: number; remainingDays: number; periodYear: number },
  context: Context,
) {
  return context.policy.resetYearly && row.periodYear < context.year
    ? row.annualDays
    : row.remainingDays
}
async function snapshot(
  tx: Tx,
  userId: string,
  context: Context,
  lock = false,
) {
  const row = await repository.balance(tx, userId, lock)
  if (row) return row
  const used = await repository.approvedCount(
    tx,
    userId,
    context.year,
    context.timezone,
    context.policy.resetYearly,
  )
  return {
    userId,
    annualDays: context.policy.defaultDays,
    remainingDays: Math.max(0, context.policy.defaultDays - used),
    periodYear: context.year,
    vacationAnnualDays: context.policy.defaultVacationDays,
    vacationRemainingDays: Math.max(
      0,
      context.policy.defaultVacationDays -
        (await repository.approvedVacationDays(
          tx,
          userId,
          context.year,
          context.timezone,
        )),
    ),
    vacationPeriodYear: context.year,
    revision: 0,
  }
}
function view(
  row: Awaited<ReturnType<typeof snapshot>>,
  context: Context,
): DayOffBalanceView {
  return {
    annualDays: row.annualDays,
    remainingDays: effective(row, context),
    revision: row.revision,
    year: context.year,
    resetYearly: context.policy.resetYearly,
    vacationAnnualDays: row.vacationAnnualDays,
    vacationRemainingDays: availableVacationDays(row, context.year),
  }
}
/** Provisioning already authorizes the account transaction, including operator-only bootstrap. */
export async function initializeEmployeeDayOffBalance(
  tx: Tx,
  userId: string,
  initialDays: number | null,
  actorId: string | null,
) {
  const context = await prepareDayOffAllowance(tx)
  const days =
    initialDays === null
      ? context.policy.defaultDays
      : dayOffDaysSchema.parse(initialDays)
  const row = await repository.initialize(tx, {
    userId,
    annualDays: days,
    remainingDays: days,
    periodYear: context.year,
    vacationAnnualDays: context.policy.defaultVacationDays,
    vacationRemainingDays: context.policy.defaultVacationDays,
    vacationPeriodYear: context.year,
  })
  await repository.audit(tx, {
    actorId,
    targetUserId: userId,
    action: 'initialized',
    reason: 'დასვენების დღეების საწყისი ლიმიტი',
    before: null,
    after: view(row, context),
  })
}
/** Vacation approval owns the transaction and requester advisory lock. Consume exactly once with the pending-to-approved transition. */
export async function consumeDayOff(
  tx: Tx,
  context: Context,
  userId: string,
  actorId: string,
  requestId: string,
) {
  let row = await repository.balance(tx, userId, true)
  if (!row)
    row = await repository.initialize(tx, await snapshot(tx, userId, context))
  const before = view(row, context)
  if (before.remainingDays < 1)
    throw new DayOffAllowanceError(
      'თანამშრომლის დასვენების დღეების ბალანსი ამოწურულია.',
    )
  if (context.policy.resetYearly && row.periodYear < context.year)
    await repository.audit(tx, {
      actorId: null,
      targetUserId: userId,
      action: 'reset',
      reason: 'ბალანსის წლიური განახლება',
      before: { remainingDays: row.remainingDays, year: row.periodYear },
      after: before,
    })
  const saved = await repository.saveBalance(tx, userId, row.revision, {
    annualDays: row.annualDays,
    remainingDays: before.remainingDays - 1,
    periodYear: context.year,
  })
  if (!saved)
    throw new DayOffAllowanceError('ბალანსი შეიცვალა. განაახლეთ მონაცემები.')
  await repository.audit(tx, {
    actorId,
    targetUserId: userId,
    action: 'consumed',
    reason: 'დასვენების დღის მოთხოვნის დამტკიცება',
    before,
    after: { ...view(saved, context), requestId },
  })
}
export async function readDayOffSettings(actor: Actor | null) {
  return leaveRepository.transact(async (tx) => {
    await authorize(tx, actor)
    const context = await prepareDayOffAllowance(tx, false)
    return { ...context.policy, year: context.year }
  })
}
export async function readOwnDayOffBalance(actor: Actor | null) {
  return leaveRepository.transact(async (tx) => {
    const current = await authorize(tx, actor)
    const context = await prepareDayOffAllowance(tx, false)
    return view(await snapshot(tx, current.id, context), context)
  })
}
export async function readEmployeeDayOffBalance(
  actor: Actor | null,
  input: unknown,
) {
  const data = allowanceTargetSchema.parse(input)
  return leaveRepository.transact(async (tx) => {
    await authorize(tx, actor, 'employees.manage')
    if (!(await leaveRepository.currentAccount(tx, data.userId)))
      throw new DayOffAllowanceError('თანამშრომელი ვერ მოიძებნა.')
    const context = await prepareDayOffAllowance(tx, false)
    return view(await snapshot(tx, data.userId, context), context)
  })
}
export async function adjustEmployeeDayOffBalance(
  actor: Actor | null,
  input: unknown,
) {
  const data = adjustDayOffBalanceSchema.parse(input)
  return leaveRepository.transact(async (tx) => {
    const current = await authorize(tx, actor, 'employees.manage')
    if (current.id === data.userId)
      throw new DayOffAllowanceError('საკუთარი ბალანსის შეცვლა შეუძლებელია.')
    const context = await prepareDayOffAllowance(tx)
    await leaveRepository.lockRequester(tx, data.userId)
    if (!(await leaveRepository.currentAccount(tx, data.userId)))
      throw new DayOffAllowanceError('თანამშრომელი ვერ მოიძებნა.')
    let row = await repository.balance(tx, data.userId, true)
    if (!row)
      row = await repository.initialize(
        tx,
        await snapshot(tx, data.userId, context),
      )
    if (row.revision !== data.revision || data.year !== context.year)
      throw new DayOffAllowanceError('ბალანსი შეიცვალა. განაახლეთ მონაცემები.')
    const before = view(row, context)
    const saved = await repository.saveBalance(tx, data.userId, data.revision, {
      annualDays: data.annualDays,
      remainingDays: data.remainingDays,
      periodYear: context.year,
      vacationAnnualDays: data.vacationAnnualDays ?? row.vacationAnnualDays,
      vacationRemainingDays:
        data.vacationRemainingDays ?? availableVacationDays(row, context.year),
      vacationPeriodYear: context.year,
    })
    if (!saved)
      throw new DayOffAllowanceError('ბალანსი შეიცვალა. განაახლეთ მონაცემები.')
    await repository.audit(tx, {
      actorId: current.id,
      targetUserId: data.userId,
      action: 'adjusted',
      reason: data.reason,
      before,
      after: view(saved, context),
    })
    return view(saved, context)
  })
}
export async function saveDayOffSettings(actor: Actor | null, input: unknown) {
  const data = saveDayOffSettingSchema.parse(input)
  return leaveRepository.transact(async (tx) => {
    const current = await authorize(tx, actor, 'leave.configure')
    const policy = await repository.settings(tx, 'update')
    if (!policy || policy.revision !== data.revision)
      throw new DayOffAllowanceError('წესი შეიცვალა. განაახლეთ მონაცემები.')
    const workday = await getCompanyWorkday(new Date(), tx)
    const year = Number(workday.date.slice(0, 4))
    if (policy.resetYearly !== data.resetYearly) {
      // Preserve each effective balance before changing how future years are interpreted.
      await repository.materializePolicyTransition(tx, policy.resetYearly, year)
    }
    const saved = await repository.saveSettings(
      tx,
      data.revision,
      data.defaultDays,
      data.resetYearly,
      data.defaultVacationDays ?? policy.defaultVacationDays,
    )
    if (!saved)
      throw new DayOffAllowanceError('წესი შეიცვალა. განაახლეთ მონაცემები.')
    await repository.audit(tx, {
      actorId: current.id,
      targetUserId: null,
      action: 'configured',
      reason: data.reason,
      before: policy,
      after: saved,
    })
    return { ...saved, year }
  })
}

/** Approval serializes with adjustments and stores a permanent charge based on the employee schedule and statutory holidays. */
export async function consumePaidVacation(
  tx: Tx,
  context: Context,
  userId: string,
  actorId: string,
  requestId: string,
  startDate: string,
  endDate: string,
) {
  await leaveRepository.currentAccount(tx, userId, true)
  const dates = await getVacationWorkingDates(tx, userId, startDate, endDate)
  if (dates.some((day) => !day.configured))
    throw new DayOffAllowanceError(
      'შვებულების დასათვლელად ჯერ განსაზღვრეთ თანამშრომლის სამუშაო განრიგი.',
    )
  const days = chargeableVacationDays(dates)
  let row = await repository.balance(tx, userId, true)
  if (!row)
    row = await repository.initialize(tx, await snapshot(tx, userId, context))
  const before = view(row, context)
  if (before.vacationRemainingDays < days)
    throw new DayOffAllowanceError(
      'შვებულების ბალანსი არასაკმარისია მოთხოვნილი სამუშაო დღეებისთვის.',
    )
  if (row.vacationPeriodYear < context.year)
    await repository.audit(tx, {
      actorId: null,
      targetUserId: userId,
      action: 'vacation_credited',
      reason: 'შვებულების წლიური ლიმიტის დამატება',
      before: {
        vacationRemainingDays: row.vacationRemainingDays,
        year: row.vacationPeriodYear,
      },
      after: before,
    })
  const saved = await repository.saveBalance(tx, userId, row.revision, {
    vacationRemainingDays: before.vacationRemainingDays - days,
    vacationAnnualDays: row.vacationAnnualDays,
    vacationPeriodYear: context.year,
  })
  if (!saved)
    throw new DayOffAllowanceError('ბალანსი შეიცვალა. განაახლეთ მონაცემები.')
  await repository.audit(tx, {
    actorId,
    targetUserId: userId,
    action: 'vacation_consumed',
    reason: 'ანაზღაურებადი შვებულების დამტკიცება',
    before,
    after: { ...view(saved, context), requestId, chargedDays: days },
  })
  return days
}
