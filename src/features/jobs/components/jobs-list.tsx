import { useMemo } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  createColumnHelper,
  tableFeatures,
  useTable,
} from '@tanstack/react-table'
import { IconArrowUp, IconArrowDown } from '@tabler/icons-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { formatJobDate } from '../jobs.presentation'
import { formatJobDay } from '../jobs.dates'
import { JobStatusBadge } from './job-status-badge'
import { JobKindBadge } from './job-kind-badge'
import type { JobSearch, JobSummary } from '../jobs.types'

const features = tableFeatures({})
const helper = createColumnHelper<typeof features, JobSummary>()
export function JobsList({
  items,
  search,
}: {
  items: Array<JobSummary>
  search: JobSearch
}) {
  const navigate = useNavigate()
  const columns = useMemo(
    () =>
      helper.columns([
        helper.accessor('title', {
          header: () => (
            <Link
              to="/jobs"
              search={{ ...search, sort: 'title', page: 1 }}
              className="inline-flex items-center gap-2 text-primary underline-offset-4 hover:underline"
            >
              სამუშაო
              {search.sort === 'title' ? (
                <IconArrowUp className="size-4" aria-hidden="true" />
              ) : null}
            </Link>
          ),
          cell: ({ row }) => (
            <Link
              to="/jobs"
              search={{ ...search, pin: row.original.id }}
              className="block max-w-80 min-w-40 rounded font-medium break-words outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            >
              {row.original.title}
              <span className="mt-1 block text-sm font-normal text-muted-foreground">
                {row.original.address || 'მისამართი არ არის მითითებული'}
              </span>
            </Link>
          ),
        }),
        helper.accessor('kind', {
          header: 'ტიპი',
          cell: ({ row }) => <JobKindBadge kind={row.original.kind} />,
        }),
        helper.accessor('status', {
          header: 'სტატუსი',
          cell: ({ row }) => <JobStatusBadge status={row.original.status} />,
        }),
        helper.accessor('assigneeName', {
          header: 'პასუხისმგებელი',
          cell: ({ row }) => row.original.assigneeName ?? 'თავისუფალია',
        }),
        helper.accessor('deadline', {
          header: 'ვადა',
          cell: ({ row }) =>
            row.original.deadline ? (
              <time
                dateTime={row.original.deadline}
                className="whitespace-nowrap tabular-nums"
              >
                {formatJobDay(row.original.deadline)}
              </time>
            ) : (
              'არ არის მითითებული'
            ),
        }),
        helper.accessor('createdAt', {
          header: () => (
            <Link
              to="/jobs"
              search={{
                ...search,
                sort: search.sort === 'newest' ? 'oldest' : 'newest',
                page: 1,
              }}
              className="inline-flex items-center gap-2 text-primary underline-offset-4 hover:underline"
            >
              დამატების თარიღი
              {search.sort === 'newest' ? (
                <IconArrowDown className="size-4" aria-hidden="true" />
              ) : search.sort === 'oldest' ? (
                <IconArrowUp className="size-4" aria-hidden="true" />
              ) : null}
            </Link>
          ),
          cell: ({ row }) => (
            <span className="whitespace-nowrap">
              {formatJobDate(row.original.createdAt)}
            </span>
          ),
        }),
      ]),
    [search],
  )
  const table = useTable({
    features,
    columns,
    data: items,
    getRowId: (row) => row.id,
  })
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Table>
        <TableHeader className="bg-muted/40">
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id}>
              {group.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className="h-12 px-4"
                  aria-sort={
                    header.column.id === 'title' && search.sort === 'title'
                      ? 'ascending'
                      : header.column.id === 'createdAt' &&
                          search.sort !== 'title'
                        ? search.sort === 'oldest'
                          ? 'ascending'
                          : 'descending'
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
                  to: '/jobs',
                  search: { ...search, pin: row.original.id },
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
    </div>
  )
}
