import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { IconArrowLeft, IconPencil } from '@tabler/icons-react'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Avatar, AvatarFallback } from '#/components/ui/avatar'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import { hasPermission } from '#/lib/authorization/permissions'
import { getEmployeeAccount } from '../access.functions'
import { availableAccountActions, canManageAccount } from '../access.actions'
import { accountInitials, accountStatus } from '../access.presentation'
import { AccountActionDialog } from './account-action-dialog'
import { AccountCodeDialog } from './account-code-dialog'
import { EmployeeDetailsDialog } from './employee-details-dialog'
import { UserAccessCard } from './user-access-card'
import { UserProfileCard } from './user-profile-card'
import { UserScheduleCard } from './user-schedule-card'
import type { Actor } from '#/lib/authorization/actor'
import type { IssuedAccountCode } from '../access.types'
import type { AccountAction } from './account-action-content'

function BackLink() {
  return (
    <Button
      nativeButton={false}
      role="link"
      variant="ghost"
      size="sm"
      className="w-fit"
      render={<Link to="/admin/users" search={{ page: 1 }} />}
    >
      <IconArrowLeft data-icon="inline-start" aria-hidden="true" />
      თანამშრომლების ანგარიშები
    </Button>
  )
}

export function UserDetail({
  userId,
  actor,
}: {
  userId: string
  actor: Actor
}) {
  const query = useQuery({
    queryKey: ['employee-accounts', 'detail', userId],
    queryFn: () => getEmployeeAccount({ data: { userId } }),
    retry: false,
    staleTime: 0,
  })
  const [action, setAction] = useState<AccountAction | null>(null)
  const [editing, setEditing] = useState(false)
  const [issuedCode, setIssuedCode] = useState<IssuedAccountCode | null>(null)
  const detail = query.data?.ok ? query.data.value : null

  if (query.isPending)
    return (
      <div role="status" aria-busy="true" aria-label="ანგარიში იტვირთება">
        <div aria-hidden="true" className="flex flex-col gap-4">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      </div>
    )
  if (!detail)
    return (
      <div className="flex flex-col gap-4">
        <BackLink />
        <Alert>
          <AlertDescription>
            {query.data && !query.data.ok
              ? query.data.message
              : query.data
                ? 'თანამშრომლის ანგარიში ვერ მოიძებნა.'
                : 'ანგარიშის ჩატვირთვა ვერ მოხერხდა. გადაამოწმეთ თქვენი წვდომა.'}
          </AlertDescription>
        </Alert>
      </div>
    )

  const { record, companyWeek } = detail
  const status = accountStatus(record)
  const manageable = canManageAccount(record, actor)
  return (
    <div className="flex flex-col gap-6">
      <BackLink />
      <header className="flex flex-wrap items-center gap-4">
        <Avatar size="lg" aria-hidden="true">
          <AvatarFallback>{accountInitials(record.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="break-words text-2xl font-semibold tracking-tight">
              {record.name}
            </h1>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
          <p className="mt-1 font-mono text-sm text-muted-foreground">
            {record.code}
          </p>
        </div>
        {manageable ? (
          <Button variant="outline" onClick={() => setEditing(true)}>
            <IconPencil data-icon="inline-start" aria-hidden="true" />
            რედაქტირება
          </Button>
        ) : null}
      </header>
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <UserProfileCard record={record} />
        <UserAccessCard
          actions={manageable ? availableAccountActions(record) : []}
          onAction={setAction}
        />
      </div>
      <UserScheduleCard week={record.workingWeek} companyWeek={companyWeek} />
      {action ? (
        <AccountActionDialog
          target={record}
          action={action}
          onClose={() => setAction(null)}
          onCode={setIssuedCode}
        />
      ) : null}
      {editing ? (
        <EmployeeDetailsDialog
          target={record}
          canConfigureSchedule={hasPermission(
            actor.roles,
            'attendance.configure',
          )}
          onClose={() => setEditing(false)}
        />
      ) : null}
      {issuedCode ? (
        <AccountCodeDialog
          value={issuedCode}
          onClose={() => setIssuedCode(null)}
        />
      ) : null}
    </div>
  )
}
