import '@tanstack/react-start/server-only'
import { and, asc, count, eq, gt, ne, sql } from 'drizzle-orm'
import { db } from '#/db'
import {
  account,
  user,
  session,
  employee,
  accountSetup,
  accessAudit,
} from '#/db/schema'

export type AccessTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0]
export const transactAccounts = db.transaction.bind(db)

export async function userIdForCode(code: string) {
  return (
    await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.username, code))
      .limit(1)
  ).at(0)?.id
}

export async function lockedAccount(tx: AccessTransaction, userId: string) {
  const identity = await tx
    .select()
    .from(user)
    .where(eq(user.id, userId))
    .for('update')
    .then((rows) => rows.at(0))
  if (!identity) return null
  const person = await tx
    .select()
    .from(employee)
    .where(eq(employee.userId, userId))
    .for('update')
    .then((rows) => rows.at(0))
  return { identity, person }
}
export async function queryAccounts(page: number) {
  const [records, totals] = await Promise.all([
    db
      .select({
        userId: user.id,
        name: employee.fullName,
        code: employee.code,
        contactEmail: employee.contactEmail,
        jobTitle: employee.jobTitle,
        phone: employee.phone,
        roles: user.roles,
        state: user.accessState,
        employmentStatus: employee.status,
      })
      .from(employee)
      .innerJoin(user, eq(employee.userId, user.id))
      .orderBy(asc(employee.code))
      .limit(20)
      .offset((page - 1) * 20),
    db.select({ count: count() }).from(employee),
  ])
  return { records, total: totals.at(0)?.count ?? 0 }
}
export async function readAccountAccess(userId: string) {
  const result = await db
    .select({
      state: user.accessState,
      employment: employee.status,
      contactEmail: employee.contactEmail,
    })
    .from(user)
    .leftJoin(employee, eq(employee.userId, user.id))
    .where(eq(user.id, userId))
    .then((rows) => rows.at(0))
  return {
    allowed:
      result?.state === 'active' &&
      (!result.employment || result.employment === 'active'),
    contactEmail: result?.contactEmail ?? null,
  }
}
export async function insertEmployee(
  tx: AccessTransaction,
  values: typeof employee.$inferInsert,
) {
  return (
    await tx.insert(employee).values(values).returning({ id: employee.id })
  ).at(0)
}
export async function updateIdentity(
  tx: AccessTransaction,
  userId: string,
  state: 'invited' | 'active' | 'suspended',
  activatedAt?: Date | null,
) {
  await tx
    .update(user)
    .set({
      accessState: state,
      ...(activatedAt !== undefined ? { activatedAt } : {}),
    })
    .where(eq(user.id, userId))
}
export async function setEmployment(
  tx: AccessTransaction,
  userId: string,
  status: 'active' | 'inactive',
) {
  await tx.update(employee).set({ status }).where(eq(employee.userId, userId))
}
export async function revokeAccess(tx: AccessTransaction, userId: string) {
  await tx.delete(session).where(eq(session.userId, userId))
  await tx.delete(accountSetup).where(eq(accountSetup.userId, userId))
}
export async function storeChallenge(
  tx: AccessTransaction,
  values: typeof accountSetup.$inferInsert,
) {
  await tx
    .insert(accountSetup)
    .values(values)
    .onConflictDoUpdate({
      target: accountSetup.userId,
      set: {
        codeHash: values.codeHash,
        purpose: values.purpose,
        expiresAt: values.expiresAt,
        issuedBy: values.issuedBy,
        createdAt: new Date(),
      },
    })
}
export async function lookupChallenge(codeHash: string) {
  const challenge = await db
    .select({ userId: accountSetup.userId })
    .from(accountSetup)
    .where(
      and(
        eq(accountSetup.codeHash, codeHash),
        gt(accountSetup.expiresAt, sql`now()`),
      ),
    )
  return challenge.at(0)
}
export async function consumeChallenge(
  tx: AccessTransaction,
  userId: string,
  hash: string,
  purpose: string,
) {
  const challenge = await tx
    .delete(accountSetup)
    .where(
      and(
        eq(accountSetup.userId, userId),
        eq(accountSetup.codeHash, hash),
        eq(accountSetup.purpose, purpose),
        gt(accountSetup.expiresAt, sql`now()`),
      ),
    )
    .returning({ userId: accountSetup.userId })
  return challenge.length === 1
}
export async function replacePassword(
  tx: AccessTransaction,
  userId: string,
  hash: string,
) {
  const updated = await tx
    .update(account)
    .set({ password: hash })
    .where(
      and(eq(account.userId, userId), eq(account.providerId, 'credential')),
    )
    .returning({ id: account.id })
  if (updated.length !== 1) throw new Error('ანგარიშის პაროლი ვერ განახლდა.')
  await tx.delete(session).where(eq(session.userId, userId))
}
export async function auditAccess(
  tx: AccessTransaction,
  values: typeof accessAudit.$inferInsert,
) {
  await tx.insert(accessAudit).values(values)
}
export async function emailInUse(
  tx: AccessTransaction,
  email: string,
  exceptUserId: string,
) {
  const rows = await tx
    .select({ id: user.id })
    .from(user)
    .where(and(eq(user.email, email), ne(user.id, exceptUserId)))
    .limit(1)
  return rows.length > 0
}
export async function updateEmployeeDetails(
  tx: AccessTransaction,
  userId: string,
  values: {
    name: string
    contactEmail: string
    jobTitle: string
    phone: string
    /** Set only when the account's login email must follow the contact email. */
    loginEmail: string | null
  },
) {
  await tx
    .update(employee)
    .set({
      fullName: values.name,
      contactEmail: values.contactEmail || null,
      jobTitle: values.jobTitle || null,
      phone: values.phone || null,
    })
    .where(eq(employee.userId, userId))
  await tx
    .update(user)
    .set({
      name: values.name,
      ...(values.loginEmail ? { email: values.loginEmail } : {}),
    })
    .where(eq(user.id, userId))
}
export async function readOwnProfile(userId: string) {
  return db
    .select({
      code: employee.code,
      jobTitle: employee.jobTitle,
      phone: employee.phone,
    })
    .from(employee)
    .where(eq(employee.userId, userId))
    .then((rows) => rows.at(0) ?? null)
}
/** Conditional on active employment so a concurrent termination cannot be overwritten. */
export async function updateOwnPhone(userId: string, phone: string | null) {
  const updated = await db
    .update(employee)
    .set({ phone })
    .where(and(eq(employee.userId, userId), eq(employee.status, 'active')))
    .returning({ id: employee.id })
  return updated.length === 1
}
