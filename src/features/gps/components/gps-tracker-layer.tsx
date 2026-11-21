import { useEffect, useRef } from 'react'
import { useMap } from '#/components/ui/map'
import { GpsTrackerMarker } from './gps-tracker-marker'
import type { GpsLocatedDevice } from '../gps.queries'

/** Tracker markers for any map. Selecting a tracker, from a pin or elsewhere, centers it below room for its popup. */
export function GpsTrackerLayer({
  devices,
  selectedId,
  onSelect,
}: {
  devices: Array<GpsLocatedDevice>
  selectedId: string | null
  onSelect: (id: string | null) => void
}) {
  const { map, loaded } = useMap()
  const selected = devices.find((device) => device.id === selectedId)
  const target = useRef(selected?.position)
  target.current = selected?.position
  // Moving the MapLibre camera synchronizes React selection with an external system.
  // Only a new selection moves it, so the periodic data refresh never recenters the map.
  useEffect(() => {
    const position = target.current
    if (!loaded || !selectedId || !position) return
    map.easeTo({
      center: [position.longitude, position.latitude],
      zoom: Math.max(map.getZoom(), 14),
      offset: [0, 90],
      duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 0
        : 500,
    })
  }, [map, loaded, selectedId])
  const now = Date.now()
  return devices.map((device) => (
    <GpsTrackerMarker
      key={device.id}
      device={device}
      selected={device.id === selectedId}
      onSelect={onSelect}
      now={now}
    />
  ))
}
