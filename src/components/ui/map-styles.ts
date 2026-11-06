import type {
  ExpressionSpecification,
  FilterSpecification,
  LayerSpecification,
  StyleSpecification,
} from 'maplibre-gl'
import { APP_NAME } from '#/lib/app'

export const mapStyleUrl = 'https://tiles.openfreemap.org/styles/liberty'

/** Keep street/place geography intact while decluttering POI icons and their labels. */
export function createMapPlacesStyle(
  style: StyleSpecification,
  showPlaces: boolean,
): StyleSpecification {
  if (showPlaces) return style
  return {
    ...style,
    layers: style.layers.map((layer): LayerSpecification => {
      if (layer.type !== 'symbol') return layer
      if (layer['source-layer'] === 'aerodrome_label')
        return { ...layer, layout: { ...layer.layout, visibility: 'none' } }
      if (layer['source-layer'] !== 'poi') return layer
      // OpenMapTiles distinguishes metro stations from ordinary rail and bus stops by subclass.
      const metro: ExpressionSpecification = [
        'match',
        ['get', 'subclass'],
        ['subway', 'subway_entrance'],
        true,
        false,
      ]
      const filter = layer.filter
        ? (['all', layer.filter, metro] as FilterSpecification)
        : metro
      return {
        ...layer,
        filter,
      }
    }),
  }
}

// Cartographic colors sampled from the supplied dark-map reference. App controls keep their own semantic UI tokens.
const dark = {
  land: '#314256',
  residential: '#314256',
  wood: '#304155',
  grass: '#304154',
  water: '#1c347a',
  park: '#00615e',
  parkOutline: '#176d70',
  cemetery: '#304453',
  institution: '#35465a',
  sand: '#3b4757',
  ice: '#53667b',
  wetland: '#2e4856',
  building: '#3b4c5e',
  buildingOutline: '#4a5c70',
  road: '#5d6d82',
  majorRoad: '#788aa1',
  path: '#485c70',
  rail: '#63768c',
  border: '#53657a',
  text: '#b8c4d0',
  roadText: '#8497b8',
  waterText: '#3778bd',
  dining: '#faae6d',
  shopping: '#f6df73',
  outdoors: '#7de08c',
  culture: '#f88ed5',
  lodging: '#c290f6',
  transit: '#6fb3ff',
  education: '#b4927d',
} as const

const fillColors: Record<string, string> = {
  park: dark.park,
  landuse_residential: dark.residential,
  landcover_wood: dark.wood,
  landcover_grass: dark.grass,
  landcover_ice: dark.ice,
  landcover_wetland: dark.wetland,
  landcover_sand: dark.sand,
  landuse_pitch: dark.park,
  landuse_track: dark.park,
  landuse_cemetery: dark.cemetery,
  landuse_hospital: dark.institution,
  landuse_school: dark.institution,
  water: dark.water,
  aeroway_fill: dark.institution,
  road_area_pattern: dark.path,
  building: dark.building,
}
const placeColor: ExpressionSpecification = [
  'match',
  ['get', 'class'],
  ['restaurant', 'cafe', 'fast_food', 'bar', 'pub', 'bakery', 'ice_cream'],
  dark.dining,
  [
    'shop',
    'grocery',
    'supermarket',
    'clothing_store',
    'furniture',
    'mall',
    'marketplace',
    'alcohol_shop',
  ],
  dark.shopping,
  [
    'park',
    'stadium',
    'pitch',
    'garden',
    'playground',
    'sports_centre',
    'swimming_pool',
  ],
  dark.outdoors,
  [
    'museum',
    'theatre',
    'cinema',
    'attraction',
    'art_gallery',
    'zoo',
    'monument',
  ],
  dark.culture,
  ['lodging', 'hotel', 'motel', 'hostel'],
  dark.lodging,
  ['rail', 'railway', 'bus', 'airport', 'ferry_terminal'],
  dark.transit,
  ['school', 'college', 'university', 'library'],
  dark.education,
  dark.text,
]

