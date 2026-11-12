import { integer, pgTable, primaryKey, text, uuid } from 'drizzle-orm/pg-core'
import { user } from '../auth/auth.schema'
import { attendanceSession } from './attendance.schema'

/** Last pending revision included in a committed digest for this assigned reviewer. */
export const attendanceDigestReceipt = pgTable(
  'attendance_digest_receipt',
  {
    /** Recipient identity, independent of subsequent assignment changes. */
    reviewerId: text('reviewer_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    /** Durable attendance record covered by the digest. */
    sessionId: uuid('session_id')
      .notNull()
      .references(() => attendanceSession.id, { onDelete: 'cascade' }),
    /** A correction advancing the session revision makes it eligible again. */
    revision: integer('revision').notNull(),
  },
  (table) => [primaryKey({ columns: [table.reviewerId, table.sessionId] })],
)
