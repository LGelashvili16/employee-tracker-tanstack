import { useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { IconArrowsSort, IconDots } from '@tabler/icons-react'
import {
  createColumnHelper,
  tableFeatures,
  useTable,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import { Avatar, AvatarFallback } from '#/components/ui/avatar'
import { accountInitials } from '../access.presentation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import {
  hasEveryPermission,
  parseRoles,
  roleLabels,
} from '#/lib/authorization/permissions'
import { adminActionLabels } from './admin-account-dialog'
import type { AdminAccountAction } from './admin-account-dialog'
import type { Actor } from '#/lib/authorization/actor'
import type { AdminAccount } from '../admin-access.types'
import type { AdminAccountSearch } from '../admin-access.schemas'

const features = tableFeatures({})
const helper = createColumnHelper<typeof features, AdminAccount>()
export function AdminAccountsTable({
  items,
  actor,
  search,
  onAction,
}: {
  items: Array<AdminAccount>
  actor: Actor
  search: AdminAccountSearch
  onAction: (
    account: AdminAccount,
    action: AdminAccountAction | 'authorization',
  ) => void
}) {
  const columns = useMemo(
    () =>
      helper.columns([
        helper.accessor('name', {
          header: () => (
            <Button
              variant="link"
              size="sm"
              nativeButton={false}
              role="link"
              render={
                <Link
                  to="/admin/access"
                  search={{
                    ...search,
                    page: 1,
                    sort:
                      (search.sort ?? 'name-asc') === 'name-asc'
                        ? 'name-desc'
                        : 'name-asc',
                  }}
                />
              }
            >
              მომხმარებელი
              <IconArrowsSort data-icon="inline-end" aria-hidden="true" />
            </Button>
          ),
          cell: ({ row }) => (
            <div className="flex min-w-48 items-center gap-3">
              <Avatar aria-hidden="true">
                <AvatarFallback>
                  {accountInitials(row.original.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-col gap-1">
                <span className="flex flex-wrap items-center gap-2 font-medium">
                  {row.original.name}
                  {row.original.userId === actor.id ? (
                    <Badge variant="secondary">თქვენ</Badge>
                  ) : null}
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {row.original.username ??
                    'მომხმარებლის სახელი არ არის მითითებული'}
                </span>
              </div>
            </div>
          ),
        }),
        helper.accessor('roles', {
          header: 'როლები და გამონაკლისები',
          cell: ({ row }) => (
            <div className="flex flex-col gap-1">
              <span>
                {parseRoles(row.original.roles)
                  .map((role) => roleLabels[role])
                  .join(', ') || 'როლი არ არის განსაზღვრული'}
              </span>
              <span className="text-xs text-muted-foreground">
                დაშვებული: {row.original.permissionOverrides.allow.length};
                აკრძალული: {row.original.permissionOverrides.deny.length}
              </span>
            </div>
          ),
        }),
        helper.accessor('state', {
          header: 'სტატუსი',
          cell: ({ row }) => (
            <Badge
              variant={
                row.original.state === 'active'
                  ? 'green'
                  : row.original.state === 'suspended'
                    ? 'red'
                    : 'yellow'
              }
            >
              {row.original.state === 'active'
                ? 'აქტიური'
                : row.original.state === 'suspended'
                  ? 'შეჩერებული'
                  : 'გასააქტიურებელი'}
            </Badge>
          ),
        }),
        helper.display({
          id: 'actions',
          header: 'მოქმედებები',
          cell: ({ row }) => {
            const record = row.original
            const protectedAccount =
              record.userId === actor.id ||
              (parseRoles(record.roles).includes('owner') &&
                !actor.roles.includes('owner'))
            const action: AdminAccountAction =
              record.state === 'suspended' ? 'restore' : 'suspend'
            return (
              <div className="flex justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    disabled={protectedAccount}
                    render={
                      <Button
                        size="icon-sm"
                        variant="outline"
                        depth="raised"
                        aria-label={`${record.name}: მოქმედებები`}
                      />
                    }
                  >
                    <IconDots aria-hidden="true" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-56">
                    <DropdownMenuGroup>
                      <DropdownMenuItem
                        disabled={!hasEveryPermission(actor, ['roles.manage'])}
                        onClick={() => onAction(record, 'authorization')}
                      >
                        როლები და უფლებები
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant={
                          action === 'suspend' ? 'destructive' : 'default'
                        }
                        disabled={
                          action === 'restore' &&
                          record.employmentStatus === 'inactive'
                        }
                        onClick={() => onAction(record, action)}
                      >
                        {adminActionLabels[action]}
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuItem
                        onClick={() => onAction(record, 'revoke_sessions')}
                      >
                        სესიების გაუქმება
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )
          },
        }),
      ]),
    [actor, search, onAction],
  )
  const table = useTable({
    features,
    columns,
    data: items,
    getRowId: (row) => row.userId,
  })
  return (
    <Table className="min-w-[42rem]">
      <TableHeader className="bg-muted/40">
        {table.getHeaderGroups().map((group) => (
          <TableRow key={group.id}>
            {group.headers.map((header) => (
              <TableHead
                key={header.id}
                className={
                  header.column.id === 'actions'
                    ? 'h-12 w-12 px-4 text-right'
                    : 'h-12 px-4'
                }
                aria-sort={
                  header.column.id === 'name' &&
                  (!search.sort || search.sort.startsWith('name-'))
                    ? search.sort === 'name-desc'
                      ? 'descending'
                      : 'ascending'
                    : undefined
                }
              >
                <table.FlexRender header={header} />
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow key={row.id}>
            {row.getAllCells().map((cell) => (
              <TableCell
                key={cell.id}
                className={
                  cell.column.id === 'actions'
                    ? 'px-4 py-4 text-right'
                    : 'px-4 py-4'
                }
              >
                <table.FlexRender cell={cell} />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
