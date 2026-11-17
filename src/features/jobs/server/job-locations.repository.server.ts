import '@tanstack/react-start/server-only'
import { and, eq, gt, sql } from 'drizzle-orm'
import { db } from '#/db'
import { jobGeocodingCache, jobGeocodingGate } from '#/db/schema'
import type { LocationFeature } from '../job-locations.types'

export async function readLocationCache(key: string) {
  return (
    await db
      .select({ features: jobGeocodingCache.features })
      .from(jobGeocodingCache)
      .where(
        and(
          eq(jobGeocodingCache.key, key),
          gt(jobGeocodingCache.expiresAt, sql`clock_timestamp()`),
        ),
      )
      .limit(1)
  ).at(0)?.features
}
export async function writeLocationCache(
  key: string,
  features: Array<LocationFeature>,
) {
  await db
    .insert(jobGeocodingCache)
    .values({
      key,
      features,
      expiresAt: sql`clock_timestamp() + interval '7 days'`,
    })
    .onConflictDoUpdate({
      target: jobGeocodingCache.key,
      set: {
        features,
        expiresAt: sql`clock_timestamp() + interval '7 days'`,
        updatedAt: sql`clock_timestamp()`,
      },
    })
  // Bound cleanup work so old searches expire without slowing an individual lookup.
  await db.execute(sql`
    delete from ${jobGeocodingCache}
    where ${jobGeocodingCache.key} in (
      select ${jobGeocodingCache.key} from ${jobGeocodingCache}
      where ${jobGeocodingCache.expiresAt} <= clock_timestamp()
      order by ${jobGeocodingCache.expiresAt}
      limit 100
    )
  `)
}
/** Reserve before waiting, then release the DB connection. A full queue fails quickly instead of building unbounded work. */
export async function reserveLocationRequest(provider: string) {
  return db.transaction(async (tx) => {
    await tx
      .insert(jobGeocodingGate)
      .values({ provider, nextRequestAt: sql`clock_timestamp()` })
      .onConflictDoNothing()
    const reservation = (
      await tx
        .update(jobGeocodingGate)
        .set({
          nextRequestAt: sql`greatest(${jobGeocodingGate.nextRequestAt}, clock_timestamp()) + interval '1100 milliseconds'`,
        })
        .where(
          and(
            eq(jobGeocodingGate.provider, provider),
            sql`${jobGeocodingGate.nextRequestAt} <= clock_timestamp() + interval '5 seconds'`,
          ),
        )
        .returning({
          waitMs: sql<number>`greatest(0, extract(epoch from (${jobGeocodingGate.nextRequestAt} - interval '1100 milliseconds' - clock_timestamp())) * 1000)::integer`,
        })
    ).at(0)
    return reservation?.waitMs ?? null
  })
}
