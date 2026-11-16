import { IconDeviceDesktop, IconFingerprint } from '@tabler/icons-react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Spinner } from '#/components/ui/spinner'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { usePasskeyEnrollment } from '../hooks/use-passkey-enrollment'
import type { readOwnDevices } from '../attendance-security.functions'
import { DeviceState } from './security-controls'

type Status = Pick<
  Extract<Awaited<ReturnType<typeof readOwnDevices>>, { ok: true }>['value'],
  'currentDevice' | 'passkeyRequired'
>

export function CurrentDeviceSetup({
  actorId,
  status,
  clock = false,
}: {
  actorId: string
  status: Status
  clock?: boolean
}) {
  const device = status.currentDevice
  const blocked = device && ['revoked', 'rejected'].includes(device.state)
  const enrollment = usePasskeyEnrollment(actorId, device)
  const needsPasskey = status.passkeyRequired && !device?.hasPasskey && !blocked
  const awaitingReview = device?.state === 'pending' && device.hasPasskey
  if (clock)
    return (
      <section
        aria-label="Passkey-ის დამატება"
        className="flex flex-col items-start gap-3"
      >
        <Alert variant="info" role="note">
          <IconFingerprint aria-hidden="true" />
          <AlertDescription>
            Passkey შესვლასა და გასვლას მოწყობილობის ბიომეტრიით ან PIN კოდით
            ადასტურებს.{' '}
            {awaitingReview
              ? 'მოთხოვნა გაგზავნილია. დაელოდეთ HR-ის დადასტურებას.'
              : 'დამატების შემდეგ საჭიროა HR-ის დადასტურებაც.'}
          </AlertDescription>
        </Alert>
        <Button
          type="button"
          className="relative min-h-10 w-full px-4 sm:w-auto sm:min-w-56"
          disabled={enrollment.isPending || awaitingReview}
          aria-busy={enrollment.isPending}
          onClick={() => enrollment.mutate()}
        >
          {enrollment.isPending ? (
            <Spinner aria-hidden="true" />
          ) : (
            <IconFingerprint data-icon="inline-start" aria-hidden="true" />
          )}
          Passkey-ის დამატება
        </Button>
      </section>
    )
  return (
    <section
      aria-label="მიმდინარე მოწყობილობის უსაფრთხოება"
      className="flex flex-col gap-4 rounded-xl border bg-muted/30 p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border bg-background text-muted-foreground">
            <IconDeviceDesktop className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold">
              {device?.name ?? 'მიმდინარე ბრაუზერი'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              ამ მოწყობილობიდან დასწრების აღრიცხვა
            </p>
          </div>
        </div>
        {device ? (
          <DeviceState state={device.state} />
        ) : (
          <Badge variant="yellow">არარეგისტრირებული</Badge>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge variant={device?.hasPasskey ? 'green' : 'secondary'}>
          {device?.hasPasskey
            ? 'Passkey დამატებულია'
            : 'Passkey არ არის დამატებული'}
        </Badge>
        <Badge variant="outline">
          {status.passkeyRequired
            ? 'დამატებითი შემოწმება ჩართულია'
            : 'დამატებითი შემოწმება გამორთულია'}
        </Badge>
      </div>
      <p className="text-sm leading-6 text-muted-foreground">
        {blocked
          ? 'მოწყობილობა შეზღუდულია. მოითხოვეთ ხელახალი რეგისტრაცია და დაელოდეთ HR-ის დადასტურებას.'
          : needsPasskey
            ? 'დასწრებისთვის საჭიროა Passkey. დაამატეთ ამ მოწყობილობაზე, შემდეგ დაელოდეთ HR-ის დადასტურებას.'
            : device?.state === 'pending'
              ? 'მოთხოვნა გაგზავნილია. დაელოდეთ HR-ის დადასტურებას.'
              : device?.state === 'approved'
                ? 'მოწყობილობა დადასტურებულია. ქსელიდან წვდომის წესები კვლავ მოქმედებს.'
                : 'დაარეგისტრირეთ მოწყობილობა დასწრების აღსარიცხად.'}
      </p>
      {needsPasskey ? (
        <Button
          type="button"
          className="relative min-h-10 w-full self-start px-4 sm:w-auto sm:min-w-56"
          disabled={enrollment.isPending}
          aria-busy={enrollment.isPending}
          onClick={() => enrollment.mutate()}
        >
          {enrollment.isPending ? (
            <Spinner aria-hidden="true" />
          ) : (
            <IconFingerprint data-icon="inline-start" aria-hidden="true" />
          )}
          {enrollment.isPending ? 'Passkey ემატება' : 'Passkey-ის დამატება'}
        </Button>
      ) : null}
    </section>
  )
}
