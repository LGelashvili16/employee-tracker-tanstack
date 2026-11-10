import { expect, it } from 'vitest'
import {
  createDarkMapStyle,
  createMapPlacesStyle,
  createMapBuildingsStyle,
} from './map-styles'
import type { StyleSpecification } from 'maplibre-gl'

const style: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [
    {
      id: 'poi_r1',
      type: 'symbol',
      source: 'tiles',
      'source-layer': 'poi',
      filter: ['<', ['get', 'rank'], 7],
      layout: { 'icon-image': ['get', 'class'] },
    },
    {
      id: 'airport',
      type: 'symbol',
      source: 'tiles',
      'source-layer': 'aerodrome_label',
    },
    {
      id: 'street',
      type: 'symbol',
      source: 'tiles',
      'source-layer': 'transportation_name',
    },
    { id: 'river', type: 'line', source: 'tiles', 'source-layer': 'waterway' },
  ],
}

it('keeps country borders visible at every zoom without changing boundary geography or dash patterns', () => {
  const borders: StyleSpecification = {
    ...style,
    layers: [
      {
        id: 'boundary_2',
        type: 'line',
        source: 'tiles',
        'source-layer': 'boundary',
        filter: ['==', ['get', 'admin_level'], 2],
        paint: {
          'line-opacity': ['interpolate', ['linear'], ['zoom'], 0, 0.4, 4, 1],
        },
      },
      {
        id: 'boundary_disputed',
        type: 'line',
        source: 'tiles',
        'source-layer': 'boundary',
        filter: ['==', ['get', 'disputed'], 1],
        paint: { 'line-dasharray': [1, 2] },
      },
      {
        id: 'boundary_3',
        type: 'line',
        source: 'tiles',
        'source-layer': 'boundary',
        minzoom: 5,
        filter: ['>=', ['get', 'admin_level'], 3],
        paint: { 'line-dasharray': [1, 1] },
      },
    ],
  }
  const result = createDarkMapStyle(borders)
  for (const [index, layer] of result.layers.entries()) {
    const original = borders.layers[index]
    if (layer.type !== 'line' || original.type !== 'line')
      throw new Error('Expected boundary lines')
    expect(layer.filter).toEqual(original.filter)
    expect(layer.minzoom).toBe(borders.layers[index].minzoom)
    expect(layer.maxzoom).toBe(borders.layers[index].maxzoom)
    if (index < 2) {
      expect(layer.paint?.['line-opacity']).toBe(1)
      expect(layer.paint?.['line-blur']).toBe(0)
      const width = layer.paint?.['line-width']
      if (!Array.isArray(width))
        throw new Error('Expected a zoom width expression')
      const widths = width.slice(4).filter((_, position) => position % 2 === 0)
      expect(
        widths.every((value) => typeof value === 'number' && value >= 1),
      ).toBe(true)
      expect(layer.paint?.['line-color']).not.toBe(
        result.layers[2].type === 'line'
          ? result.layers[2].paint?.['line-color']
          : undefined,
      )
    }
  }
  expect(result.layers[1]).toMatchObject({
    paint: { 'line-dasharray': [1, 2] },
  })
  expect(result.layers[2]).toMatchObject({
    paint: { 'line-dasharray': [1, 1] },
  })
  expect(borders.layers[0]).toMatchObject({
    paint: {
      'line-opacity': ['interpolate', ['linear'], ['zoom'], 0, 0.4, 4, 1],
    },
  })
})
it.each([false, true])(
  'flattens buildings and restores provider heights in either theme (dark: %s)',
  (dark) => {
    const provider: StyleSpecification = {
      ...style,
      layers: [
        ...style.layers,
        {
          id: 'buildings-3d',
          type: 'fill-extrusion',
          source: 'tiles',
          'source-layer': 'building',
          paint: {
            'fill-extrusion-height': ['get', 'height'],
            'fill-extrusion-base': ['get', 'min_height'],
            'fill-extrusion-color': '#ffffff',
          },
        },
      ],
    }
    const original = dark ? createDarkMapStyle(provider) : provider
    const flat = createMapBuildingsStyle(original, false)
    expect(flat.layers.at(-1)).toMatchObject({
      paint: { 'fill-extrusion-height': 0, 'fill-extrusion-base': 0 },
    })
    expect(flat.layers[2]).toBe(original.layers[2])
    expect(original.layers.at(-1)).toMatchObject({
      paint: {
        'fill-extrusion-height': ['get', 'height'],
        'fill-extrusion-base': ['get', 'min_height'],
      },
    })
    expect(createMapBuildingsStyle(original, true)).toBe(original)
    expect(
      createMapBuildingsStyle(
        createMapPlacesStyle(original, false),
        false,
      ).layers.at(-1),
    ).toMatchObject({ paint: { 'fill-extrusion-height': 0 } })
  },
)
it.each([false, true])(
  'hides optional POIs, retains metro and geography, and restores the original style (dark: %s)',
  (dark) => {
    const original = dark ? createDarkMapStyle(style) : style
    const hidden = createMapPlacesStyle(original, false)
    expect(hidden.layers[0]).toMatchObject({
      filter: [
        'all',
        ['<', ['get', 'rank'], 7],
        [
          'match',
          ['get', 'subclass'],
          ['subway', 'subway_entrance'],
          true,
          false,
        ],
      ],
    })
    expect(hidden.layers[1]).toMatchObject({ layout: { visibility: 'none' } })
    expect(hidden.layers[2]).toBe(original.layers[2])
    expect(hidden.layers[3]).toBe(original.layers[3])
    expect(original.layers[0]).toMatchObject({
      filter: ['<', ['get', 'rank'], 7],
    })
    expect(createMapPlacesStyle(original, true)).toBe(original)
  },
)
