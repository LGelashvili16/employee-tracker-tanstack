import { useEffect, useRef, useState } from 'react'
import {
  IconFocus2,
  IconMapPin,
  IconMaximize,
  IconMinimize,
  IconBuildingStore,
  IconBuildingSkyscraper,
} from '@tabler/icons-react'
import { Map, MapControls, MapMarker, useMap } from '#/components/ui/map'
import { Button } from '#/components/ui/button'
import { cn } from '#/lib/utils'
import { JobsMapMenu, MapContextLocation } from './jobs-map-menu'
import { JobMarker as JobMapMarker } from './job-marker'
import type { Actor } from '#/lib/authorization/actor'
import type { JobMapPosition, JobMarker } from '../jobs.types'
import type { ReactNode, RefObject } from 'react'
import type { MapCamera } from '#/components/ui/map'
import type { ResolvedLocation } from '../job-locations.types'

// Markers anchor at their bottom edge; reserve their height as well as the top controls.
const fitPadding = { top: 112, right: 64, bottom: 80, left: 64 }

function MapFocus({
  pins,
  selected,
  onSelect,
  location,
  focused,
  restoreCamera,
  focusRequest,
  actor,
}: {
  pins: Array<JobMarker>
  selected?: JobMarker
  onSelect: (id: string) => void
  location?: ResolvedLocation
  focused: RefObject<string | null>
  restoreCamera: boolean
  focusRequest: number
  actor: Actor
}) {
  const { map, library } = useMap()
  const initialized = useRef(restoreCamera)
  function fit() {
    if (!pins.length) return
    const bounds = new library.LngLatBounds()
    for (const pin of pins) bounds.extend([pin.longitude, pin.latitude])
    map.fitBounds(bounds, { padding: fitPadding, maxZoom: 14, duration: 0 })
  }
  useEffect(() => {
    if (!pins.length || initialized.current) return
    initialized.current = true
    if (location || selected) return
    const bounds = new library.LngLatBounds()
    for (const pin of pins) bounds.extend([pin.longitude, pin.latitude])
    map.fitBounds(bounds, { padding: fitPadding, maxZoom: 14, duration: 0 })
  }, [map, library, pins, location, selected])
  useEffect(() => {
    const target = location ?? selected
    const key = target
      ? [
          focusRequest,
          location?.sourceId ?? selected?.id,
          target.longitude,
          target.latitude,
        ].join(':')
      : null
    // The map is recreated in the expanded dialog. A previously focused result must not reset the restored camera.
    if (focused.current === key) return
    focused.current = key
    if (target)
      map.flyTo({
        center: [target.longitude, target.latitude],
        zoom: Math.max(map.getZoom(), 13),
        duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 0
          : 500,
      })
  }, [
    map,
    selected?.id,
    selected?.longitude,
    selected?.latitude,
    location?.sourceId,
    location?.longitude,
    location?.latitude,
    focused,
    focusRequest,
  ])
  const visiblePins =
    selected && !pins.some((pin) => pin.id === selected.id)
      ? [...pins, selected]
      : pins
  return (
    <>
      {location ? (
        <MapMarker longitude={location.longitude} latitude={location.latitude}>
          <span
            role="img"
            aria-label={`ნაპოვნი მდებარეობა: ${location.labelKa ?? location.labelEn}`}
            className="flex size-11 items-center justify-center rounded-2xl border-2 border-primary-foreground bg-primary text-primary-foreground shadow-md"
          >
            <IconMapPin className="size-6" aria-hidden="true" />
          </span>
        </MapMarker>
      ) : null}
      {visiblePins.map((pin) => (
        <MapMarker
          key={pin.id}
          longitude={pin.longitude}
          latitude={pin.latitude}
        >
          <JobMapMarker
            pin={pin}
            actor={actor}
            selected={selected?.id === pin.id}
            onSelect={onSelect}
          />
        </MapMarker>
      ))}
      <Button
        variant="outline"
        depth="raised"
        size="icon-lg"
        className="absolute top-16 right-4 z-10 bg-background dark:bg-background"
        aria-label="ყველა სამუშაოს ჩვენება"
        title="ყველა სამუშაოს ჩვენება"
        onClick={fit}
        disabled={!pins.length}
      >
        <IconFocus2 data-icon="inline-start" aria-hidden="true" />
      </Button>
    </>
  )
}
export default function JobsMap({
  pins,
  selected,
  onSelect,
  onPick,
  showEmpty,
  location,
  camera,
  focused,
  canCreate,
  onExpand,
  children,
  expanded,
  focusRequest,
  actor,
  showPlaces,
  onPlacesChange,
  showBuildings,
  onBuildingsChange,
}: {
  pins: Array<JobMarker>
  selected?: JobMarker
  onSelect: (id: string) => void
  onPick: (position: JobMapPosition) => void
  showEmpty: boolean
  location?: ResolvedLocation
  camera: RefObject<MapCamera | null>
  focused: RefObject<string | null>
  canCreate: boolean
  onExpand: () => void
  children?: ReactNode
  expanded: boolean
  focusRequest: number
  actor: Actor
  showPlaces: boolean
  onPlacesChange: (show: boolean) => void
  showBuildings: boolean
  onBuildingsChange: (show: boolean) => void
}) {
  const [position, setPosition] = useState<JobMapPosition | null>(null)
  const [restoreCamera] = useState(() => Boolean(camera.current))
  const content = (
    <Map camera={camera} showPlaces={showPlaces} showBuildings={showBuildings}>
      <MapFocus
        pins={pins}
        selected={selected}
        location={location}
        onSelect={onSelect}
        focused={focused}
        restoreCamera={restoreCamera}
        focusRequest={focusRequest}
        actor={actor}
      />
      {canCreate ? <MapContextLocation onPoint={setPosition} /> : null}
      <MapControls />
      <Button
        variant={showPlaces ? 'secondary' : 'outline'}
        depth="raised"
        size="icon-lg"
        className="absolute top-28 right-4 z-10 bg-background"
        aria-label="ობიექტების ჩვენება"
        aria-pressed={showPlaces}
        title={showPlaces ? 'ობიექტების დამალვა' : 'ობიექტების ჩვენება'}
        onClick={() => onPlacesChange(!showPlaces)}
      >
        <IconBuildingStore aria-hidden="true" />
      </Button>
      <Button
        variant={showBuildings ? 'default' : 'outline'}
        depth="raised"
        size="icon-lg"
        className={cn(
          'absolute top-40 right-4 z-10',
          !showBuildings && 'bg-background',
        )}
        aria-label="სამგანზომილებიანი შენობები"
        aria-pressed={showBuildings}
        title={
          showBuildings
            ? 'სამგანზომილებიანი შენობების გამორთვა'
            : 'სამგანზომილებიანი შენობების ჩართვა'
        }
        onClick={() => onBuildingsChange(!showBuildings)}
      >
        <IconBuildingSkyscraper aria-hidden="true" />
      </Button>
      <Button
        data-map-expand
        variant="outline"
        depth="raised"
        size="icon-lg"
        className="absolute top-4 right-4 z-10 bg-background dark:bg-background"
        aria-label={expanded ? 'რუკის შემცირება' : 'რუკის გაშლა'}
        title={expanded ? 'რუკის შემცირება' : 'რუკის გაშლა'}
        onClick={onExpand}
      >
        {expanded ? (
          <IconMinimize aria-hidden="true" />
        ) : (
          <IconMaximize aria-hidden="true" />
        )}
      </Button>
      {children}
      {showEmpty && !location ? (
        <div className="pointer-events-none absolute bottom-12 left-4 flex max-w-64 items-start gap-3 rounded-xl border bg-background/95 p-3 text-sm shadow-sm">
          <IconMapPin
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
          />
          <p className="leading-relaxed">ამ ხედში სამუშაოები ჯერ არ არის.</p>
        </div>
      ) : null}
    </Map>
  )
  return canCreate ? (
    <JobsMapMenu position={position} onCreate={onPick}>
      {content}
    </JobsMapMenu>
  ) : (
    content
  )
}
