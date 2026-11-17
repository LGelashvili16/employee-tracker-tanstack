import { CloseSickLeaveDialog } from './close-sick-leave-dialog'
import { useMemo } from 'react'
import {
  createColumnHelper,
  tableFeatures,
  useTable,
} from '@tanstack/react-table'
import { Badge } from '#/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar'
import { Button } from '#/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import type { LeaveItem } from '../leave.types'
import { CancelLeaveDialog } from './cancel-leave-dialog'
import {
  formatLeaveDate,
  formatLeaveEndDate,
  kindLabels,
  statusLabels,
  statusVariants,
} from '../leave.presentation'

const features = tableFeatures({})
const helper = createColumnHelper<typeof features, LeaveItem>()
export function LeaveTable({
  items,
  actorId,
  review,
  onReview,
}: {
  items: Array<LeaveItem>
  actorId: string
  review: boolean
  onReview: (item: LeaveItem) => void
}) {
  const columns = useMemo(
    () =>
      helper.columns([
        ...(review
          ? [
              helper.accessor('name', {
                header: 'თანამშრომელი',
                cell: (info) => (
                  <div className="flex items-center gap-3">
                    <Avatar aria-hidden="true">
                      {info.row.original.image ? (
                        <AvatarImage src={info.row.original.image} alt="" />
                      ) : null}
                      <AvatarFallback>
                        {info
                          .getValue()
                          .trim()
                          .split(/\s+/)
                          .slice(0, 2)
                          .map((part) => part.slice(0, 1))
                          .join('')
                          .toLocaleUpperCase('ka')}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{info.getValue()}</span>
                  </div>
                ),
              }),
            ]
          : []),
        helper.accessor('kind', {
          header: 'ტიპი',
          cell: (info) => kindLabels[info.getValue()],
        }),
        helper.accessor('startDate', {
          header: 'დაწყება',
          cell: (info) => formatLeaveDate(info.getValue()),
        }),
        helper.accessor('endDate', {
          header: 'დასრულება',
          cell: (info) => formatLeaveEndDate(info.getValue()),
        }),
        helper.accessor('status', {
          header: 'სტატუსი',
          cell: (info) => (
            <Badge variant={statusVariants[info.getValue()]}>
              {statusLabels[info.getValue()]}
            </Badge>
          ),
        }),
        helper.accessor('note', {
          header: 'კომენტარი',
          cell: (info) => (
            <p className="max-w-sm whitespace-pre-wrap break-words">
              {info.getValue() || '-'}
            </p>
          ),
        }),
        helper.display({
          id: 'review',
          header: 'განხილვა',
          cell: ({ row }) => (
            <div className="flex flex-col gap-1">
              <p className="max-w-sm whitespace-pre-wrap break-words">
                {row.original.status === 'cancelled'
                  ? 'გაუქმებულია თანამშრომლის მიერ'
                  : row.original.reviewReason ||
                    (row.original.status === 'pending' &&
                    !row.original.reviewerName
                      ? 'ჯერ არ განხილულა'
                      : 'აღწერა არ არის')}
              </p>
              {row.original.reviewerName ? (
                <span className="text-xs text-muted-foreground">
                  {row.original.reviewerName}
                </span>
              ) : null}
            </div>
          ),
        }),
        helper.display({
          id: 'actions',
          header: 'მოქმედება',
          cell: ({ row }) => (
            <div className="flex flex-wrap items-center gap-2">
              {review && row.original.status === 'pending' ? (
                row.original.requesterId === actorId ? (
                  <span className="text-sm text-muted-foreground">
                    საკუთარი მოთხოვნა
                  </span>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    depth="raised"
                    onClick={() => onReview(row.original)}
                  >
                    განხილვა
                  </Button>
                )
              ) : null}
              {!review &&
              row.original.status === 'pending' &&
              row.original.canCancel &&
              row.original.requesterId === actorId ? (
                <CancelLeaveDialog item={row.original} />
              ) : null}
              {row.original.kind === 'sick_leave' &&
              row.original.endDate === null &&
              ['pending', 'approved'].includes(row.original.status) &&
              (review || row.original.requesterId === actorId) ? (
                <CloseSickLeaveDialog item={row.original} />
              ) : null}
            </div>
          ),
        }),
      ]),
    [review, actorId, onReview],
  )
  const table = useTable({
    features,
    columns,
    data: items,
    getRowId: (row) => row.id,
  })
  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((group) => (
          <TableRow key={group.id}>
            {group.headers.map((header) => (
              <TableHead key={header.id} className="px-4">
                {header.isPlaceholder ? null : (
                  <table.FlexRender header={header} />
                )}
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
