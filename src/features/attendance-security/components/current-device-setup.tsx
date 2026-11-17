import { IconDeviceDesktop, IconFingerprint } from '@tabler/icons-react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Spinner } from '#/components/ui/spinner'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { usePasskeyEnrollment } from '../hooks/use-passkey-enrollment'
import type { readOwnDevices } from '../attendance-security.functions'
import { DeviceState } from './security-controls'
import { useBrowserRegistration } from '../hooks/use-browser-registration'

type Status = Pick<
  Extract<Awaited<ReturnType<typeof readOwnDevices>>, { ok: true }>['value'],
  'currentDevice' | 'passkeyRequired' | 'browserApprovalRequired'
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
  const registration = useBrowserRegistration(actorId, device?.name)
  const browserApprovalRequired = status.browserApprovalRequired
  const activationNeeded = !device || device.state === 'unrequested' || blocked
  const awaitingReview = device?.state === 'pending'
  const needsPasskey =
    status.passkeyRequired && !device?.hasPasskey && !activationNeeded
  const requestButton =
    activationNeeded || awaitingReview ? (
      <Button
        type="button"
        className="relative h-auto min-h-11 w-full self-start px-8 py-2 whitespace-normal sm:w-auto"
        disabled={registration.isPending || awaitingReview}
        aria-busy={registration.isPending}
        onClick={() => registration.mutate()}
      >
        {registration.isPending ? (
          <Spinner className="absolute left-3" aria-hidden="true" />
        ) : null}
        {awaitingReview
          ? 'მოთხოვნა გაგზავნილია'
          : blocked
            ? 'ხელახალი დადასტურების მოთხოვნა'
            : 'მოწყობილობის აქტივაციის მოთხოვნა'}
      </Button>
    ) : null
  if (clock && !status.passkeyRequired)
    return (
      <section
        aria-label="ბრაუზერის დადასტურება"
        className="flex flex-col items-start gap-3"
      >
        <Alert variant="warning" role="note">
          <AlertDescription>
            {awaitingReview
              ? 'მოთხოვნა გაგზავნილია. დაელოდეთ HR-ის დადასტურებას. სხვა დადასტურებული ბრაუზერებიდან დასწრება კვლავ ხელმისაწვდომია.'
              : 'ეს ბრაუზერი დასწრებისთვის არ არის აქტიური. მოითხოვეთ მისი აქტივაცია. სხვა დადასტურებული ბრაუზერებიდან დასწრება კვლავ ხელმისაწვდომია.'}
          </AlertDescription>
        </Alert>
        {requestButton}
      </section>
    )
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
            {activationNeeded
              ? 'ამ ბრაუზერიდან დასწრებისთვის ჯერ მოითხოვეთ მოწყობილობის აქტივაცია.'
              : needsPasskey
                ? 'დაამატეთ Passkey და დაელოდეთ HR-ის დადასტურებას.'
                : 'მოთხოვნა გაგზავნილია. დაელოდეთ HR-ის დადასტურებას.'}
          </AlertDescription>
        </Alert>
        {requestButton}
        {needsPasskey ? (
          <Button
            type="button"
            className="relative min-h-10 w-full px-4 sm:w-auto sm:min-w-56"
            disabled={enrollment.isPending}
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
        ) : null}
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
        {device && browserApprovalRequired ? (
          <DeviceState state={device.state} />
        ) : device ? (
          <Badge variant="secondary">რეგისტრირებული</Badge>
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
        {!browserApprovalRequired && !status.passkeyRequired
          ? 'მოწყობილობის დადასტურება არ მოითხოვება. ქსელიდან წვდომის წესები კვლავ მოქმედებს.'
          : blocked
            ? 'მოწყობილობა შეზღუდულია. მოითხოვეთ ხელახალი აქტივაცია და დაელოდეთ HR-ის დადასტურებას.'
            : activationNeeded
              ? 'მოითხოვეთ ამ ბრაუზერის აქტივაცია დასწრების აღსარიცხად.'
              : needsPasskey
                ? 'დასწრებისთვის საჭიროა Passkey. დაამატეთ ამ მოწყობილობაზე, შემდეგ დაელოდეთ HR-ის დადასტურებას.'
                : device.state === 'pending'
                  ? 'მოთხოვნა გაგზავნილია. დაელოდეთ HR-ის დადასტურებას.'
                  : device.state === 'approved'
                    ? 'მოწყობილობა დადასტურებულია. ქსელიდან წვდომის წესები კვლავ მოქმედებს.'
                    : 'მოითხოვეთ მოწყობილობის აქტივაცია დასწრების აღსარიცხად.'}
      </p>
      {browserApprovalRequired ? requestButton : null}
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
