// @vitest-environment node
import 'dotenv/config'
import { randomBytes } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import pg from 'pg'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type * as Service from './notifications.service.server'
import type { db as Database } from '#/db'
import type { Actor } from '#/lib/authorization/actor'

vi.mock('@tanstack/react-start/server-only', () => ({}))
const enabled = process.env.RUN_NOTIFICATIONS_DB_TESTS === '1'
const originalUrl = process.env.DATABASE_URL
const databaseName = `teamwork_notifications_test_${randomBytes(8).toString('hex')}`
let admin: pg.Client | undefined
let connection: pg.Client | undefined
let database: typeof Database | undefined
let service: typeof Service
let created = false
let ownId: string
let foreignId: string
const actor: Actor = {
  id: 'inbox-a',
  name: 'ანა',
  email: null,
  emailVerified: false,
  roles: ['employee'],
}
function sql() {
  if (!connection) throw new Error('Isolated database is unavailable')
  return connection
}

describe.runIf(enabled)('notification inbox against PostgreSQL', () => {
  beforeAll(async () => {
    if (!originalUrl)
      throw new Error('Local PostgreSQL configuration is required')
    const target = new URL(originalUrl)
    if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname))
      throw new Error('Tests require local PostgreSQL')
    admin = new pg.Client({
      connectionString: originalUrl,
      connectionTimeoutMillis: 3000,
    })
    await admin.connect()
    await admin.query(`CREATE DATABASE "${databaseName}"`)
    created = true
    target.pathname = `/${databaseName}`
    connection = new pg.Client({ connectionString: target.toString() })
    await connection.connect()
    for (const file of readdirSync('drizzle')
      .filter((value) => /^\d+.*\.sql$/.test(value))
      .sort()) {
      await sql().query(
        readFileSync(`drizzle/${file}`, 'utf8').replaceAll(
          '--> statement-breakpoint',
          '',
        ),
      )
    }
    // Migration defaults require the same PostgreSQL 18 UUIDv7 support as production.
    expect((await sql().query('select uuidv7() as id')).rows[0].id).toMatch(
      /^[0-9a-f-]{36}$/,
    )
    process.env.DATABASE_URL = target.toString()
    service = await import('./notifications.service.server')
    database = (await import('#/db')).db
    await sql().query(
      `INSERT INTO "user" (id, name, email) VALUES ('inbox-a', 'ანა', 'a@inbox.invalid'), ('inbox-b', 'ბექა', 'b@inbox.invalid')`,
    )
    const result = await sql().query(
      `INSERT INTO notification (recipient_id, title, body) VALUES ('inbox-a', 'განახლება', 'პირველი შეტყობინება'), ('inbox-b', 'პირადი', 'სხვა ანგარიშის შეტყობინება') RETURNING id, recipient_id`,
    )
    ownId = result.rows.find(
      (row: { recipient_id: string }) => row.recipient_id === actor.id,
    ).id
    foreignId = result.rows.find(
      (row: { recipient_id: string }) => row.recipient_id !== actor.id,
    ).id
  }, 30000)
  afterAll(async () => {
    await database?.$client.end()
    await connection?.end()
    process.env.DATABASE_URL = originalUrl
    if (admin) {
      if (created)
        await admin.query(`DROP DATABASE "${databaseName}" WITH (FORCE)`)
      await admin.end()
    }
  })

  it('rejects direct unauthenticated reads and writes', async () => {
    await expect(
      service.listOwnNotifications(null, { limit: 5, offset: 0 }),
    ).rejects.toThrow()
    await expect(
      service.markOwnNotificationsSeen(null, { ids: [ownId] }),
    ).rejects.toThrow()
  })
  it('validates direct service input before persistence', async () => {
    await expect(
      service.listOwnNotifications(actor, { limit: 500, offset: -1 }),
    ).rejects.toThrow()
    await expect(
      service.markOwnNotificationsSeen(actor, { ids: ['invalid'] }),
    ).rejects.toThrow()
  })
  it('returns only the current inbox and a minimal serialized projection', async () => {
    const result = await service.listOwnNotifications(actor, {
      limit: 5,
      offset: 0,
    })
    expect(result).toEqual({
      unseenCount: 1,
      hasMore: false,
      items: [
        {
          id: ownId,
          title: 'განახლება',
          body: 'პირველი შეტყობინება',
          announcementId: null,
          complaintId: null,
          createdAt: expect.any(String),
          seenAt: null,
        },
      ],
    })
  })
  it('ignores foreign IDs and preserves the first acknowledgement across concurrent requests', async () => {
    const results = await Promise.all([
      service.markOwnNotificationsSeen(actor, { ids: [ownId, foreignId] }),
      service.markOwnNotificationsSeen(actor, { ids: [ownId, foreignId] }),
    ])
    expect(
      results.reduce((total, result) => total + result.updatedCount, 0),
    ).toBe(1)
    const before = await service.listOwnNotifications(actor, {
      limit: 5,
      offset: 0,
    })
    expect(before.unseenCount).toBe(0)
    expect(before.items[0].seenAt).not.toBeNull()
    await service.markOwnNotificationsSeen(actor, { ids: [ownId] })
    expect(
      (await service.listOwnNotifications(actor, { limit: 5, offset: 0 }))
        .items[0].seenAt,
    ).toBe(before.items[0].seenAt)
    const foreign = await service.listOwnNotifications(
      { ...actor, id: 'inbox-b' },
      { limit: 5, offset: 0 },
    )
    expect(foreign.unseenCount).toBe(1)
    expect(foreign.items[0].seenAt).toBeNull()
  })
  it('restores unseen status only in the recipients own inbox', async () => {
    await expect(
      service.markOwnNotificationsUnseen(null, { ids: [ownId] }),
    ).rejects.toThrow()
    await expect(
      service.markOwnNotificationsUnseen(actor, { ids: ['invalid'] }),
    ).rejects.toThrow()
    await service.markOwnNotificationsSeen(
      { ...actor, id: 'inbox-b' },
      { ids: [foreignId] },
    )
    expect(
      await service.markOwnNotificationsUnseen(actor, {
        ids: [ownId, foreignId],
      }),
    ).toEqual({ updatedCount: 1 })
    expect(
      (await service.listOwnNotifications(actor, { limit: 5, offset: 0 }))
        .unseenCount,
    ).toBe(1)
    expect(
      (
        await service.listOwnNotifications(
          { ...actor, id: 'inbox-b' },
          { limit: 5, offset: 0 },
        )
      ).unseenCount,
    ).toBe(0)
    expect(
      await service.markOwnNotificationsUnseen(actor, { ids: [ownId] }),
    ).toEqual({ updatedCount: 0 })
  })
  it('bounds results and orders tied timestamps deterministically', async () => {
    await sql().query(
      `INSERT INTO notification (recipient_id, title, body, created_at) SELECT 'inbox-a', 'ახალი', 'განახლება', '2027-01-01T00:00:00Z' FROM generate_series(1, 6)`,
    )
    const first = await service.listOwnNotifications(actor, {
      limit: 5,
      offset: 0,
    })
    const next = await service.listOwnNotifications(actor, {
      limit: 5,
      offset: 5,
    })
    expect(first.items).toHaveLength(5)
    expect(first.hasMore).toBe(true)
    expect(next.items).toHaveLength(2)
    expect(next.hasMore).toBe(false)
    expect(
      new Set([...first.items, ...next.items].map((item) => item.id)).size,
    ).toBe(7)
  })
})
