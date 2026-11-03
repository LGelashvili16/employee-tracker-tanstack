import '@tanstack/react-start/server-only'
import {
  APIError,
  createAuthEndpoint,
  formCsrfMiddleware,
  originCheckMiddleware,
} from 'better-auth/api'
import { completeAccountSchema } from '../access.schemas'
import {
  AccountWorkflowError,
  completeEmployeeSetup,
} from './access.service.server'
import type { BetterAuthPlugin } from 'better-auth'

export function employeeAccessPlugin() {
  const endpoint = (purpose: 'activation' | 'reset') =>
    createAuthEndpoint(
      purpose === 'activation' ? '/employee-activate' : '/employee-reset',
      {
        method: 'POST',
        body: completeAccountSchema,
        use: [formCsrfMiddleware, originCheckMiddleware],
      },
      async (ctx) => {
        try {
          await completeEmployeeSetup(ctx.body, purpose, (password) =>
            ctx.context.password.hash(password),
          )
          return ctx.json({ status: true })
        } catch (error) {
          if (error instanceof AccountWorkflowError)
            throw new APIError('BAD_REQUEST', {
              code: 'INVALID_SETUP_CODE',
              message: error.message,
            })
          throw new APIError('INTERNAL_SERVER_ERROR', {
            code: 'ACCOUNT_SETUP_FAILED',
            message: 'მოქმედება ვერ შესრულდა. სცადეთ მოგვიანებით.',
          })
        }
      },
    )
  return {
    id: 'employee-access',
    endpoints: {
      activateEmployee: endpoint('activation'),
      resetEmployeePassword: endpoint('reset'),
    },
  } satisfies BetterAuthPlugin
}
