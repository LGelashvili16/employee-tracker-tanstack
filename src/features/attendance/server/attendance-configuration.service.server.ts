import '@tanstack/react-start/server-only'
import { and, eq, sql } from 'drizzle-orm'
import {
  attendanceReviewer,
  attendanceSetting,
  employee,
  user,
} from '#/db/schema'
import {
  hasPermission,
  currentAuthorization,
} from '#/lib/authorization/permissions'
import type { Actor } from '#/lib/authorization/actor'
import {
  attendanceAssignmentSchema,
  attendanceLimitSchema,
} from '../attendance.schemas'
import { AttendanceWorkflowError } from './attendance.service.server'
import { transactAttendance } from './attendance.repository.server'
import { authorizeAttendance } from './attendance-review.policy.server'
import * as repository from './attendance-review.repository.server'

export async function readAttendanceConfiguration(actor: Actor | null) {
  return transactAttendance(async (tx) => {
    await authorizeAttendance(tx, actor, 'attendance.configure')
    const setting = (await tx.select().from(attendanceSetting).limit(1)).at(
      0,
    ) ?? { id: 1, maxOpenHours: 16, revision: 0 }
    const people = await tx
      .select({
        id: employee.id,
        name: employee.fullName,
        userId: user.id,
        roles: user.roles,
        permissionOverrides: user.permissionOverrides,
        employmentStatus: employee.status,
        accessState: user.accessState,
      })
      .from(employee)
      .innerJoin(user, eq(user.id, employee.userId))
      .orderBy(employee.fullName)
      .limit(501)
    const assignments = await tx
      .select({
        employeeId: attendanceReviewer.employeeId,
        reviewerId: attendanceReviewer.reviewerId,
      })
      .from(attendanceReviewer)
      .orderBy(attendanceReviewer.employeeId)
      .limit(501)
    return {
      setting,
      employees: people.slice(0, 500).map((person) => ({
        id: person.id,
        name:
          person.employmentStatus === 'active'
            ? person.name
            : `${person.name} (არააქტიური)`,
      })),
      reviewers: people
        .slice(0, 500)
        .filter(
          (person) =>
            hasPermission(
              currentAuthorization(person),
              'attendance.review.team',
            ) ||
            assignments.some(
              (assignment) => assignment.reviewerId === person.userId,
            ),
        )
        .map((person) => ({
          id: person.userId,
          name:
            person.accessState === 'active' &&
            person.employmentStatus === 'active'
              ? person.name
              : `${person.name} (არააქტიური)`,
        })),
      assignments: assignments.slice(0, 500),
      truncated: people.length > 500 || assignments.length > 500,
    }
  })
}

export async function saveAttendanceLimit(actor: Actor | null, input: unknown) {
  const data = attendanceLimitSchema.parse(input)
  return transactAttendance(async (tx) => {
    const current = await authorizeAttendance(tx, actor, 'attendance.configure')
    await tx.execute(sql`select pg_advisory_xact_lock(812735, 1)`)
    const before = (await tx.select().from(attendanceSetting).limit(1)).at(
      0,
    ) ?? { id: 1, maxOpenHours: 16, revision: 0 }
    if (before.revision !== data.revision)
      throw new AttendanceWorkflowError(
        'პარამეტრები შეიცვალა. განაახლეთ გვერდი.',
      )
    const after = {
      id: 1,
      maxOpenHours: data.maxOpenHours,
      revision: before.revision + 1,
    }
    await tx
      .insert(attendanceSetting)
      .values(after)
      .onConflictDoUpdate({ target: attendanceSetting.id, set: after })
    await repository.recordAttendanceAudit(
      tx,
      current.id,
      'attendance-setting',
      'attendance.limit_changed',
      data.reason,
      before,
      after,
    )
    return after
  })
}

export async function assignAttendanceReviewer(
  actor: Actor | null,
  input: unknown,
) {
  const data = attendanceAssignmentSchema.parse(input)
  return transactAttendance(async (tx) => {
    const current = await authorizeAttendance(tx, actor, 'attendance.configure')
    await tx.execute(sql`select pg_advisory_xact_lock(812735, 2)`)
    const person = (
      await tx
        .select({ userId: employee.userId, status: employee.status })
        .from(employee)
        .where(eq(employee.id, data.employeeId))
        .for('share')
    ).at(0)
    if (!person || person.userId === data.reviewerId)
      throw new AttendanceWorkflowError(
        'საკუთარი დასწრების გადამოწმების უფლების მინიჭება დაუშვებელია.',
      )
    if (!data.revoke && person.status !== 'active')
      throw new AttendanceWorkflowError(
        'ხელმძღვანელი შეიძლება მიენიჭოს მხოლოდ აქტიურ თანამშრომელს.',
      )
    const reviewer = await repository.attendanceActor(tx, data.reviewerId)
    if (
      !data.revoke &&
      (!reviewer.identity ||
        reviewer.identity.state !== 'active' ||
        reviewer.person?.status !== 'active' ||
        !hasPermission(
          currentAuthorization(reviewer.identity),
          'attendance.review.team',
        ))
    )
      throw new AttendanceWorkflowError(
        'ხელმძღვანელს დასწრების განხილვის უფლება არ აქვს.',
      )
    const where = and(
      eq(attendanceReviewer.employeeId, data.employeeId),
      eq(attendanceReviewer.reviewerId, data.reviewerId),
    )
    const before = await tx.select().from(attendanceReviewer).where(where)
    if (data.revoke) await tx.delete(attendanceReviewer).where(where)
    else
      await tx
        .insert(attendanceReviewer)
        .values({ employeeId: data.employeeId, reviewerId: data.reviewerId })
        .onConflictDoNothing()
    await repository.recordAttendanceAudit(
      tx,
      current.id,
      data.employeeId,
      'attendance.reviewer_changed',
      data.reason,
      before.map((row) => ({ reviewerId: row.reviewerId })),
      data.revoke ? [] : [{ reviewerId: data.reviewerId }],
    )
    return { employeeId: data.employeeId }
  })
}
