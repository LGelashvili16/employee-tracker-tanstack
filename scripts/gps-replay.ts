import { createReadStream } from 'node:fs'
import { createInterface } from 'node:readline'
import { z } from 'zod'
import { readGpsConfig } from '../src/features/gps/server/gps-config.ts'
import { createDecodeContext } from '../src/features/gps/server/gps-receiver.server.ts'
import { GpsSession } from '../src/features/gps/server/gps-session.ts'

const recordSchema = z.object({
  event: z.string(),
  connection: z.string().min(1).max(100),
  receivedAt: z.iso.datetime(),
  hex: z
    .string()
    .max(131072)
    .regex(/^(?:[0-9a-f]{2})+$/i)
    .optional(),
})

// Replay files oldest first. Connection keys retain the exact TCP chunk ordering;
// replay never opens a socket or sends the proposed protocol responses.
async function replay() {
  const args = z
    .array(z.string().min(1).max(4096))
    .min(1)
    .max(20)
    .parse(process.argv.slice(2))
  const config = readGpsConfig({
    ...process.env,
    GPS_REPLY: 'false',
    GPS_DATABASE_URL: '',
  })
  const sessions = new Map<string, GpsSession>()
  for (const file of args) {
    const input = createReadStream(file)
    const lines = createInterface({ input, crlfDelay: Infinity })
    try {
      for await (const line of lines) {
        if (!line.trim()) continue
        const record = recordSchema.parse(JSON.parse(line))
        if (record.event === 'disconnect') {
          sessions.delete(record.connection)
          continue
        }
        if (record.event !== 'receive' || !record.hex) continue
        let session = sessions.get(record.connection)
        if (!session) {
          if (sessions.size >= 128) throw new Error('replay_connection_limit')
          session = new GpsSession(config.GPS_PROTOCOL)
          sessions.set(record.connection, session)
        }
        const chunk = Buffer.from(record.hex, 'hex')
        for (let offset = 0; offset < chunk.length; offset += 4096) {
          for (const result of session.push(
            chunk.subarray(offset, offset + 4096),
            createDecodeContext(config, new Date(record.receivedAt)),
          )) {
            console.info(
              JSON.stringify({
                connection: record.connection,
                ...result,
                decoded: result.decoded
                  ? { ...result.decoded, replies: undefined }
                  : undefined,
              }),
            )
          }
        }
      }
    } finally {
      lines.close()
      input.destroy()
    }
  }
  for (const [connection, session] of sessions) {
    if (session.pendingBytes)
      console.info(
        JSON.stringify({ connection, pendingBytes: session.pendingBytes }),
      )
  }
}

void replay().catch(() => {
  console.error(
    'ჩანაწერის დამუშავება ვერ მოხერხდა. მიუთითეთ სწორი JSONL ფაილები და GPS კონფიგურაცია.',
  )
  process.exitCode = 1
})
