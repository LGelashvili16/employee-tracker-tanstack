import { describe, expect, it } from 'vitest'
import { isLocationInGeorgia } from './jobs.geography'

describe('Georgia job territory', () => {
  it.each([
    ['Tbilisi', 44.8, 41.7],
    ['Batumi', 41.6367, 41.6461],
    ['Kutaisi', 42.7, 42.27],
    ['Poti', 41.671, 42.1462],
    ['Mestia', 42.728, 43.0452],
    ['Lagodekhi', 46.276, 41.8269],
    ['Stepantsminda', 44.645, 42.657],
    ['Sukhumi', 41.02, 43.0],
    ['Gagra', 40.268, 43.28],
    ['Tskhinvali', 43.97, 42.23],
  ])(
    'accepts %s within the national boundary',
    (_name, longitude, latitude) => {
      expect(isLocationInGeorgia({ longitude, latitude })).toBe(true)
    },
  )
  it.each([
    ['Istanbul', 28.9784, 41.0082],
    ['US state of Georgia', -84.388, 33.749],
    ['Vladikavkaz', 44.681, 43.024],
    ['Ardahan', 42.702, 41.11],
    ['Qazax', 45.365, 41.093],
    ['Alaverdi', 44.65, 41.09],
    ['Black Sea', 41.0, 42.0],
  ])(
    'rejects %s, including neighbouring land and water inside the bounding rectangle',
    (_name, longitude, latitude) => {
      expect(isLocationInGeorgia({ longitude, latitude })).toBe(false)
    },
  )
  it('includes exact border vertices but rejects non-finite or swapped coordinates', () => {
    expect(
      isLocationInGeorgia({
        longitude: 40.245084700000035,
        latitude: 43.585692300000034,
      }),
    ).toBe(true)
    for (const location of [
      { longitude: NaN, latitude: 41.7 },
      { longitude: 44.8, latitude: Infinity },
      { longitude: 41.7, latitude: 44.8 },
    ])
      expect(isLocationInGeorgia(location)).toBe(false)
  })
})
