import type { LocationFeature } from './job-locations.types'

type Position = { longitude: number; latitude: number }
export const reverseLookupRadiusMetres = 250
// Allow a short entrance/centroid offset while keeping numbers advisory and editable.
const numberMatchRadiusMetres = 30
const ambiguityGapMetres = 15
const radians = (degrees: number) => (degrees * Math.PI) / 180

function distanceMetres(first: Position, second: Position) {
  const latitudeDelta = radians(second.latitude - first.latitude)
  const longitudeDelta = radians(second.longitude - first.longitude)
  const arc =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(first.latitude)) *
      Math.cos(radians(second.latitude)) *
      Math.sin(longitudeDelta / 2) ** 2
  return 6_371_000 * 2 * Math.asin(Math.min(1, Math.sqrt(arc)))
}
export const locationStreetName = (feature: LocationFeature) =>
  (feature.isStreet ? feature.name : feature.street).trim()

/** Provider coordinates are representative points, not building outlines. Never claim an exact building match. */
export function selectReverseLocation(
  position: Position,
  features: ReadonlyArray<LocationFeature>,
) {
  const distinct = new Map<string, LocationFeature>()
  for (const feature of features) {
    if (locationStreetName(feature) && !distinct.has(feature.sourceId))
      distinct.set(feature.sourceId, feature)
  }
  const candidates = [...distinct.values()]
    .map((feature) => ({
      feature,
      distance: distanceMetres(position, feature),
    }))
    .filter((item) => item.distance <= reverseLookupRadiusMetres)
    .sort((first, second) => first.distance - second.distance)
  const nearest = candidates.at(0)
  if (!nearest) return null
  const street = locationStreetName(nearest.feature).toLocaleLowerCase('ka-GE')
  const closeAlternatives = candidates
    .slice(1)
    .filter(
      (candidate) =>
        candidate.distance <= nearest.distance + ambiguityGapMetres,
    )
  // Competing street names near an intersection need a human decision.
  if (
    closeAlternatives.some(
      ({ feature }) =>
        locationStreetName(feature).toLocaleLowerCase('ka-GE') !== street,
    )
  )
    return null
  const includeHouseNumber =
    !nearest.feature.isStreet &&
    Boolean(nearest.feature.houseNumber.trim()) &&
    nearest.distance <= numberMatchRadiusMetres &&
    !closeAlternatives.some(
      ({ feature }) =>
        Boolean(feature.houseNumber.trim()) &&
        feature.houseNumber.trim() !== nearest.feature.houseNumber.trim(),
    )
  return { sourceId: nearest.feature.sourceId, includeHouseNumber }
}

export function reverseAddressFeature(
  feature: LocationFeature,
  includeHouseNumber: boolean,
): LocationFeature {
  return {
    ...feature,
    name: feature.isStreet ? feature.name : '',
    houseNumber:
      includeHouseNumber && locationStreetName(feature)
        ? feature.houseNumber
        : '',
  }
}
