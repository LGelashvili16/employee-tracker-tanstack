import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import JobsMap from './jobs-map'
import type { ReactNode } from 'react'

afterEach(() => vi.unstubAllGlobals())
const map = vi.hoisted(() => ({
  fitBounds: vi.fn(),
  flyTo: vi.fn(),
  getZoom: () => 11,
}))
const bounds = vi.hoisted(() => ({ extend: vi.fn() }))
vi.mock('#/components/ui/map', () => ({
  Map: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  MapMarker: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  MapControls: () => null,
  useMap: () => ({
    map,
    loaded: true,
    library: {
      LngLatBounds: class {
        extend = bounds.extend
      },
    },
  }),
}))

it('waits for the initial job results before fitting all pins and does not refit updates', () => {
  map.fitBounds.mockClear()
  bounds.extend.mockClear()
  const pin = {
    id: 'first',
    title: 'პირველი',
    kind: 'installation' as const,
    status: 'pending' as const,
    longitude: 44.8,
    latitude: 41.7,
  }
  const distant = { ...pin, id: 'second', longitude: 42.7, latitude: 42.2 }
  const props = {
    pins: [pin],
    pinsReady: false,
    showEmpty: false,
    onPick: vi.fn(),
    onSelect: vi.fn(),
    camera: { current: null },
    focused: { current: null },
    canCreate: false,
    expanded: false,
    onExpand: vi.fn(),
    focusRequest: 0,
    actor: {
      id: 'employee',
      name: 'თანამშრომელი',
      email: null,
      emailVerified: false,
      roles: [],
    },
    showPlaces: false,
    onPlacesChange: vi.fn(),
    showBuildings: false,
    onBuildingsChange: vi.fn(),
  }
  const view = render(<JobsMap {...props} />)
  expect(map.fitBounds).not.toHaveBeenCalled()
  view.rerender(<JobsMap {...props} pins={[pin, distant]} pinsReady />)
  expect(bounds.extend).toHaveBeenCalledWith([44.8, 41.7])
  expect(bounds.extend).toHaveBeenCalledWith([42.7, 42.2])
  expect(map.fitBounds).toHaveBeenCalledTimes(1)
  view.rerender(<JobsMap {...props} pins={[pin]} pinsReady />)
  expect(map.fitBounds).toHaveBeenCalledTimes(1)
})

it('refocuses deliberate repeat selections and preserves focus across dialog remounts', () => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: false })),
  )
  map.flyTo.mockClear()
  const focused: { current: string | null } = { current: null }
  const camera = { current: null }
  const props = {
    pins: [],
    pinsReady: true,
    showEmpty: false,
    onPick: vi.fn(),
    onSelect: vi.fn(),
    camera,
    focused,
    canCreate: false,
    expanded: false,
    onExpand: vi.fn(),
    focusRequest: 0,
    actor: {
      id: 'employee',
      name: 'თანამშრომელი',
      email: null,
      emailVerified: false,
      roles: [],
    },
    showPlaces: false,
    onPlacesChange: vi.fn(),
    showBuildings: false,
    onBuildingsChange: vi.fn(),
    location: {
      sourceId: 'W:123',
      longitude: 44.8,
      latitude: 41.7,
      labelKa: 'თბილისი',
      labelEn: 'Tbilisi',
      streetNameKa: null,
      streetNameEn: null,
    },
  }
  const view = render(<JobsMap {...props} />)
  expect(map.flyTo).toHaveBeenCalledTimes(1)
  view.rerender(<JobsMap {...props} focusRequest={1} />)
  expect(map.flyTo).toHaveBeenCalledTimes(2)
  view.unmount()
  render(<JobsMap {...props} expanded focusRequest={1} />)
  expect(map.flyTo).toHaveBeenCalledTimes(2)
})

it('fits all pins on reload with a selected job and still focuses a later selection', () => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: false })),
  )
  map.fitBounds.mockClear()
  map.flyTo.mockClear()
  const first = {
    id: 'first',
    title: 'პირველი',
    kind: 'installation' as const,
    status: 'pending' as const,
    longitude: 44.8,
    latitude: 41.7,
  }
  const second = { ...first, id: 'second', longitude: 42.7, latitude: 42.2 }
  const props = {
    pins: [first, second],
    pinsReady: true,
    initialPin: first.id,
    selected: first,
    showEmpty: false,
    onPick: vi.fn(),
    onSelect: vi.fn(),
    camera: { current: null },
    focused: { current: null },
    canCreate: false,
    expanded: false,
    onExpand: vi.fn(),
    focusRequest: 0,
    actor: {
      id: 'employee',
      name: 'თანამშრომელი',
      email: null,
      emailVerified: false,
      roles: [],
    },
    showPlaces: false,
    onPlacesChange: vi.fn(),
    showBuildings: false,
    onBuildingsChange: vi.fn(),
  }
  const view = render(<JobsMap {...props} />)
  expect(map.fitBounds).toHaveBeenCalledTimes(1)
  expect(map.flyTo).not.toHaveBeenCalled()
  view.rerender(<JobsMap {...props} selected={second} focusRequest={1} />)
  expect(map.flyTo).toHaveBeenCalledWith(
    expect.objectContaining({ center: [42.7, 42.2] }),
  )
})

it('exposes an accessible buildings toggle with the controlled state', async () => {
  const onBuildingsChange = vi.fn()
  const props = {
    pins: [],
    pinsReady: true,
    showEmpty: false,
    onPick: vi.fn(),
    onSelect: vi.fn(),
    camera: { current: null },
    focused: { current: null },
    canCreate: false,
    expanded: false,
    onExpand: vi.fn(),
    focusRequest: 0,
    actor: {
      id: 'employee',
      name: 'თანამშრომელი',
      email: null,
      emailVerified: false,
      roles: [],
    },
    showPlaces: false,
    onPlacesChange: vi.fn(),
    showBuildings: false,
    onBuildingsChange,
  }
  const view = render(<JobsMap {...props} />)
  const user = userEvent.setup()
  expect(
    screen.getByRole('button', { name: 'სამგანზომილებიანი შენობები' }),
  ).toHaveAttribute('aria-pressed', 'false')
  await user.click(
    screen.getByRole('button', { name: 'სამგანზომილებიანი შენობები' }),
  )
  expect(onBuildingsChange).toHaveBeenLastCalledWith(true)
  view.rerender(<JobsMap {...props} showBuildings />)
  expect(
    screen.getByRole('button', { name: 'სამგანზომილებიანი შენობები' }),
  ).toHaveAttribute('aria-pressed', 'true')
  await user.click(
    screen.getByRole('button', { name: 'სამგანზომილებიანი შენობები' }),
  )
  expect(onBuildingsChange).toHaveBeenLastCalledWith(false)
})
