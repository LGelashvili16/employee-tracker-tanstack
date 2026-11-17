import type { PermissionOverrides, Role } from './permissions'
/** Minimal identity projection; credentials and session tokens never cross this boundary. */
export type Actor = {
  id: string
  name: string
  email: string | null
  emailVerified: boolean
  roles: Array<Role>
  permissionOverrides?: PermissionOverrides
}
