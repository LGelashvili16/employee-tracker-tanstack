import type { z } from 'zod'
import type {
  locationFeatureSchema,
  resolvedLocationSchema,
} from './job-locations.schemas'

export type LocationFeature = z.infer<typeof locationFeatureSchema>
export type ResolvedLocation = z.infer<typeof resolvedLocationSchema>
export type GeocodingRequest =
  | { kind: 'search'; q: string }
  | { kind: 'reverse'; longitude: number; latitude: number }
