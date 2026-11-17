// @vitest-environment node
import 'dotenv/config'
import {
  createHash,
  generateKeyPairSync,
  randomBytes,
  randomUUID,
  sign,
} from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import pg from 'pg'
import { isoCBOR } from '@simplewebauthn/server/helpers'
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import type { Actor } from '#/lib/authorization/actor'
import type * as Security from './attendance-security.service.server'
import type * as Attendance from '#/features/attendance/server/attendance.service.server'
import type { ClockSecurityContext } from './attendance-security-context.server'
import type { db as Database } from '#/db'

vi.mock('@tanstack/react-start/server-only', () => ({}))
const originalUrl = process.env.DATABASE_URL
const originalAuthUrl = process.env.BETTER_AUTH_URL
const name = `teamwork_security_test_${randomBytes(8).toString('hex')}`
const hash = (value: string | Buffer) =>
  createHash('sha256').update(value).digest()
let admin: pg.Client | undefined
let connection: pg.Client | undefined
let database: typeof Database | undefined
let security: typeof Security
let attendance: typeof Attendance
let databaseCreated = false
const worker: Actor = {
  id: 'worker',
  name: 'თანამშრომელი',
  email: null,
  emailVerified: false,
  roles: ['employee'],
}
const hr: Actor = { ...worker, id: 'hr', roles: ['hr_manager'] }
const administrator: Actor = {
  ...worker,
  id: 'administrator',
  roles: ['admin'],
}
const context = (actor = worker): ClockSecurityContext => ({
  userId: actor.id,
  sessionHash: hash(`session:${actor.id}`).toString('hex'),
  tokenHash: hash(`browser:${actor.id}`).toString('hex'),
  ip: '192.0.2.10',
})
const clockInput = () => ({
  requestId: randomUUID(),
  expectedLastSessionId: null,
})
function sql() {
  if (!connection) throw new Error('Isolated database unavailable')
  return connection
}

/** A real ES256 authenticator fixture: production verification is never mocked. */
async function enroll(actor = worker, reviewer = administrator) {
  await sql().query(
    'update attendance_security_policy set passkey_required=true',
  )
  const keys = generateKeyPairSync('ec', { namedCurve: 'prime256v1' })
  const jwk = keys.publicKey.export({ format: 'jwk' })
  const credentialBytes = randomBytes(32)
  const credentialId = credentialBytes.toString('base64url')
  const cose = isoCBOR.encode(
    new Map<number, number | Uint8Array>([
      [1, 2],
      [3, -7],
      [-1, 1],
      [-2, Buffer.from(jwk.x!, 'base64url')],
      [-3, Buffer.from(jwk.y!, 'base64url')],
    ]),
  )
  const start = await security.beginRegistration(actor, context(actor))
  const length = Buffer.alloc(2)
  length.writeUInt16BE(credentialBytes.length)
  const authData = Buffer.concat([
    hash('localhost'),
    Buffer.from([0x45]),
    Buffer.alloc(4),
    Buffer.alloc(16),
    length,
    credentialBytes,
    cose,
  ])
  const clientData = Buffer.from(
    JSON.stringify({
      type: 'webauthn.create',
      challenge: start.options.challenge,
      origin: 'http://localhost:3005',
    }),
  )
  const attestationObject = isoCBOR.encode(
    new Map<string, string | Map<string, string> | Uint8Array>([
      ['fmt', 'none'],
      ['attStmt', new Map()],
      ['authData', authData],
    ]),
  )
  await security.finishRegistration(
    actor,
    {
      challengeId: start.challengeId,
      response: {
        id: credentialId,
        rawId: credentialId,
        type: 'public-key',
        response: {
          clientDataJSON: clientData.toString('base64url'),
          attestationObject:
            Buffer.from(attestationObject).toString('base64url'),
          transports: ['internal'],
        },
        clientExtensionResults: {},
      },
    },
    context(actor),
  )
  const device = (
    await sql().query(
      'select id, revision from attendance_device where user_id=$1',
      [actor.id],
    )
  ).rows[0]
  await security.decideDevice(reviewer, {
    ...device,
    decision: 'approved',
    reason: 'თანამშრომლის მოწყობილობა გადამოწმებულია.',
  })
  let counter = 0
  return {
    credentialId,
    assertion(
      challenge: string,
      options: { origin?: string; verified?: boolean } = {},
    ) {
      const client = Buffer.from(
        JSON.stringify({
          type: 'webauthn.get',
          challenge,
          origin: options.origin ?? 'http://localhost:3005',
        }),
      )
      const count = Buffer.alloc(4)
      count.writeUInt32BE(++counter)
      const authenticator = Buffer.concat([
        hash('localhost'),
        Buffer.from([options.verified === false ? 0x01 : 0x05]),
        count,
      ])
      return {
        id: credentialId,
        rawId: credentialId,
        type: 'public-key',
        response: {
          clientDataJSON: client.toString('base64url'),
          authenticatorData: authenticator.toString('base64url'),
          signature: sign(
            'sha256',
            Buffer.concat([authenticator, hash(client)]),
            keys.privateKey,
          ).toString('base64url'),
        },
        clientExtensionResults: {},
      }
    },
  }
}

