import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { uuidv7PrimaryKey } from '../_shared/columns'
import { user } from '../auth/auth.schema'

/** One immutable company announcement, published immediately by an authorized HR or platform account. */
export const announcement = pgTable(
  'announcement',
  {
    /** PostgreSQL 18 UUIDv7 identity, shared by listing, modal and inbox links. */
    id: uuidv7PrimaryKey(),
    /** Publishing account, retained with the announcement; account deletion cannot erase attribution. */
    authorId: text('author_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    /** Client operation identifier, scoped to the author, preventing duplicate publication on retries. */
    requestId: uuid('request_id').notNull(),
    /** Plain-text announcement heading, rendered through React escaping. */
    title: text('title').notNull(),
    /** Plain-text announcement contents; no executable or rich HTML is stored. */
    body: text('body').notNull(),
    /** Legacy column name: true selects immediate/sign-in modal delivery until explicit reading; false selects the inbox. */
    showOnLogin: boolean('show_on_login').notNull().default(false),
    /** Database publication instant in UTC; determines chronological listing and modal queue order. */
    publishedAt: timestamp('published_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('announcement_author_request').on(
      table.authorId,
      table.requestId,
    ),
    index('announcement_recent').on(table.publishedAt.desc(), table.id.desc()),
    check(
      'announcement_title_length',
      sql`length(trim(${table.title})) between 1 and 160`,
    ),
    check(
      'announcement_body_length',
      sql`length(trim(${table.body})) between 1 and 10000`,
    ),
  ],
)

/** One employee's delivery and acknowledgement state. Publication snapshots eligible employees; future employees can still read historical announcements voluntarily. */
export const announcementRecipient = pgTable(
  'announcement_recipient',
  {
    /** Published announcement being delivered; deletion is restricted to retain acknowledgements. */
    announcementId: uuid('announcement_id')
      .notNull()
      .references(() => announcement.id, { onDelete: 'restrict' }),
    /** Recipient login identity, derived server-side; other accounts cannot alter this state. */
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    /** Last UTC dismissal/reading instant. Unread dismissals before the current sign-in are eligible for reminders. */
    dismissedAt: timestamp('dismissed_at', { withTimezone: true }),
    /** UTC instant of explicit reading; null also covers a dismissed but unread announcement. */
    readAt: timestamp('read_at', { withTimezone: true }),
  },
  (table) => [
    primaryKey({ columns: [table.announcementId, table.userId] }),
    // Live unread state includes dismissed publications until the employee explicitly reads them.
    index('announcement_recipient_unread')
      .on(table.userId)
      .where(sql`${table.readAt} is null`),
    index('announcement_recipient_pending')
      .on(table.userId, table.announcementId)
      .where(sql`${table.dismissedAt} is null and ${table.readAt} is null`),
  ],
)
