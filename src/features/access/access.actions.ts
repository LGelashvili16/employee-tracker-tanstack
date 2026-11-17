import { hasEveryPermission, parseRoles } from '#/lib/authorization/permissions'
import type { Actor } from '#/lib/authorization/actor'
import type { AccountAction } from './components/account-action-content'
import type { EmployeeAccountSummary } from './access.types'

/**
 * Interface guidance only: the server re-checks every rule. Mirrors checkTarget in the service:
 * nobody manages their own account. Owner accounts need an owner; administrator accounts need platform account authority.
 */
export function canManageAccount(
  record: Pick<EmployeeAccountSummary, 'userId' | 'roles'>,
  actor: Actor,
) {
  const targetRoles = parseRoles(record.roles)
  const privileged = targetRoles.includes('owner')
    ? !actor.roles.includes('owner')
    : targetRoles.includes('admin') &&
      !hasEveryPermission(actor, ['admin.access', 'users.manage'])
  return (
    hasEveryPermission(actor, ['manage.access', 'employees.manage']) &&
    record.userId !== actor.id &&
    !privileged
  )
}

/** Inactive employment allows suspension only; codes and restoration need an active employee. */
export function availableAccountActions(
  record: Pick<EmployeeAccountSummary, 'state' | 'employmentStatus'>,
): Array<AccountAction> {
  const actions: Array<AccountAction> =
    record.state === 'suspended'
      ? ['restore']
      : record.state === 'invited'
        ? ['issue_activation', 'suspend']
        : ['issue_reset', 'suspend']
  return record.employmentStatus === 'active'
    ? actions
    : actions.filter((action) => action === 'suspend')
}
