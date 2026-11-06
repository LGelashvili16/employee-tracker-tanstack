import { sql } from 'drizzle-orm'
import {
  check,
  date,
  doublePrecision,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { user } from '../auth/auth.schema'
import { createdAt, timestamps, uuidv7PrimaryKey } from '../_shared/columns'
import type { JobKind, JobStatus } from '#/features/jobs/jobs.types'

/** One company-visible installation, measurement or other job, optionally placed on the map. Closed jobs retain their immutable event history. */
export const job = pgTable(
  'job',
  {
    /** PostgreSQL 18-generated UUIDv7, also used in deep links. */
    id: uuidv7PrimaryKey(),
    /** Client-generated idempotency key; retries of a create do not create a second pin. */
    requestId: uuid('request_id').notNull(),
    /** Short operational title, 3 to 160 characters. */
    title: text('title').notNull(),
    /** Instructions visible to company users; empty when no instructions were provided. */
    notes: text('notes').notNull().default(''),
    /** Optional human-readable address; empty when coordinates alone identify the site. */
    address: text('address').notNull().default(''),
    /** Georgian name of the nearby street from the geocoder; null when unavailable, never a guessed translation. */
    streetNameKa: text('street_name_ka'),
    /** English name of the same street from the geocoder; null when the source has no English name. */
    streetNameEn: text('street_name_en'),
    /** Provider's Georgian location label, separate from the user's editable site address. */
    locationLabelKa: text('location_label_ka'),
    /** Provider's English location label, retained for bilingual job search. */
    locationLabelEn: text('location_label_en'),
    /** UTC lookup instant; null for older pins and failed lookups. Changing coordinates clears stale names. */
    locationResolvedAt: timestamp('location_resolved_at', {
      withTimezone: true,
    }),
    /** Stable work category: installation, measurement or other. */
    kind: text('kind').$type<JobKind>().notNull(),
    /** Optional deadline as a calendar day, never a timezone-shifted instant. */
    deadline: date('deadline', { mode: 'string' }),
    /** Persisted workflow: pending, en_route, on_site, completed, or rejected. */
    status: text('status').$type<JobStatus>().notNull().default('pending'),
    /** WGS84 longitude in degrees; null together with latitude when the exact site is unknown. */
    longitude: doublePrecision('longitude'),
    /** WGS84 latitude in degrees; a supplied coordinate pair must identify a site in Georgia. */
    latitude: doublePrecision('latitude'),
    /** Creating account; retained identity cannot be deleted while referenced. */
    createdBy: text('created_by')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    /** Account that claimed the job; null until departure or after manager reopening. */
    assigneeId: text('assignee_id').references(() => user.id, {
      onDelete: 'restrict',
    }),
    /** Monotonically increasing revision prevents a stale editor overwriting another user's change. */
    version: integer('version').notNull().default(1),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex('job_creation_request').on(table.createdBy, table.requestId),
    index('job_created_order').on(table.createdAt, table.id),
    index('job_status_order').on(table.status, table.createdAt, table.id),
    index('job_assignee_order').on(table.assigneeId, table.createdAt, table.id),
    check(
      'job_kind_valid',
      sql`${table.kind} in ('installation', 'measurement', 'other')`,
    ),
    check(
      'job_status_valid',
      sql`${table.status} in ('pending', 'en_route', 'on_site', 'completed', 'rejected')`,
    ),
    check(
      'job_coordinates_valid',
      sql`(${table.longitude} is null and ${table.latitude} is null) or (${table.longitude} is not null and ${table.latitude} is not null and ${table.longitude} between -180 and 180 and ${table.latitude} between -85 and 85)`,
    ),
    check(
      'job_text_valid',
      sql`char_length(trim(${table.title})) between 3 and 160 and char_length(${table.notes}) <= 4000 and char_length(${table.address}) <= 300`,
    ),
    check('job_version_valid', sql`${table.version} > 0`),
    check(
      'job_deadline_valid',
      sql`${table.deadline} is null or ${table.deadline} between date '1900-01-01' and date '2100-12-31'`,
    ),
    check(
      'job_location_labels_valid',
      sql`char_length(${table.streetNameKa}) <= 300 and char_length(${table.streetNameEn}) <= 300 and char_length(${table.locationLabelKa}) <= 300 and char_length(${table.locationLabelEn}) <= 300`,
    ),
    check(
      'job_assignment_valid',
      sql`(${table.status} = 'pending' and ${table.assigneeId} is null) or (${table.status} in ('en_route', 'on_site', 'completed') and ${table.assigneeId} is not null) or ${table.status} = 'rejected'`,
    ),
  ],
)

/** One immutable job creation, edit, or status event; written in the same transaction as its job. */
export const jobEvent = pgTable(
  'job_event',
  {
    /** PostgreSQL-generated time-ordered event identifier. */
    id: uuidv7PrimaryKey(),
    /** Owning job; deletion is restricted to preserve history. */
    jobId: uuid('job_id')
      .notNull()
      .references(() => job.id, { onDelete: 'restrict' }),
    /** Server-derived actor whose action produced the event. */
    actorId: text('actor_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    /** Stable action: created, edited, or status_changed. */
    action: text('action').notNull(),
    /** Status after this event. */
    status: text('status').$type<JobStatus>().notNull(),
    /** User's progress note or rejection/reopening reason; empty for ordinary creation/edit. */
    note: text('note').notNull().default(''),
    /** Database-time UTC instant of the event. */
    createdAt: createdAt(),
  },
  (table) => [
    index('job_event_history').on(table.jobId, table.createdAt, table.id),
    index('job_event_actor').on(table.actorId),
    check(
      'job_event_action_valid',
      sql`${table.action} in ('created', 'edited', 'status_changed')`,
    ),
    check(
      'job_event_status_valid',
      sql`${table.status} in ('pending', 'en_route', 'on_site', 'completed', 'rejected')`,
    ),
    check(
      'job_event_note_valid',
      sql`char_length(${table.note}) <= 2000 and (${table.action} <> 'status_changed' or ${table.status} not in ('rejected', 'pending') or char_length(trim(${table.note})) >= 5)`,
    ),
  ],
)
