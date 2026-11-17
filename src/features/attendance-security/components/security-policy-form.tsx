import { z } from 'zod'
import { useForm } from '@tanstack/react-form'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { IconFingerprint, IconNetwork } from '@tabler/icons-react'
import { toast } from 'sonner'
import { Card, CardHeader, CardTitle, CardContent } from '#/components/ui/card'
import { Alert, AlertDescription } from '#/components/ui/alert'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '#/components/ui/field'
import { Textarea } from '#/components/ui/textarea'
import { Switch } from '#/components/ui/switch'
import { Skeleton } from '#/components/ui/skeleton'
import { securityPolicyOptions } from '../attendance-security.queries'
import { updateAttendanceSecurityPolicy } from '../attendance-security.functions'
import {
  parseIpLines,
  securityPolicySchema,
} from '../attendance-security.schemas'
import { SecuritySubmit } from './security-controls'

const policyFormSchema = securityPolicySchema
  .omit({
    allowedIps: true,
    blockedIps: true,
  })
  .extend({
    browserApprovalRequired:
      securityPolicySchema.shape.browserApprovalRequired.removeDefault(),
    allowedIpsText: z.string().max(10000, 'სია ზედმეტად დიდია.'),
    blockedIpsText: z.string().max(10000, 'სია ზედმეტად დიდია.'),
  })
  .superRefine((value, ctx) => {
    if (value.passkeyRequired && !value.browserApprovalRequired)
      ctx.addIssue({
        code: 'custom',
        path: ['passkeyRequired'],
        message: 'Passkey-ისთვის ტოკენით გადამოწმებაც ჩართული უნდა იყოს.',
      })
    for (const [field, schema] of [
      ['allowedIpsText', securityPolicySchema.shape.allowedIps],
      ['blockedIpsText', securityPolicySchema.shape.blockedIps],
    ] as const) {
      if (!schema.safeParse(parseIpLines(value[field])).success)
        ctx.addIssue({
          code: 'custom',
          path: [field],
          message:
            'მიუთითეთ მაქსიმუმ 100 ზუსტი IPv4 ან IPv6 მისამართი, თითო ახალ ხაზზე.',
        })
    }
  })

