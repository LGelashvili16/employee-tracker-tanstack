import { IconChevronDown } from '@tabler/icons-react'
import { Avatar, AvatarFallback } from '#/components/ui/avatar'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { parseRoles, roleLabels } from '#/lib/authorization/permissions'
import { accountActionLabels } from './account-action-dialog'
import type { EmployeeAccountRecord } from '../access.types'
import type { Actor } from '#/lib/authorization/actor'

type Action = keyof typeof accountActionLabels
const stateLabels: Record<string, string> = {
  invited: 'გასააქტიურებელი',
  active: 'აქტიური',
  suspended: 'შეჩერებული',
}

export function EmployeeAccountRow({
  record,
  actor,
  onAction,
}: {
  record: EmployeeAccountRecord
  actor: Actor
  onAction: (action: Action) => void
}) {
  const targetRoles = parseRoles(record.roles)
  const actions: Array<Action> =
    record.state === 'suspended'
      ? ['restore']
      : record.state === 'invited'
        ? ['issue_activation', 'suspend']
        : ['issue_reset', 'suspend']
  const permittedActions =
    record.employmentStatus === 'active'
      ? actions
      : actions.filter((action) => action === 'suspend')
  const canManage =
    record.userId !== actor.id &&
    (!targetRoles.some((role) => role === 'admin' || role === 'owner') ||
      actor.roles.includes('owner'))
  const initials = record.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toLocaleUpperCase('ka')
  const inactive = record.employmentStatus !== 'active'

  return (
    <li className="flex flex-wrap items-center gap-4 px-5 py-5 sm:flex-nowrap">
      <Avatar size="lg" aria-hidden="true">
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="break-words text-sm font-medium">{record.name}</h3>
          {record.userId === actor.id ? (
            <Badge variant="secondary">თქვენ</Badge>
          ) : null}
        </div>
        <p className="mt-1 break-words text-xs leading-relaxed text-muted-foreground">
          <span className="font-mono">{record.code}</span>
          <span aria-hidden="true"> · </span>
          {targetRoles.map((role) => roleLabels[role]).join(', ')}
        </p>
        {record.contactEmail ? (
          <p className="mt-1 break-all text-xs text-muted-foreground">
            {record.contactEmail}
          </p>
        ) : null}
        {record.jobTitle ? (
          <p className="mt-1 break-words text-xs text-muted-foreground">
            {record.jobTitle}
          </p>
        ) : null}
        {record.phone ? (
          <p className="mt-1 text-xs text-muted-foreground">{record.phone}</p>
        ) : null}
      </div>
      <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-3">
        <Badge
          variant={
            inactive || record.state === 'suspended'
              ? 'orange'
              : record.state === 'active'
                ? 'green'
                : 'secondary'
          }
        >
          {inactive
            ? 'დასაქმება შეჩერებულია'
            : (stateLabels[record.state] ?? 'მიუწვდომელი')}
        </Badge>
        {canManage && permittedActions.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="outline" size="sm" />}
              aria-label={`${record.name}: მოქმედებები`}
            >
              მოქმედებები
              <IconChevronDown data-icon="inline-end" aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                {permittedActions.map((action) => (
                  <DropdownMenuItem
                    key={action}
                    variant={action === 'suspend' ? 'destructive' : 'default'}
                    onClick={() => onAction(action)}
                  >
                    {accountActionLabels[action]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </li>
  )
}
