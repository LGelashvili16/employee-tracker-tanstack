// @vitest-environment node
import 'dotenv/config'
import { randomBytes } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import pg from 'pg'
import { and, count, eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { Actor } from '#/lib/authorization/actor'
import type * as AccessService from './access.service.server'
import type * as AdminAccessService from './admin-access.service.server'
import type * as AccountSchema from '#/db/schema'
import type { db as Database } from '#/db'
import type { auth as Authentication } from '#/lib/auth/auth'

vi.mock('@tanstack/react-start/server-only', () => ({}))
const enabled = process.env.RUN_ACCOUNT_DB_TESTS === '1'
const originalUrl = process.env.DATABASE_URL
const databaseName = `teamwork_account_test_${randomBytes(8).toString('hex')}`
let adminConnection: pg.Client | undefined
let service: typeof AccessService
let administration: typeof AdminAccessService
let tables: typeof AccountSchema
let database: typeof Database | undefined
let auth: typeof Authentication
let owner: Actor
const password = 'Example-test-password-123!'
function testDatabase() {
  if (!database) throw new Error('Test database is unavailable')
  return database
}

describe.runIf(enabled)('employee account lifecycle against PostgreSQL', () => {
  beforeAll(async () => {
    if (!originalUrl)
      throw new Error('Local test database configuration is required')
    const target = new URL(originalUrl)
    if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname))
      throw new Error('Account integration tests require local PostgreSQL')
    adminConnection = new pg.Client({ connectionString: originalUrl })
    await adminConnection.connect()
    await adminConnection.query(`CREATE DATABASE "${databaseName}"`)
    target.pathname = `/${databaseName}`
    process.env.DATABASE_URL = target.toString()
    const connection = new pg.Client({ connectionString: target.toString() })
    await connection.connect()
    try {
      for (const file of readdirSync('drizzle')
        .filter((name) => /^\d+.*\.sql$/.test(name))
        .sort())
        await connection.query(
          readFileSync(`drizzle/${file}`, 'utf8').replaceAll(
            '--> statement-breakpoint',
            '',
          ),
        )
    } finally {
      await connection.end()
    }
    vi.resetModules()
    service = await import('./access.service.server')
    administration = await import('./admin-access.service.server')
    tables = await import('#/db/schema')
    database = (await import('#/db')).db
    auth = (await import('#/lib/auth/auth')).auth
    const issued = await service.bootstrapOwner({
      code: 'owner-test',
      name: 'ტესტის მფლობელი',
      contactEmail: '',
    })
    await service.completeEmployeeSetup(
      { code: issued.code, newPassword: password },
      'activation',
      (value) => auth.$context.then((context) => context.password.hash(value)),
    )
    const [record] = await testDatabase()
      .select()
      .from(tables.user)
      .where(eq(tables.user.username, 'owner-test'))
    owner = {
      id: record.id,
      name: record.name,
      email: null,
      emailVerified: false,
      roles: ['owner'],
    }
  }, 30_000)

  afterAll(async () => {
    if (database) await testDatabase().$client.end()
    process.env.DATABASE_URL = originalUrl
    if (adminConnection) {
      await adminConnection.query(
        `DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`,
      )
      await adminConnection.end()
    }
  })

  async function provision(code: string) {
    return service.provisionEmployee(owner, {
      code,
      name: 'ტესტის თანამშრომელი',
      contactEmail: '',
      role: 'employee',
    })
  }
  async function identity(code: string) {
    const [record] = await testDatabase()
      .select()
      .from(tables.user)
      .where(eq(tables.user.username, code))
    return record
  }
  const hashPassword = (value: string) =>
    auth.$context.then((context) => context.password.hash(value))

  it('bootstraps exactly one privileged owner and keeps public signup closed', async () => {
    await expect(
      service.bootstrapOwner({
        code: 'second-owner',
        name: 'მეორე მფლობელი',
        contactEmail: '',
      }),
    ).rejects.toThrow()
    await expect(
      auth.api.signUpEmail({
        body: { name: 'უარყოფილი', email: 'blocked@example.com', password },
      }),
    ).rejects.toThrow()
    expect(
      (await testDatabase().select({ count: count() }).from(tables.user))[0]
        .count,
    ).toBe(1)
  })

  it('initializes a new employee from company policy or an explicit override', async () => {
    await testDatabase()
      .update(tables.dayOffSetting)
      .set({ defaultDays: 7, defaultVacationDays: 30 })
    try {
      for (const [code, override, expected] of [
        ['allowance-default', null, 7],
        ['allowance-custom', 2, 2],
      ] as const) {
        await service.provisionEmployee(owner, {
          code,
          name: 'ტესტის თანამშრომელი',
          contactEmail: '',
          role: 'employee',
          dayOffAllowance: override,
        })
        const record = await identity(code)
        const [balance] = await testDatabase()
          .select()
          .from(tables.dayOffBalance)
          .where(eq(tables.dayOffBalance.userId, record.id))
        expect(balance).toMatchObject({
          annualDays: expected,
          remainingDays: expected,
          vacationAnnualDays: 30,
          vacationRemainingDays: 30,
          revision: 0,
        })
      }
    } finally {
      await testDatabase()
        .update(tables.dayOffSetting)
        .set({ defaultDays: 4, defaultVacationDays: 24 })
    }
  })
  it.each([
    'supervisor',
    'sales_manager',
    'production_specialist',
    'hr_manager',
  ] as const)(
    'provisions and stores the %s role through the employee workflow',
    async (role) => {
      const code = `test-${role}`
      await service.provisionEmployee(owner, {
        code,
        name: 'ტესტის თანამშრომელი',
        contactEmail: '',
        role,
      })
      const record = await identity(code)
      expect(record.roles).toBe(role)
      expect(record.accessState).toBe('invited')
    },
  )
  it('lets HR manage employees while protecting role grants, privileged targets, and revoked access', async () => {
    const issued = await service.provisionEmployee(owner, {
      code: 'hr-operator',
      name: 'HR',
      contactEmail: '',
      role: 'hr_manager',
    })
    await service.completeEmployeeSetup(
      { code: issued.code, newPassword: password },
      'activation',
      hashPassword,
    )
    const identityRecord = await identity('hr-operator')
    const hr: Actor = { ...owner, id: identityRecord.id, roles: ['hr_manager'] }
    const input = {
      code: 'hr-created-worker',
      name: 'ახალი თანამშრომელი',
      contactEmail: '',
      role: 'employee' as const,
    }
    const activation = await service.provisionEmployee(hr, input)
    const worker = await identity(input.code)
    expect(
      (await service.listEmployeeAccounts(hr, { page: 1 })).records.some(
        (record) => record.userId === worker.id,
      ),
    ).toBe(true)
    expect(
      (await service.readEmployeeAccount(hr, { userId: worker.id }))?.record
        .code,
    ).toBe(input.code)
    await service.editEmployeeDetails(hr, {
      userId: worker.id,
      name: 'განახლებული თანამშრომელი',
      contactEmail: '',
      jobTitle: 'სპეციალისტი',
      phone: '',
    })
    await service.completeEmployeeSetup(
      { code: activation.code, newPassword: password },
      'activation',
      hashPassword,
    )
    expect(
      await service.manageEmployeeAccount(hr, {
        userId: worker.id,
        action: 'issue_reset',
        reason: 'თანამშრომლის პაროლის აღდგენა.',
      }),
    ).toMatchObject({ purpose: 'reset' })
    await service.manageEmployeeAccount(hr, {
      userId: worker.id,
      action: 'suspend',
      reason: 'თანამშრომლის წვდომის შეჩერება.',
    })
    expect((await service.getLoginAccess(worker.id)).allowed).toBe(false)
    await service.manageEmployeeAccount(hr, {
      userId: worker.id,
      action: 'restore',
      reason: 'თანამშრომლის წვდომის აღდგენა.',
    })
    expect((await service.getLoginAccess(worker.id)).allowed).toBe(true)
    for (const userId of [hr.id, owner.id]) {
      await expect(
        service.manageEmployeeAccount(hr, {
          userId,
          action: 'suspend',
          reason: 'აკრძალული მოქმედების შემოწმება.',
        }),
      ).rejects.toThrow()
      await expect(
        service.editEmployeeDetails(hr, {
          userId,
          name: 'დაუშვებელი ცვლილება',
          contactEmail: '',
        }),
      ).rejects.toThrow()
    }
    await expect(
      service.provisionEmployee(hr, {
        ...input,
        code: 'hr-role-grant',
        role: 'hr_manager',
      }),
    ).rejects.toThrow()
    // Mutation authority comes from the locked current account, not the caller's stale role projection.
    await testDatabase()
      .update(tables.user)
      .set({ roles: 'employee' })
      .where(eq(tables.user.id, hr.id))
    await expect(
      service.provisionEmployee(hr, { ...input, code: 'revoked-actor' }),
    ).rejects.toThrow()
  })
  it('creates an email-optional account, stores only a code hash, and blocks invited login', async () => {
    const issued = await provision('worker-one')
    const record = await identity('worker-one')
    expect(record.accessState).toBe('invited')
    const [person] = await testDatabase()
      .select()
      .from(tables.employee)
      .where(eq(tables.employee.userId, record.id))
    expect(person.contactEmail).toBeNull()
    const [creationAudit] = await testDatabase()
      .select({
        actorId: tables.accessAudit.actorId,
        reason: tables.accessAudit.reason,
      })
      .from(tables.accessAudit)
      .where(
        and(
          eq(tables.accessAudit.targetId, record.id),
          eq(tables.accessAudit.action, 'account.provisioned.employee'),
        ),
      )
    expect(creationAudit).toEqual({
      actorId: owner.id,
      reason: 'თანამშრომლის ანგარიშის შექმნა.',
    })
    const [challenge] = await testDatabase()
      .select()
      .from(tables.accountSetup)
      .where(eq(tables.accountSetup.userId, record.id))
    expect(challenge.codeHash).not.toBe(issued.code)
    expect(challenge.codeHash).toBe(service.hashSetupCode(issued.code))
    expect((await service.getLoginAccess(record.id)).allowed).toBe(false)
    await expect(
      auth.api.signInUsername({ body: { username: 'worker-one', password } }),
    ).rejects.toThrow()
  })

  it('edits employee details without a reason and audits the trusted actor and time', async () => {
    await service.provisionEmployee(owner, {
      code: 'edit-worker',
      name: 'რედაქტირების თანამშრომელი',
      contactEmail: 'edit-worker@example.com',
      role: 'employee',
    })
    await provision('edit-plain')
    const record = await identity('edit-worker')
    const edit = (userId: string, overrides: Record<string, string> = {}) =>
      service.editEmployeeDetails(owner, {
        userId,
        name: 'ახალი სახელი',
        contactEmail: 'moved@example.com',
        jobTitle: 'მენეჯერი',
        phone: '+995 555 00 00 00',
        ...overrides,
      })
    await edit(record.id)
    const updated = await identity('edit-worker')
    expect(updated).toMatchObject({
      name: 'ახალი სახელი',
      email: 'moved@example.com',
    })
    const [person] = await testDatabase()
      .select()
      .from(tables.employee)
      .where(eq(tables.employee.userId, record.id))
    expect(person).toMatchObject({
      fullName: 'ახალი სახელი',
      contactEmail: 'moved@example.com',
      jobTitle: 'მენეჯერი',
      phone: '+995 555 00 00 00',
    })
    const [audit] = await testDatabase()
      .select({
        reason: tables.accessAudit.reason,
        actorId: tables.accessAudit.actorId,
        createdAt: tables.accessAudit.createdAt,
      })
      .from(tables.accessAudit)
      .where(
        and(
          eq(tables.accessAudit.targetId, record.id),
          eq(tables.accessAudit.action, 'account.details_updated'),
        ),
      )
    expect(audit.reason).toBe('თანამშრომლის მონაცემების განახლება.')
    expect(audit.actorId).toBe(owner.id)
    expect(audit.createdAt).toBeInstanceOf(Date)
    await expect(edit(record.id, { contactEmail: '' })).rejects.toThrow(
      /წაშლა შეუძლებელია/,
    )
    const plain = await identity('edit-plain')
    await expect(
      edit(plain.id, { contactEmail: 'moved@example.com' }),
    ).rejects.toThrow(/უკვე უკავია/)
    await edit(plain.id, { contactEmail: 'plain@example.com' })
    expect((await identity('edit-plain')).email).toMatch(
      /@accounts\.teamwork\.invalid$/,
    )
    await expect(edit(owner.id)).rejects.toThrow()
  })

  it('lets an active employee change only their own phone number', async () => {
    const issued = await provision('phone-worker')
    await service.completeEmployeeSetup(
      { code: issued.code, newPassword: password },
      'activation',
      hashPassword,
    )
    const record = await identity('phone-worker')
    const worker: Actor = {
      id: record.id,
      name: record.name,
      email: null,
      emailVerified: false,
      roles: ['employee'],
    }
    await service.updateOwnPhone(worker, { phone: ' +995 599 11 22 33 ' })
    expect(await service.readOwnProfile(worker)).toMatchObject({
      code: 'phone-worker',
      phone: '+995 599 11 22 33',
    })
    await service.updateOwnPhone(worker, { phone: '' })
    expect((await service.readOwnProfile(worker))?.phone).toBeNull()
    await expect(
      service.updateOwnPhone(worker, { phone: 'not a phone' }),
    ).rejects.toThrow()
  })

  it('rejects duplicate employees under concurrent creation without orphan accounts', async () => {
    const before = (
      await testDatabase().select({ count: count() }).from(tables.user)
    )[0].count
    const results = await Promise.allSettled([
      provision('worker-race'),
      provision('worker-race'),
    ])
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1)
    expect(
      (await testDatabase().select({ count: count() }).from(tables.user))[0]
        .count,
    ).toBe(before + 1)
    const record = await identity('worker-race')
    await expect(
      testDatabase().insert(tables.employee).values({
        userId: record.id,
        username: 'other-code',
        fullName: 'დუბლიკატი',
      }),
    ).rejects.toThrow()
  })

  it('stores optional profile details and signs in using either email or username after activation', async () => {
    const issued = await service.provisionEmployee(owner, {
      code: 'email-worker',
      name: 'ელფოსტის თანამშრომელი',
      contactEmail: '  Worker@Example.com  ',
      role: 'employee',
      jobTitle: 'დიზაინერი',
      phone: '+995 555 12 34 56',
    })
    const record = await identity('email-worker')
    expect(record.email).toBe('worker@example.com')
    await expect(
      auth.api.signInEmail({ body: { email: 'worker@example.com', password } }),
    ).rejects.toThrow()
    await service.completeEmployeeSetup(
      { code: issued.code, newPassword: password },
      'activation',
      hashPassword,
    )
    const byEmail = await auth.api.signInEmail({
      body: { email: 'worker@example.com', password },
    })
    const byUsername = await auth.api.signInUsername({
      body: { username: 'email-worker', password },
    })
    expect(byEmail.user.id).toBe(record.id)
    expect(byUsername.user.id).toBe(record.id)
    const person = (
      await testDatabase()
        .select()
        .from(tables.employee)
        .where(eq(tables.employee.userId, record.id))
    )[0]
    expect(person).toMatchObject({
      jobTitle: 'დიზაინერი',
      phone: '+995 555 12 34 56',
      contactEmail: 'worker@example.com',
    })
    const before = (
      await testDatabase().select({ count: count() }).from(tables.user)
    )[0].count
    await expect(
      service.provisionEmployee(owner, {
        code: 'email-duplicate',
        name: 'დუბლიკატი',
        contactEmail: 'WORKER@example.com',
        role: 'employee',
      }),
    ).rejects.toThrow()
    expect(
      (await testDatabase().select({ count: count() }).from(tables.user))[0]
        .count,
    ).toBe(before)
  })

  it('creates an employee and its initial schedule assignment atomically', async () => {
    await testDatabase().insert(tables.companySchedule).values({
      effectiveFrom: '2026-01-01',
      timezone: 'Asia/Tbilisi',
      lateGraceMinutes: 0,
      earlyDepartureGraceMinutes: 0,
    })
    await testDatabase()
      .insert(tables.companyScheduleDay)
      .values(
        Array.from({ length: 7 }, (_, index) => ({
          effectiveFrom: '2026-01-01',
          weekday: index + 1,
          startTime: index < 6 ? '10:00' : null,
          endTime: index < 6 ? '19:00' : null,
        })),
      )
    const days = Array.from({ length: 7 }, (_, index) => ({
      weekday: index + 1,
      hours: index < 5 ? { start: '09:00', end: '18:00' } : null,
    }))
    await service.provisionEmployee(owner, {
      code: 'office-week',
      name: 'ოფისის თანამშრომელი',
      contactEmail: '',
      role: 'employee',
      workingWeek: days,
    })
    const record = await identity('office-week')
    const person = (
      await testDatabase()
        .select()
        .from(tables.employee)
        .where(eq(tables.employee.userId, record.id))
    )[0]
    const assignment = (
      await testDatabase()
        .select()
        .from(tables.employeeWorkSchedule)
        .where(eq(tables.employeeWorkSchedule.employeeId, person.id))
    )[0]
    expect(assignment).toMatchObject({ assignedBy: owner.id, days })
    const before = (
      await testDatabase().select({ count: count() }).from(tables.user)
    )[0].count
    await expect(
      service.provisionEmployee(owner, {
        code: 'invalid-week',
        name: 'არასწორი კვირა',
        contactEmail: '',
        role: 'employee',
        workingWeek: days.map((day) => ({ ...day, weekday: 1 })),
      }),
    ).rejects.toThrow()
    expect(
      (await testDatabase().select({ count: count() }).from(tables.user))[0]
        .count,
    ).toBe(before)
  })

  it('replaces or clears an employee working week and audits real changes only', async () => {
    const record = await identity('office-week')
    const person = (
      await testDatabase()
        .select()
        .from(tables.employee)
        .where(eq(tables.employee.userId, record.id))
    )[0]
    const saturdayShift = Array.from({ length: 7 }, (_, index) => ({
      weekday: index + 1,
      hours: index === 5 ? { start: '10:00', end: '14:00' } : null,
    }))
    const edit = (workingWeek?: typeof saturdayShift | null) =>
      service.editEmployeeDetails(owner, {
        userId: record.id,
        name: person.fullName,
        contactEmail: '',
        jobTitle: '',
        phone: '',
        workingWeek,
      })
    const scheduleAudits = async () =>
      (
        await testDatabase()
          .select({ id: tables.accessAudit.id })
          .from(tables.accessAudit)
          .where(
            and(
              eq(tables.accessAudit.targetId, record.id),
              eq(tables.accessAudit.action, 'account.schedule_updated'),
            ),
          )
      ).length
    const storedWeek = async () =>
      (
        await testDatabase()
          .select({ days: tables.employeeWorkSchedule.days })
          .from(tables.employeeWorkSchedule)
          .where(eq(tables.employeeWorkSchedule.employeeId, person.id))
      ).at(0)?.days
    await edit(saturdayShift)
    expect(await storedWeek()).toEqual(saturdayShift)
    expect(await scheduleAudits()).toBe(1)
    await edit(saturdayShift)
    expect(await scheduleAudits()).toBe(1)
    await edit(undefined)
    expect(await storedWeek()).toEqual(saturdayShift)
    const custom = await service.readEmployeeAccount(owner, {
      userId: record.id,
    })
    expect(custom?.record.workingWeek).toEqual(saturdayShift)
    expect(custom?.companyWeek).toBeNull()
    await edit(null)
    expect(await storedWeek()).toBeUndefined()
    expect(await scheduleAudits()).toBe(2)
    const inherited = await service.readEmployeeAccount(owner, {
      userId: record.id,
    })
    expect(inherited?.record.workingWeek).toBeNull()
    expect(inherited?.companyWeek).toHaveLength(7)
    expect(
      await service.readEmployeeAccount(owner, { userId: 'missing-user' }),
    ).toBeNull()
    await expect(
      edit(saturdayShift.map((day) => ({ ...day, hours: null }))),
    ).rejects.toThrow()
  })

  it('allows only one concurrent consumption and authenticates through Better Auth username login', async () => {
    const issued = await provision('worker-active')
    const outcomes = await Promise.allSettled(
      [1, 2].map(() =>
        service.completeEmployeeSetup(
          { code: issued.code, newPassword: password },
          'activation',
          hashPassword,
        ),
      ),
    )
    expect(
      outcomes.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1)
    const login = await auth.api.signInUsername({
      body: { username: 'worker-active', password },
    })
    expect(login.user.id).toBe((await identity('worker-active')).id)
    expect((await service.getLoginAccess(login.user.id)).allowed).toBe(true)
  })

  it('invalidates previous reset codes, rejects activation codes for reset, and revokes sessions after reset', async () => {
    const record = await identity('worker-active')
    const first = await service.manageEmployeeAccount(owner, {
      userId: record.id,
      action: 'issue_reset',
      reason: 'პირველი აღდგენის მცდელობა.',
    })
    const second = await service.manageEmployeeAccount(owner, {
      userId: record.id,
      action: 'issue_reset',
      reason: 'კოდის ხელახალი გაცემა.',
    })
    if (!first || !second) throw new Error('Expected reset codes')
    await expect(
      service.completeEmployeeSetup(
        { code: first.code, newPassword: password },
        'reset',
        hashPassword,
      ),
    ).rejects.toThrow()
    await expect(
      service.completeEmployeeSetup(
        { code: second.code, newPassword: password },
        'activation',
        hashPassword,
      ),
    ).rejects.toThrow()
    await service.completeEmployeeSetup(
      { code: second.code, newPassword: `${password}new` },
      'reset',
      hashPassword,
    )
    expect(
      (
        await testDatabase()
          .select({ count: count() })
          .from(tables.session)
          .where(eq(tables.session.userId, record.id))
      )[0].count,
    ).toBe(0)
    await expect(
      auth.api.signInUsername({
        body: { username: 'worker-active', password },
      }),
    ).rejects.toThrow()
    const login = await auth.api.signInUsername({
      body: { username: 'worker-active', password: `${password}new` },
    })
    expect(login.user.id).toBe(record.id)
  })

  it('denies stale or forged permissions and prevents administrators targeting themselves', async () => {
    const employee = await identity('worker-active')
    const forged = { ...owner, id: employee.id }
    await expect(
      service.provisionEmployee(forged, {
        code: 'forbidden',
        name: 'ტესტი',
        contactEmail: '',
        role: 'employee',
      }),
    ).rejects.toThrow()
    await expect(
      service.manageEmployeeAccount(owner, {
        userId: owner.id,
        action: 'suspend',
        reason: 'საკუთარი ანგარიშის შეჩერება.',
      }),
    ).rejects.toThrow()
  })

  it('suspends immediately, revokes sessions and codes, then restores the same account', async () => {
    const record = await identity('worker-active')
    const issued = await service.manageEmployeeAccount(owner, {
      userId: record.id,
      action: 'issue_reset',
      reason: 'აღდგენის საცდელი გაცემა.',
    })
    if (!issued) throw new Error('Expected reset code')
    await service.manageEmployeeAccount(owner, {
      userId: record.id,
      action: 'suspend',
      reason: 'სამუშაოზე წვდომის შეჩერება.',
    })
    expect((await service.getLoginAccess(record.id)).allowed).toBe(false)
    expect(
      (
        await testDatabase()
          .select({ count: count() })
          .from(tables.session)
          .where(eq(tables.session.userId, record.id))
      )[0].count,
    ).toBe(0)
    await expect(
      auth.api.signInUsername({
        body: { username: 'worker-active', password: `${password}new` },
      }),
    ).rejects.toThrow()
    await expect(
      service.completeEmployeeSetup(
        { code: issued.code, newPassword: password },
        'reset',
        hashPassword,
      ),
    ).rejects.toThrow()
    await service.manageEmployeeAccount(owner, {
      userId: record.id,
      action: 'restore',
      reason: 'თანამშრომლის წვდომის აღდგენა.',
    })
    expect((await identity('worker-active')).id).toBe(record.id)
    expect((await service.getLoginAccess(record.id)).allowed).toBe(true)
  })

  it('rejects expired activation and records lifecycle changes without secrets', async () => {
    const issued = await provision('worker-expired')
    const record = await identity('worker-expired')
    await testDatabase()
      .update(tables.accountSetup)
      .set({ expiresAt: new Date(0) })
      .where(eq(tables.accountSetup.userId, record.id))
    await expect(
      service.completeEmployeeSetup(
        { code: issued.code, newPassword: password },
        'activation',
        hashPassword,
      ),
    ).rejects.toThrow()
    const audits = await testDatabase()
      .select({
        action: tables.accessAudit.action,
        reason: tables.accessAudit.reason,
      })
      .from(tables.accessAudit)
      .where(and(eq(tables.accessAudit.targetId, record.id)))
    expect(audits).toHaveLength(1)
    expect(JSON.stringify(audits)).not.toContain(issued.code)
    expect(JSON.stringify(audits)).not.toContain(password)
  })

  it('validates native activation requests, origin protection, and request throttling', async () => {
    const issued = await provision('worker-http')
    const base = process.env.BETTER_AUTH_URL ?? 'http://localhost:3005'
    const request = (code: string, origin: string) =>
      new Request(`${base}/api/auth/employee-activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: origin,
          'x-forwarded-for': '127.0.0.81',
        },
        body: JSON.stringify({ code, newPassword: password }),
      })
    const forbidden = await auth.handler(
      request(issued.code, 'https://untrusted.example'),
    )
    expect(forbidden.status).toBe(403)
    const activated = await auth.handler(request(issued.code, base))
    expect(activated.status).toBe(200)
    const replay = await auth.handler(request(issued.code, base))
    expect(replay.status).toBe(400)
    const attempts = []
    for (let index = 0; index < 6; index++)
      attempts.push((await auth.handler(request('A'.repeat(12), base))).status)
    expect(attempts).toContain(429)
  })
  it('lets a database operator recover the existing owner without provisioning another identity', async () => {
    const issued = await service.recoverOwnerCode({
      code: 'owner-test',
      reason: 'მფლობელის პირადობა გადამოწმებულია.',
    })
    expect(issued.purpose).toBe('reset')
    await service.completeEmployeeSetup(
      { code: issued.code, newPassword: password },
      'reset',
      hashPassword,
    )
    expect((await identity('owner-test')).id).toBe(owner.id)
    await expect(
      service.recoverOwnerCode({
        code: 'worker-one',
        reason: 'არამფლობელის აღდგენის მცდელობა.',
      }),
    ).rejects.toThrow()
  })
  it('keeps employment termination separate from account suspension and prevents restoring inactive employment', async () => {
    const record = await identity('worker-active')
    await testDatabase()
      .update(tables.employee)
      .set({ status: 'inactive' })
      .where(eq(tables.employee.userId, record.id))
    expect((await service.getLoginAccess(record.id)).allowed).toBe(false)
    await expect(
      auth.api.signInUsername({
        body: { username: 'worker-active', password: `${password}new` },
      }),
    ).rejects.toThrow()
    await service.manageEmployeeAccount(owner, {
      userId: record.id,
      action: 'suspend',
      reason: 'არააქტიური თანამშრომლის ანგარიშის შეჩერება.',
    })
    await expect(
      service.manageEmployeeAccount(owner, {
        userId: record.id,
        action: 'restore',
        reason: 'დასაქმების შემოწმების გარეშე აღდგენა.',
      }),
    ).rejects.toThrow()
    expect((await identity('worker-active')).accessState).toBe('suspended')
  })
  it('administers every non-owner account, including identities without employee records, and protects self and owner access', async () => {
    const issued = await service.provisionEmployee(owner, {
      code: 'access-admin',
      name: 'წვდომის ადმინისტრატორი',
      contactEmail: '',
      role: 'employee',
    })
    await service.completeEmployeeSetup(
      { code: issued.code, newPassword: password },
      'activation',
      hashPassword,
    )
    const adminRecord = await identity('access-admin')
    await testDatabase()
      .update(tables.user)
      .set({ roles: 'admin' })
      .where(eq(tables.user.id, adminRecord.id))
    const adminActor: Actor = { ...owner, id: adminRecord.id, roles: ['admin'] }
    await testDatabase().insert(tables.user).values({
      id: 'orphan-admin',
      name: 'ცალკე ადმინისტრატორი',
      email: 'orphan@access.invalid',
      username: 'orphan-admin',
      roles: 'admin',
      accessState: 'active',
      activatedAt: new Date(),
    })
    const directory = await administration.listAdminAccounts(adminActor, {
      q: 'orphan-admin',
    })
    expect(directory.items.map((item) => item.userId)).toEqual(['orphan-admin'])
    expect(directory.items[0].employmentStatus).toBeNull()
    const authorizationChange = {
      userId: 'orphan-admin',
      roles: ['admin', 'supervisor'] as Array<'admin' | 'supervisor'>,
      permissionOverrides: { allow: [], deny: [] },
      expectedRoles: 'admin',
      expectedOverrides: { allow: [], deny: [] },
      reason: 'ადმინისტრატორის როლების განახლება.',
    }
    await administration.updateAccountAuthorization(
      adminActor,
      authorizationChange,
    )
    expect(
      (
        await administration.listAdminAccounts(adminActor, {
          q: 'orphan-admin',
        })
      ).items[0].roles,
    ).toBe('admin,supervisor')
    await expect(
      administration.updateAccountAuthorization(adminActor, {
        ...authorizationChange,
        roles: ['owner'],
        expectedRoles: 'admin,supervisor',
      }),
    ).rejects.toThrow()
    await expect(
      administration.updateAccountAuthorization(adminActor, {
        ...authorizationChange,
        userId: owner.id,
        roles: ['employee'],
        expectedRoles: 'owner',
      }),
    ).rejects.toThrow()
    await administration.administerAccount(adminActor, {
      userId: 'orphan-admin',
      action: 'suspend',
      reason: 'წვდომის დროებით შეჩერება.',
    })
    expect((await service.getLoginAccess('orphan-admin')).allowed).toBe(false)
    await administration.administerAccount(adminActor, {
      userId: 'orphan-admin',
      action: 'restore',
      reason: 'წვდომის აღდგენა შემოწმების შემდეგ.',
    })
    expect((await service.getLoginAccess('orphan-admin')).allowed).toBe(true)
    for (const userId of [adminActor.id, owner.id])
      await expect(
        administration.administerAccount(adminActor, {
          userId,
          action: 'suspend',
          reason: 'დაცული ანგარიშის შემოწმება.',
        }),
      ).rejects.toThrow()
    await expect(
      administration.listAdminAccounts(
        { ...adminActor, roles: ['hr_manager'] },
        {},
      ),
    ).rejects.toThrow()
    await expect(
      administration.administerAccount(
        { ...adminActor, id: owner.id, roles: ['employee'] },
        {
          userId: 'orphan-admin',
          action: 'suspend',
          reason: 'მიმდინარე უფლებების შემოწმება.',
        },
      ),
    ).resolves.toBeUndefined()
    // The stored owner's grants, rather than a caller-provided role projection, authorize this last action.
    const audits = await testDatabase()
      .select()
      .from(tables.accessAudit)
      .where(
        and(
          eq(tables.accessAudit.targetId, 'orphan-admin'),
          eq(tables.accessAudit.actorId, adminActor.id),
        ),
      )
    expect(audits.map((entry) => entry.action)).toEqual(
      expect.arrayContaining(['account.suspend', 'account.restore']),
    )
    await testDatabase()
      .update(tables.user)
      .set({ roles: 'employee' })
      .where(eq(tables.user.id, adminActor.id))
    await expect(
      administration.administerAccount(adminActor, {
        userId: 'orphan-admin',
        action: 'restore',
        reason: 'გაუქმებული უფლების შემოწმება.',
      }),
    ).rejects.toThrow()
  })
  it('persists permission exceptions, revokes sessions, rejects stale edits, and rechecks exceptions in domain services', async () => {
    const issued = await service.provisionEmployee(owner, {
      code: 'override-worker',
      name: 'უფლებების ტესტი',
      contactEmail: '',
      role: 'employee',
    })
    await service.completeEmployeeSetup(
      { code: issued.code, newPassword: password },
      'activation',
      hashPassword,
    )
    const worker = await identity('override-worker')
    const actor: Actor = { ...owner, id: worker.id, roles: ['employee'] }
    await auth.api.signInUsername({
      body: { username: 'override-worker', password },
    })
    expect(
      (
        await testDatabase()
          .select()
          .from(tables.session)
          .where(eq(tables.session.userId, worker.id))
      ).length,
    ).toBeGreaterThan(0)
    const grant = {
      userId: worker.id,
      roles: ['employee'] as Array<'employee'>,
      permissionOverrides: {
        allow: ['manage.access', 'attendance.read.all'] as Array<
          'manage.access' | 'attendance.read.all'
        >,
        deny: [],
      },
      expectedRoles: worker.roles,
      expectedOverrides: { allow: [], deny: [] },
      reason: 'მხოლოდ დასწრების ნახვის უფლება.',
    }
    await administration.updateAccountAuthorization(owner, grant)
    expect(
      await testDatabase()
        .select()
        .from(tables.session)
        .where(eq(tables.session.userId, worker.id)),
    ).toHaveLength(0)
    const attendance =
      await import('#/features/attendance/server/company-attendance.service.server')
    expect(
      (await attendance.listCompanyAttendanceUsers(actor, {})).total,
    ).toBeGreaterThan(0)
    await expect(
      administration.updateAccountAuthorization(owner, {
        ...grant,
        permissionOverrides: { allow: [], deny: [] },
      }),
    ).rejects.toThrow('უფლებები შეიცვალა')
    const current = await identity('override-worker')
    await administration.updateAccountAuthorization(owner, {
      ...grant,
      expectedRoles: current.roles,
      expectedOverrides: current.permissionOverrides,
      permissionOverrides: { allow: [], deny: ['attendance.read.all'] },
    })
    await expect(
      attendance.listCompanyAttendanceUsers(
        { ...actor, permissionOverrides: grant.permissionOverrides },
        {},
      ),
    ).rejects.toThrow()
    await expect(
      administration.updateAccountAuthorization(owner, {
        ...grant,
        userId: owner.id,
      }),
    ).rejects.toThrow()
    await expect(
      administration.updateAccountAuthorization(actor, {
        ...grant,
        userId: owner.id,
      }),
    ).rejects.toThrow()
    const changed = await identity('override-worker')
    const next = {
      ...grant,
      expectedRoles: changed.roles,
      expectedOverrides: changed.permissionOverrides,
    }
    const results = await Promise.allSettled([
      administration.updateAccountAuthorization(owner, next),
      administration.updateAccountAuthorization(owner, next),
    ])
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1)
    const audit = await testDatabase()
      .select()
      .from(tables.accessAudit)
      .where(
        and(
          eq(tables.accessAudit.targetId, worker.id),
          eq(tables.accessAudit.action, 'account.authorization_updated'),
        ),
      )
    expect(audit).toHaveLength(3)
  })
  it('keeps literal directory searches, pagination, and totals server-side', async () => {
    await testDatabase()
      .insert(tables.user)
      .values(
        Array.from({ length: 22 }, (_, index) => ({
          id: 'directory-' + index,
          name: 'სიაში ' + index,
          email: 'directory-' + index + '@access.invalid',
          username: 'directory-' + index,
          roles: 'employee',
        })),
      )
    const first = await administration.listAdminAccounts(owner, {
      q: 'directory-',
      page: 1,
      sort: 'username-asc',
    })
    const second = await administration.listAdminAccounts(owner, {
      q: 'directory-',
      page: 2,
      sort: 'username-asc',
    })
    expect(first.items).toHaveLength(20)
    expect(second.items).toHaveLength(2)
    expect(first.total).toBe(22)
    expect(
      (await administration.listAdminAccounts(owner, { q: '%' })).total,
    ).toBe(0)
    await expect(
      administration.listAdminAccounts(owner, { page: -1 }),
    ).rejects.toThrow()
  })
})
