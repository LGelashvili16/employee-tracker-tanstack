// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { requestGeocoding } from './geocoding.server'

vi.mock('@tanstack/react-start/server-only', () => ({}))
const response = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [44.74512, 41.71983] },
      properties: {
        osm_type: 'W',
        osm_id: 123,
        name: 'უნივერსიტეტის ქუჩა',
        city: 'თბილისი',
        countrycode: 'GE',
        type: 'street',
      },
    },
  ],
}
afterEach(() => vi.unstubAllGlobals())
describe('Photon adapter', () => {
  it('retains mapped house numbers and recognizes highway streets without an optional type field', async () => {
    const street = {
      ...response.features[0],
      properties: {
        osm_type: 'W',
        osm_id: 456,
        name: 'უნივერსიტეტის ქუჩა',
        countrycode: 'GE',
        osm_key: 'highway',
      },
    }
    const building = {
      ...response.features[0],
      properties: {
        osm_type: 'W',
        osm_id: 123,
        street: 'უნივერსიტეტის ქუჩა',
        housenumber: '12',
        countrycode: 'GE',
        type: 'house',
      },
    }
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        Response.json({
          type: 'FeatureCollection',
          features: [building, street],
        }),
      ),
    )
    const result = await requestGeocoding(
      'https://geocoder.test',
      { kind: 'reverse', longitude: 44.8, latitude: 41.7 },
      'default',
    )
    expect(result[0]).toMatchObject({
      street: 'უნივერსიტეტის ქუჩა',
      houseNumber: '12',
      isStreet: false,
    })
    expect(result[1].isStreet).toBe(true)
  })
  it('uses a fixed endpoint, country filter and explicit source language', async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json(response))
    vi.stubGlobal('fetch', fetcher)
    const result = await requestGeocoding(
      'https://geocoder.test',
      { kind: 'search', q: 'უნივერსიტეტის ქუჩა' },
      'default',
    )
    const url = fetcher.mock.calls[0][0] as URL
    expect(url.origin).toBe('https://geocoder.test')
    expect(url.pathname).toBe('/api')
    expect(url.searchParams.get('countrycode')).toBe('GE')
    expect(url.searchParams.get('lang')).toBe('default')
    expect(url.searchParams.get('q')).toBe('უნივერსიტეტის ქუჩა')
    expect(fetcher.mock.calls[0][1]).toMatchObject({
      redirect: 'error',
      headers: { 'User-Agent': expect.stringContaining('Teamwork') },
    })
    expect(result[0]).toMatchObject({
      sourceId: 'W:123',
      name: 'უნივერსიტეტის ქუჩა',
      isStreet: true,
    })
  })
  it('requests nearby houses and streets for reverse lookup and rejects malformed responses', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(Response.json(response))
      .mockResolvedValueOnce(
        Response.json({
          type: 'FeatureCollection',
          features: [
            {
              ...response.features[0],
              geometry: { type: 'Point', coordinates: ['bad', 41] },
            },
          ],
        }),
      )
    vi.stubGlobal('fetch', fetcher)
    await requestGeocoding(
      'https://geocoder.test',
      { kind: 'reverse', longitude: 44.8, latitude: 41.7 },
      'en',
    )
    const url = fetcher.mock.calls[0][0] as URL
    expect(url.pathname).toBe('/reverse')
    expect(url.searchParams.getAll('layer')).toEqual(['house', 'street'])
    expect(url.searchParams.get('radius')).toBe('0.25')
    expect(url.searchParams.get('limit')).toBe('5')
    expect(url.searchParams.get('distance_sort')).toBe('true')
    await expect(
      requestGeocoding(
        'https://geocoder.test',
        { kind: 'search', q: 'Tbilisi' },
        'en',
      ),
    ).rejects.toThrow()
  })
  it('fails safely without retries on provider errors or oversized bodies', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 429 }))
      .mockResolvedValueOnce(new Response('x'.repeat(256001)))
    vi.stubGlobal('fetch', fetcher)
    for (let i = 0; i < 2; i++)
      await expect(
        requestGeocoding(
          'https://geocoder.test',
          { kind: 'search', q: 'Tbilisi' },
          'en',
        ),
      ).rejects.toThrow()
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
})
