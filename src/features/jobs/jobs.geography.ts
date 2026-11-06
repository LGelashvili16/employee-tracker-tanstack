import { z } from 'zod'
import boundaryData from './data/georgia-boundary.geojson?raw'

export const georgiaLocationError =
  'სამუშაოს მდებარეობა საქართველოს ტერიტორიაზე უნდა იყოს.'

const positionSchema = z.tuple([
  z.number().finite().min(-180).max(180),
  z.number().finite().min(-90).max(90),
])
const ringSchema = z
  .array(positionSchema)
  .min(4)
  .refine((ring) => {
    const first = ring[0]
    const last = ring[ring.length - 1]
    return first[0] === last[0] && first[1] === last[1]
  })
// Validate the vendored snapshot once, rather than trusting a cast or fetching boundaries during a request.
const boundary = z
  .object({
    type: z.literal('FeatureCollection'),
    features: z.tuple([
      z.object({
        type: z.literal('Feature'),
        properties: z.object({ shapeISO: z.literal('GEO') }),
        geometry: z.object({
          type: z.literal('Polygon'),
          coordinates: z.array(ringSchema).min(1),
        }),
      }),
    ]),
  })
  .parse(JSON.parse(boundaryData)).features[0].geometry.coordinates

type Position = z.infer<typeof positionSchema>
type Location = { longitude: number; latitude: number }
const bounds = boundary[0].reduce(
  (result, [longitude, latitude]) => ({
    west: Math.min(result.west, longitude),
    east: Math.max(result.east, longitude),
    south: Math.min(result.south, latitude),
    north: Math.max(result.north, latitude),
  }),
  { west: Infinity, east: -Infinity, south: Infinity, north: -Infinity },
)

function locateInRing(
  { longitude, latitude }: Location,
  ring: Array<Position>,
): 'inside' | 'outside' | 'boundary' {
  let inside = false
  for (
    let index = 0, previous = ring.length - 1;
    index < ring.length;
    previous = index++
  ) {
    const [startX, startY] = ring[previous]
    const [endX, endY] = ring[index]
    const dx = endX - startX
    const dy = endY - startY
    const length = Math.hypot(dx, dy)
    // This tolerance only absorbs floating-point roundoff, not a geographic buffer outside the country.
    const onLine =
      length === 0
        ? longitude === startX && latitude === startY
        : Math.abs((longitude - startX) * dy - (latitude - startY) * dx) <=
          1e-10 * length
    if (
      onLine &&
      longitude >= Math.min(startX, endX) &&
      longitude <= Math.max(startX, endX) &&
      latitude >= Math.min(startY, endY) &&
      latitude <= Math.max(startY, endY)
    )
      return 'boundary'
    if (
      startY > latitude !== endY > latitude &&
      longitude < startX + ((latitude - startY) * dx) / dy
    )
      inside = !inside
  }
  return inside ? 'inside' : 'outside'
}

/** Country territory check shared by map interaction, forms and server validation. Border points are included. */
export function isLocationInGeorgia(location: Location): boolean {
  const { longitude, latitude } = location
  if (
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude) ||
    longitude < bounds.west ||
    longitude > bounds.east ||
    latitude < bounds.south ||
    latitude > bounds.north
  )
    return false
  const outer = locateInRing(location, boundary[0])
  if (outer === 'outside') return false
  for (const hole of boundary.slice(1))
    if (locateInRing(location, hole) === 'inside') return false
  return true
}
