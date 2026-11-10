// @vitest-environment node
import 'dotenv/config'
import { randomBytes, randomUUID } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import pg from 'pg'
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import type * as Service from './announcements.service.server'
import type { db as Database } from '#/db'
import type { Actor } from '#/lib/authorization/actor'

vi.mock('@tanstack/react-start/server-only', () => ({}))
const originalUrl = process.env.DATABASE_URL
const databaseName = `teamwork_announcements_test_${randomBytes(8).toString('hex')}`
let admin: pg.Client | undefined
let connection: pg.Client | undefined
let database: typeof Database | undefined
let service: typeof Service
let created = false
const actor = (id: string, roles: Actor['roles'] = ['employee']): Actor => ({
  id,
  roles,
  name: 'ტესტი',
  email: null,
  emailVerified: false,
})
const hr = actor('announcement-hr', ['hr_manager'])
const platform = actor('announcement-admin', ['admin'])
const first = actor('announcement-first')
const second = actor('announcement-second')
const futureLogin = new Date('2100-01-01T00:00:00Z')
function sql() {
  if (!connection) throw new Error('Isolated database unavailable')
  return connection
}
const input = (showOnLogin = false) => ({
  requestId: randomUUID(),
  title: 'კომპანიის სიახლე',
  body: 'ახალი სამუშაო ინფორმაცია.',
  showOnLogin,
})

