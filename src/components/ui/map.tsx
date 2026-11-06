// Focused adaptation of mapcn's Map/useMap/MapMarker composition (MIT).
// Source and license: https://github.com/AnmolSaini16/mapcn
import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import 'maplibre-gl/dist/maplibre-gl.css'
import { IconMinus, IconPlus, IconRefresh } from '@tabler/icons-react'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import { Spinner } from '#/components/ui/spinner'
import { toast } from 'sonner'
import { cn } from '#/lib/utils'
import {
  createDarkMapStyle,
  createMapPlacesStyle,
  mapStyleUrl,
} from './map-styles'
import type { ReactNode, RefObject } from 'react'
import type * as MapLibre from 'maplibre-gl'

type MapContextValue = { map: MapLibre.Map; library: typeof MapLibre }
export type MapCamera = {
  center: [number, number]
  zoom: number
  bearing: number
  pitch: number
}
function readCamera(map: MapLibre.Map): MapCamera {
  const point = map.getCenter()
  return {
    center: [point.lng, point.lat],
    zoom: map.getZoom(),
    bearing: map.getBearing(),
    pitch: map.getPitch(),
  }
}
const MapContext = createContext<MapContextValue | null>(null)
export function useMap() {
  const context = useContext(MapContext)
  if (!context) throw new Error('Map controls require a Map parent')
  return context
}
export function Map({
  children,
  className,
  center = [44.8015, 41.6938],
  zoom = 11,
  camera,
  showPlaces = false,
}: {
  children?: ReactNode
  className?: string
  center?: [number, number]
  zoom?: number
  camera?: RefObject<MapCamera | null>
  showPlaces?: boolean
}) {
  const container = useRef<HTMLDivElement>(null)
  const initial = useRef({ center, zoom })
  const places = useRef(showPlaces)
  places.current = showPlaces
  const sourceStyle = useRef<MapLibre.StyleSpecification | null>(null)
  const [context, setContext] = useState<MapContextValue | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [retrying, setRetrying] = useState(false)
  const retryRequested = useRef(false)
  useEffect(() => {
    let disposed = false
    let instance: MapLibre.Map | undefined
    let observer: MutationObserver | undefined
    let resize: ResizeObserver | undefined
    const fail = () => {
      if (disposed) return
      setFailed(true)
      setRetrying(false)
      if (retryRequested.current) {
        retryRequested.current = false
        toast.error('რუკა ვერ ჩაიტვირთა. გამოიყენეთ სამუშაოების სია.')
      }
    }
    const timeout = setTimeout(fail, 25_000)
    void import('maplibre-gl')
      .then((library) => {
        if (disposed || !container.current) return
        // Vite emits the worker and its shared module together; no remote executable code is needed.
        library.setWorkerUrl(workerUrl)
        const isDark = () =>
          document.documentElement.dataset.theme === 'dark' ||
          document.documentElement.classList.contains('dark')
        let appliedDark = isDark()
        instance = new library.Map({
          container: container.current,
          center: initial.current.center,
          zoom: initial.current.zoom,
          ...camera?.current,
          style: mapStyleUrl,
          transformStyle: (_previous, next) => {
            sourceStyle.current = next
            return createMapPlacesStyle(
              appliedDark ? createDarkMapStyle(next) : next,
              places.current,
            )
          },
          renderWorldCopies: false,
          attributionControl: { compact: true },
          locale: {
            'AttributionControl.ToggleAttribution': 'რუკის წყაროები',
            'Map.Title': 'სამუშაოების რუკა',
          },
        })
        const map = instance
        const saveCamera = () => {
          if (!camera) return
          camera.current = readCamera(map)
        }
        map.on('moveend', saveCamera)
        map
          .getCanvas()
          .setAttribute(
            'aria-label',
            'სამუშაოების რუკა. ჩანაწერები ასევე ხელმისაწვდომია სიაში.',
          )
        map.on('load', () => {
          clearTimeout(timeout)
          setLoaded(true)
          setFailed(false)
          setRetrying(false)
          if (retryRequested.current) {
            retryRequested.current = false
            toast.success('რუკა ჩატვირთულია.')
          }
        })
        observer = new MutationObserver(() => {
          const next = isDark()
          if (next === appliedDark) return
          appliedDark = next
          map.setStyle(mapStyleUrl)
        })
        observer.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ['class', 'data-theme'],
        })
        resize = new ResizeObserver(() => map.resize())
        resize.observe(container.current)
        setContext({ map, library })
      })
      .catch(() => {
        if (!disposed) {
          clearTimeout(timeout)
          fail()
        }
      })
    return () => {
      disposed = true
      clearTimeout(timeout)
      observer?.disconnect()
      resize?.disconnect()
      if (instance && camera) {
        camera.current = readCamera(instance)
      }
      instance?.remove()
    }
  }, [attempt, camera])
  useEffect(() => {
    if (context && sourceStyle.current)
      context.map.setStyle(sourceStyle.current)
  }, [context, showPlaces])
  return (
    <div
      className={cn(
        'relative isolate h-full w-full overflow-hidden bg-muted',
        className,
      )}
    >
      <div ref={container} className="h-full w-full" />
      {context ? (
        <MapContext.Provider value={context}>{children}</MapContext.Provider>
      ) : null}
      {!loaded && !failed ? (
        <div className="absolute inset-0" role="status" aria-busy="true">
          <span className="sr-only">რუკა იტვირთება</span>
          <Skeleton className="h-full w-full rounded-none" aria-hidden="true" />
        </div>
      ) : null}
      {failed || retrying ? (
        <Alert
          className="absolute inset-x-4 top-4 z-20 w-auto"
          variant={failed ? 'destructive' : 'info'}
        >
          <AlertTitle>
            {failed ? 'რუკა ვერ ჩაიტვირთა' : 'რუკა იტვირთება'}
          </AlertTitle>
          <AlertDescription>
            გადაამოწმეთ ინტერნეტი ან გამოიყენეთ სამუშაოების სია. მდებარეობა
            კოორდინატებითაც შეგიძლიათ მიუთითოთ.
          </AlertDescription>
          <Button
            variant="outline"
            depth="raised"
            className="mt-3 min-w-40"
            disabled={retrying}
            aria-busy={retrying}
            onClick={() => {
              retryRequested.current = true
              setRetrying(true)
              setFailed(false)
              setLoaded(false)
              setContext(null)
              setAttempt((value) => value + 1)
            }}
          >
            {retrying ? (
              <Spinner aria-hidden="true" />
            ) : (
              <IconRefresh aria-hidden="true" />
            )}
            ხელახლა ცდა
          </Button>
        </Alert>
      ) : null}
    </div>
  )
}

