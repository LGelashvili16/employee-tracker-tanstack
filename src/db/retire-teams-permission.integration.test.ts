// @vitest-environment node
import 'dotenv/config'
import { readFileSync } from 'node:fs'
import pg from 'pg'
import { expect, it } from 'vitest'

it.runIf(process.env.RUN_ACCOUNT_DB_TESTS === '1')(
  'retires team permission overrides while preserving other grants and denials',
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
      // The temporary relation shadows the real auth table for this transaction only.
      await client.query(
        'CREATE TEMP TABLE "user" (id integer, permission_overrides jsonb) ON COMMIT DROP',
      )
      const values = [
        { allow: ['teams.manage', 'jobs.manage'], deny: ['users.manage'] },
        { allow: [], deny: ['teams.manage', 'attendance.read.all'] },
        { allow: ['jobs.claim'], deny: [] },
        { allow: [], deny: [] },
      ]
      for (const [id, value] of values.entries())
        await client.query('INSERT INTO "user" VALUES ($1, $2::jsonb)', [
          id,
          JSON.stringify(value),
        ])
      const migration = readFileSync(
        'drizzle/0017_retire_teams_permission.sql',
        'utf8',
      )
      await client.query(migration)
      await client.query(migration)
      const result = await client.query(
        'SELECT permission_overrides FROM "user" ORDER BY id',
      )
      expect(result.rows.map((row) => row.permission_overrides)).toEqual([
        { allow: ['jobs.manage'], deny: ['users.manage'] },
        { allow: [], deny: ['attendance.read.all'] },
        values[2],
        values[3],
      ])
    } finally {
      await client.query('ROLLBACK')
      await client.end()
    }
  },
)
