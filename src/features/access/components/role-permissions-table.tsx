import {
  createColumnHelper,
  tableFeatures,
  useTable,
} from '@tanstack/react-table'
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from '#/components/ui/table'
import { Badge } from '#/components/ui/badge'
import {
  hasPermission,
  permissionSchema,
  roleLabels,
  roleSchema,
} from '#/lib/authorization/permissions'
import { permissionLabels } from '../admin-access.content'
import type { Permission } from '#/lib/authorization/permissions'

const features = tableFeatures({})
const helper = createColumnHelper<typeof features, { permission: Permission }>()
const items = permissionSchema.options.map((permission) => ({ permission }))
const columns = helper.columns([
  helper.accessor('permission', {
    header: 'უფლება',
    cell: ({ row }) => permissionLabels[row.original.permission],
  }),
  ...roleSchema.options.map((role) =>
    helper.display({
      id: role,
      header: roleLabels[role],
      cell: ({ row }) => {
        const allowed = hasPermission([role], row.original.permission)
        return (
          <Badge variant={allowed ? 'green' : 'red'}>
            {allowed ? 'დაშვებულია' : 'აკრძალულია'}
          </Badge>
        )
      },
    }),
  ),
])

/** Fixed role definitions form a bounded matrix, so no server list pagination is needed. */
export function RolePermissionsTable() {
  const table = useTable({
    features,
    columns,
    data: items,
    getRowId: (row) => row.permission,
  })
  return (
    <Table>
      <TableHeader className="bg-muted/40">
        {table.getHeaderGroups().map((group) => (
          <TableRow key={group.id}>
            {group.headers.map((header) => (
              <TableHead key={header.id} className="h-12 px-4">
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
              <TableCell key={cell.id} className="px-4 py-4">
                <table.FlexRender cell={cell} />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
