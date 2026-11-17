import { z } from 'zod'
import { teamMemberRoles } from './teams.rules'

export const teamRoleFilterSchema = z
  .array(z.enum(teamMemberRoles, { error: 'გუნდისთვის როლი დაუშვებელია.' }), {
    error: 'როლების სია არასწორია.',
  })
  .max(teamMemberRoles.length, 'როლების რაოდენობა არასწორია.')
  .refine(
    (roles) => new Set(roles).size === roles.length,
    'როლი სიაში მეორდება.',
  )

export const teamIdSchema = z.uuid({
  error: 'გუნდის იდენტიფიკატორი არასწორია.',
})
const personId = z
  .string({ error: 'აირჩიეთ თანამშრომელი.' })
  .min(1, 'აირჩიეთ თანამშრომელი.')
  .max(256, 'იდენტიფიკატორი ძალიან გრძელია.')
export const teamSearchSchema = z.object({
  q: z
    .string({ error: 'ძიება არასწორია.' })
    .trim()
    .max(100, 'ძიება ძალიან გრძელია.')
    .default(''),
  page: z.coerce
    .number({ error: 'გვერდი არასწორია.' })
    .int('გვერდი არასწორია.')
    .min(1, 'გვერდი არასწორია.')
    .max(100000, 'გვერდი არასწორია.')
    .default(1),
  status: z
    .enum(['active', 'inactive'], { error: 'სტატუსი არასწორია.' })
    .default('active'),
  sort: z
    .enum(['name', 'newest'], { error: 'დალაგება არასწორია.' })
    .default('name'),
  team: teamIdSchema.optional(),
})
export const teamSearchFormSchema = z.object({
  q: teamSearchSchema.shape.q.removeDefault(),
})
export const teamNameSchema = z.object({
  name: z
    .string({ error: 'მიუთითეთ სახელი.' })
    .trim()
    .min(2, 'სახელი უნდა შეიცავდეს მინიმუმ 2 სიმბოლოს.')
    .max(100, 'სახელი ძალიან გრძელია.'),
})
export const teamLookupSchema = z.object({ id: teamIdSchema })
export const teamRevisionSchema = teamLookupSchema.extend({
  version: z
    .number({ error: 'ვერსია არასწორია.' })
    .int('ვერსია არასწორია.')
    .positive('ვერსია არასწორია.'),
})
export const teamCandidatesSchema = z.object({
  q: teamSearchSchema.shape.q,
  jobTitle: teamSearchSchema.shape.q,
  page: teamSearchSchema.shape.page,
  roles: teamRoleFilterSchema.default(['production_specialist']),
})
export const teamCandidateFiltersSchema = z.object({
  q: teamSearchFormSchema.shape.q,
  jobTitle: teamSearchFormSchema.shape.q,
  roles: teamRoleFilterSchema,
})
export type TeamCandidateSearch = z.infer<typeof teamCandidatesSchema>
export type TeamSearch = z.infer<typeof teamSearchSchema>
export const teamsPageSize = 20

export const teamDraftSchema = teamNameSchema
  .extend({
    members: z.array(
      z.object({ userId: personId, fromTeamId: teamIdSchema.nullable() }),
      { error: 'წევრების სია არასწორია.' },
    ),
    leaderId: personId.nullable(),
    active: z.boolean({ error: 'სტატუსი არასწორია.' }),
  })
  .superRefine((value, ctx) => {
    if (
      new Set(value.members.map((member) => member.userId)).size !==
      value.members.length
    )
      ctx.addIssue({
        code: 'custom',
        path: ['members'],
        message: 'წევრი სიაში მეორდება.',
      })
    if (
      value.leaderId &&
      !value.members.some((member) => member.userId === value.leaderId)
    )
      ctx.addIssue({
        code: 'custom',
        path: ['leaderId'],
        message: 'ხელმძღვანელი უნდა იყოს გუნდის წევრი.',
      })
    if (!value.active && value.members.length)
      ctx.addIssue({
        code: 'custom',
        path: ['members'],
        message: 'გაუქმებამდე ამოიღეთ გუნდის ყველა წევრი.',
      })
  })
export const teamSaveSchema = teamDraftSchema
  .safeExtend({
    id: teamIdSchema.nullable(),
    version: teamRevisionSchema.shape.version.nullable(),
  })
  .refine((value) => (value.id === null) === (value.version === null), {
    path: ['version'],
    message: 'გუნდის ვერსია არასწორია.',
  })
  .refine((value) => value.id !== null || value.active, {
    path: ['active'],
    message: 'ახალი გუნდი უნდა იყოს მოქმედი.',
  })
export type TeamDraft = z.infer<typeof teamDraftSchema>
export type TeamSave = z.infer<typeof teamSaveSchema>
