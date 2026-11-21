import { useQuery } from '@tanstack/react-query'
import {
  IconActivity,
  IconAlertCircle,
  IconDeviceMobilePlus,
  IconShieldCheck,
} from '@tabler/icons-react'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import { formatGeorgianDateTime } from '#/lib/date-format'
import { getGpsDiagnostics } from '../gps.functions'
import { gpsKey } from '../gps.queries'
import { gpsTimeZone } from '../gps.schemas'
import { GpsErrorSheet } from './gps-error-sheet'

const activity = [
  {
    kind: 'registration',
    label: 'ბოლო რეგისტრაციის მოთხოვნა',
    icon: IconDeviceMobilePlus,
  },
  {
    kind: 'authentication',
    label: 'ბოლო წარმატებული ავთენტიფიკაცია',
    icon: IconShieldCheck,
  },
  { kind: 'heartbeat', label: 'ბოლო საკონტროლო სიგნალი', icon: IconActivity },
  {
    kind: 'decode_error',
    label: 'ბოლო დეკოდირების შეცდომა',
    icon: IconAlertCircle,
  },
] as const

export function GpsDeviceDiagnostics({
  actorId,
  deviceId,
  deviceName,
}: {
  actorId: string
  deviceId: string
  deviceName: string
}) {
  const query = useQuery({
    queryKey: [...gpsKey(actorId), 'diagnostics', deviceId],
    queryFn: () => getGpsDiagnostics({ data: { deviceId } }),
    refetchInterval: 15_000,
  })
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>კავშირის დიაგნოსტიკა</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {query.isPending ? (
          <div role="status" aria-busy="true">
            <span className="sr-only">კავშირის დიაგნოსტიკა იტვირთება</span>
            <Skeleton className="h-16" aria-hidden="true" />
          </div>
        ) : query.isError ? (
          <Alert variant="destructive">
            <AlertDescription>
              კავშირის დიაგნოსტიკა ვერ ჩაიტვირთა. განაახლეთ გვერდი.
            </AlertDescription>
          </Alert>
        ) : (
          <dl className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {activity.map(({ kind, label, icon: Icon }) => {
              const event = query.data.find((item) => item.kind === kind)
              const receivedAt = event?.receivedAt
              const value = receivedAt && (
                <time dateTime={receivedAt.toISOString()}>
                  {formatGeorgianDateTime(
                    receivedAt.toISOString(),
                    gpsTimeZone,
                    true,
                  )}
                </time>
              )
              return (
                <div
                  key={kind}
                  className="flex flex-col gap-2 rounded-lg border bg-muted/25 p-3"
                >
                  <dt className="flex items-center gap-2 text-sm font-medium">
                    <Icon
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                    {label}
                  </dt>
                  <dd className="text-sm tabular-nums text-muted-foreground">
                    {kind === 'decode_error' && event ? (
                      <div className="flex flex-wrap items-center gap-2">
                        {value}
                        <GpsErrorSheet deviceName={deviceName} error={event} />
                      </div>
                    ) : (
                      (value ?? 'არ დაფიქსირებულა')
                    )}
                  </dd>
                </div>
              )
            })}
          </dl>
        )}
      </CardContent>
    </Card>
  )
}
