import { ownDevicesOptions } from '../attendance-security.queries'
import { DeviceFilters } from './device-filters'
import { useMemo } from 'react'
import { IconDevices } from '@tabler/icons-react'
import {
  createColumnHelper,
  tableFeatures,
  useTable,
} from '@tanstack/react-table'
import type { readOwnDevices } from '../attendance-security.functions'
import { CurrentDeviceSetup } from './current-device-setup'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '#/components/ui/table'
import { Badge } from '#/components/ui/badge'
import { Separator } from '#/components/ui/separator'
import type { z } from 'zod'
import type { securityListSchema } from '../attendance-security.schemas'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { Card, CardHeader, CardTitle, CardContent } from '#/components/ui/card'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Skeleton } from '#/components/ui/skeleton'
import { DeviceState, SecurityPagination } from './security-controls'
import { formatAttendanceDateTime } from '#/features/attendance/attendance.rules'

type Device = Extract<
  Awaited<ReturnType<typeof readOwnDevices>>,
  { ok: true }
>['value']['items'][number]
const features = tableFeatures({})
const helper = createColumnHelper<typeof features, Device>()
const empty: Device[] = []

export function OwnDevices({
  actorId,
  search,
  onSearch,
}: {
  actorId: string
  search: z.infer<typeof securityListSchema>
  onSearch: (search: z.infer<typeof securityListSchema>) => void
}) {
  const { page } = search
  const query = useQuery({
    ...ownDevicesOptions(actorId, search),
    placeholderData: keepPreviousData,
  })
  const result = query.data?.ok ? query.data.value : null
  const columns = useMemo(
    () =>
      helper.columns([
        helper.accessor('name', {
          header: 'მოწყობილობა',
          cell: ({ row }) => (
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{row.original.name}</span>
              {row.original.id === result?.currentDeviceId ? (
                <Badge variant="outline">მიმდინარე</Badge>
              ) : null}
            </div>
          ),
        }),
        helper.accessor('hasPasskey', {
          header: 'Passkey',
          cell: ({ row }) =>
            row.original.hasPasskey ? 'დამატებულია' : 'არ არის დამატებული',
        }),
        helper.accessor('createdAt', {
          header: 'რეგისტრაცია',
          cell: ({ row }) =>
            formatAttendanceDateTime(
              row.original.createdAt,
              result?.timezone ?? 'Asia/Tbilisi',
            ),
        }),
        helper.accessor('state', {
          header: 'სტატუსი',
          cell: ({ row }) => <DeviceState state={row.original.state} />,
        }),
      ]),
    [result?.currentDeviceId, result?.timezone],
  )
  const table = useTable({
    features,
    columns,
    data: result?.items ?? empty,
    getRowId: (row) => row.id,
  })
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <IconDevices
            className="size-5 text-muted-foreground"
            aria-hidden="true"
          />
          დასწრების მოწყობილობები
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {query.isPending ? (
          <div
            role="status"
            aria-label="მოწყობილობები იტვირთება"
            aria-busy="true"
          >
            <Skeleton
              className="h-40 motion-reduce:animate-none"
              aria-hidden="true"
            />
          </div>
        ) : !result ? (
          <Alert variant="destructive">
            <AlertDescription>
              {query.data && !query.data.ok
                ? query.data.message
                : 'მოწყობილობები ვერ ჩაიტვირთა.'}
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <CurrentDeviceSetup actorId={actorId} status={result} />
            <Separator />
            <h2 className="text-sm font-semibold">
              რეგისტრირებული მოწყობილობები
            </h2>
            <DeviceFilters search={search} onChange={onSearch} />
            <div
              className="min-w-0 overflow-hidden rounded-xl border"
              aria-busy={query.isFetching}
            >
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((group) => (
                    <TableRow key={group.id}>
                      {group.headers.map((header) => (
                        <TableHead key={header.id} className="px-4">
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
                  {!result.items.length ? (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className="p-8 text-center text-muted-foreground"
                      >
                        შესაბამისი მოწყობილობები არ მოიძებნა.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
              <SecurityPagination
                page={page}
                total={result.total}
                onPage={(next) => onSearch({ ...search, page: next })}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