describe.runIf(process.env.RUN_ATTENDANCE_SECURITY_DB_TESTS === '1')(
  'attendance network, browser, passkey and actor boundaries',
  () => {
    beforeAll(async () => {
      if (!originalUrl) throw new Error('Local PostgreSQL required')
      const url = new URL(originalUrl)
      if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
        throw new Error('Local PostgreSQL required')
      admin = new pg.Client({
        connectionString: originalUrl,
        connectionTimeoutMillis: 3000,
      })
      await admin.connect()
      await admin.query(`CREATE DATABASE "${name}"`)
      databaseCreated = true
      url.pathname = `/${name}`
      connection = new pg.Client({ connectionString: url.toString() })
      await connection.connect()
      for (const file of readdirSync('drizzle')
        .filter((filename) => /^\d+.*\.sql$/.test(filename))
        .sort())
        await sql().query(
          readFileSync(`drizzle/${file}`, 'utf8').replaceAll(
            '--> statement-breakpoint',
            '',
          ),
        )
      process.env.DATABASE_URL = url.toString()
      process.env.BETTER_AUTH_URL = 'http://localhost:3005'
      security = await import('./attendance-security.service.server')
      attendance =
        await import('#/features/attendance/server/attendance.service.server')
      database = (await import('#/db')).db
      await sql().query(
        `insert into "user" (id,name,email,roles) values ('worker','თანამშრომელი','worker@security.invalid','employee'),('hr','HR','hr@security.invalid','hr_manager'),('administrator','ადმინისტრატორი','admin@security.invalid','admin')`,
      )
      await sql().query(
        `insert into employee (username,user_id,full_name) select 'security-' || id,id,name from "user"`,
      )
      await sql().query(
        `insert into company_schedule (effective_from,timezone,late_grace_minutes,early_departure_grace_minutes) values ('2026-01-01','Asia/Tbilisi',0,0); insert into company_schedule_day select '2026-01-01',day,time '00:00',time '23:59' from generate_series(1,7) day`,
      )
    }, 30000)
    beforeEach(async () => {
      await sql().query(
        `delete from notification; delete from attendance_challenge; delete from attendance_punch; delete from attendance_audit; delete from attendance_session; delete from attendance_security_audit; delete from attendance_device; delete from attendance_employee_network; delete from attendance_security_policy; update "user" set roles=case id when 'worker' then 'employee' when 'hr' then 'hr_manager' else 'admin' end, access_state='active', permission_overrides='{"allow":[],"deny":[]}'::jsonb; insert into attendance_security_policy (id,passkey_required) values (1,false)`,
      )
      for (const actor of [worker, hr, administrator])
        await sql().query(
          `insert into attendance_device (user_id,token_hash,name,state) values ($1,$2,'ტესტის მოწყობილობა','approved')`,
          [actor.id, context(actor).tokenHash],
        )
    })
    afterAll(async () => {
      await database?.$client.end()
      await connection?.end()
      process.env.DATABASE_URL = originalUrl
      process.env.BETTER_AUTH_URL = originalAuthUrl
      if (admin) {
        if (databaseCreated)
          await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`)
        await admin.end()
      }
    })
    it('caps the workday across clock intervals and blocks another same-day clock-in', async () => {
      vi.useFakeTimers({ toFake: ['Date'] })
      try {
        vi.setSystemTime(new Date('2031-01-10T00:00:00Z'))
        await sql().query(
          `update attendance_device set created_at='2031-01-10T00:00:00Z'`,
        )
        const first = await attendance.checkIn(worker, clockInput(), context())
        vi.setSystemTime(new Date('2031-01-10T08:00:00Z'))
        await attendance.checkOut(
          worker,
          { sessionId: first.id, confirmEarly: true },
          context(),
        )
        vi.setSystemTime(new Date('2031-01-10T09:00:00Z'))
        const second = await attendance.checkIn(
          worker,
          { ...clockInput(), expectedLastSessionId: first.id },
          context(),
        )
        vi.setSystemTime(new Date('2031-01-10T19:00:00Z'))
        await expect(
          attendance.checkOut(
            worker,
            { sessionId: second.id, confirmEarly: true },
            context(),
          ),
        ).rejects.toThrow('ავტომატური დასრულება')
        const { runAttendanceReminders } =
          await import('#/features/attendance/server/attendance-reminders.service.server')
        await runAttendanceReminders(new Date())
        const closed = (
          await sql().query(
            'select ended_at,auto_closed_at,original_ended_at from attendance_session where id=$1',
            [second.id],
          )
        ).rows[0]
        expect(closed.ended_at.toISOString()).toBe('2031-01-10T19:00:00.000Z')
        expect(closed.auto_closed_at.toISOString()).toBe(
          '2031-01-10T19:00:00.000Z',
        )
        expect(closed.original_ended_at).toBeNull()
        await expect(
          attendance.checkIn(
            worker,
            { ...clockInput(), expectedLastSessionId: second.id },
            context(),
          ),
        ).rejects.toThrow('18-საათიანი ჯამური ზღვარი')
        vi.setSystemTime(new Date('2031-01-11T00:00:00Z'))
        await expect(
          attendance.checkIn(
            worker,
            { ...clockInput(), expectedLastSessionId: second.id },
            context(),
          ),
        ).resolves.toBeDefined()
      } finally {
        vi.useRealTimers()
      }
    })
    it.each(['admin', 'owner', 'hr_manager'] as const)(
      'lets %s explicitly approve their own pending browser and audits it',
      async (role) => {
        await sql().query(
          `update "user" set roles=$1 where id='administrator'`,
          [role],
        )
        const device = (
          await sql().query(
            `update attendance_device set state='pending' where user_id='administrator' returning id,revision`,
          )
        ).rows[0]
        expect(
          (await security.reviewDevices(administrator, {})).canApproveOwn,
        ).toBe(true)
        await security.decideDevice(administrator, {
          ...device,
          decision: 'approved',
        })
        const reviewed = (
          await security.reviewDevices(administrator, {})
        ).items.find((item) => item.id === device.id)
        expect(reviewed?.reviewedByName).toBe('ადმინისტრატორი')
        expect(reviewed?.reviewedAt).toEqual(expect.any(String))
        expect(
          (await security.deviceStatus(administrator, context(administrator)))
            .currentDevice?.state,
        ).toBe('approved')
        expect(
          (
            await sql().query(
              'select actor_id,details from attendance_security_audit where target_id=$1',
              [device.id],
            )
          ).rows[0],
        ).toMatchObject({
          actor_id: administrator.id,
          details: {
            userId: administrator.id,
            before: 'pending',
            after: 'approved',
            selfApproval: true,
          },
        })
        await expect(
          security.decideDevice(administrator, {
            ...device,
            decision: 'approved',
          }),
        ).rejects.toThrow()
        await sql().query(
          `update attendance_security_policy set ip_restriction_enabled=true,allowed_ips='["203.0.113.10"]'`,
        )
        const preparation = security.prepareClock(
          administrator,
          { kind: 'in', data: clockInput() },
          context(administrator),
        )
        if (role === 'hr_manager') await expect(preparation).rejects.toThrow()
        else
          await expect(preparation).resolves.toEqual({
            challengeId: null,
            options: null,
          })
        await sql().query(
          `update attendance_security_policy set ip_restriction_enabled=false,passkey_required=true`,
        )
        await expect(
          security.prepareClock(
            administrator,
            { kind: 'in', data: clockInput() },
            context(administrator),
          ),
        ).rejects.toThrow()
        await sql().query(
          `update "user" set roles='admin' where id='administrator'`,
        )
      },
    )
    it('does not let a delegated device reviewer self-approve without the separate permission', async () => {
      await sql().query(
        `update "user" set permission_overrides='{"allow":["attendance.devices.manage"],"deny":[]}'::jsonb where id='worker'`,
      )
      const device = (
        await sql().query(
          `update attendance_device set state='pending' where user_id='worker' returning id,revision`,
        )
      ).rows[0]
      expect((await security.reviewDevices(worker, {})).canApproveOwn).toBe(
        false,
      )
      await expect(
        security.decideDevice(worker, { ...device, decision: 'approved' }),
      ).rejects.toThrow()
    })
    it.each(['missing Passkey', 'revoked permission', 'suspended account'])(
      'blocks privileged self-approval with %s',
      async (condition) => {
        const device = (
          await sql().query(
            `update attendance_device set state='pending' where user_id='administrator' returning id,revision`,
          )
        ).rows[0]
        if (condition === 'missing Passkey')
          await sql().query(
            'update attendance_security_policy set passkey_required=true',
          )
        if (condition === 'revoked permission')
          await sql().query(
            `update "user" set permission_overrides='{"allow":[],"deny":["attendance.devices.approve.self"]}'::jsonb where id='administrator'`,
          )
        if (condition === 'suspended account')
          await sql().query(
            `update "user" set access_state='suspended' where id='administrator'`,
          )
        await expect(
          security.decideDevice(administrator, {
            ...device,
            decision: 'approved',
          }),
        ).rejects.toThrow()
        expect(
          (
            await sql().query(
              'select state,revision from attendance_device where id=$1',
              [device.id],
            )
          ).rows[0],
        ).toEqual({ state: 'pending', revision: device.revision })
      },
    )
    it.each(['approved', 'rejected', 'revoked'] as const)(
      'audits a device %s decision without a manual reason',
      async (decision) => {
        const before = decision === 'revoked' ? 'approved' : 'pending'
        const device = (
          await sql().query(
            `update attendance_device set state=$1 where user_id='worker' returning id,revision`,
            [before],
          )
        ).rows[0]
        await security.decideDevice(hr, { ...device, decision })
        const audit = (
          await sql().query(
            'select actor_id,target_id,action,reason,details from attendance_security_audit where target_id=$1',
            [device.id],
          )
        ).rows
        expect(audit).toEqual([
          {
            actor_id: hr.id,
            target_id: device.id,
            action: `device.${decision}`,
            reason: 'მოწყობილობის სტატუსი შეცვლილია.',
            details: { userId: worker.id, before, after: decision },
          },
        ])
        const saved = (
          await sql().query(
            'select state,reviewed_by,revision from attendance_device where id=$1',
            [device.id],
          )
        ).rows[0]
        expect(saved).toEqual({
          state: decision,
          reviewed_by: hr.id,
          revision: device.revision + 1,
        })
        if (decision === 'revoked')
          await expect(
            attendance.checkIn(worker, clockInput(), context()),
          ).rejects.toThrow()
      },
    )
    it('identifies a new browser without sending an HR request until the employee explicitly activates it', async () => {
      await sql().query(`delete from attendance_device where user_id='worker'`)
      const identified = await security.registerAutomaticDevice(
        worker,
        context(),
      )
      expect(identified.state).toBe('unrequested')
      expect(await security.registerAutomaticDevice(worker, context())).toEqual(
        identified,
      )
      expect(
        (await security.reviewDevices(hr, {})).items.some(
          (row) => row.id === identified.id,
        ),
      ).toBe(false)
      expect(
        (await sql().query('select count(*)::int as total from notification'))
          .rows[0].total,
      ).toBe(0)
      await expect(
        security.decideDevice(hr, {
          id: identified.id,
          revision: 0,
          decision: 'approved',
        }),
      ).rejects.toThrow()
      await expect(
        security.prepareClock(
          worker,
          { kind: 'in', data: clockInput() },
          context(),
        ),
      ).rejects.toThrow()
      const requested = await security.requestDevice(
        worker,
        { name: 'ბრაუზერი' },
        context(),
        true,
      )
      expect(requested).toEqual({ id: identified.id, state: 'pending' })
      expect(
        (await security.reviewDevices(hr, {})).items.find(
          (row) => row.id === identified.id,
        ),
      ).toMatchObject({ state: 'pending', revision: 1 })
      const sent = (
        await sql().query('select count(*)::int as total from notification')
      ).rows[0].total
      expect(sent).toBeGreaterThan(0)
      await security.requestDevice(
        worker,
        { name: 'ბრაუზერი' },
        context(),
        true,
      )
      await security.registerAutomaticDevice(worker, context())
      expect(
        (await sql().query('select count(*)::int as total from notification'))
          .rows[0].total,
      ).toBe(sent)
      expect(
        (
          await sql().query(
            `select revision from attendance_device where id=$1`,
            [identified.id],
          )
        ).rows[0].revision,
      ).toBe(1)
    })
    it('keeps an approved browser usable while another sign-in waits for an explicit activation request', async () => {
      const second = {
        ...context(),
        tokenHash: hash('unrequested-second-browser').toString('hex'),
      }
      const identified = await security.registerAutomaticDevice(worker, second)
      expect(identified.state).toBe('unrequested')
      await expect(
        security.prepareClock(
          worker,
          { kind: 'in', data: clockInput() },
          context(),
        ),
      ).resolves.toEqual({ challengeId: null, options: null })
      await expect(
        attendance.checkIn(worker, clockInput(), second),
      ).rejects.toThrow()
      expect(
        (await sql().query('select count(*)::int as total from notification'))
          .rows[0].total,
      ).toBe(0)
      await security.requestDevice(
        worker,
        { name: 'ახალი ბრაუზერი' },
        second,
        true,
      )
      expect(
        (await security.deviceStatus(worker, second)).currentDevice?.state,
      ).toBe('pending')
      await expect(
        security.prepareClock(
          worker,
          { kind: 'in', data: clockInput() },
          context(),
        ),
      ).resolves.toEqual({ challengeId: null, options: null })
      expect(
        (await sql().query('select count(*)::int as total from notification'))
          .rows[0].total,
      ).toBeGreaterThan(0)
    })
    it('explains the rejection cooldown and lets the same browser request HR review again afterward', async () => {
      await sql().query(`delete from attendance_device where user_id='worker'`)
      const device = await security.requestDevice(
        worker,
        { name: 'ბრაუზერი' },
        context(),
        true,
      )
      await security.decideDevice(hr, {
        id: device.id,
        revision: 0,
        decision: 'rejected',
      })
      await expect(
        security.requestDevice(worker, { name: 'ბრაუზერი' }, context(), true),
      ).rejects.toThrow('ხელახლა მოთხოვნა ერთ წუთში იქნება შესაძლებელი.')
      expect(
        (await security.deviceStatus(worker, context())).currentDevice?.state,
      ).toBe('rejected')
      await sql().query(
        `update attendance_device set reviewed_at=now()-interval '61 seconds' where id=$1`,
        [device.id],
      )
      await expect(
        security.requestDevice(worker, { name: 'ბრაუზერი' }, context(), true),
      ).resolves.toEqual({ id: device.id, state: 'pending' })
      await expect(
        security.prepareClock(
          worker,
          { kind: 'in', data: clockInput() },
          context(),
        ),
      ).rejects.toThrow()
      await security.decideDevice(hr, {
        id: device.id,
        revision: 2,
        decision: 'approved',
      })
      await expect(
        security.prepareClock(
          worker,
          { kind: 'in', data: clockInput() },
          context(),
        ),
      ).resolves.toEqual({ challengeId: null, options: null })
      expect(
        (
          await sql().query(
            `select count(*)::int as total from attendance_device where user_id='worker'`,
          )
        ).rows[0].total,
      ).toBe(1)
    })
    it('uses token-only verification for reactivation even when an older passkey is retained', async () => {
      const key = await enroll()
      await sql().query(
        'update attendance_security_policy set passkey_required=false',
      )
      const device = (
        await sql().query(
          `select id,revision from attendance_device where user_id='worker'`,
        )
      ).rows[0]
      await security.decideDevice(hr, { ...device, decision: 'revoked' })
      await sql().query(
        `update attendance_device set reviewed_at=now()-interval '61 seconds' where id=$1`,
        [device.id],
      )
      await security.requestDevice(
        worker,
        { name: 'ბრაუზერი' },
        context(),
        true,
      )
      const list = await security.reviewDevices(hr, {})
      expect(list).toMatchObject({
        browserApprovalRequired: true,
        passkeyRequired: false,
      })
      const pending = list.items.find((item) => item.id === device.id)!
      expect(pending).toMatchObject({ state: 'pending', hasPasskey: true })
      await expect(
        security.prepareClock(
          worker,
          { kind: 'in', data: clockInput() },
          context(),
        ),
      ).rejects.toThrow()
      await security.decideDevice(hr, {
        id: pending.id,
        revision: pending.revision,
        decision: 'approved',
      })
      await expect(
        security.prepareClock(
          worker,
          { kind: 'in', data: clockInput() },
          context(),
        ),
      ).resolves.toEqual({ challengeId: null, options: null })
      expect(
        (
          await sql().query(
            'select credential_id from attendance_device where id=$1',
            [device.id],
          )
        ).rows[0].credential_id,
      ).toBe(key.credentialId)
    })
    it('does not start or finish passkey enrollment while the active policy disables it', async () => {
      const message = 'Passkey-ით გადამოწმება გამორთულია. განაახლეთ გვერდი.'
      await expect(
        security.beginRegistration(worker, context()),
      ).rejects.toThrow(message)
      expect(
        (
          await sql().query(
            'select count(*)::int as total from attendance_challenge',
          )
        ).rows[0].total,
      ).toBe(0)
      await sql().query(
        'update attendance_security_policy set passkey_required=true',
      )
      const started = await security.beginRegistration(worker, context())
      await sql().query(
        'update attendance_security_policy set passkey_required=false',
      )
      await expect(
        security.finishRegistration(
          worker,
          { challengeId: started.challengeId, response: {} },
          context(),
        ),
      ).rejects.toThrow(message)
      expect(
        (
          await sql().query(
            `select credential_id,state from attendance_device where user_id='worker'`,
          )
        ).rows[0],
      ).toEqual({ credential_id: null, state: 'approved' })
    })
    it('retains an existing passkey when reapplying after revocation and still requires HR review', async () => {
      await enroll()
      await sql().query(
        'update attendance_security_policy set passkey_required=true',
      )
      const device = (
        await sql().query(
          `select id,revision,credential_id from attendance_device where user_id='worker'`,
        )
      ).rows[0]
      await security.decideDevice(hr, {
        id: device.id,
        revision: device.revision,
        decision: 'revoked',
      })
      await sql().query(
        `update attendance_device set reviewed_at=now()-interval '61 seconds' where id=$1`,
        [device.id],
      )
      await security.requestDevice(
        worker,
        { name: 'დასწრების ბრაუზერი' },
        context(),
        true,
      )
      expect(
        (
          await sql().query(
            'select state,credential_id from attendance_device where id=$1',
            [device.id],
          )
        ).rows[0],
      ).toEqual({ state: 'pending', credential_id: device.credential_id })
      await expect(
        security.beginRegistration(worker, context()),
      ).rejects.toThrow()
      await expect(
        security.prepareClock(
          worker,
          { kind: 'in', data: clockInput() },
          context(),
        ),
      ).rejects.toThrow()
    })
    it('identifies a browser outside the attendance allowlist but requires an allowed IP for activation and clock actions', async () => {
      await sql().query(
        `delete from attendance_device where user_id='worker'; update attendance_security_policy set ip_restriction_enabled=true,allowed_ips='["203.0.113.10"]'::jsonb`,
      )
      const first = await security.registerAutomaticDevice(worker, context())
      expect(first.state).toBe('unrequested')
      expect(await security.registerAutomaticDevice(worker, context())).toEqual(
        first,
      )
      expect(
        (
          await sql().query(
            `select count(*)::int as total from attendance_device where user_id='worker'`,
          )
        ).rows[0].total,
      ).toBe(1)
      await expect(
        security.requestDevice(worker, { name: 'ბრაუზერი' }, context(), true),
      ).rejects.toThrow()
      await security.requestDevice(
        worker,
        { name: 'ბრაუზერი' },
        { ...context(), ip: '203.0.113.10' },
        true,
      )
      await security.decideDevice(hr, {
        id: first.id,
        revision: 1,
        decision: 'approved',
      })
      await expect(
        attendance.checkIn(worker, clockInput(), context()),
      ).rejects.toThrow()
      await expect(
        security.prepareClock(
          worker,
          { kind: 'in', data: clockInput() },
          { ...context(), ip: '203.0.113.10' },
        ),
      ).resolves.toEqual({ challengeId: null, options: null })
      await sql().query(
        `update attendance_security_policy set blocked_ips='["192.0.2.10"]'::jsonb`,
      )
      await expect(
        security.registerAutomaticDevice(worker, context()),
      ).rejects.toThrow()
    })
    it('allows both HR-approved browsers and revokes one without disabling the other', async () => {
      await sql().query(
        `delete from attendance_device where user_id='worker'; delete from attendance_security_policy`,
      )
      const secondContext = {
        ...context(),
        tokenHash: hash('second-browser').toString('hex'),
        sessionHash: hash('second-login').toString('hex'),
      }
      const first = await security.registerAutomaticDevice(worker, context())
      const second = await security.registerAutomaticDevice(
        worker,
        secondContext,
      )
      expect(first.id).not.toBe(second.id)
      expect(
        (
          await sql().query(
            'select browser_approval_required,passkey_required from attendance_security_policy',
          )
        ).rows,
      ).toEqual([{ browser_approval_required: true, passkey_required: false }])
      await expect(
        security.prepareClock(
          worker,
          { kind: 'in', data: clockInput() },
          context(),
        ),
      ).rejects.toThrow()
      await security.requestDevice(worker, { name: 'პირველი' }, context(), true)
      await security.requestDevice(
        worker,
        { name: 'მეორე' },
        secondContext,
        true,
      )
      for (const device of [first, second])
        await security.decideDevice(hr, {
          id: device.id,
          revision: 1,
          decision: 'approved',
        })
      const opened = await attendance.checkIn(worker, clockInput(), context())
      await attendance.checkOut(
        worker,
        { sessionId: opened.id, confirmEarly: true },
        secondContext,
      )
      await security.decideDevice(hr, {
        id: first.id,
        revision: 2,
        decision: 'revoked',
      })
      expect(
        (await security.registerAutomaticDevice(worker, context())).state,
      ).toBe('revoked')
      const next = { ...clockInput(), expectedLastSessionId: opened.id }
      await expect(
        attendance.checkIn(worker, next, context()),
      ).rejects.toThrow()
      await expect(
        attendance.checkIn(worker, next, secondContext),
      ).resolves.toBeDefined()
    })
    it.each([true, false])(
      'enforces company and employee IPs on both punch writes with browser approval %s',
      async (required) => {
        await sql().query(
          `update attendance_security_policy set browser_approval_required=$1,ip_restriction_enabled=true,allowed_ips='["192.0.2.10"]'::jsonb`,
          [required],
        )
        if (!required)
          await sql().query(
            `update attendance_device set state='pending' where user_id='worker'`,
          )
        const data = clockInput()
        await security.prepareClock(worker, { kind: 'in', data }, context())
        await sql().query(
          `update attendance_security_policy set allowed_ips='["203.0.113.10"]'::jsonb`,
        )
        await expect(
          attendance.checkIn(worker, data, context()),
        ).rejects.toThrow()
        await sql().query(
          `update attendance_security_policy set allowed_ips='["192.0.2.10"]'::jsonb`,
        )
        await sql().query(
          `insert into attendance_employee_network (user_id,allowed_ips) values ('worker','[]'::jsonb)`,
        )
        await expect(
          attendance.checkIn(worker, data, context()),
        ).rejects.toThrow()
        await sql().query(
          `delete from attendance_employee_network where user_id='worker'`,
        )
        const opened = await attendance.checkIn(worker, data, context())
        await sql().query(
          `update attendance_security_policy set allowed_ips='["203.0.113.10"]'::jsonb`,
        )
        await expect(
          attendance.checkOut(
            worker,
            { sessionId: opened.id, confirmEarly: true },
            context(),
          ),
        ).rejects.toThrow()
        await sql().query(
          `update attendance_security_policy set allowed_ips='["192.0.2.10"]'::jsonb`,
        )
        await expect(
          attendance.checkOut(
            worker,
            { sessionId: opened.id, confirmEarly: true },
            context(),
          ),
        ).resolves.toBeDefined()
      },
    )
    it.each(['admin', 'owner'] as const)(
      'exempts persisted %s roles from company and individual allowlists and audits both punches',
      async (role) => {
        await sql().query(`update "user" set roles=$1 where id='worker'`, [
          role,
        ])
        await sql().query(
          `update attendance_security_policy set ip_restriction_enabled=true,allowed_ips='["203.0.113.10"]'::jsonb;
           insert into attendance_employee_network(user_id,allowed_ips) values ('worker','[]'::jsonb)`,
        )
        // The supplied actor still says employee; only the persisted role grants the exemption.
        const data = clockInput()
        await security.prepareClock(worker, { kind: 'in', data }, context())
        const opened = await attendance.checkIn(worker, data, context())
        await attendance.checkIn(worker, data, context())
        const out = { sessionId: opened.id, confirmEarly: true }
        await security.prepareClock(
          worker,
          { kind: 'out', data: out },
          context(),
        )
        await attendance.checkOut(worker, out, context())
        const audits = (
          await sql().query(
            `select actor_id,target_id,details from attendance_security_audit where action='clock.ip_allowlist_exempted' order by details->>'kind'`,
          )
        ).rows
        expect(audits).toEqual(
          ['in', 'out'].map((kind) => ({
            actor_id: worker.id,
            target_id: opened.id,
            details: {
              kind,
              subjectUserId: worker.id,
              ip: context().ip,
              role,
              policyRevision: 0,
            },
          })),
        )
        expect(
          (await sql().query('select ip from attendance_punch')).rows,
        ).toEqual([{ ip: context().ip }, { ip: context().ip }])
      },
    )
    it.each([
      'employee',
      'production_specialist',
      'supervisor',
      'sales_manager',
      'hr_manager',
    ] as const)(
      'keeps allowlists enforced for %s despite forged admin roles',
      async (role) => {
        await sql().query(`update "user" set roles=$1 where id='worker'`, [
          role,
        ])
        await sql().query(
          `update attendance_security_policy set ip_restriction_enabled=true,allowed_ips='["203.0.113.10"]'::jsonb`,
        )
        const forged: Actor = { ...worker, roles: ['admin', 'owner'] }
        const data = clockInput()
        await expect(
          security.prepareClock(forged, { kind: 'in', data }, context()),
        ).rejects.toThrow('ამ ქსელიდან')
        await expect(
          attendance.checkIn(forged, data, context()),
        ).rejects.toThrow('ამ ქსელიდან')
        await sql().query(
          `update attendance_security_policy set allowed_ips='["192.0.2.10"]'::jsonb`,
        )
        const opened = await attendance.checkIn(worker, data, context())
        await sql().query(
          `update attendance_security_policy set allowed_ips='["203.0.113.10"]'::jsonb`,
        )
        const out = { sessionId: opened.id, confirmEarly: true }
        await expect(
          security.prepareClock(forged, { kind: 'out', data: out }, context()),
        ).rejects.toThrow('ამ ქსელიდან')
        await expect(
          attendance.checkOut(forged, out, context()),
        ).rejects.toThrow('ამ ქსელიდან')
        expect(
          (
            await sql().query(
              `select count(*)::int as total from attendance_security_audit where action='clock.ip_allowlist_exempted'`,
            )
          ).rows[0].total,
        ).toBe(0)
      },
    )
    it.each(['admin', 'owner'] as const)(
      'keeps blocked IPs, browser approval, Passkey, and current-role checks enforced for %s',
      async (role) => {
        await sql().query(`update "user" set roles=$1 where id='worker'`, [
          role,
        ])
        const actor: Actor = { ...worker, roles: [role] }
        const key = await enroll(actor)
        await sql().query(
          `update attendance_security_policy set ip_restriction_enabled=true,allowed_ips='[]'::jsonb,blocked_ips='["192.0.2.10"]'::jsonb`,
        )
        const data = clockInput()
        const intent = { kind: 'in' as const, data }
        await expect(
          security.prepareClock(actor, intent, context()),
        ).rejects.toThrow('წვდომა აკრძალულია')
        await expect(
          attendance.checkIn(actor, data, context()),
        ).rejects.toThrow('წვდომა აკრძალულია')
        await expect(
          attendance.checkIn(actor, data, { ...context(), ip: null }),
        ).rejects.toThrow('წვდომა აკრძალულია')
        await sql().query(
          `update attendance_security_policy set blocked_ips='[]'::jsonb; update attendance_device set state='pending' where user_id='worker'`,
        )
        await expect(
          security.prepareClock(actor, intent, context()),
        ).rejects.toThrow('მოწყობილობა')
        await expect(
          attendance.checkIn(actor, data, context()),
        ).rejects.toThrow('მოწყობილობა')
        await sql().query(
          `update attendance_device set state='approved' where user_id='worker'`,
        )
        await expect(
          attendance.checkIn(actor, data, context()),
        ).rejects.toThrow('დამატებითი დადასტურება')
        const prepared = await security.prepareClock(actor, intent, context())
        const opened = await attendance.checkIn(actor, data, context(), {
          intent,
          challengeId: prepared.challengeId!,
          response: key.assertion(prepared.options!.challenge),
        })
        const out = { sessionId: opened.id, confirmEarly: true }
        await sql().query(
          `update attendance_security_policy set blocked_ips='["192.0.2.10"]'::jsonb`,
        )
        await expect(
          attendance.checkOut(actor, out, context()),
        ).rejects.toThrow('წვდომა აკრძალულია')
        await sql().query(
          `update attendance_security_policy set blocked_ips='[]'::jsonb; update "user" set roles='employee' where id='worker'`,
        )
        await expect(
          security.prepareClock(actor, { kind: 'out', data: out }, context()),
        ).rejects.toThrow('ამ ქსელიდან')
        await expect(
          attendance.checkOut(actor, out, context()),
        ).rejects.toThrow('ამ ქსელიდან')
        expect(
          (
            await sql().query(
              `select count(*)::int as total from attendance_security_audit where action='clock.ip_allowlist_exempted'`,
            )
          ).rows[0].total,
        ).toBe(1)
      },
    )
    it('rejects disabling browser approval while passkeys remain enabled', async () => {
      const policy = await security.securitySettings(administrator)
      await expect(
        security.saveSecuritySettings(
          administrator,
          { ...policy, browserApprovalRequired: false, passkeyRequired: true },
          context(administrator),
        ),
      ).rejects.toThrow()
    })
    it('reads only current browser status without provisioning and rejects suspended accounts', async () => {
      await sql().query(
        'update attendance_security_policy set passkey_required=true',
      )
      const device = (
        await sql().query(
          `select id,name from attendance_device where user_id='worker'`,
        )
      ).rows[0]
      expect(await security.deviceStatus(worker, context())).toEqual({
        browserApprovalRequired: true,
        passkeyRequired: true,
        currentDevice: { ...device, state: 'approved', hasPasskey: false },
      })
      expect(
        await security.deviceStatus(worker, {
          ...context(),
          tokenHash: hash('unknown-browser').toString('hex'),
        }),
      ).toEqual({
        browserApprovalRequired: true,
        passkeyRequired: true,
        currentDevice: null,
      })
      expect(
        (
          await sql().query(
            `select count(*)::int as total from attendance_device where user_id='worker'`,
          )
        ).rows[0].total,
      ).toBe(1)
      await expect(security.deviceStatus(hr, context(worker))).rejects.toThrow()
      await sql().query(
        `update "user" set access_state='suspended' where id='worker'`,
      )
      await expect(security.deviceStatus(worker, context())).rejects.toThrow()
    })
    it('defaults passkeys off and audits settings saved without a manual reason', async () => {
      await sql().query('delete from attendance_security_policy')
      const initial = await security.securitySettings(administrator)
      expect(initial.passkeyRequired).toBe(false)
      const saved = await security.saveSecuritySettings(
        administrator,
        initial,
        context(administrator),
      )
      expect(saved.passkeyRequired).toBe(false)
      expect(
        (
          await sql().query(
            `select actor_id,reason from attendance_security_audit where action='policy.updated'`,
          )
        ).rows,
      ).toEqual([
        { actor_id: administrator.id, reason: 'უსაფრთხოების წესები შეიცვალა.' },
      ])
      const list = await security.reviewDevices(hr, {})
      expect(
        list.items.some(
          (item) => item.userId === worker.id && item.state === 'approved',
        ),
      ).toBe(true)
    })
    it('denies missing context, unknown/revoked browsers and suspended accounts even with passkeys disabled', async () => {
      await expect(attendance.checkIn(worker, clockInput())).rejects.toThrow()
      await expect(
        attendance.checkIn(worker, clockInput(), {
          ...context(),
          tokenHash: 'unknown',
        }),
      ).rejects.toThrow()
      await sql().query(
        `update attendance_device set state='revoked' where user_id='worker'`,
      )
      await expect(
        attendance.checkIn(worker, clockInput(), context()),
      ).rejects.toThrow()
      await sql().query(
        `update attendance_device set state='approved'; update "user" set access_state='suspended' where id='worker'`,
      )
      await expect(
        attendance.checkIn(worker, clockInput(), context()),
      ).rejects.toThrow()
      expect(
        (await sql().query('select * from attendance_session')).rows,
      ).toHaveLength(0)
    })
    it('bounds browser requests, deduplicates repeated requests, and refuses expired registrations', async () => {
      const fresh = {
        ...context(),
        tokenHash: hash('new-browser').toString('hex'),
      }
      const first = await security.requestDevice(
        worker,
        { name: 'ახალი ბრაუზერი' },
        fresh,
      )
      const repeated = await security.requestDevice(
        worker,
        { name: 'ახალი ბრაუზერი' },
        fresh,
      )
      expect(first.id).toBe(repeated.id)
      expect(
        (
          await sql().query(
            `select count(*)::int value from attendance_device where user_id='worker'`,
          )
        ).rows[0].value,
      ).toBe(2)
      await sql().query(
        `insert into attendance_device (user_id,token_hash,name,state) select 'worker','extra-' || n,'დამატებითი ბრაუზერი','pending' from generate_series(1,18) n`,
      )
      await expect(
        security.requestDevice(
          worker,
          { name: 'ზედმეტი ბრაუზერი' },
          { ...context(), tokenHash: 'overflow' },
        ),
      ).rejects.toThrow()
      await sql().query(
        `update attendance_device set state='revoked',reviewed_at=now()-interval '2 minutes' where id=$1`,
        [first.id],
      )
      await security.requestDevice(
        worker,
        { name: 'შემცვლელი ბრაუზერი' },
        { ...context(), tokenHash: 'replacement' },
      )
      await expect(
        security.requestDevice(
          worker,
          { name: 'ხელახალი მოთხოვნა' },
          fresh,
          true,
        ),
      ).rejects.toThrow()
      await sql().query(
        `update attendance_device set created_at=now()-interval '366 days' where token_hash=$1`,
        [context().tokenHash],
      )
      await expect(
        security.prepareClock(
          worker,
          { kind: 'in', data: clockInput() },
          context(),
        ),
      ).rejects.toThrow()
    })
    it('enforces exact company and individual IPs, empty lists, missing addresses and global deny precedence', async () => {
      await sql().query(
        `update attendance_security_policy set ip_restriction_enabled=true,allowed_ips='["192.0.2.10"]'`,
      )
      await expect(
        attendance.checkIn(worker, clockInput(), {
          ...context(),
          ip: '192.0.2.11',
        }),
      ).rejects.toThrow()
      await expect(
        attendance.checkIn(worker, clockInput(), { ...context(), ip: null }),
      ).rejects.toThrow()
      await security.saveEmployeeNetwork(administrator, {
        userId: worker.id,
        allowedIps: [],
        reason: 'ინდივიდუალური შეზღუდვის ტესტი.',
      })
      await expect(
        attendance.checkIn(worker, clockInput(), context()),
      ).rejects.toThrow()
      await security.saveEmployeeNetwork(administrator, {
        userId: worker.id,
        allowedIps: ['198.51.100.10'],
        reason: 'ინდივიდუალური დაშვების ტესტი.',
      })
      await expect(
        attendance.checkIn(worker, clockInput(), context()),
      ).rejects.toThrow()
      await sql().query(
        `update attendance_security_policy set blocked_ips='["198.51.100.10"]'`,
      )
      await expect(
        attendance.checkIn(worker, clockInput(), {
          ...context(),
          ip: '198.51.100.10',
        }),
      ).rejects.toThrow()
      await sql().query(
        `update attendance_security_policy set blocked_ips='[]'`,
      )
      await attendance.checkIn(worker, clockInput(), {
        ...context(),
        ip: '198.51.100.10',
      })
    })
    it('registers real credentials pending HR approval and prohibits self-approval or stale decisions', async () => {
      const authenticator = await enroll()
      expect(authenticator.credentialId).toBeTruthy()
      const device = (
        await sql().query(
          `select id,revision from attendance_device where user_id='worker'`,
        )
      ).rows[0]
      await expect(
        security.decideDevice(
          { ...worker, roles: ['hr_manager'] },
          { ...device, decision: 'revoked', reason: 'გაუქმების შემოწმება.' },
        ),
      ).rejects.toThrow()
      await expect(
        security.decideDevice(administrator, {
          ...device,
          revision: device.revision - 1,
          decision: 'revoked',
          reason: 'ვერსიის შემოწმება.',
        }),
      ).rejects.toThrow()
      const ownAdmin = (
        await sql().query(
          `select id,revision from attendance_device where user_id='administrator'`,
        )
      ).rows[0]
      await expect(
        security.decideDevice(administrator, {
          ...ownAdmin,
          decision: 'revoked',
          reason: 'საკუთარი ცვლილების ტესტი.',
        }),
      ).rejects.toThrow()
    })
    it('requires a fresh real assertion bound to its session and exact action and consumes it once', async () => {
      const key = await enroll()
      await sql().query(
        `update attendance_security_policy set passkey_required=true`,
      )
      const data = clockInput()
      const intent = { kind: 'in' as const, data }
      const prepared = await security.prepareClock(worker, intent, context())
      const proof = {
        intent,
        challengeId: prepared.challengeId!,
        response: key.assertion(prepared.options!.challenge),
      }
      await expect(
        attendance.checkIn(
          worker,
          data,
          { ...context(), sessionHash: 'another-session' },
          proof,
        ),
      ).rejects.toThrow()
      await expect(
        attendance.checkIn(worker, clockInput(), context(), proof),
      ).rejects.toThrow()
      const created = await attendance.checkIn(worker, data, context(), proof)
      await expect(
        attendance.checkIn(worker, data, context(), proof),
      ).rejects.toThrow()
      const out = {
        kind: 'out' as const,
        data: { sessionId: created.id, confirmEarly: true },
      }
      const finish = await security.prepareClock(worker, out, context())
      await attendance.checkOut(worker, out.data, context(), {
        intent: out,
        challengeId: finish.challengeId!,
        response: key.assertion(finish.options!.challenge),
      })
      expect(
        (
          await sql().query(
            `select kind,user_verified,actor_id,subject_user_id from attendance_punch order by kind`,
          )
        ).rows,
      ).toEqual([
        {
          kind: 'in',
          user_verified: true,
          actor_id: 'worker',
          subject_user_id: 'worker',
        },
        {
          kind: 'out',
          user_verified: true,
          actor_id: 'worker',
          subject_user_id: 'worker',
        },
      ])
    })
    it('rejects wrong origins, absent user verification, expired challenges and credential revocation', async () => {
      const key = await enroll()
      await sql().query(
        `update attendance_security_policy set passkey_required=true`,
      )
      const data = clockInput()
      const intent = { kind: 'in' as const, data }
      const prepared = await security.prepareClock(worker, intent, context())
      for (const options of [
        { origin: 'https://evil.invalid' },
        { verified: false },
      ])
        await expect(
          attendance.checkIn(worker, data, context(), {
            intent,
            challengeId: prepared.challengeId!,
            response: key.assertion(prepared.options!.challenge, options),
          }),
        ).rejects.toThrow()
      await sql().query(
        `update attendance_challenge set expires_at=now()-interval '1 second'`,
      )
      await expect(
        attendance.checkIn(worker, data, context(), {
          intent,
          challengeId: prepared.challengeId!,
          response: key.assertion(prepared.options!.challenge),
        }),
      ).rejects.toThrow()
      await sql().query(
        `update attendance_device set state='revoked' where user_id='worker'`,
      )
      await expect(
        security.prepareClock(worker, intent, context()),
      ).rejects.toThrow()
      expect(
        (await sql().query('select * from attendance_punch')).rows,
      ).toHaveLength(0)
    })
    it('allows disabling only the extra passkey check and retains device restrictions and attribution', async () => {
      await sql().query(
        `update attendance_security_policy set passkey_required=true`,
      )
      await expect(
        attendance.checkIn(worker, clockInput(), context()),
      ).rejects.toThrow()
      await security.saveSecuritySettings(
        administrator,
        {
          ipRestrictionEnabled: false,
          passkeyRequired: false,
          allowedIps: [],
          blockedIps: [],
          revision: 0,
          reason: 'დამატებითი დადასტურების გამორთვის ტესტი.',
        },
        context(administrator),
      )
      await attendance.checkIn(worker, clockInput(), context())
      expect(
        (
          await sql().query(
            `select user_verified,credential_id from attendance_punch`,
          )
        ).rows,
      ).toEqual([{ user_verified: false, credential_id: null }])
      await expect(
        attendance.checkOut(
          worker,
          { sessionId: randomUUID(), confirmEarly: true },
          { ...context(), tokenHash: 'unknown' },
        ),
      ).rejects.toThrow()
    })
    it('attributes HR-assisted punches to HR, preserves the subject, and blocks self-service privilege spoofing', async () => {
      const hrAuthenticator = await enroll(hr)
      await sql().query(
        `update attendance_security_policy set passkey_required=true`,
      )
      const data = clockInput()
      const intent = {
        kind: 'in' as const,
        data,
        targetUserId: worker.id,
        reason: 'თანამშრომლის ტელეფონი დაზიანებულია.',
      }
      await expect(
        security.prepareClock(
          worker,
          { ...intent, targetUserId: hr.id },
          context(),
        ),
      ).rejects.toThrow()
      await expect(
        security.prepareClock(
          hr,
          { ...intent, targetUserId: hr.id },
          context(hr),
        ),
      ).rejects.toThrow()
      await sql().query(
        `update attendance_device set state='revoked' where user_id='worker'`,
      )
      const begin = await security.prepareClock(hr, intent, context(hr))
      const created = await attendance.checkIn(hr, data, context(hr), {
        intent,
        challengeId: begin.challengeId!,
        response: hrAuthenticator.assertion(begin.options!.challenge),
      })
      const out = {
        kind: 'out' as const,
        data: { sessionId: created.id, confirmEarly: true },
        targetUserId: worker.id,
        reason: intent.reason,
      }
      const end = await security.prepareClock(hr, out, context(hr))
      await attendance.checkOut(hr, out.data, context(hr), {
        intent: out,
        challengeId: end.challengeId!,
        response: hrAuthenticator.assertion(end.options!.challenge),
      })
      expect(
        (
          await sql().query(
            `select actor_id,subject_user_id,source,reason from attendance_punch order by kind`,
          )
        ).rows,
      ).toEqual(
        [1, 2].map(() => ({
          actor_id: 'hr',
          subject_user_id: 'worker',
          source: 'hr',
          reason: intent.reason,
        })),
      )
      expect(
        (
          await sql().query(
            `select recipient_id from notification where recipient_id='worker'`,
          )
        ).rows,
      ).toHaveLength(2)
      expect(
        (
          await sql().query(
            `select ended_at is not null as closed from attendance_session`,
          )
        ).rows,
      ).toEqual([{ closed: true }])
    })
    it('serializes competing punches so only one session and one actor event commit', async () => {
      const responses = await Promise.allSettled([
        attendance.checkIn(worker, clockInput(), context()),
        attendance.checkIn(worker, clockInput(), context()),
      ])
      expect(
        responses.filter((result) => result.status === 'fulfilled'),
      ).toHaveLength(1)
      expect(
        (await sql().query('select * from attendance_session')).rows,
      ).toHaveLength(1)
      expect(
        (await sql().query('select * from attendance_punch')).rows,
      ).toHaveLength(1)
    })
  },
)
