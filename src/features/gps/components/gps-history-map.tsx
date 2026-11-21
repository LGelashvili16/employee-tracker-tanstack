import { useEffect, useMemo, useRef } from 'react'
import { IconMapPin } from '@tabler/icons-react'
import { Badge } from '#/components/ui/badge'
import { Map, MapControls, MapMarker, useMap } from '#/components/ui/map'
import { buildGpsTrack } from '../gps-track'
import type { GpsHistory } from '../gps.queries'
import type { FeatureCollection, LineString, Point } from 'geojson'
import type { GeoJSONSource } from 'maplibre-gl'

const sourceId = 'gps-history-track'
const lineId = 'gps-history-line'
const pointId = 'gps-history-point'
// A cartographic accent keeps the route visible on both basemaps.
const routeColor = '#8250df'
const mapLabel = 'მარშრუტის რუკა'
type Segments = ReturnType<typeof buildGpsTrack>

function TrackLayer({ segments }: { segments: Segments }) {
  const { map, library, loaded } = useMap()
  const fittedMap = useRef<typeof map>(null)
  const data = useMemo<FeatureCollection<LineString | Point>>(
    () => ({
      type: 'FeatureCollection',
      features: segments.map((segment) => ({
        type: 'Feature',
        properties: {},
        geometry:
          segment.length === 1
            ? { type: 'Point', coordinates: segment[0] }
            : { type: 'LineString', coordinates: segment },
      })),
    }),
    [segments],
  )
  useEffect(() => {
    function draw() {
      const source = map.getSource<GeoJSONSource>(sourceId)
      if (source) {
        source.setData(data)
        return
      }
      map.addSource(sourceId, { type: 'geojson', data })
      map.addLayer({
        id: lineId,
        type: 'line',
        source: sourceId,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': routeColor, 'line-width': 4 },
      })
      map.addLayer({
        id: pointId,
        type: 'circle',
        source: sourceId,
        filter: ['==', ['geometry-type'], 'Point'],
        paint: {
          'circle-color': routeColor,
          'circle-radius': 5,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
        },
      })
    }
    // The shared map replaces its style when the site theme changes.
    map.on('style.load', draw)
    if (map.getSource(sourceId) || map.isStyleLoaded()) draw()
    else map.once('idle', draw)
    // This overlay lives for the lifetime of its Map. Data changes update the source in place.
    return () => {
      map.off('style.load', draw)
      map.off('idle', draw)
    }
  }, [map, data])
  useEffect(() => {
    if (!loaded || fittedMap.current === map) return
    const coordinates = segments.flat()
    const bounds = new library.LngLatBounds()
    coordinates.forEach((coordinate) => bounds.extend(coordinate))
    if (
      bounds.getWest() !== bounds.getEast() ||
      bounds.getSouth() !== bounds.getNorth()
    ) {
      map.fitBounds(bounds, { padding: 44, maxZoom: 16, duration: 0 })
    }
    fittedMap.current = map
  }, [map, library, loaded, segments])
  return null
}

export function GpsHistoryMap({ fixes }: { fixes: GpsHistory['track'] }) {
  const segments = useMemo(() => buildGpsTrack(fixes), [fixes])
  const first = segments.at(0)?.at(0)
  const last = segments.at(-1)?.at(-1)
  if (!first || !last) {
    return (
      <div className="flex min-h-32 items-center justify-center gap-2 px-4 text-center text-sm text-muted-foreground">
        <IconMapPin aria-hidden="true" className="size-4 shrink-0" />
        ამ პერიოდში რუკაზე საჩვენებელი მდებარეობა არ არის.
      </div>
    )
  }
  return (
    <Map
      center={first}
      zoom={15}
      className="h-72 sm:h-96"
      label={mapLabel}
      showBuildings={false}
    >
      <TrackLayer segments={segments} />
      <MapControls />
      {first.join() !== last.join() && (
        <MapMarker longitude={first[0]} latitude={first[1]}>
          <Badge variant="secondary">დასაწყისი</Badge>
        </MapMarker>
      )}
      <MapMarker longitude={last[0]} latitude={last[1]}>
        <Badge variant="blue">ბოლო მდებარეობა</Badge>
      </MapMarker>
    </Map>
  )
}