function lineColor(layer: Extract<LayerSpecification, { type: 'line' }>) {
  const source = layer['source-layer']
  if (source === 'waterway') return dark.water
  if (source === 'park') return dark.parkOutline
  if (source === 'boundary') return dark.border
  if (source === 'aeroway') return dark.road
  if (layer.id.includes('casing')) return dark.land
  if (layer.id.includes('rail')) return dark.rail
  if (layer.id.includes('path') || layer.id.includes('track')) return dark.path
  if (/motorway|trunk|primary|secondary|tertiary/.test(layer.id))
    return dark.majorRoad
  return dark.road
}

function linePaint(layer: Extract<LayerSpecification, { type: 'line' }>) {
  const paint = { ...layer.paint, 'line-color': lineColor(layer) }
  // The daytime style's pale casings provide local streets below zoom 14. Dark casings blend into the land, so draw their cores earlier.
  if (/^(road_minor|tunnel_minor|bridge_street)$/.test(layer.id))
    paint['line-width'] = [
      'interpolate',
      ['linear'],
      ['zoom'],
      12,
      0.45,
      14,
      1.25,
      18,
      7,
      20,
      14,
    ]
  else if (layer.id.endsWith('service_track'))
    paint['line-width'] = [
      'interpolate',
      ['linear'],
      ['zoom'],
      12,
      0.2,
      14,
      0.65,
      18,
      3,
      20,
      5.5,
    ]
  return paint
}

function textColor(layer: Extract<LayerSpecification, { type: 'symbol' }>) {
  switch (layer['source-layer']) {
    case 'waterway':
    case 'water_name':
      return dark.waterText
    case 'poi':
      return layer.id === 'poi_transit' ? dark.transit : placeColor
    case 'transportation_name':
      return dark.roadText
    default:
      return dark.text
  }
}

function darkLayer(layer: LayerSpecification): LayerSpecification {
  switch (layer.type) {
    case 'background':
      return {
        ...layer,
        paint: { ...layer.paint, 'background-color': dark.land },
      }
    case 'raster':
      // The low-zoom daytime relief raster would otherwise leak its light palette into the dark style.
      return { ...layer, layout: { ...layer.layout, visibility: 'none' } }
    case 'fill': {
      const paint: NonNullable<typeof layer.paint> = {
        ...layer.paint,
        'fill-color': fillColors[layer.id] ?? dark.land,
        'fill-opacity':
          layer['source-layer'] === 'building'
            ? ['interpolate', ['linear'], ['zoom'], 13, 0, 14, 0.6, 16, 1]
            : 1,
        'fill-outline-color':
          layer['source-layer'] === 'building'
            ? dark.buildingOutline
            : (fillColors[layer.id] ?? dark.land),
      }
      // Daytime pedestrian/wetland bitmap patterns cannot be recolored with fill-color.
      delete paint['fill-pattern']
      return { ...layer, paint }
    }
    case 'fill-extrusion':
      return {
        ...layer,
        paint: {
          ...layer.paint,
          'fill-extrusion-color': dark.building,
          'fill-extrusion-opacity': 1,
        },
      }
    case 'line':
      return {
        ...layer,
        paint: linePaint(layer),
      }
    case 'symbol': {
      const source = layer['source-layer']
      const water = source === 'waterway' || source === 'water_name'
      const poi = source === 'poi'
      const minzoom =
        layer.id === 'poi_r1'
          ? 12
          : layer.id === 'poi_r7'
            ? 13
            : layer.id === 'poi_r20'
              ? 15
              : layer.minzoom
      return {
        ...layer,
        minzoom,
        layout: {
          ...layer.layout,
          ...(poi
            ? { 'text-font': ['Noto Sans Regular'], 'text-size': 11 }
            : {}),
          ...(layer.id.includes('shield') || layer.id.includes('one_way')
            ? { visibility: 'none' }
            : {}),
        },
        paint: {
          ...layer.paint,
          'text-color': textColor(layer),
          'text-halo-color': water ? dark.water : dark.land,
          'text-halo-width': 1,
          'text-halo-blur': 0.5,
        },
      }
    }
    default:
      return layer
  }
}

/** Recolor the public vector style before MapLibre commits it, preserving source URLs, attribution, geographic filters and road hierarchy. */
export function createDarkMapStyle(
  style: StyleSpecification,
): StyleSpecification {
  return {
    ...style,
    name: APP_NAME + ' მუქი რუკა',
    layers: style.layers.map(darkLayer),
  }
}
