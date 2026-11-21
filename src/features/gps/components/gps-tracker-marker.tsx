import { useId, useRef } from 'react'
import { Link } from '@tanstack/react-router'
import { IconGps, IconX } from '@tabler/icons-react'
import { Badge } from '#/components/ui/badge'
import { Button, buttonVariants } from '#/components/ui/button'
import { MapMarker } from '#/components/ui/map'
import { formatGeorgianDateTime } from '#/lib/date-format'
import { cn } from '#/lib/utils'
import { formatGpsFixAge, isGpsFixStale } from '../gps.rules'
import { gpsTimeZone } from '../gps.schemas'
import { GpsBatteryLevel, gpsBatteryTone } from './gps-battery-level'
import type { GpsLocatedDevice } from '../gps.queries'
import type { Ref } from 'react'

type Props = {
  device: GpsLocatedDevice
  selected: boolean
  onSelect: (id: string | null) => void
  now: number
}

function Pin({
  device,
  selected,
  stale,
  age,
  onSelect,
  pinRef,
  popupId,
}: Omit<Props, 'now'> & {
  stale: boolean
  age: string
  pinRef: Ref<HTMLButtonElement>
  popupId: string
}) {
  return (
    <>
      <Button
        ref={pinRef}
        type="button"
        variant={stale ? 'outline' : 'default'}
        size="icon-lg"
        depth="raised"
        aria-label={`${device.name}, ბოლო მდებარეობა: ${age}`}
        aria-expanded={selected}
        aria-controls={selected ? popupId : undefined}
        onClick={(event) => {
          event.stopPropagation()
          onSelect(selected ? null : device.id)
        }}
        className={cn(
          'relative size-11 rounded-full border-2 shadow-lg motion-safe:hover:scale-105 focus-visible:ring-4 focus-visible:ring-ring/50',
          stale
            ? 'border-dashed border-muted-foreground bg-card text-muted-foreground'
            : 'border-background bg-primary text-primary-foreground',
          selected &&
            'scale-110 ring-4 ring-ring/40 ring-offset-2 ring-offset-background',
        )}
      >
        <IconGps className="size-5" aria-hidden="true" />
        <span
          aria-hidden="true"
          className={cn(
            'absolute -right-1 -bottom-1 size-4 rounded-full border-2 border-background bg-current',
            gpsBatteryTone(device.batteryPercent),
          )}
        />
      </Button>
      <span
        aria-hidden="true"
        className={cn(
          '-mt-1.5 size-3 rotate-45 rounded-[2px]',
          stale ? 'bg-muted-foreground' : 'bg-primary',
        )}
      />
      {selected ? null : (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-full mb-2 hidden w-max max-w-48 flex-col rounded-lg border bg-popover px-2.5 py-1.5 text-xs shadow-md group-focus-within:flex group-hover:flex"
        >
          <span className="font-medium break-words">{device.name}</span>
          <span className="text-muted-foreground">{age}</span>
        </span>
      )}
    </>
  )
}

function Popup({
  device,
  stale,
  age,
  onClose,
  id,
}: {
  device: GpsLocatedDevice
  stale: boolean
  age: string
  onClose: () => void
  id: string
}) {
  const { position } = device
  return (
    <div
      role="group"
      id={id}
      aria-label={`${device.name}: დეტალები`}
      className="absolute bottom-full mb-3 flex w-64 cursor-default flex-col gap-3 rounded-xl border bg-popover p-3 text-sm text-popover-foreground shadow-lg"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="font-semibold break-words">{device.name}</span>
          <Badge variant={stale ? 'secondary' : 'green'} className="w-max">
            {stale ? 'ძველი მდებარეობა' : 'აქტუალური მდებარეობა'}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="დახურვა"
          onClick={onClose}
        >
          <IconX aria-hidden="true" />
        </Button>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
        <dt className="text-muted-foreground">ბატარეა</dt>
        <dd>
          <GpsBatteryLevel percent={device.batteryPercent} />
        </dd>
        <dt className="text-muted-foreground">სიჩქარე</dt>
        <dd className="tabular-nums">{position.speedKmh} კმ/სთ</dd>
        <dt className="text-muted-foreground">GPS დრო</dt>
        <dd className="tabular-nums">
          {formatGeorgianDateTime(position.fixAt.toISOString(), gpsTimeZone)}
          <span className="block text-xs text-muted-foreground">{age}</span>
        </dd>
      </dl>
      <Link
        to="/manage/gps/$deviceId"
        params={{ deviceId: device.id }}
        search={{}}
        className={buttonVariants({ variant: 'outline', depth: 'raised' })}
      >
        მოწყობილობის ისტორია
      </Link>
    </div>
  )
}

/** Circular tracker pin, distinct from the rounded-square job markers, with a click-to-open popup. */
export function GpsTrackerMarker({ device, selected, onSelect, now }: Props) {
  const pinRef = useRef<HTMLButtonElement>(null)
  const popupId = useId()
  const close = () => {
    pinRef.current?.focus()
    onSelect(null)
  }
  const stale = isGpsFixStale(device.position.fixAt, now)
  const age = formatGpsFixAge(device.position.fixAt, now)
  return (
    <MapMarker
      longitude={device.position.longitude}
      latitude={device.position.latitude}
      elevated={selected}
    >
      <div
        className="group relative flex flex-col items-center"
        data-gps-marker
        onKeyDown={(event) => {
          if (event.key === 'Escape' && selected) {
            event.stopPropagation()
            close()
          }
        }}
      >
        <Pin
          device={device}
          selected={selected}
          stale={stale}
          age={age}
          onSelect={onSelect}
          pinRef={pinRef}
          popupId={popupId}
        />
        {selected ? (
          <Popup
            id={popupId}
            device={device}
            stale={stale}
            age={age}
            onClose={close}
          />
        ) : null}
      </div>
    </MapMarker>
  )
}
