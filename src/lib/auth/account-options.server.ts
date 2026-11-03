import '@tanstack/react-start/server-only'
import { username } from 'better-auth/plugins/username'

export const accountUserFields = {
  roles: {
    type: 'string',
    required: false,
    defaultValue: 'employee',
    input: false,
  },
  accessState: {
    type: 'string',
    required: false,
    defaultValue: 'active',
    input: false,
    returned: false,
  },
  activatedAt: { type: 'date', required: false, input: false, returned: false },
} as const

export const employeeUsername = () =>
  username({
    immutableUsername: true,
    displayUsername: false,
    minUsernameLength: 3,
    maxUsernameLength: 32,
    usernameValidator: (value) => /^[a-z0-9][a-z0-9._-]{2,31}$/i.test(value),
  })
