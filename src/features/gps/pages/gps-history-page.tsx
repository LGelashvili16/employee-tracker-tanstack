import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  createColumnHelper,
  tableFeatures,
  useTable,
} from '@tanstack/react-table'
import { IconArrowLeft, IconGps, IconRoute } from '@tabler/icons-react'
import { DataPagination } from '#/components/common/data-pagination'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Button, buttonVariants } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '#/components/ui/empty'
import { Skeleton } from '#/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { formatGeorgianDateTime } from '#/lib/date-format'
import { GpsHistoryMap } from '../components/gps-history-map'
import { GpsDeviceDiagnostics } from '../components/gps-device-diagnostics'
import { GpsBatteryLevel } from '../components/gps-battery-level'
import { GpsHistoryRange } from '../components/gps-history-range'
import { gpsHistoryQuery } from '../gps.queries'
import { gpsHistorySearch, gpsPageSize, gpsTimeZone } from '../gps.schemas'
import type { GpsHistory } from '../gps.queries'
import type { GpsHistorySearch } from '../gps.schemas'

const features = tableFeatures({})
const column = createColumnHelper<typeof features, GpsHistory['rows'][number]>()
const displayTime = (date: Date | null) =>
  date
    ? formatGeorgianDateTime(date.toISOString(), gpsTimeZone, true)
    : 'არ დაფიქსირებულა'
const coordinates = (point: { latitude: number; longitude: number }) =>
  `${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}`
const columns = [
  column.display({
    id: 'fixAt',
    header: 'GPS დრო',
    cell: ({ row }) => displayTime(row.original.fixAt),
  }),
  column.display({
    id: 'coordinates',
    header: 'კოორდინატები',
    cell: ({ row }) => coordinates(row.original),
  }),
  column.display({
    id: 'valid',
    header: 'GPS სტატუსი',
    cell: ({ row }) => (
      <Badge variant={row.original.valid ? 'green' : 'secondary'}>
        {row.original.valid ? 'ვალიდური' : 'არავალიდური'}
      </Badge>
    ),
  }),
  column.display({
    id: 'receivedAt',
    header: 'მიღების დრო',
    cell: ({ row }) => displayTime(row.original.receivedAt),
  }),
  column.display({
    id: 'speedKmh',
    header: 'სიჩქარე (კმ/სთ)',
    cell: ({ row }) => row.original.speedKmh,
  }),
  column.display({
    id: 'course',
    header: 'მიმართულება (°)',
    cell: ({ row }) => row.original.course,
  }),
  column.display({
    id: 'altitude',
    header: 'სიმაღლე (მ)',
    cell: ({ row }) => row.original.altitude ?? 'უცნობია',
  }),
]

