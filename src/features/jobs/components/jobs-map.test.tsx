import { render } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import JobsMap from './jobs-map'
import type { ReactNode } from 'react'

afterEach(() => vi.unstubAllGlobals())
const map = vi.hoisted(() => ({
  fitBounds: vi.fn(),
  flyTo: vi.fn(),
  getZoom: () => 11,
}))
vi.mock('#/components/ui/map', () => ({
  Map: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  MapMarker: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  MapControls: () => null,
  useMap: () => ({ map, library: {} }),
}))

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
