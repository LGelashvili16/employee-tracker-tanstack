// @vitest-environment node
import 'dotenv/config'
import { randomBytes } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import pg from 'pg'
import { and, count, eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { Actor } from '#/lib/authorization/actor'
import type * as AccessService from './access.service.server'
import type * as AccountSchema from '#/db/schema'
import type { db as Database } from '#/db'
import type { auth as Authentication } from '#/lib/auth/auth'

vi.mock('@tanstack/react-start/server-only', () => ({}))
const enabled = process.env.RUN_ACCOUNT_DB_TESTS === '1'
const originalUrl = process.env.DATABASE_URL
const databaseName = `teamwork_account_test_${randomBytes(8).toString('hex')}`
let adminConnection: pg.Client | undefined
let service: typeof AccessService
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
      reason: 'იზოლირებული ინტეგრაციის ტესტი.',
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

  it('creates an email-optional account, stores only a code hash, and blocks invited login', async () => {
    const issued = await provision('worker-one')
    const record = await identity('worker-one')
    expect(record.accessState).toBe('invited')
    const [person] = await testDatabase()
      .select()
      .from(tables.employee)
      .where(eq(tables.employee.userId, record.id))
    expect(person.contactEmail).toBeNull()
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
        code: 'other-code',
        fullName: 'დუბლიკატი',
      }),
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
        reason: 'აკრძალული ანგარიშის შექმნა.',
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
      attempts.push((await auth.handler(request('A'.repeat(43), base))).status)
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
})
