import { IconAt, IconPencil } from '@tabler/icons-react'
import { Avatar, AvatarFallback } from '#/components/ui/avatar'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent } from '#/components/ui/card'
import { parseRoles, roleLabels } from '#/lib/authorization/permissions'
import { accountInitials, accountStatus } from '../access.presentation'
import type { EmployeeAccountRecord } from '../access.types'

export function UserProfileHeader({
  record,
  canEdit,
  onEdit,
}: {
  record: EmployeeAccountRecord
  canEdit: boolean
  onEdit: () => void
}) {
  const status = accountStatus(record)
  return (
    <Card className="rounded-2xl py-6 sm:py-8">
      <CardContent className="px-5 sm:px-6">
        <header className="flex flex-wrap items-center gap-5">
          <Avatar
            className="size-16 after:border-border sm:size-20"
            aria-hidden="true"
          >
            <AvatarFallback className="bg-badge-blue text-2xl font-medium text-badge-blue-foreground sm:text-3xl">
              {accountInitials(record.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 basis-48">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant={status.variant}>{status.label}</Badge>
              {parseRoles(record.roles).map((role) => (
                <Badge
                  key={role}
                  variant="outline"
                  className="h-auto max-w-full whitespace-normal"
                >
                  {roleLabels[role]}
                </Badge>
              ))}
            </div>
            <h1 className="wrap-anywhere text-2xl font-semibold tracking-tight sm:text-3xl">
              {record.name}
            </h1>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
              <IconAt className="size-4 shrink-0" aria-hidden="true" />
              <span className="wrap-anywhere font-mono">{record.code}</span>
            </p>
          </div>
          {canEdit ? (
            <Button onClick={onEdit} className="max-sm:w-full">
              <IconPencil data-icon="inline-start" aria-hidden="true" />
              რედაქტირება
            </Button>
          ) : null}
        </header>
      </CardContent>
    </Card>
  )
}
