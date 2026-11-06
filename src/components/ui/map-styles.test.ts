import { expect, it } from 'vitest'
import { createDarkMapStyle, createMapPlacesStyle } from './map-styles'
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
