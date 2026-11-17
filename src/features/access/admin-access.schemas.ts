import { z } from 'zod'
import { accountDirectorySearchSchema } from '#/lib/account-directory.schemas'
import {
  permissionOverridesSchema,
  roleSchema,
} from '#/lib/authorization/permissions'
import { accountIdSchema, reasonSchema } from './access.schemas'

export const adminAccountSearchSchema = accountDirectorySearchSchema
export const adminAccountListSchema = adminAccountSearchSchema.extend({
  page: adminAccountSearchSchema.shape.page.default(1),
  q: adminAccountSearchSchema.shape.q.default(''),
  sort: adminAccountSearchSchema.shape.sort.default('name-asc'),
})
export const updateAccountAuthorizationSchema = z.object({
  userId: accountIdSchema,
  roles: z
    .array(roleSchema, { error: 'მიუთითეთ როლების სია.' })
    .min(1, 'აირჩიეთ მინიმუმ ერთი როლი.')
    .max(roleSchema.options.length, 'როლების რაოდენობა არასწორია.'),
  permissionOverrides: permissionOverridesSchema,
  expectedRoles: z
    .string({ error: 'ანგარიშის უფლებები არასწორია.' })
    .min(1, 'ანგარიშის უფლებები არასწორია.')
    .max(512, 'ანგარიშის უფლებები არასწორია.'),
  expectedOverrides: permissionOverridesSchema,
  reason: reasonSchema,
})
export const adminAccountActionSchema = z.object({
  userId: accountIdSchema,
  action: z.enum(['suspend', 'restore', 'revoke_sessions'], {
    error: 'მოქმედება არასწორია.',
  }),
  reason: reasonSchema,
})
export const adminAccountActionFormSchema =
  updateAccountAuthorizationSchema.extend({
    roles: z.array(roleSchema),
    expectedRoles: z.string().max(512, 'ანგარიშის უფლებები არასწორია.'),
  })
export type AdminAccountSearch = z.infer<typeof adminAccountSearchSchema>
export type AdminAccountList = z.infer<typeof adminAccountListSchema>
