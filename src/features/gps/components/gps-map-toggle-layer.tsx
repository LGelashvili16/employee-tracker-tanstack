import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { IconGps } from '@tabler/icons-react'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { gpsMapQuery, hasGpsPosition } from '../gps.queries'
import { GpsTrackerLayer } from './gps-tracker-layer'

/** Optional tracker layer for another feature's map. Render it inside a Map; the caller owns the toggle state. */
export function GpsMapToggleLayer({
  actorId,
  enabled,
  onEnabledChange,
}: {
  actorId: string
  enabled: boolean
  onEnabledChange: (enabled: boolean) => void
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const query = useQuery({
    ...gpsMapQuery(actorId, ''),
    enabled,
    retry: false,
    refetchInterval: 15_000,
  })
  const results = enabled && query.isSuccess ? query.data : undefined
  return (
    <>
      <Button
        variant={enabled ? 'default' : 'outline'}
        depth="raised"
        size="icon-lg"
        className={
          enabled
            ? 'absolute top-52 right-4 z-10'
            : 'absolute top-52 right-4 z-10 bg-background'
        }
        aria-label="GPS მოწყობილობების ჩვენება"
        aria-pressed={enabled}
        title={
          enabled ? 'GPS მოწყობილობების დამალვა' : 'GPS მოწყობილობების ჩვენება'
        }
        onClick={() => onEnabledChange(!enabled)}
      >
        <IconGps aria-hidden="true" />
      </Button>
      {enabled && query.isError ? (
        <Alert
          variant="destructive"
          className="absolute bottom-12 left-4 z-10 max-w-64"
        >
          <AlertDescription>GPS მდებარეობები ვერ ჩაიტვირთა.</AlertDescription>
        </Alert>
      ) : null}
      {results && results.total > results.devices.length && (
        <Alert className="absolute bottom-12 left-4 z-10 max-w-64">
          <AlertDescription>
            ნაჩვენებია {results.devices.length} / {results.total} მოწყობილობა.
          </AlertDescription>
        </Alert>
      )}
      {results ? (
        <GpsTrackerLayer
          devices={results.devices.filter(hasGpsPosition)}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      ) : null}
    </>
  )
}
