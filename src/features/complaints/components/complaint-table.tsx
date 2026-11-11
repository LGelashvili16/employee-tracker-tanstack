import { useMemo } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  createColumnHelper,
  tableFeatures,
  useTable,
} from '@tanstack/react-table'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableCell,
  TableRow,
} from '#/components/ui/table'
import { Badge } from '#/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar'
import type { ComplaintItem } from '../complaints.queries'
import type { ComplaintSearch } from '../complaints.schemas'
import {
  complaintCategoryLabels,
  complaintDate,
  complaintStatusLabels,
  complaintStatusVariants,
} from '../complaints.presentation'

const features = tableFeatures({})
const helper = createColumnHelper<typeof features, ComplaintItem>()
export function ComplaintTable({
  items,
  review,
  search,
}: {
  items: Array<ComplaintItem>
  review: boolean
  search: ComplaintSearch
}) {
  const navigate = useNavigate()
  const columns = useMemo(
    () =>
      helper.columns([
        helper.accessor('requesterName', {
          header: 'თანამშრომელი',
          cell: (info) => (
            <div className="flex items-center gap-3">
              <Avatar aria-hidden="true">
                {info.row.original.requesterImage ? (
                  <AvatarImage src={info.row.original.requesterImage} alt="" />
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
        helper.accessor('title', {
          header: 'თემა',
          cell: (info) => (
            <Link
              to={review ? '/manage/complaints' : '/complaints'}
              search={{
                ...search,
                complaintId: info.row.original.id,
                activityPage: 1,
              }}
              className="block max-w-sm rounded-sm font-medium break-words underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            >
              {info.getValue()}
            </Link>
          ),
        }),
        helper.accessor('status', {
          header: 'სტატუსი',
          cell: (info) => (
            <Badge variant={complaintStatusVariants[info.getValue()]}>
              {complaintStatusLabels[info.getValue()]}
            </Badge>
          ),
        }),
        helper.accessor('category', {
          header: 'კატეგორია',
          cell: (info) => complaintCategoryLabels[info.getValue()],
        }),
        helper.accessor('assigneeName', {
          header: 'პასუხისმგებელი',
          cell: (info) => info.getValue() ?? 'ჯერ არ არის მინიჭებული',
        }),
        helper.accessor('visibility', {
          header: 'ხილვადობა',
          cell: (info) =>
            info.getValue() === 'hr_only' ? (
              <Badge variant="outline">კონფიდენციალური</Badge>
            ) : (
              'ჩვეულებრივი'
            ),
        }),
        helper.accessor('createdAt', {
          header: 'რეგისტრაცია',
          cell: (info) => complaintDate(info.getValue()),
        }),
      ]),
    [review, search],
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
          <TableRow
            key={row.id}
            className="cursor-pointer focus-within:bg-muted/50"
            onClick={(event) => {
              if (
                event.defaultPrevented ||
                event.button !== 0 ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey ||
                window.getSelection()?.toString() ||
                (event.target instanceof Element &&
                  event.target.closest(
                    'a, button, input, textarea, select, [role="button"], [role="link"], [contenteditable="true"]',
                  ))
              )
                return
              void navigate({
                to: review ? '/manage/complaints' : '/complaints',
                search: {
                  ...search,
                  complaintId: row.original.id,
                  activityPage: 1,
                },
              })
            }}
          >
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