describe.runIf(process.env.RUN_ANNOUNCEMENTS_DB_TESTS === '1')(
  'announcements against isolated PostgreSQL',
  () => {
    beforeAll(async () => {
      if (!originalUrl)
        throw new Error('Local PostgreSQL configuration required')
      const target = new URL(originalUrl)
      if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname))
        throw new Error('Tests require local PostgreSQL')
      admin = new pg.Client({
        connectionString: originalUrl,
        connectionTimeoutMillis: 3000,
      })
      await admin.connect()
      expect(
        Number(
          (await admin.query('show server_version_num')).rows[0]
            .server_version_num,
        ),
      ).toBeGreaterThanOrEqual(180000)
      await admin.query(`CREATE DATABASE "${databaseName}"`)
      created = true
      target.pathname = `/${databaseName}`
      connection = new pg.Client({ connectionString: target.toString() })
      await connection.connect()
      for (const file of readdirSync('drizzle')
        .filter((name) => /^\d+.*\.sql$/.test(name))
        .sort())
        await sql().query(
          readFileSync(`drizzle/${file}`, 'utf8').replaceAll(
            '--> statement-breakpoint',
            '',
          ),
        )
      process.env.DATABASE_URL = target.toString()
      service = await import('./announcements.service.server')
      database = (await import('#/db')).db
      for (const identity of [hr, platform, first, second]) {
        await sql().query(
          'INSERT INTO "user" (id, name, email, username, roles) VALUES ($1, $2, $3, $1, $4)',
          [
            identity.id,
            identity.name,
            `${identity.id}@test.invalid`,
            identity.roles.join(','),
          ],
        )
        await sql().query(
          'INSERT INTO employee (user_id, username, full_name) VALUES ($1, $1, $2)',
          [identity.id, identity.name],
        )
      }
    }, 30000)
    afterAll(async () => {
      await database?.$client.end()
      await connection?.end()
      if (admin && created)
        await admin.query(`DROP DATABASE "${databaseName}" WITH (FORCE)`)
      await admin?.end()
      process.env.DATABASE_URL = originalUrl
    })
    beforeEach(async () => {
      await sql().query(
        'TRUNCATE notification, announcement_recipient, announcement',
      )
      await sql().query(
        'UPDATE "user" SET roles = $1, permission_overrides = $2::jsonb WHERE id = $3',
        ['hr_manager', '{"allow":[],"deny":[]}', hr.id],
      )
      await sql().query('UPDATE employee SET status = $1', ['active'])
    })
    it('denies anonymous access and ignores forged publisher roles', async () => {
      await expect(service.listAnnouncements(null, {})).rejects.toThrow()
      await expect(service.publishAnnouncement(null, input())).rejects.toThrow()
      await expect(
        service.publishAnnouncement({ ...first, roles: ['admin'] }, input()),
      ).rejects.toThrow()
      await expect(
        service.publishAnnouncement(actor('missing', ['admin']), input()),
      ).rejects.toThrow()
    })
    it('allows HR and administrators to publish, with current database grants authoritative', async () => {
      await service.publishAnnouncement(hr, input())
      await service.publishAnnouncement(platform, input())
      await sql().query('UPDATE "user" SET roles = $1 WHERE id = $2', [
        'employee',
        hr.id,
      ])
      await expect(service.publishAnnouncement(hr, input())).rejects.toThrow()
      expect(
        (await sql().query('SELECT count(*)::int AS count FROM announcement'))
          .rows[0].count,
      ).toBe(2)
    })
    it('honors permission denials and terminated employment', async () => {
      await sql().query(
        'UPDATE "user" SET permission_overrides = $1::jsonb WHERE id = $2',
        ['{"allow":[],"deny":["announcements.manage"]}', hr.id],
      )
      await expect(service.publishAnnouncement(hr, input())).rejects.toThrow()
      await sql().query('UPDATE employee SET status = $1 WHERE user_id = $2', [
        'inactive',
        first.id,
      ])
      await expect(service.listAnnouncements(first, {})).rejects.toThrow()
      await expect(
        service.getLoginAnnouncement(first, futureLogin),
      ).rejects.toThrow()
    })
    it('validates untrusted inputs before publishing or reading', async () => {
      for (const invalid of [
        { ...input(), title: ' ' },
        { ...input(), body: ' ' },
        { ...input(), showOnLogin: 'yes' },
        { ...input(), requestId: 'invalid' },
      ])
        await expect(service.publishAnnouncement(hr, invalid)).rejects.toThrow()
      await expect(
        service.listAnnouncements(first, { page: -1 }),
      ).rejects.toThrow()
      await expect(
        service.listAnnouncements(first, { sort: 'sql' }),
      ).rejects.toThrow()
      await expect(
        service.acknowledgeAnnouncement(first, {
          id: 'invalid',
          action: 'read',
        }),
      ).rejects.toThrow()
    })
    it('publishes and delivers exactly once under concurrent retries', async () => {
      const data = input()
      const results = await Promise.all([
        service.publishAnnouncement(hr, data),
        service.publishAnnouncement(hr, data),
      ])
      expect(results[0]).toEqual(results[1])
      expect(
        (await sql().query('SELECT count(*)::int AS count FROM announcement'))
          .rows[0].count,
      ).toBe(1)
      expect(
        (await sql().query('SELECT count(*)::int AS count FROM notification'))
          .rows[0].count,
      ).toBe(4)
      await expect(
        service.publishAnnouncement(hr, { ...data, title: 'სხვა სათაური' }),
      ).rejects.toThrow()
      expect(await service.getLoginAnnouncement(first, futureLogin)).toBeNull()
    })
    it('waits for the next login and never sends modal announcements to the bell', async () => {
      const result = await service.publishAnnouncement(hr, input(true))
      expect(
        (await sql().query('SELECT count(*)::int AS count FROM notification'))
          .rows[0].count,
      ).toBe(0)
      expect(await service.getLoginAnnouncement(first, new Date(0))).toBeNull()
      expect(
        await service.getLoginAnnouncement(first, futureLogin),
      ).toMatchObject({ id: result.id })
    })
    it('persists dismissal without claiming reading and scopes it to the current recipient', async () => {
      const result = await service.publishAnnouncement(hr, input(true))
      await service.acknowledgeAnnouncement(first, {
        id: result.id,
        action: 'dismiss',
        userId: second.id,
      })
      expect(await service.getLoginAnnouncement(first, futureLogin)).toBeNull()
      expect(
        await service.getLoginAnnouncement(second, futureLogin),
      ).toMatchObject({ id: result.id })
      expect(
        await service.getAnnouncement(first, { id: result.id }),
      ).toMatchObject({ id: result.id, readAt: null })
      expect(
        (await service.listAnnouncements(first, { status: 'unread' })).total,
      ).toBe(1)
    })
    it('keeps reading sticky across concurrent dismissals and clears only the matching inbox alert', async () => {
      const result = await service.publishAnnouncement(hr, input())
      await Promise.all([
        service.acknowledgeAnnouncement(first, {
          id: result.id,
          action: 'read',
        }),
        service.acknowledgeAnnouncement(first, {
          id: result.id,
          action: 'dismiss',
        }),
      ])
      expect(
        await service.getAnnouncement(first, { id: result.id }),
      ).toMatchObject({ readAt: expect.any(String) })
      const notifications = await sql().query(
        'SELECT recipient_id, seen_at FROM notification WHERE announcement_id = $1',
        [result.id],
      )
      expect(
        notifications.rows.find((row) => row.recipient_id === first.id).seen_at,
      ).not.toBeNull()
      expect(
        notifications.rows.find((row) => row.recipient_id === second.id)
          .seen_at,
      ).toBeNull()
      expect(
        (await service.listAnnouncements(first, { status: 'read' })).total,
      ).toBe(1)
    })
    it('allows voluntary historical reading without assigning old login popups to future employees', async () => {
      const result = await service.publishAnnouncement(hr, input(true))
      await sql().query(
        'DELETE FROM announcement_recipient WHERE user_id = $1',
        [second.id],
      )
      expect(await service.getLoginAnnouncement(second, futureLogin)).toBeNull()
      expect(
        await service.getAnnouncement(second, { id: result.id }),
      ).toMatchObject({ id: result.id })
      await service.acknowledgeAnnouncement(second, {
        id: result.id,
        action: 'read',
      })
      expect(
        (await service.listAnnouncements(second, { status: 'read' })).total,
      ).toBe(1)
    })
    it('bounds lists, sorts deterministically, and treats search wildcards as literal text', async () => {
      for (let index = 0; index < 21; index++)
        await service.publishAnnouncement(hr, {
          ...input(),
          title: index === 0 ? '100% სიახლე' : `განცხადება ${index}`,
        })
      expect((await service.listAnnouncements(first, {})).items).toHaveLength(
        20,
      )
      expect(
        (await service.listAnnouncements(first, { page: 2 })).items,
      ).toHaveLength(1)
      const found = await service.listAnnouncements(first, { q: '%' })
      expect(found.total).toBe(1)
      expect(found.items[0]).not.toHaveProperty('body')
      const oldest = await service.listAnnouncements(first, { sort: 'oldest' })
      expect(oldest.items[0].title).toBe('100% სიახლე')
    })
  },
)
