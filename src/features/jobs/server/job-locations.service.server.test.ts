// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  resolveJobStreet,
  searchJobLocations,
  suggestCompanyJobAddress,
} from './job-locations.service.server'
import { AuthorizationError } from '#/lib/authorization/authorization-error'
import type { Actor } from '#/lib/authorization/actor'

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  reserve: vi.fn(),
  read: vi.fn(),
  write: vi.fn(),
}))
vi.mock('@tanstack/react-start/server-only', () => ({}))
vi.mock('#/server/integrations/geocoding.server', () => ({
  geocodingConfiguration: () => ({
    enabled: true,
    baseUrl: 'https://geocoder.test',
  }),
  requestGeocoding: mocks.request,
  GeocodingUnavailableError: class extends Error {},
}))
vi.mock('./job-locations.repository.server', () => ({
  readLocationCache: mocks.read,
  writeLocationCache: mocks.write,
  reserveLocationRequest: mocks.reserve,
}))
vi.mock('./jobs.repository.server', () => ({
  transactJobs: (fn: (tx: unknown) => unknown) => fn({}),
}))
vi.mock('./jobs.policy.server', () => ({
  assertJobManager: (actor: Actor) => {
    if (!actor.roles.includes('supervisor')) throw new AuthorizationError()
  },
  requireJobActor: (_tx: unknown, actor: Actor | null) => {
    if (!actor) throw new AuthorizationError()
    return actor
  },
}))
const actor: Actor = {
  id: 'test',
  name: 'ტესტი',
  email: null,
  emailVerified: false,
  roles: ['employee'],
}
const feature = {
  sourceId: 'W:123',
  longitude: 44.8,
  latitude: 41.7,
  name: 'უნივერსიტეტის ქუჩა',
  street: '',
  city: 'თბილისი',
  houseNumber: '',
  countryCode: 'GE',
  isStreet: true,
}
beforeEach(() => {
  vi.resetAllMocks()
  mocks.reserve.mockResolvedValue(0)
  mocks.read.mockResolvedValue(undefined)
})
describe('job location lookup', () => {
  it('fills a mapped building number together with its own street and merges languages by source identity', async () => {
    const manager: Actor = { ...actor, roles: ['supervisor'] }
    const building = {
      ...feature,
      isStreet: false,
      name: 'შენობა',
      street: feature.name,
      houseNumber: '12',
    }
    mocks.request.mockResolvedValueOnce([building]).mockResolvedValueOnce([
      {
        ...building,
        name: 'Building',
        street: 'University Street',
        city: 'Tbilisi',
      },
    ])
    expect(
      await suggestCompanyJobAddress(manager, {
        longitude: 44.8,
        latitude: 41.7,
      }),
    ).toBe('უნივერსიტეტის ქუჩა 12, თბილისი')
  })
  it('uses the street from a nearby building without borrowing its number and refuses ambiguous streets', async () => {
    const manager: Actor = { ...actor, roles: ['supervisor'] }
    const building = {
      ...feature,
      isStreet: false,
      name: 'შენობა',
      street: feature.name,
      houseNumber: '12',
      latitude: 41.7007,
    }
    mocks.request.mockResolvedValue([building])
    expect(
      await suggestCompanyJobAddress(manager, {
        longitude: 44.8,
        latitude: 41.7,
      }),
    ).toBe('უნივერსიტეტის ქუჩა, თბილისი')
    mocks.request.mockResolvedValue([
      feature,
      { ...feature, sourceId: 'W:456', name: 'სხვა ქუჩა', latitude: 41.70005 },
    ])
    expect(
      await suggestCompanyJobAddress(manager, {
        longitude: 44.8,
        latitude: 41.7,
      }),
    ).toBeNull()
  })
  it('authorizes and validates reverse address previews before provider/cache access', async () => {
    const position = { longitude: 44.8, latitude: 41.7 }
    await expect(suggestCompanyJobAddress(null, position)).rejects.toThrow(
      'წვდომა',
    )
    await expect(suggestCompanyJobAddress(actor, position)).rejects.toThrow(
      'წვდომა',
    )
    await expect(
      suggestCompanyJobAddress(
        { ...actor, roles: ['supervisor'] },
        { longitude: 41, latitude: 42 },
      ),
    ).rejects.toThrow('საქართველოს')
    expect(mocks.read).not.toHaveBeenCalled()
    expect(mocks.request).not.toHaveBeenCalled()
  })
  it('prefers a Georgian address, falls back to English, and permits missing results', async () => {
    const manager: Actor = { ...actor, roles: ['supervisor'] }
    const position = { longitude: 44.8, latitude: 41.7 }
    mocks.request
      .mockResolvedValueOnce([feature])
      .mockResolvedValueOnce([
        { ...feature, name: 'University Street', city: 'Tbilisi' },
      ])
    expect(await suggestCompanyJobAddress(manager, position)).toBe(
      'უნივერსიტეტის ქუჩა, თბილისი',
    )
    mocks.request
      .mockRejectedValueOnce(new Error('Unavailable'))
      .mockResolvedValueOnce([
        { ...feature, name: 'University Street', city: 'Tbilisi' },
      ])
    expect(await suggestCompanyJobAddress(manager, position)).toBe(
      'University Street, Tbilisi',
    )
    mocks.request.mockRejectedValue(new Error('Unavailable'))
    expect(await suggestCompanyJobAddress(manager, position)).toBeNull()
  })
  it('authenticates and validates before calling the external provider', async () => {
    await expect(searchJobLocations(null, { q: 'Tbilisi' })).rejects.toThrow(
      'წვდომა',
    )
    await expect(searchJobLocations(actor, { q: 'ab' })).rejects.toThrow()
    expect(mocks.request).not.toHaveBeenCalled()
  })
  it('pairs the same OSM street across local and English results', async () => {
    mocks.request
      .mockResolvedValueOnce([feature])
      .mockResolvedValueOnce([
        { ...feature, name: 'University Street', city: 'Tbilisi' },
      ])
    expect(
      await searchJobLocations(actor, { q: 'უნივერსიტეტის ქუჩა' }),
    ).toEqual([
      expect.objectContaining({
        streetNameKa: feature.name,
        streetNameEn: 'University Street',
        labelKa: 'უნივერსიტეტის ქუჩა, თბილისი',
        labelEn: 'University Street, Tbilisi',
      }),
    ])
  })
  it('preserves available names when only one language request succeeds', async () => {
    mocks.request
      .mockResolvedValueOnce([feature])
      .mockRejectedValueOnce(new Error('English unavailable'))
    expect(await searchJobLocations(actor, { q: 'თბილისი' })).toEqual([
      expect.objectContaining({
        streetNameKa: feature.name,
        streetNameEn: null,
      }),
    ])
    mocks.request
      .mockRejectedValueOnce(new Error('Local unavailable'))
      .mockResolvedValueOnce([
        { ...feature, name: 'University Street', city: 'Tbilisi' },
      ])
    expect(await resolveJobStreet({ longitude: 44.8, latitude: 41.7 })).toEqual(
      expect.objectContaining({
        streetNameKa: null,
        streetNameEn: 'University Street',
      }),
    )
  })
  it('never labels a Georgian fallback as an English translation and filters foreign coordinates', async () => {
    mocks.request.mockResolvedValue([
      feature,
      { ...feature, sourceId: 'W:456', longitude: 44.681, latitude: 43.024 },
    ])
    const result = await searchJobLocations(actor, { q: 'Tbilisi' })
    expect(result).toHaveLength(1)
    expect(result[0].streetNameEn).toBeNull()
  })
  it('uses validated cache entries without external requests and saves gracefully on provider failure', async () => {
    mocks.read.mockResolvedValue([feature])
    expect(await searchJobLocations(actor, { q: 'Tbilisi' })).toHaveLength(1)
    expect(mocks.request).not.toHaveBeenCalled()
    mocks.read.mockResolvedValue(undefined)
    mocks.request.mockRejectedValue(new Error('Network'))
    expect(
      await resolveJobStreet({ longitude: 44.8, latitude: 41.7 }),
    ).toBeNull()
    await expect(searchJobLocations(actor, { q: 'Tbilisi' })).rejects.toThrow(
      'დროებით მიუწვდომელია',
    )
  })
})
