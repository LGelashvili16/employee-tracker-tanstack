import 'dotenv/config'
import { and, eq, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import { z } from 'zod'
import { notification } from '../src/db/schema/notifications/notification.schema'
import { user } from '../src/db/schema/auth/auth.schema'

// Explicit local preview data, never a fallback for a failed production read.
const samples = [
  {
    title: 'სამუშაო განრიგი',
    body: 'ასე გამოჩნდება შეტყობინება სამუშაო განრიგის განახლების შესახებ.',
    minutesAgo: 5,
    seen: false,
  },
  {
    title: 'დასწრების შეხსენება',
    body: 'ასე გამოჩნდება სამუშაო დღის დასრულების შეხსენება.',
    minutesAgo: 25,
    seen: false,
  },
  {
    title: 'მოთხოვნის პასუხი',
    body: 'ასე გამოჩნდება შეტყობინება თქვენი მოთხოვნის პასუხის შესახებ.',
    minutesAgo: 60,
    seen: false,
  },
  {
    title: 'ახალი დავალება',
    body: 'ასე გამოჩნდება შეტყობინება ახალი სამუშაო დავალების შესახებ.',
    minutesAgo: 120,
    seen: false,
  },
  {
    title: 'გუნდის განახლება',
    body: 'ეს ნანახი შეტყობინების სადემონსტრაციო მაგალითია.',
    minutesAgo: 180,
    seen: true,
  },
  {
    title: 'კეთილი იყოს თქვენი მობრძანება',
    body: 'ეს შეტყობინება მხოლოდ შეტყობინებების სიის დიზაინის სანახავადაა დამატებული.',
    minutesAgo: 240,
    seen: true,
  },
]

const databaseUrl = z.url().parse(process.env.DATABASE_URL)
if (
  process.env.NODE_ENV === 'production' ||
  !['localhost', '127.0.0.1', '[::1]'].includes(new URL(databaseUrl).hostname)
) {
  throw new Error('სადემონსტრაციო მონაცემები მხოლოდ ლოკალურ ბაზაში ემატება.')
}
const connection = new pg.Client({
  connectionString: databaseUrl,
  connectionTimeoutMillis: 3000,
})
try {
  await connection.connect()
  const database = drizzle(connection)
  const insertedCount = await database.transaction(async (tx) => {
    // Re-running the preview seed must not duplicate or reset acknowledged entries.
    await tx.execute(sql`select pg_advisory_xact_lock(80351105)`)
    let inserted = 0
    const recipients = await tx.select({ id: user.id }).from(user)
    for (const recipient of recipients) {
      for (const sample of samples) {
        const title = `სადემონსტრაციო: ${sample.title}`
        const createdAt = new Date(Date.now() - sample.minutesAgo * 60_000)
        const existing = await tx
          .select({ id: notification.id })
          .from(notification)
          .where(
            and(
              eq(notification.recipientId, recipient.id),
              eq(notification.title, title),
            ),
          )
          .limit(1)
        if (existing.length > 0) continue
        await tx
          .insert(notification)
          .values({
            recipientId: recipient.id,
            title,
            body: sample.body,
            createdAt,
            seenAt: sample.seen ? createdAt : null,
          })
        inserted += 1
      }
    }
    return inserted
  })
  console.log(`დაემატა ${insertedCount} სადემონსტრაციო შეტყობინება.`)
} finally {
  await connection.end()
}
