import { useEffect, useEffectEvent } from 'react'
import { useMap } from '#/components/ui/map'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuTrigger,
} from '#/components/ui/context-menu'
import { jobKindSchema, jobLocationSchema } from '../jobs.schemas'
import { jobKinds } from '../jobs.presentation'
import { useMapLongPress } from '../hooks/use-map-long-press'
import type { ReactNode } from 'react'
import type { MapMouseEvent, MapTouchEvent } from 'maplibre-gl'
import type { JobMapPosition } from '../jobs.types'

export function MapContextLocation({
  onPoint,
}: {
  onPoint: (point: JobMapPosition) => void
}) {
  const { map } = useMap()
  const point = useEffectEvent(onPoint)
  // MapLibre owns geographic pointer coordinates; context menu and keyboard actions share the same location.
  useEffect(() => {
    const update = (event: MapMouseEvent | MapTouchEvent) =>
      point({
        longitude: Math.round(event.lngLat.wrap().lng * 1e6) / 1e6,
        latitude: Math.round(event.lngLat.lat * 1e6) / 1e6,
      })
    const keyboard = (event: KeyboardEvent) => {
      if (
        event.key !== 'ContextMenu' &&
        !(event.shiftKey && event.key === 'F10')
      )
        return
      const center = map.getCenter()
      point({ longitude: center.lng, latitude: center.lat })
    }
    // Listening to MapLibre's contextmenu event suppresses the native event that Base UI needs to open its menu.
    map.on('mousedown', update)
    map.on('touchstart', update)
    const canvas = map.getCanvas()
    canvas.addEventListener('keydown', keyboard)
    return () => {
      map.off('mousedown', update)
      map.off('touchstart', update)
      canvas.removeEventListener('keydown', keyboard)
    }
  }, [map])
  return null
}

export function JobsMapMenu({
  children,
  position,
  onCreate,
}: {
  children: ReactNode
  position: JobMapPosition | null
  onCreate: (position: JobMapPosition) => void
}) {
  const hold = useMapLongPress()
  const valid =
    position !== null && jobLocationSchema.safeParse(position).success
  return (
    <ContextMenu>
      <ContextMenuTrigger
        {...hold}
        className="h-full"
        onTouchStartCapture={(event) => {
          if (
            !(event.target instanceof HTMLCanvasElement) &&
            !(
              event.target instanceof Element &&
              event.target.closest('[data-job-marker]')
            )
          )
            event.stopPropagation()
        }}
        onContextMenuCapture={(event) => {
          if (
            event.target instanceof Element &&
            event.target.closest('[data-job-marker]')
          )
            return
          if (!(event.target instanceof HTMLCanvasElement))
            event.stopPropagation()
          else hold.onContextMenuCapture?.(event)
        }}
      >
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent
        aria-label="სამუშაოს დამატება რუკაზე"
        className="w-64 max-w-[calc(100vw-2rem)]"
      >
        <ContextMenuGroup>
          <ContextMenuLabel>
            {valid ? 'სამუშაოს ადგილი' : 'მონიშნეთ ადგილი საქართველოში'}
            {position ? (
              <span className="mt-1 block font-normal tabular-nums">
                {position.latitude.toFixed(6)}, {position.longitude.toFixed(6)}
              </span>
            ) : null}
          </ContextMenuLabel>
          {jobKindSchema.options.map((kind) => {
            const item = jobKinds[kind]
            const Icon = item.icon
            return (
              <ContextMenuItem
                key={kind}
                disabled={!valid}
                onClick={() => {
                  if (position) onCreate({ ...position, kind })
                }}
              >
                <Icon aria-hidden="true" />
                {item.createLabel}
              </ContextMenuItem>
            )
          })}
        </ContextMenuGroup>
      </ContextMenuContent>
    </ContextMenu>
  )
}
