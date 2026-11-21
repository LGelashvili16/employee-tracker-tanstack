import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'

/** Website-managed JT808 tracker identity. Leading zeroes are preserved in the configured identifier. */
export const gpsDevice = pgTable(
  'gps_device',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    reportedId: text('reported_id').notNull(),
    canonicalId: text('canonical_id').generatedAlwaysAs(
      sql`ltrim("reported_id", '0')`,
    ),
    enabled: boolean('enabled').notNull().default(true),
    version: integer('version').notNull().default(1),
    /** Receipt time of the newest authenticated, supported packet. */
    lastContactAt: timestamp('last_contact_at', { withTimezone: true }),
  },
  (t) => [
    unique('gps_device_identity').on(t.canonicalId),
    check(
      'gps_device_name_valid',
      sql`length(trim(${t.name})) between 1 and 100`,
    ),
    check(
      'gps_device_id_valid',
      sql`${t.reportedId} ~ '^[0-9]{5,20}$' and ${t.reportedId} ~ '[1-9]'`,
    ),
  ],
)

/** Authenticated location reports. The wire-frame fingerprint deduplicates retries across connections. */
export const gpsPosition = pgTable(
  'gps_position',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    deviceId: uuid('device_id')
      .notNull()
      .references(() => gpsDevice.id, { onDelete: 'restrict' }),
    fingerprint: text('fingerprint').notNull(),
    fixAt: timestamp('fix_at', { withTimezone: true }).notNull(),
    receivedAt: timestamp('received_at', { withTimezone: true }).notNull(),
    valid: boolean('valid').notNull(),
    latitude: doublePrecision('latitude').notNull(),
    longitude: doublePrecision('longitude').notNull(),
    speedKmh: doublePrecision('speed_kmh').notNull(),
    course: doublePrecision('course').notNull(),
    altitude: doublePrecision('altitude'),
    batteryPercent: integer('battery_percent'),
    satellites: integer('satellites'),
    cellularSignal: integer('cellular_signal'),
    odometerKm: doublePrecision('odometer_km'),
  },
  (t) => [
    unique('gps_position_frame').on(t.deviceId, t.fingerprint),
    index('gps_position_history').on(
      t.deviceId,
      t.fixAt.desc(),
      t.receivedAt.desc(),
      t.id.desc(),
    ),
    index('gps_position_latest_valid')
      .on(t.deviceId, t.fixAt.desc(), t.receivedAt.desc(), t.id.desc())
      .where(sql`${t.valid}`),
    index('gps_position_latest_battery')
      .on(t.deviceId, t.fixAt.desc(), t.receivedAt.desc(), t.id.desc())
      .where(sql`${t.batteryPercent} is not null`),
    check(
      'gps_position_battery_percent',
      sql`${t.batteryPercent} between 0 and 100`,
    ),
    check('gps_position_satellites', sql`${t.satellites} between 0 and 254`),
    check(
      'gps_position_cellular_signal',
      sql`${t.cellularSignal} between 0 and 254`,
    ),
    check(
      'gps_position_odometer',
      sql`${t.odometerKm} between 0 and 429496729.5`,
    ),
    check(
      'gps_position_coordinates',
      sql`${t.latitude} between -90 and 90 and ${t.longitude} between -180 and 180`,
    ),
  ],
)

/** Immutable record of registry changes, with the actor ID retained as a snapshot. */
export const gpsDeviceEvent = pgTable('gps_device_event', {
  id: uuid('id').defaultRandom().primaryKey(),
  deviceId: uuid('device_id')
    .notNull()
    .references(() => gpsDevice.id, { onDelete: 'restrict' }),
  actorId: text('actor_id').notNull(),
  occurredAt: timestamp('occurred_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  before: text('before'),
  after: text('after').notNull(),
})

export const gpsDiagnosticKind = pgEnum('gps_diagnostic_kind', [
  'registration',
  'authentication',
  'heartbeat',
  'decode_error',
])

// One row per device and event kind keeps routine heartbeat traffic bounded.
export const gpsDeviceDiagnostic = pgTable(
  'gps_device_diagnostic',
  {
    deviceId: uuid('device_id')
      .notNull()
      .references(() => gpsDevice.id, { onDelete: 'restrict' }),
    kind: gpsDiagnosticKind('kind').notNull(),
    errorCode: text('error_code'),
    receivedAt: timestamp('received_at', { withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.deviceId, t.kind] })],
)
