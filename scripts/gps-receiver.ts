import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import {
  createGpsDecodeErrorRecorder,
  createGpsIngest,
} from '../src/features/gps/server/gps-ingest.server.ts'
import { readGpsConfig } from '../src/features/gps/server/gps-config.ts'
import { createFileJournal } from '../src/features/gps/server/gps-journal.server.ts'
import { createGpsReceiver } from '../src/features/gps/server/gps-receiver.server.ts'

try {
  const config = readGpsConfig(process.env)
  const journal = createFileJournal(
    config.GPS_DATA_DIR,
    config.GPS_JOURNAL_BYTES,
    config.GPS_JOURNAL_FILES,
  )
  const pool = config.GPS_DATABASE_URL
    ? new Pool({
        connectionString: config.GPS_DATABASE_URL,
        max: 4,
        connectionTimeoutMillis: 3000,
        statement_timeout: 3000,
        idleTimeoutMillis: 5000,
        allowExitOnIdle: true,
      })
    : undefined
  pool?.on('error', () =>
    console.error('GPS მონაცემთა ბაზასთან კავშირი შეწყდა.'),
  )
  const db = pool ? drizzle({ client: pool }) : undefined
  const receiver = createGpsReceiver(
    config,
    journal,
    () => {
      console.error('GPS ჩანაწერის შენახვა ვერ მოხერხდა. მიმღები შეჩერებულია.')
      process.exitCode = 1
    },
    db ? createGpsIngest(db) : undefined,
    db ? createGpsDecodeErrorRecorder(db) : undefined,
  )
  receiver.server.on('error', () => {
    console.error(
      'GPS მიმღების გაშვება ვერ მოხერხდა. შეამოწმეთ პორტი და ქსელი.',
    )
    process.exitCode = 1
  })
  receiver.server.listen(config.GPS_PORT, '0.0.0.0', () => {
    console.info(
      JSON.stringify({
        message: 'GPS მიმღები მზადაა',
        port: config.GPS_PORT,
        protocol: config.GPS_PROTOCOL,
        replies: config.GPS_REPLY,
      }),
    )
  })
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, () => {
      void receiver
        .close()
        .then(() => pool?.end())
        .catch(() => {
          process.exitCode = 1
        })
    })
  }
} catch {
  console.error(
    'GPS მიმღების კონფიგურაცია ან საცავი არასწორია. შეამოწმეთ პარამეტრები და წვდომა.',
  )
  process.exitCode = 1
}
