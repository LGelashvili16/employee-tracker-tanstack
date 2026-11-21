import { Link } from '@tanstack/react-router'
import { IconHistory, IconPencil } from '@tabler/icons-react'
import { Badge } from '#/components/ui/badge'
import { Button, buttonVariants } from '#/components/ui/button'
import { cn } from '#/lib/utils'
import { formatGpsFixAge, isGpsFixStale } from '../gps.rules'
import { GpsBatteryLevel } from './gps-battery-level'
import type { GpsMapDevice } from '../gps.queries'

export function GpsDeviceCard({
  device,
  selected,
  onSelect,
  onEdit,
  now,
}: {
  device: GpsMapDevice
  selected: boolean
  onSelect: (id: string) => void
  onEdit?: (device: GpsMapDevice) => void
  now: number
}) {
  const fixAt = device.position?.fixAt
  const stale = fixAt ? isGpsFixStale(fixAt, now) : false
  return (
    <li className="relative">
      <button
        type="button"
        disabled={!device.position || !device.enabled}
        aria-pressed={selected}
        onClick={() => onSelect(device.id)}
        className={cn(
          'flex w-full cursor-pointer flex-col gap-2 border-l-4 border-transparent p-4 pr-14 text-left transition-colors outline-none hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:opacity-70',
          onEdit && 'pr-24',
          selected && 'border-primary bg-muted/60',
        )}
      >
        <span className="font-medium break-words">{device.name}</span>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <GpsBatteryLevel percent={device.batteryPercent} />
          {!device.enabled ? (
            <Badge variant="secondary">გამორთულია</Badge>
          ) : fixAt ? (
            <Badge variant={stale ? 'secondary' : 'green'}>
              {formatGpsFixAge(fixAt, now)}
            </Badge>
          ) : (
            <span className="text-muted-foreground">
              მდებარეობა არ დაფიქსირებულა
            </span>
          )}
        </span>
      </button>
      <div className="absolute top-3 right-3 flex gap-1.5">
        {onEdit ? (
          <Button
            variant="outline"
            depth="raised"
            size="icon"
            aria-label={`${device.name}: რედაქტირება`}
            title="რედაქტირება"
            onClick={() => onEdit(device)}
          >
            <IconPencil aria-hidden="true" />
          </Button>
        ) : null}
        <Link
          to="/manage/gps/$deviceId"
          params={{ deviceId: device.id }}
          search={{}}
          aria-label={`${device.name}: ისტორია`}
          title="მოწყობილობის ისტორია"
          className={buttonVariants({
            variant: 'outline',
            size: 'icon',
            depth: 'raised',
          })}
        >
          <IconHistory aria-hidden="true" />
        </Link>
      </div>
    </li>
  )
}
