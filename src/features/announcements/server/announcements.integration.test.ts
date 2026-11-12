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
const currentLogin = new Date('2000-01-01T00:00:00Z')
const pendingModal = async (identity: Actor | null, loginAt: Date) =>
  (await service.getLoginAnnouncement(identity, loginAt)).item
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
    it('streams recipient-only unread state, suppresses publisher toasts, and preserves login display rules', async () => {
      const announcement = await service.publishAnnouncement(hr, input(true))
      expect(
        await service.announcementRealtimeState(first, announcement.id),
      ).toEqual({
        unreadCount: 1,
        published: {
          id: announcement.id,
          title: 'კომპანიის სიახლე',
          showOnLogin: true,
        },
      })
      expect(
        await service.announcementRealtimeState(hr, announcement.id),
      ).toEqual({ unreadCount: 0 })
      expect(await pendingModal(first, new Date('2000-01-01'))).toMatchObject({
        id: announcement.id,
      })
      await service.acknowledgeAnnouncement(first, {
        id: announcement.id,
        action: 'dismiss',
      })
      expect((await service.announcementRealtimeState(first)).unreadCount).toBe(
        1,
      )
      await service.acknowledgeAnnouncement(first, {
        id: announcement.id,
        action: 'read',
      })
      expect(
        await service.announcementRealtimeState(first, announcement.id),
      ).toEqual({ unreadCount: 0 })
      expect(
        (await service.announcementRealtimeState(second)).unreadCount,
      ).toBe(1)
      await sql().query(
        'DELETE FROM announcement_recipient WHERE user_id = $1',
        [second.id],
      )
      expect(
        await service.announcementRealtimeState(second, announcement.id),
      ).toEqual({ unreadCount: 0 })
      await sql().query('UPDATE employee SET status = $1 WHERE user_id = $2', [
        'inactive',
        first.id,
      ])
      await expect(service.announcementRealtimeState(first)).rejects.toThrow()
    })
    it('broadcasts publication only after commit and never broadcasts rollbacks or idempotent retries', async () => {
      const { subscribeRealtime, signalRealtime } =
        await import('#/lib/realtime/postgres-events.server')
      const signals: Array<{ subjectId?: string }> = []
      let ready!: () => void
      let delivered!: () => void
      const connected = new Promise<void>((resolve) => {
        ready = resolve
      })
      const received = new Promise<void>((resolve) => {
        delivered = resolve
      })
      const unsubscribe = subscribeRealtime({
        connected: () => ready(),
        signal: (value) => {
          if (value.topic !== 'announcements') return
          signals.push(value)
          delivered()
        },
      })
      try {
        await connected
        await expect(
          database!.transaction(async (tx) => {
            await signalRealtime(tx, {
              topic: 'announcements',
              subjectId: randomUUID(),
            })
            throw new Error('rollback')
          }),
        ).rejects.toThrow('rollback')
        const data = input()
        const publication = await service.publishAnnouncement(hr, data)
        await received
        expect(signals).toEqual([
          { topic: 'announcements', subjectId: publication.id },
        ])
        expect(await service.publishAnnouncement(hr, data)).toEqual(publication)
        // A later committed signal acts as a delivery barrier for the duplicate publication.
        let barrier!: () => void
        const next = new Promise<void>((resolve) => {
          barrier = resolve
        })
        const stopBarrier = subscribeRealtime({
          connected: () => {},
          signal: (value) => {
            if (
              value.topic === 'announcements' &&
              value.recipientId === first.id
            )
              barrier()
          },
        })
        try {
          await service.acknowledgeAnnouncement(first, {
            id: publication.id,
            action: 'read',
          })
          await next
          expect(signals.filter((value) => value.subjectId)).toHaveLength(1)
        } finally {
          stopBarrier()
        }
      } finally {
        unsubscribe()
      }
    }, 10000)
    it('shares one PostgreSQL listener and reconnects it after a connection loss', async () => {
      const { subscribeRealtime } =
        await import('#/lib/realtime/postgres-events.server')
      let connections = 0
      let ready!: () => void
      let recovered!: () => void
      const connected = new Promise<void>((resolve) => {
        ready = resolve
      })
      const reconnected = new Promise<void>((resolve) => {
        recovered = resolve
      })
      const firstStop = subscribeRealtime({
        signal: () => {},
        connected: () => {
          connections++
          if (connections === 1) ready()
          else recovered()
        },
      })
      const secondStop = subscribeRealtime({
        signal: () => {},
        connected: () => {},
      })
      try {
        await connected
        const listeners = await sql().query(
          "SELECT pid FROM pg_stat_activity WHERE datname = current_database() AND application_name = 'teamwork_realtime'",
        )
        expect(listeners.rowCount).toBe(1)
        await sql().query('SELECT pg_terminate_backend($1)', [
          listeners.rows[0].pid,
        ])
        await reconnected
        expect(connections).toBe(2)
        expect(
          (
            await sql().query(
              "SELECT count(*)::int AS value FROM pg_stat_activity WHERE datname = current_database() AND application_name = 'teamwork_realtime'",
            )
          ).rows[0].value,
        ).toBe(1)
      } finally {
        firstStop()
        secondStop()
      }
    }, 10000)
    it('keeps author publications visible and read without self delivery, including legacy deliveries', async () => {
      const modal = await service.publishAnnouncement(hr, input(true))
      const bell = await service.publishAnnouncement(hr, input(false))
      expect((await service.listAnnouncements(hr, {})).total).toBe(2)
      expect(
        (await service.listAnnouncements(hr, { status: 'read' })).total,
      ).toBe(2)
      expect(
        (await service.listAnnouncements(hr, { status: 'unread' })).total,
      ).toBe(0)
      expect(
        (await service.getAnnouncement(hr, { id: modal.id })).readAt,
      ).not.toBeNull()
      expect(
        (
          await sql().query(
            'SELECT count(*)::int AS count FROM announcement_recipient WHERE user_id = $1',
            [hr.id],
          )
        ).rows[0].count,
      ).toBe(0)
      // Previously delivered rows remain stored but no longer drive creator notifications.
      await sql().query(
        'INSERT INTO announcement_recipient (announcement_id, user_id) VALUES ($1, $2)',
        [modal.id, hr.id],
      )
      await sql().query(
        'INSERT INTO notification (recipient_id, title, body, announcement_id) VALUES ($1, $2, $3, $4)',
        [hr.id, 'სიახლე', 'ტექსტი', bell.id],
      )
      expect(await pendingModal(hr, currentLogin)).toBeNull()
      expect(await service.announcementRealtimeState(hr, modal.id)).toEqual({
        unreadCount: 0,
      })
      const { listOwnNotifications } =
        await import('#/features/notifications/server/notifications.service.server')
      expect(
        await listOwnNotifications(hr, { limit: 5, offset: 0 }),
      ).toMatchObject({
        items: [],
        unseenCount: 0,
      })
      expect(
        (await listOwnNotifications(first, { limit: 5, offset: 0 })).items,
      ).toHaveLength(1)
      expect((await pendingModal(first, currentLogin))?.id).toBe(modal.id)
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
      const hrPublication = await service.publishAnnouncement(hr, input())
      const adminPublication = await service.publishAnnouncement(
        platform,
        input(),
      )
      await sql().query('UPDATE "user" SET name = $1 WHERE id = $2', [
        'გამომქვეყნებელი',
        hr.id,
      ])
      const listed = await service.listAnnouncements(first, {})
      expect(
        listed.items.find((item) => item.id === hrPublication.id)?.authorName,
      ).toBe('გამომქვეყნებელი')
      expect(
        listed.items.find((item) => item.id === adminPublication.id)
          ?.authorName,
      ).toBe(platform.name)
      await sql().query('UPDATE "user" SET name = $1 WHERE id = $2', [
        hr.name,
        hr.id,
      ])
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
      await expect(pendingModal(first, currentLogin)).rejects.toThrow()
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
      ).toBe(3)
      await expect(
        service.publishAnnouncement(hr, { ...data, title: 'სხვა სათაური' }),
      ).rejects.toThrow()
      expect(await pendingModal(first, currentLogin)).toBeNull()
    })
    it('queues live and signed-out announcements oldest first and reminds dismissed items only after another sign-in', async () => {
      const firstPublication = await service.publishAnnouncement(hr, {
        ...input(true),
        title: 'პირველი',
      })
      const secondPublication = await service.publishAnnouncement(hr, {
        ...input(true),
        title: 'მეორე',
      })
      let queue = await service.getLoginAnnouncement(first, currentLogin)
      expect(queue).toMatchObject({
        item: { id: firstPublication.id },
        remaining: 2,
      })
      const thirdPublication = await service.publishAnnouncement(hr, {
        ...input(true),
        title: 'მესამე',
      })
      queue = await service.getLoginAnnouncement(first, currentLogin)
      expect(queue).toMatchObject({
        item: { id: firstPublication.id },
        remaining: 3,
      })
      await service.acknowledgeAnnouncement(first, {
        id: firstPublication.id,
        action: 'dismiss',
      })
      expect(
        await service.getLoginAnnouncement(first, currentLogin),
      ).toMatchObject({ item: { id: secondPublication.id }, remaining: 2 })
      await service.acknowledgeAnnouncement(first, {
        id: secondPublication.id,
        action: 'read',
      })
      expect(
        await service.getLoginAnnouncement(first, currentLogin),
      ).toMatchObject({ item: { id: thirdPublication.id }, remaining: 1 })
      await service.acknowledgeAnnouncement(first, {
        id: thirdPublication.id,
        action: 'dismiss',
      })
      expect(await service.getLoginAnnouncement(first, currentLogin)).toEqual({
        item: null,
        remaining: 0,
      })
      const nextLogin = new Date('2100-01-01')
      expect(
        await service.getLoginAnnouncement(first, nextLogin),
      ).toMatchObject({ item: { id: firstPublication.id }, remaining: 2 })
      // A later close must replace the old dismissal, rather than permanently preserving it.
      await sql().query(
        'UPDATE announcement_recipient SET dismissed_at = $1 WHERE announcement_id = $2 AND user_id = $3',
        [new Date('1999-01-01'), firstPublication.id, first.id],
      )
      await service.acknowledgeAnnouncement(first, {
        id: firstPublication.id,
        action: 'dismiss',
      })
      expect(await pendingModal(first, currentLogin)).toBeNull()
      expect(
        (await service.getLoginAnnouncement(second, currentLogin)).remaining,
      ).toBe(3)
      expect(
        (await service.getLoginAnnouncement(hr, currentLogin)).remaining,
      ).toBe(0)
    })
    it('shows modal announcements during an existing session without bell duplication', async () => {
      const result = await service.publishAnnouncement(hr, input(true))
      expect(
        (await sql().query('SELECT count(*)::int AS count FROM notification'))
          .rows[0].count,
      ).toBe(0)
      expect(await pendingModal(first, new Date(0))).toMatchObject({
        id: result.id,
      })
      expect(await pendingModal(first, currentLogin)).toMatchObject({
        id: result.id,
      })
    })
    it('persists dismissal without claiming reading and scopes it to the current recipient', async () => {
      const result = await service.publishAnnouncement(hr, input(true))
      await service.acknowledgeAnnouncement(first, {
        id: result.id,
        action: 'dismiss',
        userId: second.id,
      })
      expect(await pendingModal(first, currentLogin)).toBeNull()
      expect(await pendingModal(second, currentLogin)).toMatchObject({
        id: result.id,
      })
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
      expect(await pendingModal(second, currentLogin)).toBeNull()
      expect(
        await service.getAnnouncement(second, { id: result.id }),
      ).toMatchObject({ id: result.id, isRecipient: false })
      await service.acknowledgeAnnouncement(second, {
        id: result.id,
        action: 'dismiss',
      })
      expect(await pendingModal(second, new Date('2100-01-01'))).toBeNull()
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
