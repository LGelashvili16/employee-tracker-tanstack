import '@tanstack/react-start/server-only'
import { db } from '#/db'

export async function checkDatabaseReadiness() {
  // Bound both pool acquisition and the query so probes cannot accumulate.
  const client = await db.$client.connect()
  try {
    // pg supports this per-query timeout even though QueryConfig omits it.
    const probe = { text: 'select 1', query_timeout: 1500 }
    await client.query(probe)
  } finally {
    client.release()
  }
}
