import type { PermissionOverrides } from '#/lib/authorization/permissions'

export type AdminAccount = {
  userId: string
  name: string
  username: string | null
  roles: string
  permissionOverrides: PermissionOverrides
  state: string
  employmentStatus: string | null
}
