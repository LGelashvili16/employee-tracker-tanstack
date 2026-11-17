import '@tanstack/react-start/server-only'
import { and, eq, sql } from 'drizzle-orm'
import {
  dayOffSetting,
  dayOffBalance,
  dayOffAllowanceAudit,
  leaveRequest,
} from '#/db/schema'
import type { LeaveTransaction } from './leave.repository.server'

export async function settings(
  tx: LeaveTransaction,
  lock: 'share' | 'update' | false = false,
) {
  const query = tx.select().from(dayOffSetting).where(eq(dayOffSetting.id, 1))
  return (await (lock ? query.for(lock) : query)).at(0)
}
export async function balance(
  tx: LeaveTransaction,
  userId: string,
  lock = false,
) {
  const query = tx
    .select()
    .from(dayOffBalance)
    .where(eq(dayOffBalance.userId, userId))
  return (await (lock ? query.for('update') : query)).at(0)
}
export async function approvedCount(
  tx: LeaveTransaction,
  userId: string,
  year: number,
  timezone: string,
  reset: boolean,
) {
  const [row] = await tx
    .select({ used: sql<number>`count(*)::int` })
    .from(leaveRequest)
    .where(
      and(
        eq(leaveRequest.requesterId, userId),
        eq(leaveRequest.kind, 'day_off'),
        eq(leaveRequest.status, 'approved'),
        reset
          ? sql`extract(year from ${leaveRequest.reviewedAt} at time zone ${timezone}) = ${year}`
          : undefined,
      ),
    )
  return row.used
}
export async function initialize(
  tx: LeaveTransaction,
  data: typeof dayOffBalance.$inferInsert,
) {
  return (await tx.insert(dayOffBalance).values(data).returning())[0]
}
export async function saveBalance(
  tx: LeaveTransaction,
  userId: string,
  revision: number,
  data: Partial<
    Pick<
      typeof dayOffBalance.$inferInsert,
      | 'annualDays'
      | 'remainingDays'
      | 'periodYear'
      | 'vacationAnnualDays'
      | 'vacationRemainingDays'
      | 'vacationPeriodYear'
    >
  >,
) {
  return (
    await tx
      .update(dayOffBalance)
      .set({ ...data, revision: revision + 1 })
      .where(
        and(
          eq(dayOffBalance.userId, userId),
          eq(dayOffBalance.revision, revision),
        ),
      )
      .returning()
  ).at(0)
}
export async function audit(
  tx: LeaveTransaction,
  data: typeof dayOffAllowanceAudit.$inferInsert,
) {
  await tx.insert(dayOffAllowanceAudit).values(data)
}
export async function saveSettings(
  tx: LeaveTransaction,
  revision: number,
  defaultDays: number,
  resetYearly: boolean,
  defaultVacationDays: number,
) {
  return (
    await tx
      .update(dayOffSetting)
      .set({
        defaultDays,
        resetYearly,
        defaultVacationDays,
        revision: revision + 1,
      })
      .where(and(eq(dayOffSetting.id, 1), eq(dayOffSetting.revision, revision)))
      .returning()
  ).at(0)
}
/** Policy holds the company row exclusively, so no balance writer can race mode changes. Preserve effective balances when enabling/disabling resets. */
export async function materializePolicyTransition(
  tx: LeaveTransaction,
  oldReset: boolean,
  year: number,
) {
  return tx
    .update(dayOffBalance)
    .set({
      remainingDays: sql`case when ${oldReset} and ${dayOffBalance.periodYear} < ${year} then ${dayOffBalance.annualDays} else ${dayOffBalance.remainingDays} end`,
      periodYear: sql`greatest(${dayOffBalance.periodYear}, ${year})`,
      revision: sql`${dayOffBalance.revision} + 1`,
    })
    .returning()
}

export async function approvedVacationDays(
  tx: LeaveTransaction,
  userId: string,
  year: number,
  timezone: string,
) {
  const [row] = await tx
    .select({
      used: sql<number>`coalesce(sum(${leaveRequest.chargedVacationDays}), 0)::int`,
    })
    .from(leaveRequest)
    .where(
      and(
        eq(leaveRequest.requesterId, userId),
        eq(leaveRequest.kind, 'vacation'),
        eq(leaveRequest.status, 'approved'),
        sql`extract(year from ${leaveRequest.reviewedAt} at time zone ${timezone}) = ${year}`,
      ),
    )
  return row.used
}
