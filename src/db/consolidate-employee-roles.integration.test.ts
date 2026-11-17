// @vitest-environment node
import 'dotenv/config'
import { readFileSync } from 'node:fs'
import pg from 'pg'
import { expect, it } from 'vitest'
import {
  currentAuthorization,
  hasPermission,
  permissionSchema,
} from '#/lib/authorization/permissions'

it.runIf(process.env.RUN_ACCOUNT_DB_TESTS === '1')(
  'retires legacy roles without adding review rights, losing denials, or changing unrelated accounts',
  async () => {
    const connectionString = process.env.DATABASE_URL
    if (
      !connectionString ||
      !['localhost', '127.0.0.1', '[::1]'].includes(
        new URL(connectionString).hostname,
      )
    )
      throw new Error('Migration verification requires local PostgreSQL')
    const client = new pg.Client({ connectionString })
    await client.connect()
    try {
      await client.query('BEGIN')
      await client.query(
        'CREATE TEMP TABLE "user" (id text, roles text, permission_overrides jsonb, updated_at timestamptz) ON COMMIT DROP',
      )
      await client.query(
        'CREATE TEMP TABLE session (user_id text) ON COMMIT DROP',
      )
      await client.query(
        'CREATE TEMP TABLE access_audit (actor_id text, target_id text, action text, reason text) ON COMMIT DROP',
      )
      const values = [
        ['sales', 'sales_manager', { allow: [], deny: ['jobs.manage'] }],
        [
          'operations',
          'operations_manager',
          { allow: ['jobs.claim'], deny: [] },
        ],
        [
          'combined',
          'admin, sales_manager,operations_manager',
          { allow: [], deny: ['jobs.manage'] },
        ],
        ['invalid', 'operations_manager', { allow: 'invalid', deny: [] }],
        ['untouched', 'hr_manager', { allow: [], deny: [] }],
      ] as const
      for (const [id, roles, overrides] of values) {
        await client.query(
          'INSERT INTO "user" VALUES ($1, $2, $3::jsonb, now())',
          [id, roles, JSON.stringify(overrides)],
        )
        await client.query('INSERT INTO session VALUES ($1)', [id])
      }
      const migration = readFileSync(
        'drizzle/0026_consolidate_employee_roles.sql',
        'utf8',
      )
      await client.query(migration)
      await client.query(migration)
      const result = await client.query<{
        id: string
        roles: string
        permission_overrides: unknown
      }>('SELECT * FROM "user" ORDER BY id')
      for (const record of result.rows) {
        const auth = currentAuthorization({
          roles: record.roles,
          permissionOverrides: record.permission_overrides,
        })
        if (record.id === 'untouched') {
          expect(record.roles).toBe('hr_manager')
          continue
        }
        expect(record.roles).toBe(
          record.id === 'combined'
            ? 'admin,sales_manager'
            : record.id === 'sales'
              ? 'sales_manager'
              : 'employee',
        )
        expect(hasPermission(auth, 'attendance.review.team')).toBe(false)
        expect(hasPermission(auth, 'timesheets.review.team')).toBe(false)
        if (record.id === 'invalid') {
          for (const permission of permissionSchema.options)
            expect(hasPermission(auth, permission)).toBe(false)
        }
        if (record.id === 'sales') {
          expect(hasPermission(auth, 'manage.access')).toBe(true)
          expect(hasPermission(auth, 'jobs.manage')).toBe(false)
        }
        if (record.id === 'operations') {
          for (const permission of [
            'manage.access',
            'attendance.read.team',
            'schedule.manage',
            'jobs.manage',
            'employees.read',
            'reports.read',
            'jobs.claim',
          ] as const)
            expect(hasPermission(auth, permission)).toBe(true)
          expect(hasPermission(auth, 'admin.access')).toBe(false)
        }
        if (record.id === 'combined')
          expect(hasPermission(auth, 'jobs.manage')).toBe(false)
      }
      expect(
        (await client.query('SELECT user_id FROM session ORDER BY user_id'))
          .rows,
      ).toEqual([{ user_id: 'sales' }, { user_id: 'untouched' }])
      expect(
        (await client.query('SELECT count(*)::int AS count FROM access_audit'))
          .rows,
      ).toEqual([{ count: 3 }])
    } finally {
      await client.query('ROLLBACK')
      await client.end()
    }
  },
)
