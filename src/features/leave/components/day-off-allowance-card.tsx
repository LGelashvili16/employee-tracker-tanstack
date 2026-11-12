import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  IconCalendarPause,
  IconSun,
  IconAdjustmentsHorizontal,
} from '@tabler/icons-react'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import { Input } from '#/components/ui/input'
import { Switch } from '#/components/ui/switch'
import { Spinner } from '#/components/ui/spinner'
import { Skeleton } from '#/components/ui/skeleton'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Field, FieldLabel, FieldError } from '#/components/ui/field'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import {
  dayOffSettingsQuery,
  employeeDayOffBalanceQuery,
  ownDayOffBalanceQuery,
  dayOffAllowanceKey,
} from '../day-off-allowance.queries'
import {
  updateDayOffSettings,
  updateEmployeeDayOffBalance,
} from '../day-off-allowance.functions'
import {
  saveAllowanceSettingFormSchema,
  adjustAllowanceBalanceFormSchema,
} from '../day-off-allowance.schemas'
import type { DayOffBalanceView } from '../day-off-allowance.schemas'

function PendingBalance() {
  return (
    <div role="status" aria-busy="true" aria-label="ბალანსი იტვირთება">
      <Skeleton className="h-24 w-full" aria-hidden="true" />
    </div>
  )
}
function BalanceError() {
  return (
    <Alert variant="destructive">
      <AlertDescription>
        დასვენების დღეების ბალანსი ვერ ჩაიტვირთა. განაახლეთ გვერდი.
      </AlertDescription>
    </Alert>
  )
}
export function OwnDayOffBalance({ actorId }: { actorId: string }) {
  const query = useQuery(ownDayOffBalanceQuery(actorId))
  if (query.isPending) return <PendingBalance />
  if (!query.data) return <BalanceError />
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge
        variant="blue"
        className="h-auto max-w-full px-3 py-1.5 text-sm whitespace-normal"
      >
        დასვენების დღეები: {query.data.remainingDays}
      </Badge>
      <Badge
        variant="purple"
        className="h-auto max-w-full px-3 py-1.5 text-sm whitespace-normal"
      >
        შვებულება: {query.data.vacationRemainingDays} სამუშაო დღე
      </Badge>
    </div>
  )
}
export function EmployeeDayOffBalanceCard({
  actorId,
  userId,
  canEdit,
}: {
  actorId: string
  userId: string
  canEdit: boolean
}) {
  const query = useQuery(employeeDayOffBalanceQuery(actorId, userId))
  const [editing, setEditing] = useState(false)
  return (
    <Card className="rounded-2xl py-5 sm:py-6">
      <CardHeader className="px-5 sm:px-6">
        <CardTitle className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <IconCalendarPause className="size-5" aria-hidden="true" />
          </span>
          <h2>დასვენება და შვებულება</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 px-5 sm:px-6">
        {query.isPending ? (
          <div role="status" aria-busy="true" aria-label="ბალანსი იტვირთება">
            <div className="flex flex-col gap-3" aria-hidden="true">
              <Skeleton className="h-36 rounded-xl" />
              <Skeleton className="h-32 rounded-xl" />
              {canEdit ? <Skeleton className="h-8 rounded-lg" /> : null}
            </div>
          </div>
        ) : !query.data ? (
          <BalanceError />
        ) : (
          <>
            <dl className="grid gap-3">
              <div className="rounded-xl bg-badge-blue/40 p-4">
                <dt className="flex items-center gap-2 text-sm font-medium text-badge-blue-foreground">
                  <IconCalendarPause className="size-4" aria-hidden="true" />
                  დასვენების დღეები
                </dt>
                <dd className="mt-3 flex items-baseline gap-2 text-badge-blue-foreground">
                  <span className="text-4xl font-semibold tracking-tight tabular-nums">
                    {query.data.remainingDays}
                  </span>
                  <span className="text-sm">დღე</span>
                </dd>
                <dd className="mt-3 text-xs leading-5 text-muted-foreground">
                  წლიური ლიმიტი: {query.data.annualDays}.{' '}
                  {query.data.resetYearly
                    ? 'ბალანსი განახლდება 1 იანვარს.'
                    : 'წლიური განახლება გამორთულია.'}
                </dd>
              </div>
              <div className="rounded-xl bg-badge-purple/40 p-4">
                <dt className="flex items-center gap-2 text-sm font-medium text-badge-purple-foreground">
                  <IconSun className="size-4" aria-hidden="true" />
                  შვებულება
                </dt>
                <dd className="mt-3 flex items-baseline gap-2 text-badge-purple-foreground">
                  <span className="text-4xl font-semibold tracking-tight tabular-nums">
                    {query.data.vacationRemainingDays}
                  </span>
                  <span className="text-sm">სამუშაო დღე</span>
                </dd>
                <dd className="mt-3 text-xs leading-5 text-muted-foreground">
                  წლიური დამატება: {query.data.vacationAnnualDays} დღე
                </dd>
              </div>
            </dl>
            {canEdit ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setEditing(true)}
              >
                <IconAdjustmentsHorizontal
                  data-icon="inline-start"
                  aria-hidden="true"
                />
                რედაქტირება
              </Button>
            ) : null}
            <Dialog open={editing} onOpenChange={setEditing}>
              <DialogContent className="max-h-[90dvh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>ბალანსების შეცვლა</DialogTitle>
                </DialogHeader>
                <BalanceForm
                  userId={userId}
                  initial={query.data}
                  onSaved={() => setEditing(false)}
                />
              </DialogContent>
            </Dialog>
          </>
        )}
      </CardContent>
    </Card>
  )
}
function BalanceForm({
  userId,
  initial,
  onSaved,
}: {
  userId: string
  initial: DayOffBalanceView
  onSaved: () => void
}) {
  const client = useQueryClient()
  const [error, setError] = useState('')
  const form = useForm({
    defaultValues: {
      userId,
      annualDays: initial.annualDays,
      remainingDays: initial.remainingDays,
      vacationAnnualDays: initial.vacationAnnualDays,
      vacationRemainingDays: initial.vacationRemainingDays,
      revision: initial.revision,
      year: initial.year,
      reason: '',
    },
    validators: { onSubmit: adjustAllowanceBalanceFormSchema },
    onSubmit: async ({ value }) => {
      setError('')
      try {
        const result = await updateEmployeeDayOffBalance({ data: value })
        if (!result.ok) {
          setError(result.message)
          toast.error(result.message)
          return
        }
        await client.invalidateQueries({ queryKey: dayOffAllowanceKey })
        toast.success('ბალანსები განახლდა.')
        onSaved()
      } catch {
        const message =
          'ბალანსი ვერ განახლდა. განაახლეთ მონაცემები და სცადეთ ხელახლა.'
        setError(message)
        toast.error(message)
      }
    },
  })
  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
    >
      {(
        [
          'annualDays',
          'remainingDays',
          'vacationAnnualDays',
          'vacationRemainingDays',
          'reason',
        ] as const
      ).map((name) => (
        <form.Field key={name} name={name}>
          {(field) => (
            <Field data-invalid={!field.state.meta.isValid}>
              <FieldLabel htmlFor={`balance-${name}`}>
                {name === 'annualDays'
                  ? 'წლიური ლიმიტი'
                  : name === 'remainingDays'
                    ? 'დარჩენილი დღეები'
                    : name === 'vacationAnnualDays'
                      ? 'შვებულების წლიური ლიმიტი (სამუშაო დღე)'
                      : name === 'vacationRemainingDays'
                        ? 'შვებულების დარჩენილი სამუშაო დღეები'
                        : 'ცვლილების მიზეზი'}
              </FieldLabel>
              <Input
                id={`balance-${name}`}
                type={name === 'reason' ? 'text' : 'number'}
                min={name === 'vacationAnnualDays' ? 24 : 0}
                required
                value={
                  typeof field.state.value === 'number' &&
                  Number.isNaN(field.state.value)
                    ? ''
                    : field.state.value
                }
                onBlur={field.handleBlur}
                onChange={(event) =>
                  field.handleChange(
                    name === 'reason'
                      ? event.target.value
                      : event.target.value === ''
                        ? Number.NaN
                        : Number(event.target.value),
                  )
                }
                aria-invalid={!field.state.meta.isValid}
                aria-describedby={`balance-${name}-error`}
              />
              <FieldError
                id={`balance-${name}-error`}
                errors={field.state.meta.errors}
              />
            </Field>
          )}
        </form.Field>
      ))}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <form.Subscribe selector={(state) => state.isSubmitting}>
        {(pending) => (
          <Button type="submit" disabled={pending} aria-busy={pending}>
            {pending ? <Spinner aria-hidden="true" /> : null}ბალანსის შენახვა
          </Button>
        )}
      </form.Subscribe>
    </form>
  )
}
export function DayOffSettingsCard({ canEdit }: { canEdit: boolean }) {
  const query = useQuery(dayOffSettingsQuery())
  return (
    <Card>
      <CardHeader>
        <CardTitle>დასვენებისა და შვებულების ლიმიტები</CardTitle>
      </CardHeader>
      <CardContent>
        {query.isPending ? (
          <PendingBalance />
        ) : !query.data ? (
          <BalanceError />
        ) : (
          <SettingsForm
            key={query.data.revision}
            initial={query.data}
            canEdit={canEdit}
          />
        )}
      </CardContent>
    </Card>
  )
}
function SettingsForm({
  initial,
  canEdit,
}: {
  initial: {
    defaultDays: number
    resetYearly: boolean
    revision: number
    defaultVacationDays?: number
  }
  canEdit: boolean
}) {
  const client = useQueryClient()
  const [error, setError] = useState('')
  const form = useForm({
    defaultValues: {
      ...initial,
      defaultVacationDays: initial.defaultVacationDays ?? 24,
    },
    validators: { onSubmit: saveAllowanceSettingFormSchema },
    onSubmit: async ({ value }) => {
      setError('')
      try {
        const result = await updateDayOffSettings({ data: value })
        if (!result.ok) {
          setError(result.message)
          toast.error(result.message)
          return
        }
        await client.invalidateQueries({ queryKey: dayOffAllowanceKey })
        toast.success('დასვენების დღეების წესი შენახულია.')
      } catch {
        const message =
          'წესი ვერ შეინახა. განაახლეთ მონაცემები და სცადეთ ხელახლა.'
        setError(message)
        toast.error(message)
      }
    },
  })
  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
    >
      <p className="text-sm text-muted-foreground">
        ახალი თანამშრომლებისთვის. შვებულება ლიმიტს არ ამცირებს.
      </p>
      <form.Field name="defaultDays">
        {(field) => (
          <Field>
            <FieldLabel htmlFor="default-day-offs">
              საწყისი ლიმიტი (დღე)
            </FieldLabel>
            <Input
              id="default-day-offs"
              type="number"
              min={0}
              max={366}
              disabled={!canEdit}
              value={
                typeof field.state.value === 'number' &&
                Number.isNaN(field.state.value)
                  ? ''
                  : field.state.value
              }
              onBlur={field.handleBlur}
              onChange={(event) =>
                field.handleChange(
                  event.target.value === ''
                    ? Number.NaN
                    : Number(event.target.value),
                )
              }
              aria-invalid={!field.state.meta.isValid}
            />
            <FieldError errors={field.state.meta.errors} />
          </Field>
        )}
      </form.Field>
      <form.Field name="resetYearly">
        {(field) => (
          <Field orientation="horizontal">
            <FieldLabel htmlFor="reset-day-offs">
              ბალანსის წლიური განახლება 1 იანვარს
            </FieldLabel>
            <Switch
              id="reset-day-offs"
              disabled={!canEdit}
              checked={field.state.value}
              onCheckedChange={field.handleChange}
            />
          </Field>
        )}
      </form.Field>
      <p className="text-sm text-muted-foreground">
        გამორთვისას ნაშთი შენარჩუნდება. ჩართვა იმოქმედებს მომდევნო 1 იანვრიდან.
      </p>
      <form.Field name="defaultVacationDays">
        {(field) => (
          <Field data-invalid={!field.state.meta.isValid}>
            <FieldLabel htmlFor="default-vacation-days">
              შვებულების წლიური ლიმიტი (სამუშაო დღე)
              <span aria-hidden="true" className="text-destructive">
                *
              </span>
            </FieldLabel>
            <Input
              id="default-vacation-days"
              required
              type="number"
              min={24}
              max={366}
              disabled={!canEdit}
              value={Number.isNaN(field.state.value) ? '' : field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) =>
                field.handleChange(event.target.valueAsNumber)
              }
              aria-invalid={!field.state.meta.isValid}
            />
            <FieldError errors={field.state.meta.errors} />
            <p className="text-sm text-muted-foreground">
              ყოველ 1 იანვარს ემატება. გამოუყენებელი დღეები ინახება.
            </p>
          </Field>
        )}
      </form.Field>
      {canEdit ? (
        <>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(pending) => (
              <Button
                type="submit"
                className="self-end"
                disabled={pending}
                aria-busy={pending}
              >
                {pending ? <Spinner aria-hidden="true" /> : null}წესის შენახვა
              </Button>
            )}
          </form.Subscribe>
        </>
      ) : null}
    </form>
  )
}
