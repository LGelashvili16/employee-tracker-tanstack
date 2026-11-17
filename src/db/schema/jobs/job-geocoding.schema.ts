import { index, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { updatedAt } from '../_shared/columns'
import type { LocationFeature } from '#/features/jobs/job-locations.types'

/** Reusable public address results for job-map searches and pin lookups; raw queries and private job content are not stored here. */
export const jobGeocodingCache = pgTable(
  'job_geocoding_cache',
  {
    /** SHA-256 of provider, request, language and format revision; also prevents oversized keys. */
    key: text('key').primaryKey(),
    /** Minimal provider features validated before writing and again when reading. */
    features: jsonb('features').$type<Array<LocationFeature>>().notNull(),
    /** UTC expiry; expired entries may be reused only after a successful refresh. */
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    /** Last cache refresh instant. */
    updatedAt: updatedAt(),
  },
  (table) => [index('job_geocoding_cache_expiry').on(table.expiresAt)],
)

/** One shared request schedule per configured provider, so multiple app processes respect the same outbound limit. */
export const jobGeocodingGate = pgTable('job_geocoding_gate', {
  /** SHA-256 of the configured geocoder origin. */
  provider: text('provider').primaryKey(),
  /** UTC instant of the next reservable provider request; reservations are spaced 1.1 seconds apart. */
  nextRequestAt: timestamp('next_request_at', { withTimezone: true }).notNull(),
})
