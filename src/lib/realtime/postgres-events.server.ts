import '@tanstack/react-start/server-only'
import { Client } from 'pg'
import { sql } from 'drizzle-orm'
import { z } from 'zod'
import { realtimeSignalSchema } from './realtime.schemas'
import type { RealtimeSignal } from './realtime.schemas'
import type { db } from '#/db'

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0]
type Subscriber = {
  signal: (value: RealtimeSignal) => void
  connected: () => void
}
const subscribers = new Set<Subscriber>()
let client: Client | undefined
let retry: ReturnType<typeof setTimeout> | undefined

/** PostgreSQL delivers this wake-up only if the caller's business transaction commits. */
export async function signalRealtime(tx: Transaction, value: RealtimeSignal) {
  const payload = JSON.stringify(realtimeSignalSchema.parse(value))
  await tx.execute(sql`select pg_notify('teamwork_events', ${payload})`)
}

/** Bulk delivery keeps whole-company publication to one database round trip. */
export async function signalRealtimeBatch(
  tx: Transaction,
  values: Array<RealtimeSignal>,
) {
  if (!values.length) return
  const payloads = values.map((value) =>
    JSON.stringify(realtimeSignalSchema.parse(value)),
  )
  await tx.execute(
    sql`select pg_notify('teamwork_events', payload) from jsonb_array_elements_text(${JSON.stringify(payloads)}::jsonb) as payload`,
  )
}

function connect() {
  if (client || !subscribers.size) return
  const next = new Client({
    connectionString: z.url().parse(process.env.DATABASE_URL),
    connectionTimeoutMillis: 3000,
    keepAlive: true,
    application_name: 'teamwork_realtime',
  })
  client = next
  function disconnected() {
    if (client !== next) return
    client = undefined
    void next.end().catch(() => {})
    if (subscribers.size) retry = setTimeout(connect, 3000)
  }
  next.on('error', disconnected)
  next.on('end', disconnected)
  next.on('notification', (message) => {
    if (
      client !== next ||
      message.channel !== 'teamwork_events' ||
      !message.payload
    )
      return
    try {
      const parsed = realtimeSignalSchema.safeParse(JSON.parse(message.payload))
      if (parsed.success)
        for (const subscriber of subscribers) subscriber.signal(parsed.data)
    } catch {
      // Invalid database signals are ignored; browser input never reaches this channel.
    }
  })
  void next
    .connect()
    .then(() => next.query('LISTEN teamwork_events'))
    .then(() => {
      if (client === next)
        for (const subscriber of subscribers) subscriber.connected()
    })
    .catch(disconnected)
}

/** One dedicated database connection per process, shared by all browser streams. */
export function subscribeRealtime(subscriber: Subscriber) {
  subscribers.add(subscriber)
  connect()
  return () => {
    subscribers.delete(subscriber)
    if (subscribers.size) return
    clearTimeout(retry)
    retry = undefined
    const previous = client
    client = undefined
    void previous?.end().catch(() => {})
  }
}
