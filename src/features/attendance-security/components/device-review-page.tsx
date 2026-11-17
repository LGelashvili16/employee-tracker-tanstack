import { deviceReviewOptions } from '../attendance-security.queries'
import { AttendanceSecurityProvider } from '../providers/attendance-security-provider'
import type { readDeviceRequests } from '../attendance-security.functions'
import { DeviceFilters } from './device-filters'
import { useMemo, useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import {
  useQuery,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query'
import { useForm } from '@tanstack/react-form'
import {
  createColumnHelper,
  tableFeatures,
  useTable,
} from '@tanstack/react-table'
import { toast } from 'sonner'
import type { z } from 'zod'
import { reviewAttendanceDevice } from '../attendance-security.functions'
import {
  deviceDecisionSchema,
  securityListSchema,
} from '../attendance-security.schemas'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import { FieldGroup } from '#/components/ui/field'
import { Tabs, TabsList, TabsTrigger } from '#/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { Skeleton } from '#/components/ui/skeleton'
import {
  DeviceState,
  SecurityPagination,
  SecuritySubmit,
} from './security-controls'
import { formatAttendanceDateTime } from '#/features/attendance/attendance.rules'

const route = getRouteApi('/_authenticated/manage/devices')
type Device = Extract<
  Awaited<ReturnType<typeof readDeviceRequests>>,
  { ok: true }
>['value']['items'][number]
const features = tableFeatures({})
const helper = createColumnHelper<typeof features, Device>()
const empty: Device[] = []
export function DeviceReviewPage() {
  const { actor } = route.useRouteContext()
  return (
    <AttendanceSecurityProvider key={actor.id}>
      <DeviceReviewWorkspace />
    </AttendanceSecurityProvider>
  )
}

function DeviceReviewWorkspace() {
  const { actor } = route.useRouteContext()
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const [selection, setSelection] = useState<{
    device: Device
    decision: z.infer<typeof deviceDecisionSchema>['decision']
  } | null>(null)
  const query = useQuery({
    ...deviceReviewOptions(actor.id, search),
    placeholderData: keepPreviousData,
  })
  const result = query.data?.ok ? query.data.value : null
  const columns = useMemo(
    () =>
      helper.columns([
        helper.accessor('userName', { header: 'თანამშრომელი' }),
        helper.accessor('name', { header: 'მოწყობილობა' }),
        helper.display({
          id: 'type',
          header: 'ტიპი',
          cell: () => (
            <Badge
              variant={
                result?.passkeyRequired
                  ? 'purple'
                  : result?.browserApprovalRequired === false
                    ? 'secondary'
                    : 'blue'
              }
            >
              {result?.passkeyRequired
                ? 'Token + Passkey'
                : result?.browserApprovalRequired === false
                  ? 'გამორთულია'
                  : 'Token'}
            </Badge>
          ),
        }),
        helper.accessor('state', {
          header: 'სტატუსი',
          cell: ({ row }) => <DeviceState state={row.original.state} />,
        }),
        helper.display({
          id: 'verification',
          header: 'დადასტურების გასაღები',
          cell: ({ row }) =>
            row.original.hasPasskey
              ? row.original.backedUp
                ? 'დამატებულია · სინქრონიზებული'
                : 'დამატებულია'
              : 'არ არის დამატებული',
        }),
        helper.accessor('requestedIp', {
          header: 'მოთხოვნის IP',
          cell: ({ row }) => row.original.requestedIp ?? 'უცნობია',
        }),
        helper.accessor('createdAt', {
          header: 'მოთხოვნის დრო',
          cell: ({ row }) =>
            formatAttendanceDateTime(
              row.original.createdAt,
              result?.timezone ?? 'Asia/Tbilisi',
            ),
        }),
        helper.display({
          id: 'reviewer',
          header: 'გადაწყვეტილება მიიღო',
          cell: ({ row }) =>
            row.original.reviewedAt ? (
              <div className="flex flex-col gap-1">
                <span>{row.original.reviewedByName ?? 'უცნობია'}</span>
                <span className="text-xs text-muted-foreground">
                  {formatAttendanceDateTime(
                    row.original.reviewedAt,
                    result?.timezone ?? 'Asia/Tbilisi',
                  )}
                </span>
              </div>
            ) : (
              <span className="text-muted-foreground">
                გადაწყვეტილება მოლოდინშია
              </span>
            ),
        }),
        helper.display({
          id: 'actions',
          header: 'მოქმედება',
          cell: ({ row }) =>
            row.original.userId === actor.id &&
            (!result?.canApproveOwn || row.original.state !== 'pending') ? (
              <span className="text-muted-foreground">საკუთარი მოთხოვნა</span>
            ) : (
              <div className="flex gap-2">
                {row.original.state === 'pending' ? (
                  <>
                    <Button
                      size="sm"
                      onClick={() =>
                        setSelection({
                          device: row.original,
                          decision: 'approved',
                        })
                      }
                    >
                      {row.original.userId === actor.id
                        ? 'საკუთარი მოწყობილობის დადასტურება'
                        : 'დადასტურება'}
                    </Button>
                    {row.original.userId !== actor.id ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setSelection({
                            device: row.original,
                            decision: 'rejected',
                          })
                        }
                      >
                        უარყოფა
                      </Button>
                    ) : null}
                  </>
                ) : row.original.state === 'approved' ? (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() =>
                      setSelection({
                        device: row.original,
                        decision: 'revoked',
                      })
                    }
                  >
                    გაუქმება
                  </Button>
                ) : null}
              </div>
            ),
        }),
      ]),
    [
      actor.id,
      result?.timezone,
      result?.browserApprovalRequired,
      result?.passkeyRequired,
      result?.canApproveOwn,
    ],
  )
  const table = useTable({
    features,
    columns,
    data: result?.items ?? empty,
    getRowId: (row) => row.id,
  })
  return (
    <section className="flex min-w-0 flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        დასწრების მოწყობილობები
      </h1>
      <Tabs
        value={search.state}
        onValueChange={(state) => {
          const next = securityListSchema.safeParse({
            ...search,
            state,
            page: 1,
          })
          if (next.success) void navigate({ search: next.data })
        }}
        className="min-w-0"
      >
        <div className="max-w-full overflow-x-auto">
          <TabsList
            aria-label="მოწყობილობების სტატუსი"
            className="w-max gap-1 rounded-xl border p-0.5 group-data-horizontal/tabs:h-auto"
          >
            <TabsTrigger value="all" className="min-h-10 px-4">
              ყველა
            </TabsTrigger>
            <TabsTrigger value="pending" className="min-h-10 px-4">
              დასადასტურებელი
            </TabsTrigger>
            <TabsTrigger value="approved" className="min-h-10 px-4">
              აქტიური
            </TabsTrigger>
            <TabsTrigger value="revoked" className="min-h-10 px-4">
              გაუქმებული
            </TabsTrigger>
            <TabsTrigger value="rejected" className="min-h-10 px-4">
              უარყოფილი
            </TabsTrigger>
          </TabsList>
        </div>
      </Tabs>
      <DeviceFilters
        showState={false}
        search={search}
        onChange={(next) => {
          void navigate({ search: next })
        }}
      />
      {query.isPending ? (
        <div
          role="status"
          aria-busy="true"
          aria-label="მოწყობილობები იტვირთება"
        >
          <Skeleton
            className="h-72 motion-reduce:animate-none"
            aria-hidden="true"
          />
        </div>
      ) : !result ? (
        <Alert variant="destructive">
          <AlertDescription>მოწყობილობების სია ვერ ჩაიტვირთა.</AlertDescription>
        </Alert>
      ) : (
        <div
          className="min-w-0 overflow-hidden rounded-xl border bg-card"
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
                    <TableCell key={cell.id} className="px-4">
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
            page={search.page}
            total={result.total}
            onPage={(page) => {
              void navigate({ search: { ...search, page } })
            }}
          />
        </div>
      )}
      <Dialog
        open={Boolean(selection)}
        onOpenChange={(open) => {
          if (!open) setSelection(null)
        }}
      >
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>მოწყობილობის სტატუსის შეცვლა</DialogTitle>
          </DialogHeader>
          {selection ? (
            <DeviceDecision
              key={`${selection.device.id}:${selection.decision}`}
              selection={selection}
              onDone={() => setSelection(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  )
}
function DeviceDecision({
  selection,
  onDone,
}: {
  selection: {
    device: Device
    decision: z.infer<typeof deviceDecisionSchema>['decision']
  }
  onDone: () => void
}) {
  const client = useQueryClient()
  const [message, setMessage] = useState('')
  const form = useForm({
    defaultValues: {
      id: selection.device.id,
      revision: selection.device.revision,
      decision: selection.decision,
    },
    validators: { onSubmit: deviceDecisionSchema },
    onSubmit: async ({ value }) => {
      const result = await reviewAttendanceDevice({ data: value }).catch(
        () => null,
      )
      if (!result?.ok) {
        const text = result?.message ?? 'მოწყობილობის სტატუსი ვერ შეიცვალა.'
        setMessage(text)
        toast.error(text)
        return
      }
      toast.success('მოწყობილობის სტატუსი შეცვლილია.')
      await client.invalidateQueries({ queryKey: ['attendance-security'] })
      onDone()
    },
  })
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
    >
      <FieldGroup>
        <p className="text-sm">
          {selection.device.userName} · {selection.device.name}
        </p>
        {selection.decision === 'revoked' ? (
          <Alert variant="warning" role="note">
            <AlertDescription>
              გაუქმების შემდეგ ამ მოწყობილობიდან შესვლა და გასვლა შეიზღუდება.
            </AlertDescription>
          </Alert>
        ) : null}
        {message ? (
          <Alert variant="destructive">
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        ) : null}
        <form.Subscribe selector={(s) => s.isSubmitting}>
          {(pending) => (
            <SecuritySubmit pending={pending}>
              გადაწყვეტილების შენახვა
            </SecuritySubmit>
          )}
        </form.Subscribe>
      </FieldGroup>
    </form>
  )
}