export function SecurityPolicy({ actorId }: { actorId: string }) {
  const query = useQuery(securityPolicyOptions(actorId))
  return (
    <div className="w-full max-w-5xl">
      {query.isPending ? (
        <div
          role="status"
          aria-busy="true"
          aria-label="წესები იტვირთება"
          className="flex flex-col gap-6"
        >
          <Skeleton
            className="h-40 motion-reduce:animate-none"
            aria-hidden="true"
          />
          <Skeleton
            className="h-80 motion-reduce:animate-none"
            aria-hidden="true"
          />
        </div>
      ) : query.data?.ok ? (
        <PolicyForm key={query.data.value.revision} policy={query.data.value} />
      ) : (
        <Alert variant="destructive">
          <AlertDescription>
            უსაფრთხოების წესები ვერ ჩაიტვირთა.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

function PolicyForm({
  policy,
}: {
  policy: z.infer<typeof securityPolicySchema>
}) {
  const client = useQueryClient()
  const form = useForm({
    defaultValues: {
      browserApprovalRequired: policy.browserApprovalRequired,
      passkeyRequired: policy.passkeyRequired,
      ipRestrictionEnabled: policy.ipRestrictionEnabled,
      allowedIpsText: policy.allowedIps.join('\n'),
      blockedIpsText: policy.blockedIps.join('\n'),
      revision: policy.revision,
    },
    validators: { onSubmit: policyFormSchema },
    onSubmit: async ({ value }) => {
      const result = await updateAttendanceSecurityPolicy({
        data: securityPolicySchema.parse({
          ...value,
          allowedIps: parseIpLines(value.allowedIpsText),
          blockedIps: parseIpLines(value.blockedIpsText),
        }),
      }).catch(() => null)
      if (!result?.ok) {
        toast.error(result?.message ?? 'წესები ვერ შეინახა.')
        return
      }
      toast.success('უსაფრთხოების წესები შენახულია.')
      await client.invalidateQueries({ queryKey: ['attendance-security'] })
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
      <FieldGroup className="gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <IconFingerprint
                className="size-5 text-muted-foreground"
                aria-hidden="true"
              />
              დასწრების დადასტურება
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <form.Field name="browserApprovalRequired">
              {(field) => (
                <Field
                  orientation="horizontal"
                  className="items-start gap-6"
                  data-invalid={!field.state.meta.isValid}
                >
                  <FieldContent>
                    <FieldLabel htmlFor="browser-approval-required">
                      ტოკენით გადამოწმება
                    </FieldLabel>
                    <FieldDescription id="browser-approval-help">
                      ბრაუზერი ავტომატურად აქტიურდება HR-ის დადასტურების შემდეგ.
                      გამორთვისას მოწყობილობისა და Passkey-ის შემოწმება აღარ
                      მოითხოვება. ქსელის წესები კვლავ მოქმედებს.
                    </FieldDescription>
                    <FieldError
                      id="browser-approval-error"
                      errors={field.state.meta.errors}
                    />
                  </FieldContent>
                  <Switch
                    id="browser-approval-required"
                    checked={field.state.value}
                    onCheckedChange={(checked) => {
                      field.handleChange(checked)
                      if (!checked) form.setFieldValue('passkeyRequired', false)
                    }}
                    onBlur={field.handleBlur}
                    aria-invalid={!field.state.meta.isValid}
                    aria-describedby="browser-approval-help browser-approval-error"
                  />
                </Field>
              )}
            </form.Field>
            <form.Subscribe
              selector={(state) => state.values.browserApprovalRequired}
            >
              {(browserEnabled) => (
                <form.Field name="passkeyRequired">
                  {(field) => (
                    <Field
                      orientation="horizontal"
                      className="items-start gap-6"
                      data-disabled={!browserEnabled}
                      data-invalid={!field.state.meta.isValid}
                    >
                      <FieldContent>
                        <FieldLabel htmlFor="passkey-required">
                          დამატებითი გადამოწმება (Passkey)
                        </FieldLabel>
                        <FieldDescription id="passkey-required-help">
                          ყოველ შესვლასა და გასვლაზე საჭიროა ბიომეტრიით ან PIN
                          კოდით დადასტურება. ჯერ ჩართეთ ტოკენით გადამოწმება.
                          ორივე შემოწმება სავალდებულოა.
                        </FieldDescription>
                        <FieldError
                          id="passkey-required-error"
                          errors={field.state.meta.errors}
                        />
                      </FieldContent>
                      <Switch
                        id="passkey-required"
                        checked={field.state.value}
                        onCheckedChange={field.handleChange}
                        onBlur={field.handleBlur}
                        disabled={!browserEnabled}
                        aria-invalid={!field.state.meta.isValid}
                        aria-describedby="passkey-required-help passkey-required-error"
                      />
                    </Field>
                  )}
                </form.Field>
              )}
            </form.Subscribe>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <IconNetwork
                className="size-5 text-muted-foreground"
                aria-hidden="true"
              />
              ქსელიდან წვდომა
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup className="gap-6">
              <form.Field name="ipRestrictionEnabled">
                {(field) => (
                  <Field orientation="horizontal" className="items-start gap-6">
                    <FieldContent>
                      <FieldLabel htmlFor="ip-required">
                        დასწრება მხოლოდ დაშვებული IP მისამართებიდან
                      </FieldLabel>
                      <FieldDescription>
                        ჩართვისას შესვლა და გასვლა მხოლოდ მითითებული ქსელებიდან
                        იქნება შესაძლებელი.
                      </FieldDescription>
                    </FieldContent>
                    <Switch
                      id="ip-required"
                      checked={field.state.value}
                      onCheckedChange={field.handleChange}
                    />
                  </Field>
                )}
              </form.Field>
              <div className="grid gap-6 md:grid-cols-2">
                {(['allowedIpsText', 'blockedIpsText'] as const).map((name) => (
                  <form.Field key={name} name={name}>
                    {(field) => (
                      <Field
                        className="h-full"
                        data-invalid={!field.state.meta.isValid}
                      >
                        <FieldLabel htmlFor={name}>
                          {name === 'allowedIpsText'
                            ? 'დასწრებისთვის დაშვებული IP მისამართები'
                            : 'სრულად დაბლოკილი IP მისამართები'}
                        </FieldLabel>
                        <FieldDescription id={`${name}-help`}>
                          {name === 'allowedIpsText'
                            ? 'ზუსტი საჯარო IP მისამართები, თითო ახალ ხაზზე.'
                            : 'ამ მისამართებიდან აპლიკაციაზე წვდომა სრულად იკრძალება.'}
                        </FieldDescription>
                        <Textarea
                          id={name}
                          rows={6}
                          className="mt-auto min-h-36 font-mono"
                          value={field.state.value}
                          onChange={(event) =>
                            field.handleChange(event.target.value)
                          }
                          onBlur={field.handleBlur}
                          aria-invalid={!field.state.meta.isValid}
                          aria-describedby={`${name}-help ${name}-error`}
                        />
                        <FieldError
                          id={`${name}-error`}
                          errors={field.state.meta.errors}
                        />
                      </Field>
                    )}
                  </form.Field>
                ))}
              </div>
              <Alert variant="warning" role="note">
                <AlertDescription>
                  დაბლოკილ IP მისამართს უპირატესობა აქვს დაშვებაზე. ქსელის
                  შეზღუდვის ჩართვისას ცარიელი დაშვებული სია დასწრებას კრძალავს.
                </AlertDescription>
              </Alert>
            </FieldGroup>
          </CardContent>
        </Card>
        <div className="flex justify-end">
          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(pending) => (
              <SecuritySubmit pending={pending}>წესების შენახვა</SecuritySubmit>
            )}
          </form.Subscribe>
        </div>
      </FieldGroup>
    </form>
  )
}
