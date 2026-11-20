import {
  appendFileSync,
  existsSync,
  mkdirSync,
  renameSync,
  rmSync,
  statSync,
} from 'node:fs'
import { join } from 'node:path'

export interface JournalRecord {
  event: 'connect' | 'receive' | 'frame' | 'send' | 'disconnect' | 'rejected'
  connection: string
  receivedAt: string
  [key: string]: unknown
}

export interface GpsJournal {
  write: (record: JournalRecord) => void
}

// A small adapter keeps storage separate from transport and decoding. Bounded
// synchronous writes intentionally apply backpressure instead of accumulating an
// unbounded async queue. The worker is independent of the HTTP application.
export function createFileJournal(
  directory: string,
  maxBytes: number,
  files: number,
): GpsJournal {
  mkdirSync(directory, { recursive: true, mode: 0o700 })
  const active = join(directory, 'journal.jsonl')
  let size = existsSync(active) ? statSync(active).size : 0
  return {
    write(record) {
      const line = `${JSON.stringify(record)}\n`
      const bytes = Buffer.byteLength(line)
      if (bytes > maxBytes) throw new Error('journal_record_limit')
      if (size + bytes > maxBytes) {
        rmSync(`${active}.${files - 1}`, { force: true })
        for (let index = files - 2; index >= 1; index--) {
          if (existsSync(`${active}.${index}`))
            renameSync(`${active}.${index}`, `${active}.${index + 1}`)
        }
        if (existsSync(active)) renameSync(active, `${active}.1`)
        size = 0
      }
      appendFileSync(active, line, { mode: 0o600 })
      size += bytes
    },
  }
}
