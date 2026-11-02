import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not defined in the environment variables.')
}

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema/**/*.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
})
