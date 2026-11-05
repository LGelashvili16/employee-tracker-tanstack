import { Link } from '@tanstack/react-router'
import { IconChevronRight } from '@tabler/icons-react'
import { Avatar, AvatarFallback } from '#/components/ui/avatar'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { parseRoles, roleLabels } from '#/lib/authorization/permissions'
import { accountInitials, accountStatus } from '../access.presentation'
import type { EmployeeAccountSummary } from '../access.types'

export function EmployeeAccountsTable({
  records,
  actorId,
}: {
  records: Array<EmployeeAccountSummary>
  actorId: string
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="pl-5">თანამშრომელი</TableHead>
          <TableHead className="hidden md:table-cell">როლი</TableHead>
          <TableHead>სტატუსი</TableHead>
          <TableHead className="w-12 pr-5">
            <span className="sr-only">დეტალები</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {records.map((record) => {
          const status = accountStatus(record)
          return (
            <TableRow key={record.userId}>
              <TableCell className="pl-5">
                <div className="flex items-center gap-3">
                  <Avatar aria-hidden="true">
                    <AvatarFallback>
                      {accountInitials(record.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex min-w-0 flex-col">
                    <span className="flex flex-wrap items-center gap-2 font-medium">
                      <Link
                        to="/admin/users/$userId"
                        params={{ userId: record.userId }}
                        className="break-words outline-none hover:underline focus-visible:underline"
                      >
                        {record.name}
                      </Link>
                      {record.userId === actorId ? (
                        <Badge variant="secondary">თქვენ</Badge>
                      ) : null}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {record.code}
                    </span>
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden text-muted-foreground md:table-cell">
                {parseRoles(record.roles)
                  .map((role) => roleLabels[role])
                  .join(', ')}
              </TableCell>
              <TableCell>
                <Badge variant={status.variant}>{status.label}</Badge>
              </TableCell>
              <TableCell className="pr-5">
                <Button
                  nativeButton={false}
                  role="link"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`${record.name}: დეტალები`}
                  render={
                    <Link
                      to="/admin/users/$userId"
                      params={{ userId: record.userId }}
                    />
                  }
                >
                  <IconChevronRight aria-hidden="true" />
                </Button>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
