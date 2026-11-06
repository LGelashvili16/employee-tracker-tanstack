import { describe, expect, it } from 'vitest'
import {
  reverseAddressFeature,
  selectReverseLocation,
} from './job-locations.rules'
import type { LocationFeature } from './job-locations.types'

const position = { longitude: 44.8, latitude: 41.7 }
const house: LocationFeature = {
  ...position,
  sourceId: 'W:1',
  name: 'შენობა',
  street: 'უნივერსიტეტის ქუჩა',
  city: 'თბილისი',
  houseNumber: '12',
  countryCode: 'GE',
  isStreet: false,
}
const north = (metres: number) => position.latitude + metres / 111_195

describe('conservative reverse address selection', () => {
  it('uses one close building address and keeps its number on the same feature', () => {
    const selected = selectReverseLocation(position, [house])
    expect(selected).toEqual({
      sourceId: house.sourceId,
      includeHouseNumber: true,
    })
    expect(reverseAddressFeature(house, true)).toMatchObject({
      name: '',
      street: house.street,
      houseNumber: '12',
    })
  })
  it('suggests a nearby street from a building address but omits a distant building number', () => {
    const nearby = { ...house, latitude: north(80) }
    expect(selectReverseLocation(position, [nearby])).toEqual({
      sourceId: house.sourceId,
      includeHouseNumber: false,
    })
    expect(reverseAddressFeature(nearby, false).houseNumber).toBe('')
  })
  it('allows a short entrance offset for a well-separated mapped house number', () => {
    expect(
      selectReverseLocation(position, [{ ...house, latitude: north(25) }]),
    ).toEqual({ sourceId: house.sourceId, includeHouseNumber: true })
  })
  it('does not choose a house number from a neighboring address with comparable distance', () => {
    const first = { ...house, latitude: north(5) }
    const second = {
      ...house,
      sourceId: 'W:2',
      latitude: north(8),
      houseNumber: '14',
    }
    expect(selectReverseLocation(position, [second, first])).toEqual({
      sourceId: first.sourceId,
      includeHouseNumber: false,
    })
  })
  it('requires manual entry for competing street names at an intersection', () => {
    expect(
      selectReverseLocation(position, [
        house,
        { ...house, sourceId: 'W:2', latitude: north(8), street: 'სხვა ქუჩა' },
      ]),
    ).toBeNull()
  })
  it('keeps a clear closest street and rejects far or unnamed matches', () => {
    const street = {
      ...house,
      sourceId: 'W:3',
      isStreet: true,
      name: house.street,
      street: '',
      houseNumber: '',
    }
    expect(
      selectReverseLocation(position, [
        { ...house, sourceId: 'W:2', latitude: north(80), street: 'სხვა ქუჩა' },
        street,
      ]),
    ).toEqual({ sourceId: street.sourceId, includeHouseNumber: false })
    expect(
      selectReverseLocation(position, [{ ...house, latitude: north(300) }]),
    ).toBeNull()
    expect(
      selectReverseLocation(position, [{ ...house, street: '' }]),
    ).toBeNull()
  })
  it('does not count the same source in two languages as a competing street', () => {
    expect(
      selectReverseLocation(position, [
        house,
        { ...house, street: 'University Street' },
      ]),
    ).toEqual({ sourceId: house.sourceId, includeHouseNumber: true })
  })
})
