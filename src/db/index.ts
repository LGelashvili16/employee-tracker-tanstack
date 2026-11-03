import '@tanstack/react-start/server-only'
import 'dotenv/config'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not defined in the environment variables.')
}

const pool = new Pool({
  connectionString: databaseUrl,
})

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL pool error', error)
})

export const db = drizzle({ client: pool, schema })