function HistoryTable({
  rows,
  pending,
}: {
  rows: GpsHistory['rows']
  pending: boolean
}) {
  const table = useTable({
    features,
    columns,
    data: rows,
    getRowId: (row) => row.id,
  })
  return (
    <div aria-busy={pending}>
      {pending && (
        <span className="sr-only" role="status">
          ჩანაწერები იტვირთება
        </span>
      )}
      <Table aria-label="GPS მდებარეობის ჩანაწერები">
        <TableHeader className="bg-muted/40">
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id}>
              {group.headers.map((header) => (
                <TableHead key={header.id}>
                  <table.FlexRender header={header} />
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody className="tabular-nums">
          {pending
            ? Array.from({ length: 4 }, (_, index) => (
                <TableRow key={index} aria-hidden="true">
                  {columns.map((item) => (
                    <TableCell key={item.id}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getAllCells().map((cell) => (
                    <TableCell key={cell.id}>
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
        </TableBody>
      </Table>
    </div>
  )
}

export function GpsHistoryPage({
  actorId,
  deviceId,
  search,
  onRangeChange,
}: {
  actorId: string
  deviceId: string
  search: GpsHistorySearch
  onRangeChange: (range: Pick<GpsHistorySearch, 'from' | 'to'>) => void
}) {
  const query = useQuery(gpsHistoryQuery(actorId, deviceId, search))
  const history = query.data
  const { to: today } = gpsHistorySearch.parse({})
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            to="/manage/gps"
            search={{}}
            className={buttonVariants({
              variant: 'outline',
              depth: 'raised',
              size: 'icon',
            })}
            aria-label="GPS მოწყობილობების სია"
          >
            <IconArrowLeft aria-hidden="true" />
          </Link>
          <h1 className="min-w-0 wrap-anywhere text-2xl font-semibold tracking-tight">
            {history?.device.name ?? 'მდებარეობის ისტორია'}
          </h1>
        </div>
      </div>

      {query.isPending ? (
        <div className="grid gap-6" role="status" aria-busy="true">
          <span className="sr-only">მდებარეობის ისტორია იტვირთება</span>
          <Skeleton className="h-32" aria-hidden="true" />
          <Skeleton className="h-96" aria-hidden="true" />
        </div>
      ) : query.isError ? (
        <Alert variant="destructive">
          <AlertDescription>
            მდებარეობის ისტორია ვერ ჩაიტვირთა. განაახლეთ გვერდი.
          </AlertDescription>
        </Alert>
      ) : history ? (
        <>
          <Card>
            <CardContent>
              <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="grid content-start gap-1.5">
                  <dt className="text-sm text-muted-foreground">
                    GPS მოწყობილობის იდენტიფიკატორი
                  </dt>
                  <dd className="flex flex-wrap items-center gap-2 font-medium tabular-nums">
                    {history.device.reportedId}
                    <Badge
                      variant={history.device.enabled ? 'green' : 'secondary'}
                    >
                      {history.device.enabled ? 'ჩართულია' : 'გამორთულია'}
                    </Badge>
                  </dd>
                </div>
                <div className="grid content-start gap-1.5">
                  <dt className="text-sm text-muted-foreground">
                    ბოლო კავშირი
                  </dt>
                  <dd className="font-medium tabular-nums">
                    {displayTime(history.device.lastContactAt)}
                  </dd>
                </div>
                <div className="grid content-start gap-1.5">
                  <dt className="text-sm text-muted-foreground">
                    ბოლო ვალიდური მდებარეობა
                  </dt>
                  <dd className="font-medium tabular-nums">
                    {displayTime(history.latestFix?.fixAt ?? null)}
                  </dd>
                  {history.latestFix && (
                    <dd className="text-xs tabular-nums text-muted-foreground">
                      {coordinates(history.latestFix)}
                    </dd>
                  )}
                </div>
                <div className="grid content-start gap-1.5">
                  <dt className="text-sm text-muted-foreground">ბატარეა</dt>
                  <dd>
                    <GpsBatteryLevel
                      percent={history.battery?.percent ?? null}
                    />
                  </dd>
                  {history.battery && (
                    <dd className="text-xs tabular-nums text-muted-foreground">
                      <time dateTime={history.battery.fixAt.toISOString()}>
                        {displayTime(history.battery.fixAt)}
                      </time>
                    </dd>
                  )}
                </div>
              </dl>
              <dl className="mt-4 grid grid-cols-2 gap-3 border-t pt-4 xl:grid-cols-4">
                {[
                  {
                    label: 'სიჩქარე',
                    value: history.latestFix?.speedKmh,
                    unit: 'კმ/სთ',
                  },
                  {
                    label: 'თანამგზავრები',
                    value: history.latestFix?.satellites,
                    unit: '',
                  },
                  {
                    label: 'მობილური სიგნალი',
                    value: history.latestFix?.cellularSignal,
                    unit: '',
                  },
                  {
                    label: 'გარბენი',
                    value: history.latestFix?.odometerKm,
                    unit: 'კმ',
                  },
                ].map(({ label, value, unit }) => (
                  <div
                    key={label}
                    className="grid content-start gap-1 rounded-lg border bg-muted/25 px-3 py-2.5"
                  >
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="font-medium tabular-nums">
                      {value == null
                        ? 'უცნობია'
                        : `${value.toLocaleString('ka-GE')}${unit ? ` ${unit}` : ''}`}
                    </dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
          <GpsDeviceDiagnostics
            actorId={actorId}
            deviceId={deviceId}
            deviceName={history.device.name}
          />
          <section
            aria-label="მდებარეობის ისტორიის პერიოდი"
            className="flex flex-wrap items-center justify-between gap-3"
          >
            <h2 className="text-base font-semibold">მდებარეობის ისტორია</h2>
            <div className="flex flex-wrap items-center gap-2">
              {[
                { days: 1, label: 'დღეს' },
                { days: 3, label: 'ბოლო 3 დღე' },
                { days: 7, label: 'ბოლო 7 დღე' },
              ].map(({ days, label }) => {
                const from = new Date(
                  Date.parse(today) - (days - 1) * 86_400_000,
                )
                  .toISOString()
                  .slice(0, 10)
                const selected = search.from === from && search.to === today
                return (
                  <Button
                    key={days}
                    variant={selected ? 'secondary' : 'outline'}
                    depth="raised"
                    aria-pressed={selected}
                    onClick={() => onRangeChange({ from, to: today })}
                  >
                    {label}
                  </Button>
                )
              })}
              <GpsHistoryRange value={search} onChange={onRangeChange} />
            </div>
          </section>
          {history.total === 0 ? (
            <Empty className="rounded-xl border bg-card">
              <EmptyHeader>
                <EmptyMedia aria-hidden="true">
                  <IconRoute />
                </EmptyMedia>
                <EmptyTitle>
                  ამ პერიოდში მდებარეობა არ დაფიქსირებულა.
                </EmptyTitle>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              <Card className="overflow-hidden pb-0">
                <CardHeader>
                  <CardTitle>
                    <h2>მარშრუტი</h2>
                  </CardTitle>
                </CardHeader>
                {history.total > history.trackLimit && (
                  <div className="px-4">
                    <Alert>
                      <AlertDescription>
                        რუკაზე დამუშავებულია მხოლოდ ბოლო {history.trackLimit}{' '}
                        ჩანაწერი. სრული ისტორია ხელმისაწვდომია ცხრილში.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
                <GpsHistoryMap
                  key={`${deviceId}:${search.from}:${search.to}`}
                  fixes={history.track}
                />
              </Card>
              <Card className="overflow-hidden pb-0">
                <CardHeader>
                  <CardTitle>
                    <h2>მდებარეობის ჩანაწერები</h2>
                  </CardTitle>
                </CardHeader>
                <div>
                  <HistoryTable
                    rows={history.rows}
                    pending={query.isPlaceholderData}
                  />
                  {history.total > gpsPageSize && (
                    <div className="border-t p-4">
                      <DataPagination
                        page={
                          query.isPlaceholderData ? search.page : history.page
                        }
                        pageSize={gpsPageSize}
                        total={history.total}
                        renderLink={(page) => (
                          <Link
                            to="/manage/gps/$deviceId"
                            params={{ deviceId }}
                            search={{ ...search, page }}
                            resetScroll={false}
                          />
                        )}
                      />
                    </div>
                  )}
                </div>
              </Card>
            </>
          )}
        </>
      ) : (
        <Empty className="rounded-xl border bg-card">
          <EmptyHeader>
            <EmptyMedia aria-hidden="true">
              <IconGps />
            </EmptyMedia>
            <EmptyTitle>GPS მოწყობილობა ვერ მოიძებნა.</EmptyTitle>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  )
}
