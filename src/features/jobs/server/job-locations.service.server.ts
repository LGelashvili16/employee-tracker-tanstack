import '@tanstack/react-start/server-only'
import { createHash } from 'node:crypto'
import { setTimeout as delay } from 'node:timers/promises'
import {
  geocodingConfiguration,
  GeocodingUnavailableError,
  requestGeocoding,
} from '#/server/integrations/geocoding.server'
import {
  locationFeaturesSchema,
  locationSearchSchema,
} from '../job-locations.schemas'
import { jobLocationSchema } from '../jobs.schemas'
import { isLocationInGeorgia } from '../jobs.geography'
import {
  locationStreetName,
  reverseAddressFeature,
  selectReverseLocation,
} from '../job-locations.rules'
import { JobWorkflowError } from '../jobs.rules'
import { assertJobManager, requireJobActor } from './jobs.policy.server'
import { transactJobs } from './jobs.repository.server'
import {
  readLocationCache,
  reserveLocationRequest,
  writeLocationCache,
} from './job-locations.repository.server'
import type { Actor } from '#/lib/authorization/actor'
import type {
  GeocodingRequest,
  LocationFeature,
  ResolvedLocation,
} from '../job-locations.types'

const hash = (value: string) => createHash('sha256').update(value).digest('hex')
async function features(request: GeocodingRequest, language: 'default' | 'en') {
  const config = geocodingConfiguration()
  if (!config.enabled) throw new GeocodingUnavailableError()
  const key = hash(
    JSON.stringify([
      request.kind === 'reverse' ? 2 : 1,
      config.baseUrl,
      request,
      language,
    ]),
  )
  const cached = locationFeaturesSchema.safeParse(await readLocationCache(key))
  if (cached.success) return cached.data
  const wait = await reserveLocationRequest(hash(config.baseUrl))
  if (wait === null) throw new GeocodingUnavailableError()
  if (wait > 0) await delay(wait)
  const response = await requestGeocoding(config.baseUrl, request, language)
  const allowed = response.filter(
    (item) => item.countryCode === 'GE' && isLocationInGeorgia(item),
  )
  await writeLocationCache(key, allowed)
  return allowed
}
const georgian = (value: string) => (/[ა-ჰ]/.test(value) ? value : null)
const english = (value: string) =>
  /[A-Za-z]/.test(value) && !/[ა-ჰ]/.test(value) ? value : null
const label = (item: LocationFeature) =>
  [
    ...new Set(
      [
        item.name,
        [item.street, item.houseNumber].filter(Boolean).join(' '),
        item.city,
      ].filter(Boolean),
    ),
  ]
    .join(', ')
    .slice(0, 300)
function merge(
  local: Array<LocationFeature>,
  translated: Array<LocationFeature>,
): Array<ResolvedLocation> {
  const localById = new Map(local.map((item) => [item.sourceId, item]))
  const englishById = new Map(translated.map((item) => [item.sourceId, item]))
  const ordered = [
    ...new Map(
      [...local, ...translated].map((item) => [item.sourceId, item]),
    ).values(),
  ]
  return ordered
    .slice(0, 5)
    .map((item) => {
      const ka = localById.get(item.sourceId)
      const en = englishById.get(item.sourceId)
      return {
        sourceId: item.sourceId,
        longitude: item.longitude,
        latitude: item.latitude,
        labelKa: ka ? georgian(label(ka)) : null,
        labelEn: en ? english(label(en)) : null,
        streetNameKa: ka ? georgian(locationStreetName(ka)) : null,
        streetNameEn: en ? english(locationStreetName(en)) : null,
      }
    })
    .filter((item) => item.labelKa || item.labelEn)
}
async function findLocations(request: GeocodingRequest) {
  const results: Array<Array<LocationFeature> | null> = []
  // A missing language must not discard names already returned by the other lookup.
  for (const language of ['default', 'en'] as const) {
    try {
      results.push(await features(request, language))
    } catch {
      results.push(null)
    }
  }
  if (results.every((result) => result === null))
    throw new GeocodingUnavailableError()
  const local = results[0] ?? []
  const translated = results[1] ?? []
  if (request.kind === 'reverse') {
    const selected = selectReverseLocation(request, [...local, ...translated])
    if (!selected) return []
    const selectedFeatures = (items: Array<LocationFeature>) =>
      items
        .filter(
          (item) =>
            item.sourceId === selected.sourceId &&
            Boolean(locationStreetName(item)),
        )
        .map((item) => reverseAddressFeature(item, selected.includeHouseNumber))
    return merge(selectedFeatures(local), selectedFeatures(translated))
  }
  return merge(local, translated)
}
export async function searchJobLocations(
  actor: Actor | null,
  input: unknown,
): Promise<Array<ResolvedLocation>> {
  const parsed = locationSearchSchema.safeParse(input)
  if (!parsed.success)
    throw new JobWorkflowError('მიუთითეთ ქუჩა ან მისამართი, მინიმუმ 3 სიმბოლო.')
  await transactJobs((tx) => requireJobActor(tx, actor))
  const request = { kind: 'search' as const, q: parsed.data.q }
  try {
    return await findLocations(request)
  } catch {
    throw new JobWorkflowError(
      'მისამართის ძიება დროებით მიუწვდომელია. სცადეთ ხელახლა ან მონიშნეთ ადგილი რუკაზე.',
    )
  }
}
/** Called after current-manager authorization and outside the job write transaction. Never fabricates a missing translation. */
export async function resolveJobStreet(
  input: unknown,
): Promise<ResolvedLocation | null> {
  const position = jobLocationSchema.parse(input)
  const request = {
    kind: 'reverse' as const,
    longitude: Math.round(position.longitude * 1e6) / 1e6,
    latitude: Math.round(position.latitude * 1e6) / 1e6,
  }
  try {
    return (await findLocations(request))[0] ?? null
  } catch {
    return null
  }
}

/** A preview for a new map-selected job; uses the same bounded lookup and cache as saving. */
export async function suggestCompanyJobAddress(
  actor: Actor | null,
  input: unknown,
): Promise<string | null> {
  const parsed = jobLocationSchema.safeParse(input)
  if (!parsed.success)
    throw new JobWorkflowError('მიუთითეთ მდებარეობა საქართველოს ტერიტორიაზე.')
  await transactJobs(async (tx) =>
    assertJobManager(await requireJobActor(tx, actor)),
  )
  const location = await resolveJobStreet(parsed.data)
  return location?.labelKa ?? location?.labelEn ?? null
}
