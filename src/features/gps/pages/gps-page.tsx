import { useEffect, useMemo, useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  createColumnHelper,
  tableFeatures,
  useTable,
} from '@tanstack/react-table'
import {
  IconArrowsSort,
  IconGps,
  IconMapPin,
  IconPlus,
  IconSearch,
} from '@tabler/icons-react'
import { z } from 'zod'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '#/components/ui/empty'
import { Field, FieldError, FieldLabel } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { Map, MapControls, MapMarker } from '#/components/ui/map'
import { Skeleton } from '#/components/ui/skeleton'
import { Sheet } from '#/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { DataPagination } from '#/components/common/data-pagination'
import { formatGeorgianDateTime } from '#/lib/date-format'
import { GpsDeviceEditor } from '../components/gps-device-editor'
import { GpsBatteryLevel } from '../components/gps-battery-level'
import { GpsErrorSheet } from '../components/gps-error-sheet'
import { gpsQuery } from '../gps.queries'
import { gpsPageSize, gpsSearchText } from '../gps.schemas'
import type { GpsDeviceRow } from '../gps.queries'
import type { GpsSearch } from '../gps.schemas'

const features = tableFeatures({})
const column = createColumnHelper<typeof features, GpsDeviceRow>()
const empty: GpsDeviceRow[] = []
const searchFormSchema = z.object({ q: gpsSearchText })
const displayTime = (date: Date) =>
  formatGeorgianDateTime(date.toISOString(), 'Asia/Tbilisi')

function DeviceSearch({
  search,
  onSearch,
}: {
  search: GpsSearch
  onSearch: (search: GpsSearch, replace?: boolean) => void
}) {
  const form = useForm({
    defaultValues: { q: search.q },
    validators: { onChange: searchFormSchema },
  })
  useEffect(() => {
    form.reset({ q: search.q })
  }, [form, search.q])
  return (
    <form.Field name="q">
      {(field) => (
        <SearchInput
          value={field.state.value}
          onValue={field.handleChange}
          errors={field.state.meta.errors}
          onCommit={(q) => {
            if (q !== search.q) onSearch({ ...search, q, page: 1 }, true)
          }}
        />
      )}
    </form.Field>
  )
}

function SearchInput({
  value,
  onValue,
  onCommit,
  errors,
}: {
  value: string
  onValue: (value: string) => void
  onCommit: (value: string) => void
  errors: Array<{ message: string } | undefined>
}) {
  useEffect(() => {
    const parsed = gpsSearchText.safeParse(value)
    if (!parsed.success) return
    const timer = setTimeout(() => onCommit(parsed.data), 300)
    return () => clearTimeout(timer)
  }, [value, onCommit])
  return (
    <Field className="max-w-sm">
      <FieldLabel htmlFor="gps-search">მოწყობილობის ძიება</FieldLabel>
      <Input
        id="gps-search"
        value={value}
        onChange={(e) => onValue(e.target.value)}
        maxLength={80}
        aria-invalid={errors.length > 0}
      />
      <FieldError errors={errors} />
    </Field>
  )
}

