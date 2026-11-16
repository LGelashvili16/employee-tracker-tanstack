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
        `delete from notification; delete from attendance_challenge; delete from attendance_punch; delete from attendance_audit; delete from attendance_session; delete from attendance_security_audit; delete from attendance_device; delete from attendance_employee_network; delete from attendance_security_policy; update "user" set access_state='active', permission_overrides='{"allow":[],"deny":[]}'::jsonb; insert into attendance_security_policy (id,passkey_required) values (1,false)`,
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
        passkeyRequired: true,
        currentDevice: { ...device, state: 'approved', hasPasskey: false },
      })
      expect(
        await security.deviceStatus(worker, {
          ...context(),
          tokenHash: hash('unknown-browser').toString('hex'),
        }),
      ).toEqual({ passkeyRequired: true, currentDevice: null })
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
