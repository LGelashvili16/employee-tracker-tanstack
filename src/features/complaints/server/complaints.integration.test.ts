// @vitest-environment node
import 'dotenv/config'
import { randomBytes, randomUUID } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
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
import type { Actor } from '#/lib/authorization/actor'
import type * as Service from './complaints.service.server'
import type { db as Database } from '#/db'

vi.mock('@tanstack/react-start/server-only', () => ({}))
const originalUrl = process.env.DATABASE_URL
const databaseName = `teamwork_complaints_test_${randomBytes(8).toString('hex')}`
let admin: pg.Client | undefined
let connection: pg.Client | undefined
let database: typeof Database | undefined
let service: typeof Service
let created = false
const employee: Actor = {
  id: 'complaint-worker',
  name: 'ანა',
  email: null,
  emailVerified: false,
  roles: ['employee'],
}
const hr: Actor = { ...employee, id: 'complaint-hr', roles: ['hr_manager'] }
const supervisor: Actor = {
  ...employee,
  id: 'complaint-supervisor',
  roles: ['supervisor'],
}
const other: Actor = { ...employee, id: 'complaint-other' }
const owner: Actor = { ...employee, id: 'complaint-owner', roles: ['owner'] }
const platformAdmin: Actor = {
  ...employee,
  id: 'complaint-admin',
  roles: ['admin'],
}
const input = () => ({
  submissionId: randomUUID(),
  title: 'სამუშაო პირობები',
  description: 'სატესტო საჩივრის აღწერა',
  category: 'conditions',
})
function sql() {
  if (!connection) throw new Error('Isolated database unavailable')
  return connection
}
describe.runIf(process.env.RUN_COMPLAINTS_DB_TESTS === '1')(
  'complaints against isolated PostgreSQL',
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
      await admin.query(`CREATE DATABASE "${databaseName}"`)
      created = true
      target.pathname = `/${databaseName}`
      connection = new pg.Client({ connectionString: target.toString() })
      await connection.connect()
      for (const file of readdirSync('drizzle')
        .filter((value) => /^\d+.*\.sql$/.test(value))
        .sort())
        await sql().query(readFileSync(`drizzle/${file}`, 'utf8'))
      process.env.DATABASE_URL = target.toString()
      service = await import('./complaints.service.server')
      database = (await import('#/db')).db
      for (const actor of [
        employee,
        hr,
        supervisor,
        other,
        owner,
        platformAdmin,
      ]) {
        await sql().query(
          'INSERT INTO "user" (id,name,email,roles,access_state) VALUES ($1,$2,$3,$4,\'active\')',
          [
            actor.id,
            actor.name,
            `${actor.id}@complaints.invalid`,
            actor.roles.join(','),
          ],
        )
        await sql().query(
          'INSERT INTO employee (username,user_id,full_name) VALUES ($1,$1,$2)',
          [actor.id, actor.name],
        )
      }
    }, 30000)
    beforeEach(async () => {
      await sql().query(
        `DELETE FROM notification; DELETE FROM complaint_activity; DELETE FROM complaint; UPDATE "user" SET access_state='active', permission_overrides='{"allow":[],"deny":[]}'; UPDATE employee SET status='active'`,
      )
    })
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
    it('creates once on concurrent retry and atomically delivers generic notifications', async () => {
      const submission = input()
      const results = await Promise.all([
        service.createComplaint(employee, submission),
        service.createComplaint(employee, submission),
      ])
      expect(results[0].id).toBe(results[1].id)
      await expect(
        service.createComplaint(employee, {
          ...submission,
          description: 'შეცვლილი აღწერა',
        }),
      ).rejects.toThrow()
      expect(
        (await service.listComplaints(employee, { review: false })).total,
      ).toBe(1)
      expect(
        (await sql().query('SELECT action FROM complaint_activity')).rows,
      ).toEqual([{ action: 'created' }])
      const notes = (
        await sql().query(
          'SELECT recipient_id,title,body FROM notification ORDER BY recipient_id',
        )
      ).rows
      expect(notes.map((row) => row.recipient_id)).toEqual([
        platformAdmin.id,
        hr.id,
        owner.id,
      ])
      expect(
        notes.every(
          (row) =>
            !row.body.includes(submission.description) &&
            !row.title.includes(submission.title),
        ),
      ).toBe(true)
    })
    it('isolates employee records, supervisor lists, confidential details and live projections', async () => {
      const { id } = await service.createComplaint(employee, input())
      // Retain coverage for confidential records created before visibility became server-owned.
      await sql().query(
        "UPDATE complaint SET visibility='hr_only' WHERE id=$1",
        [id],
      )
      expect(
        (await service.listComplaints(other, { review: false })).total,
      ).toBe(0)
      expect(
        (await service.listComplaints(supervisor, { review: true })).total,
      ).toBe(0)
      await expect(service.complaintDetail(other, { id })).rejects.toThrow()
      await expect(
        service.complaintDetail(supervisor, { id }),
      ).rejects.toThrow()
      await expect(
        service.complaintDetail(platformAdmin, { id }),
      ).rejects.toThrow()
      expect(await service.complaintRealtimeState(supervisor, id)).toBeNull()
      expect(await service.complaintRealtimeState(hr, id)).toMatchObject({
        changed: true,
        id,
        hasUnreadComplaints: true,
        notification: { id: expect.any(String), review: true },
      })
      await sql().query(
        `UPDATE "user" SET permission_overrides='{"allow":[],"deny":["manage.access"]}' WHERE id=$1`,
        [hr.id],
      )
      try {
        expect(await service.complaintRealtimeState(hr, id)).toMatchObject({
          notification: { review: false },
        })
      } finally {
        await sql().query(
          `UPDATE "user" SET permission_overrides='{"allow":[],"deny":[]}' WHERE id=$1`,
          [hr.id],
        )
      }
      expect((await service.complaintDetail(owner, { id })).visibility).toBe(
        'hr_only',
      )
      await expect(
        service.assignComplaint(hr, {
          id,
          revision: 0,
          assigneeId: supervisor.id,
          reason: 'მინიჭება',
        }),
      ).rejects.toThrow()
      expect((await service.complaintDetail(hr, { id })).revision).toBe(0)
    })
    it('persists unread management state and reconciles read/unread notifications without replaying alerts', async () => {
      const { id } = await service.createComplaint(employee, input())
      expect(await service.complaintRealtimeState(hr)).toEqual({
        changed: false,
        hasUnreadComplaints: true,
      })
      expect(await service.complaintRealtimeState(platformAdmin)).toEqual({
        changed: false,
        hasUnreadComplaints: true,
      })
      expect(await service.complaintRealtimeState(supervisor)).toEqual({
        changed: false,
        hasUnreadComplaints: false,
      })
      const inbox =
        await import('#/features/notifications/server/notifications.service.server')
      const own = await inbox.listOwnNotifications(hr, { limit: 5, offset: 0 })
      expect(own.items[0].complaintId).toBe(id)
      await inbox.markOwnNotificationsSeen(hr, { ids: [own.items[0].id] })
      expect(await service.complaintRealtimeState(hr)).toEqual({
        changed: false,
        hasUnreadComplaints: false,
      })
      expect(await service.complaintRealtimeState(hr, id)).not.toHaveProperty(
        'notification',
      )
      await inbox.markOwnNotificationsUnseen(hr, { ids: [own.items[0].id] })
      expect(await service.complaintRealtimeState(hr)).toEqual({
        changed: false,
        hasUnreadComplaints: true,
      })
      expect(await service.complaintRealtimeState(platformAdmin)).toEqual({
        changed: false,
        hasUnreadComplaints: true,
      })
    })
    it('excludes closed and resolved complaints from the management dot while retaining unread inbox history', async () => {
      const first = await service.createComplaint(employee, input())
      const second = await service.createComplaint(employee, input())
      const change = (id: string, revision: number, status: string) =>
        service.changeComplaintStatus(owner, {
          id,
          revision,
          status,
          reason: 'განხილვის შედეგი',
        })
      await change(first.id, 0, 'closed')
      expect(
        (await service.complaintRealtimeState(hr))?.hasUnreadComplaints,
      ).toBe(true)
      await change(second.id, 0, 'in_review')
      await change(second.id, 1, 'resolved')
      for (const reviewer of [hr, platformAdmin, owner]) {
        expect(
          (await service.complaintRealtimeState(reviewer))?.hasUnreadComplaints,
        ).toBe(false)
        expect(
          (await service.complaintRealtimeState(reviewer, first.id))
            ?.hasUnreadComplaints,
        ).toBe(false)
      }
      const inbox =
        await import('#/features/notifications/server/notifications.service.server')
      expect(
        (await inbox.listOwnNotifications(hr, { limit: 5, offset: 0 }))
          .unseenCount,
      ).toBeGreaterThan(0)
      await change(second.id, 2, 'in_review')
      expect(
        (await service.complaintRealtimeState(hr))?.hasUnreadComplaints,
      ).toBe(true)
    })
    it('acknowledges only the acting reviewers complaint alerts and restores unread state for new employee replies', async () => {
      const { id } = await service.createComplaint(employee, input())
      expect(
        (await service.complaintRealtimeState(hr))?.hasUnreadComplaints,
      ).toBe(true)
      await service.changeComplaintStatus(hr, {
        id,
        revision: 0,
        status: 'in_review',
        reason: 'განხილვის დაწყება',
      })
      expect(
        (await service.complaintRealtimeState(hr))?.hasUnreadComplaints,
      ).toBe(false)
      expect(
        (await service.complaintRealtimeState(platformAdmin))
          ?.hasUnreadComplaints,
      ).toBe(true)
      const inbox =
        await import('#/features/notifications/server/notifications.service.server')
      expect(
        (await inbox.listOwnNotifications(hr, { limit: 20, offset: 0 }))
          .unseenCount,
      ).toBe(0)
      await service.replyToComplaint(employee, {
        id,
        submissionId: randomUUID(),
        body: 'დამატებითი ინფორმაცია',
      })
      expect(
        (await service.complaintRealtimeState(hr))?.hasUnreadComplaints,
      ).toBe(true)
      await service.replyToComplaint(hr, {
        id,
        submissionId: randomUUID(),
        body: 'ინფორმაცია მიღებულია',
      })
      expect(
        (await service.complaintRealtimeState(hr))?.hasUnreadComplaints,
      ).toBe(false)
      expect(
        (await service.complaintRealtimeState(platformAdmin))
          ?.hasUnreadComplaints,
      ).toBe(true)
      await service.createComplaint(other, input())
      await service.changeComplaintStatus(hr, {
        id,
        revision: 3,
        status: 'resolved',
        reason: 'მოგვარებულია',
      })
      expect(
        (await service.complaintRealtimeState(hr))?.hasUnreadComplaints,
      ).toBe(true)
    })
    it('rolls back notification acknowledgement when review delivery fails', async () => {
      const { id } = await service.createComplaint(employee, input())
      await sql().query(
        `CREATE FUNCTION reject_review_delivery() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture failure'; END $$; CREATE TRIGGER fail_review_delivery BEFORE INSERT ON notification FOR EACH ROW EXECUTE FUNCTION reject_review_delivery()`,
      )
      try {
        await expect(
          service.changeComplaintStatus(hr, {
            id,
            revision: 0,
            status: 'in_review',
            reason: 'განხილვის დაწყება',
          }),
        ).rejects.toThrow()
      } finally {
        await sql().query(
          'DROP TRIGGER fail_review_delivery ON notification; DROP FUNCTION reject_review_delivery()',
        )
      }
      expect((await service.complaintDetail(hr, { id })).status).toBe('new')
      expect(
        (await service.complaintRealtimeState(hr))?.hasUnreadComplaints,
      ).toBe(true)
    })
    it('includes the complainant profile image in the scoped table projection', async () => {
      await sql().query('UPDATE "user" SET image=$1 WHERE id=$2', [
        '/complaint-test-avatar.png',
        employee.id,
      ])
      await service.createComplaint(employee, input())
      const own = await service.listComplaints(employee, { review: false })
      expect(own.items[0]).toMatchObject({
        requesterName: employee.name,
        requesterImage: '/complaint-test-avatar.png',
      })
      expect(
        (await service.listComplaints(hr, { review: true })).items[0]
          .requesterImage,
      ).toBe('/complaint-test-avatar.png')
      expect(
        (await service.listComplaints(other, { review: false })).items,
      ).toHaveLength(0)
    })
    it('publishes only an identifier wake-up after the complaint commits', async () => {
      const listener = new pg.Client({
        connectionString: process.env.DATABASE_URL,
      })
      await listener.connect()
      try {
        await listener.query('LISTEN teamwork_events')
        const signal = new Promise<unknown>((resolve, reject) => {
          const timer = setTimeout(
            () => reject(new Error('Complaint signal did not arrive')),
            3000,
          )
          listener.on('notification', (message) => {
            const payload = JSON.parse(message.payload ?? '{}')
            if (payload.topic !== 'complaints') return
            clearTimeout(timer)
            resolve(payload)
          })
        })
        const { id } = await service.createComplaint(employee, input())
        expect(await signal).toEqual({ topic: 'complaints', subjectId: id })
        expect(
          (
            await sql().query(
              'SELECT count(*)::int AS count FROM complaint WHERE id=$1',
              [id],
            )
          ).rows[0].count,
        ).toBe(1)
      } finally {
        await listener.end()
      }
    })
    it('allows explicit assignment, deduplicates replies, and removes reassigned supervisors', async () => {
      const { id } = await service.createComplaint(employee, input())
      await service.assignComplaint(hr, {
        id,
        revision: 0,
        assigneeId: supervisor.id,
        reason: 'განხილვის მინიჭება',
      })
      expect(
        (await service.listComplaints(supervisor, { review: true })).total,
      ).toBe(1)
      const reply = {
        id,
        submissionId: randomUUID(),
        body: 'დამატებითი ინფორმაცია',
      }
      await Promise.all([
        service.replyToComplaint(supervisor, reply),
        service.replyToComplaint(supervisor, reply),
      ])
      const detail = await service.complaintDetail(employee, { id })
      expect(
        detail.activity.items.filter((entry) => entry.action === 'reply'),
      ).toHaveLength(1)
      expect(detail.revision).toBe(2)
      await service.assignComplaint(hr, {
        id,
        revision: 2,
        assigneeId: hr.id,
        reason: 'HR აგრძელებს განხილვას',
      })
      expect(
        (await service.listComplaints(supervisor, { review: true })).total,
      ).toBe(0)
      await expect(
        service.complaintDetail(supervisor, { id }),
      ).rejects.toThrow()
    })
    it('serializes decisions, preserves history, and prevents self-review or stale writes', async () => {
      const { id } = await service.createComplaint(employee, input())
      const decision = {
        id,
        revision: 0,
        status: 'in_review',
        reason: 'განხილვის დაწყება',
      }
      const results = await Promise.allSettled([
        service.changeComplaintStatus(hr, decision),
        service.changeComplaintStatus(owner, decision),
      ])
      expect(
        results.filter((result) => result.status === 'fulfilled'),
      ).toHaveLength(1)
      expect((await service.complaintDetail(hr, { id })).revision).toBe(1)
      await expect(
        service.changeComplaintStatus(employee, {
          ...decision,
          revision: 1,
          status: 'resolved',
        }),
      ).rejects.toThrow()
      await service.changeComplaintStatus(hr, {
        ...decision,
        revision: 1,
        status: 'resolved',
      })
      await expect(
        service.replyToComplaint(employee, {
          id,
          submissionId: randomUUID(),
          body: 'პასუხი',
        }),
      ).rejects.toThrow()
      await service.changeComplaintStatus(hr, { ...decision, revision: 2 })
      expect(
        (await service.complaintDetail(employee, { id })).activity.total,
      ).toBe(4)
      const own = await service.createComplaint(hr, input())
      await expect(
        service.changeComplaintStatus(hr, { ...decision, id: own.id }),
      ).rejects.toThrow()
    })
    it('uses persisted permissions and employment rather than the supplied role projection', async () => {
      const { id } = await service.createComplaint(employee, input())
      await sql().query(
        'UPDATE "user" SET permission_overrides=$1 WHERE id=$2',
        [JSON.stringify({ allow: [], deny: ['complaints.review.all'] }), hr.id],
      )
      await expect(service.complaintDetail(hr, { id })).rejects.toThrow()
      await sql().query(
        "UPDATE employee SET status='inactive' WHERE user_id=$1",
        [employee.id],
      )
      await expect(service.createComplaint(employee, input())).rejects.toThrow()
    })
    it('rolls back complaint, audit and notification writes when delivery fails', async () => {
      await sql().query(
        `CREATE FUNCTION reject_complaint_notification() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture failure'; END $$; CREATE TRIGGER fail_complaint_notification BEFORE INSERT ON notification FOR EACH ROW EXECUTE FUNCTION reject_complaint_notification()`,
      )
      try {
        await expect(
          service.createComplaint(employee, input()),
        ).rejects.toThrow()
      } finally {
        await sql().query(
          'DROP TRIGGER fail_complaint_notification ON notification; DROP FUNCTION reject_complaint_notification()',
        )
      }
      expect(
        (await sql().query('SELECT count(*)::int AS count FROM complaint'))
          .rows[0].count,
      ).toBe(0)
      expect(
        (
          await sql().query(
            'SELECT count(*)::int AS count FROM complaint_activity',
          )
        ).rows[0].count,
      ).toBe(0)
    })
  },
)
