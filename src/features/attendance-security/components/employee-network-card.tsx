import { employeeNetworkOptions } from '../attendance-security.queries'
import { z } from 'zod'
import { useForm } from '@tanstack/react-form'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '#/components/ui/field'
import { Textarea } from '#/components/ui/textarea'
import { Switch } from '#/components/ui/switch'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Skeleton } from '#/components/ui/skeleton'
import { updateAttendanceEmployeeNetwork } from '../attendance-security.functions'
import {
  employeeNetworkSchema,
  parseIpLines,
  securityReasonSchema,
} from '../attendance-security.schemas'
import { SecuritySubmit } from './security-controls'

const schema = z
  .object({
    inherit: z.boolean(),
    ipsText: z.string().max(10000, 'სია ზედმეტად დიდია.'),
    reason: securityReasonSchema,
  })
  .superRefine((value, ctx) => {
    if (
      !value.inherit &&
      !employeeNetworkSchema.shape.allowedIps.safeParse(
        parseIpLines(value.ipsText),
      ).success
    )
      ctx.addIssue({
        code: 'custom',
        path: ['ipsText'],
        message: 'მიუთითეთ მაქსიმუმ 100 ზუსტი IP მისამართი.',
      })
  })
export function EmployeeNetworkCard({
  userId,
  actorId,
}: {
  userId: string
  actorId: string
}) {
  const query = useQuery(employeeNetworkOptions(actorId, userId))
  return (
    <Card>
      <CardHeader>
        <CardTitle>დასწრების დაშვებული ქსელები</CardTitle>
      </CardHeader>
      <CardContent>
        {query.isPending ? (
          <div
            role="status"
            aria-busy="true"
            aria-label="ქსელის წესები იტვირთება"
          >
            <Skeleton
              className="h-40 motion-reduce:animate-none"
              aria-hidden="true"
            />
          </div>
        ) : query.data?.ok ? (
          <NetworkForm
            key={JSON.stringify(query.data.value)}
            userId={userId}
            allowedIps={query.data.value.allowedIps}
          />
        ) : (
          <Alert variant="destructive">
            <AlertDescription>ქსელის წესები ვერ ჩაიტვირთა.</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
function NetworkForm({
  userId,
  allowedIps,
}: {
  userId: string
  allowedIps: string[] | null
}) {
  const client = useQueryClient()
  const form = useForm({
    defaultValues: {
      inherit: allowedIps === null,
      ipsText: allowedIps?.join('\n') ?? '',
      reason: '',
    },
    validators: { onSubmit: schema },
    onSubmit: async ({ value }) => {
      const result = await updateAttendanceEmployeeNetwork({
        data: {
          userId,
          allowedIps: value.inherit ? null : parseIpLines(value.ipsText),
          reason: value.reason,
        },
      }).catch(() => null)
      if (!result?.ok) {
        toast.error(result?.message ?? 'ქსელები ვერ შეინახა.')
        return
      }
      toast.success('თანამშრომლის ქსელები შენახულია.')
      await client.invalidateQueries({
        queryKey: ['attendance-security', 'network'],
      })
    },
  })
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
    >
      <FieldGroup>
        <form.Field name="inherit">
          {(field) => (
            <Field orientation="horizontal">
              <FieldLabel htmlFor="inherit-network">
                კომპანიის საერთო სიის გამოყენება
              </FieldLabel>
              <Switch
                id="inherit-network"
                checked={field.state.value}
                onCheckedChange={field.handleChange}
              />
            </Field>
          )}
        </form.Field>
        <form.Subscribe selector={(state) => state.values.inherit}>
          {(inherit) =>
            !inherit ? (
              <form.Field name="ipsText">
                {(field) => (
                  <Field data-invalid={!field.state.meta.isValid}>
                    <FieldLabel htmlFor="employee-network-ips">
                      ინდივიდუალური IP მისამართები
                    </FieldLabel>
                    <Textarea
                      id="employee-network-ips"
                      value={field.state.value}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      onBlur={field.handleBlur}
                      aria-invalid={!field.state.meta.isValid}
                      aria-describedby="employee-network-error"
                    />
                    <FieldError
                      id="employee-network-error"
                      errors={field.state.meta.errors}
                    />
                  </Field>
                )}
              </form.Field>
            ) : null
          }
        </form.Subscribe>
        <Alert variant="info" role="note">
          <AlertDescription>
            ინდივიდუალური სია კომპანიის დაშვებულ სიას ანაცვლებს. სრულად
            დაბლოკილი IP მისამართები ყოველთვის აკრძალულია.
          </AlertDescription>
        </Alert>
        <form.Field name="reason">
          {(field) => (
            <Field data-invalid={!field.state.meta.isValid}>
              <FieldLabel htmlFor="employee-network-reason">
                ცვლილების მიზეზი
              </FieldLabel>
              <Textarea
                id="employee-network-reason"
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                onBlur={field.handleBlur}
                aria-invalid={!field.state.meta.isValid}
                aria-describedby="employee-network-reason-error"
              />
              <FieldError
                id="employee-network-reason-error"
                errors={field.state.meta.errors}
              />
            </Field>
          )}
        </form.Field>
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(pending) => (
            <SecuritySubmit pending={pending}>ქსელების შენახვა</SecuritySubmit>
          )}
        </form.Subscribe>
      </FieldGroup>
    </form>
  )
}
