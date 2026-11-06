import '@tanstack/react-start/server-only'
import { z } from 'zod'
import { reverseLookupRadiusMetres } from '#/features/jobs/job-locations.rules'
import type {
  GeocodingRequest,
  LocationFeature,
} from '#/features/jobs/job-locations.types'

export class GeocodingUnavailableError extends Error {}
const configSchema = z.object({
  GEOCODING_ENABLED: z.enum(['true', 'false']).default('true'),
  GEOCODING_BASE_URL: z
    .url()
    .refine((value) => {
      const url = new URL(value)
      return (
        ['https:', 'http:'].includes(url.protocol) &&
        !url.username &&
        !url.password &&
        !url.search &&
        !url.hash
      )
    })
    .default('https://photon.komoot.io'),
})
export function geocodingConfiguration() {
  const config = configSchema.parse({
    GEOCODING_ENABLED: process.env.GEOCODING_ENABLED,
    GEOCODING_BASE_URL: process.env.GEOCODING_BASE_URL,
  })
  return {
    enabled: config.GEOCODING_ENABLED === 'true',
    baseUrl: config.GEOCODING_BASE_URL.replace(/\/$/, ''),
  }
}
const text = z.string().max(300).optional().default('')
const responseSchema = z.object({
  type: z.literal('FeatureCollection'),
  features: z
    .array(
      z.object({
        type: z.literal('Feature'),
        geometry: z.object({
          type: z.literal('Point'),
          coordinates: z.tuple([
            z.number().finite().min(-180).max(180),
            z.number().finite().min(-85).max(85),
          ]),
        }),
        properties: z.object({
          osm_type: z.enum(['N', 'W', 'R']),
          osm_id: z.number().int().positive(),
          name: text,
          street: text,
          city: text,
          housenumber: z.string().max(40).optional().default(''),
          countrycode: z.string().length(2),
          type: z.string().max(60).optional(),
          osm_key: z.string().max(60).optional(),
        }),
      }),
    )
    .max(10),
})

async function readBoundedJson(response: Response): Promise<unknown> {
  if (!response.body) throw new GeocodingUnavailableError()
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let size = 0
  let body = ''
  try {
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > 256_000) {
        await reader.cancel()
        throw new GeocodingUnavailableError()
      }
      body += decoder.decode(value, { stream: true })
    }
    return JSON.parse(body + decoder.decode())
  } finally {
    reader.releaseLock()
  }
}

/** Fixed server-configured origin only. No client URL, private notes or employee identity reaches the provider. */
export async function requestGeocoding(
  baseUrl: string,
  request: GeocodingRequest,
  language: 'default' | 'en',
): Promise<Array<LocationFeature>> {
  const url = new URL(
    `${baseUrl}/${request.kind === 'search' ? 'api' : 'reverse'}`,
  )
  url.searchParams.set('lang', language)
  url.searchParams.set('limit', '5')
  if (request.kind === 'search') {
    url.searchParams.set('q', request.q)
    url.searchParams.set('countrycode', 'GE')
    url.searchParams.set('bbox', '39.9,41,46.8,43.7')
  } else {
    url.searchParams.set('lon', String(request.longitude))
    url.searchParams.set('lat', String(request.latitude))
    url.searchParams.append('layer', 'house')
    url.searchParams.append('layer', 'street')
    url.searchParams.set('radius', String(reverseLookupRadiusMetres / 1000))
    url.searchParams.set('distance_sort', 'true')
  }
  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Teamwork/1.0 (company job map; Photon geocoding)',
      },
      signal: AbortSignal.timeout(8000),
      redirect: 'error',
    })
    if (!response.ok) throw new GeocodingUnavailableError()
    const data = responseSchema.parse(await readBoundedJson(response))
    return data.features.map(({ geometry, properties: item }) => ({
      sourceId: `${item.osm_type}:${item.osm_id}`,
      longitude: geometry.coordinates[0],
      latitude: geometry.coordinates[1],
      name: item.name,
      street: item.street,
      city: item.city,
      houseNumber: item.housenumber,
      countryCode: item.countrycode.toUpperCase(),
      isStreet: item.type === 'street' || item.osm_key === 'highway',
    }))
  } catch {
    throw new GeocodingUnavailableError()
  }
}