export function GpsPage({
  actorId,
  canManage,
  search,
  onSearch,
}: {
  actorId: string
  canManage: boolean
  search: GpsSearch
  onSearch: (search: GpsSearch, replace?: boolean) => void
}) {
  const query = useQuery({
    ...gpsQuery(actorId, search),
    refetchInterval: 15_000,
  })
  const [editing, setEditing] = useState<GpsDeviceRow | null | undefined>(
    undefined,
  )
  const [editorOpen, setEditorOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const columns = useMemo(
    () => [
      column.display({
        id: 'name',
        header: 'სახელი',
        cell: ({ row }) => (
          <Link
            to="/manage/gps/$deviceId"
            params={{ deviceId: row.original.id }}
            search={{}}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {row.original.name}
          </Link>
        ),
      }),
      column.display({
        id: 'reportedId',
        header: 'იდენტიფიკატორი',
        cell: ({ row }) => row.original.reportedId,
      }),
      column.display({
        id: 'enabled',
        header: 'სტატუსი',
        cell: ({ row }) => (
          <Badge variant={row.original.enabled ? 'green' : 'secondary'}>
            {row.original.enabled ? 'ჩართულია' : 'გამორთულია'}
          </Badge>
        ),
      }),
      column.display({
        id: 'lastContactAt',
        header: 'ბოლო კავშირი',
        cell: ({ row }) => {
          const date = row.original.lastContactAt
          return date ? displayTime(date) : 'არ დაფიქსირებულა'
        },
      }),
      column.display({
        id: 'fix',
        header: 'ბოლო მდებარეობა',
        cell: ({ row }) =>
          row.original.position ? (
            <div className="tabular-nums">
              <div>{displayTime(row.original.position.fixAt)}</div>
              <div className="text-xs text-muted-foreground">
                {row.original.position.latitude.toFixed(5)},{' '}
                {row.original.position.longitude.toFixed(5)}
              </div>
            </div>
          ) : (
            'მდებარეობა არ დაფიქსირებულა'
          ),
      }),
      column.display({
        id: 'battery',
        header: 'ბატარეა',
        cell: ({ row }) => (
          <GpsBatteryLevel percent={row.original.batteryPercent ?? null} />
        ),
      }),
      column.display({
        id: 'diagnostics',
        header: 'დიაგნოსტიკა',
        cell: ({ row }) =>
          row.original.error ? (
            <GpsErrorSheet
              deviceName={row.original.name}
              error={row.original.error}
            />
          ) : (
            <span className="text-muted-foreground">
              შეცდომა არ დაფიქსირებულა
            </span>
          ),
      }),
      ...(canManage
        ? [
            column.display({
              id: 'edit',
              header: 'მოქმედება',
              cell: ({ row }) => (
                <Button
                  variant="outline"
                  size="sm"
                  aria-label={`${row.original.name}: რედაქტირება`}
                  onClick={() => {
                    setEditing(row.original)
                    setEditorOpen(true)
                  }}
                >
                  რედაქტირება
                </Button>
              ),
            }),
          ]
        : []),
    ],
    [canManage],
  )
  const rows = query.data?.rows ?? empty
  const table = useTable({
    features,
    columns,
    data: rows,
    getRowId: (row) => row.id,
  })
  const markers = rows.flatMap((row) =>
    row.enabled && row.position
      ? [{ ...row.position, id: row.id, name: row.name }]
      : [],
  )
  const first = markers.at(0)
  const nextSort = search.sort === 'name' ? 'recent' : 'name'
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          GPS მოწყობილობები
        </h1>
        {canManage && (
          <Button
            onClick={() => {
              setEditing(null)
              setEditorOpen(true)
            }}
          >
            <IconPlus aria-hidden="true" /> მოწყობილობის დამატება
          </Button>
        )}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <DeviceSearch search={search} onSearch={onSearch} />
        <Button
          variant="outline"
          onClick={() => onSearch({ ...search, sort: nextSort, page: 1 })}
          aria-label="დალაგების შეცვლა"
        >
          <IconArrowsSort aria-hidden="true" />{' '}
          {search.sort === 'name'
            ? 'სახელის მიხედვით'
            : 'ბოლო კავშირის მიხედვით'}
        </Button>
      </div>
      {query.isPending ? (
        <div role="status" aria-busy="true">
          <span className="sr-only">მოწყობილობები იტვირთება</span>
          <Skeleton className="h-64" aria-hidden="true" />
        </div>
      ) : query.isError ? (
        <Alert variant="destructive">
          <AlertDescription>
            მოწყობილობები ვერ ჩაიტვირთა. განაახლეთ გვერდი.
          </AlertDescription>
        </Alert>
      ) : query.data.total === 0 ? (
        <Empty className="rounded-xl border bg-card">
          <EmptyHeader>
            <EmptyMedia aria-hidden="true">
              {search.q ? <IconSearch /> : <IconGps />}
            </EmptyMedia>
            <EmptyTitle>
              {search.q
                ? 'ძიების შედეგები ვერ მოიძებნა.'
                : 'GPS მოწყობილობები ჯერ არ არის დამატებული.'}
            </EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          {first && (
            <section
              aria-label="ამ გვერდზე ნაჩვენები მოწყობილობების მდებარეობები"
              className="overflow-hidden rounded-xl border"
            >
              <Map
                key={`${search.page}:${search.q}:${search.sort}`}
                className="h-80"
                center={[first.longitude, first.latitude]}
              >
                <MapControls />
                {markers.map((marker) => (
                  <MapMarker
                    key={marker.id}
                    longitude={marker.longitude}
                    latitude={marker.latitude}
                  >
                    <Badge variant="blue" title={displayTime(marker.fixAt)}>
                      <IconMapPin aria-hidden="true" />
                      {marker.name}
                    </Badge>
                  </MapMarker>
                ))}
              </Map>
            </section>
          )}
          <div className="overflow-hidden rounded-xl border bg-card">
            <Table>
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
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getAllCells().map((cell) => (
                      <TableCell key={cell.id}>
                        <table.FlexRender cell={cell} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
                {!rows.length && (
                  <TableRow>
                    <TableCell colSpan={columns.length}>
                      ამ გვერდზე მოწყობილობები არ არის.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <div className="border-t p-4">
              <DataPagination
                page={search.page}
                total={query.data.total}
                pageSize={gpsPageSize}
                renderLink={(page) => (
                  <Link to="/manage/gps" search={{ ...search, page }} />
                )}
              />
            </div>
          </div>
        </>
      )}
      {canManage && (
        <Sheet
          open={editorOpen}
          onOpenChange={(open) => {
            if (!open && !saving) setEditorOpen(false)
          }}
          onOpenChangeComplete={(open) => {
            if (!open) setEditing(undefined)
          }}
        >
          {editing !== undefined && (
            <GpsDeviceEditor
              key={editing?.id ?? 'new'}
              device={editing}
              actorId={actorId}
              close={() => setEditorOpen(false)}
              onBusyChange={setSaving}
            />
          )}
        </Sheet>
      )}
    </div>
  )
}
