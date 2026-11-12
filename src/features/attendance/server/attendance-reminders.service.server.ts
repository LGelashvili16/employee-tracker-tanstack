import '@tanstack/react-start/server-only'
import { sql } from 'drizzle-orm'
import type { DeliverNotificationsInput } from '#/features/notifications/notifications.schemas'
import { deliverNotificationBatch } from '#/features/notifications/server/notifications.service.server'
import { transactAttendance } from './attendance.repository.server'
import {
  checkinCandidates,
  digestCandidates,
  openCandidates,
  saveDigestReceipts,
} from './attendance-reminder.repository.server'

/** Called only by the server clock. Serializable snapshots order eligibility against concurrent domain writes. */
export function runAttendanceReminders(now = new Date()) {
  const instant = now.toISOString()
  return transactAttendance(
    async (tx) => {
      await tx.execute(sql`set local statement_timeout='8s'`)
      await tx.execute(sql`set local lock_timeout='1s'`)
      await tx.execute(sql`set local transaction_timeout='40s'`)
      const lock = await tx.execute<{ locked: boolean }>(
        sql`select pg_try_advisory_xact_lock(845928341) as locked`,
      )
      if (!lock.rows[0]?.locked) return 0
      const messages: Array<DeliverNotificationsInput> = []
      function notify(
        row: { subject: string; recipient: string; date: string; key: string },
        title: string,
        body: string,
        liveToast = true,
      ) {
        messages.push({
          eventKey: row.key,
          recipientIds: [row.recipient],
          title,
          body,
          liveToast,
          destination: {
            kind: 'attendance',
            userId: row.subject,
            workDate: row.date,
          },
        })
      }
      for (const row of await checkinCandidates(tx, instant))
        notify(
          row,
          'სამუშაოს დაწყების შეხსენება',
          'გადაამოწმეთ დღევანდელი განრიგი და დააფიქსირეთ სამუშაოს დაწყება.',
        )
      for (const row of await openCandidates(tx, instant, false))
        notify(
          row,
          'სამუშაოს დასრულების შეხსენება',
          'სამუშაოს დასრულებისას დააფიქსირეთ გასვლა.',
        )
      for (const row of await openCandidates(tx, instant, true))
        notify(
          row,
          'გახანგრძლივებული სამუშაო სესია',
          'სამუშაო სესია კვლავ ღიაა. გადაამოწმეთ დასწრების ჩანაწერი.',
        )
      const candidates = await digestCandidates(tx, instant)
      const groups = new Map<string, typeof candidates>()
      for (const row of candidates) {
        const group = JSON.stringify([row.key, row.recipient])
        const rows = groups.get(group)
        if (rows) rows.push(row)
        else groups.set(group, [row])
      }
      for (const rows of groups.values()) {
        notify(
          rows[0],
          'დასწრების ჩანაწერები განსახილველია',
          'გადაამოწმეთ თანამშრომლის დასწრების ჩანაწერები.',
          false,
        )
      }
      const inserted = await deliverNotificationBatch(tx, messages)
      const covered = inserted.flatMap(
        (row) =>
          groups.get(JSON.stringify([row.eventKey, row.recipientId])) ?? [],
      )
      await saveDigestReceipts(tx, covered)
      return inserted.length
    },
    { isolationLevel: 'serializable' },
  )
}