/** React owns the marker content. The effect owns the external MapLibre marker and its cleanup. */
export function MapMarker({
  longitude,
  latitude,
  children,
}: {
  longitude: number
  latitude: number
  children: ReactNode
}) {
  const { map, library } = useMap()
  const [element] = useState(() => document.createElement('div'))
  const markerRef = useRef<MapLibre.Marker | null>(null)
  const position = useRef({ longitude, latitude })
  position.current = { longitude, latitude }
  useEffect(() => {
    const marker = new library.Marker({ element, anchor: 'bottom' })
      .setLngLat([position.current.longitude, position.current.latitude])
      .addTo(map)
    markerRef.current = marker
    return () => {
      markerRef.current = null
      marker.remove()
    }
  }, [map, library, element])
  useEffect(() => {
    markerRef.current?.setLngLat([longitude, latitude])
  }, [longitude, latitude])
  return createPortal(children, element)
}
export function MapControls() {
  const { map } = useMap()
  return (
    <div
      className="absolute right-4 bottom-12 z-10 flex flex-col gap-2 rounded-xl border bg-background p-1.5 shadow-sm"
      role="group"
      aria-label="რუკის მასშტაბი"
    >
      <Button
        variant="outline"
        depth="raised"
        size="icon-lg"
        aria-label="რუკის გადიდება"
        title="გადიდება"
        onClick={() => map.zoomIn()}
      >
        <IconPlus aria-hidden="true" />
      </Button>
      <Button
        variant="outline"
        depth="raised"
        size="icon-lg"
        aria-label="რუკის დაპატარავება"
        title="დაპატარავება"
        onClick={() => map.zoomOut()}
      >
        <IconMinus aria-hidden="true" />
      </Button>
    </div>
  )
}
