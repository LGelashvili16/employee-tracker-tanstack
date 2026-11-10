import {
  createColumnHelper,
  tableFeatures,
  useTable,
} from '@tanstack/react-table'
import { useMemo } from 'react'
import { IconArrowsSort } from '@tabler/icons-react'
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
import { formatAnnouncementDate } from '../announcements.format'
import type { AnnouncementSummary } from '../announcements.types'

const features = tableFeatures({})
const helper = createColumnHelper<typeof features, AnnouncementSummary>()
export function AnnouncementsTable({
  items,
  sort,
  onSort,
  onOpen,
}: {
  items: Array<AnnouncementSummary>
  sort: 'newest' | 'oldest'
  onSort: () => void
  onOpen: (id: string) => void
}) {
  const columns = useMemo(
    () =>
      helper.columns([
        helper.accessor('title', {
          header: 'განცხადება',
          cell: ({ row }) => (
            <Button
              variant="link"
              className="h-auto max-w-full justify-start px-0 py-1 text-start whitespace-normal wrap-anywhere"
              onClick={() => onOpen(row.original.id)}
            >
              {row.original.title}
            </Button>
          ),
        }),
        helper.accessor('publishedAt', {
          header: () => (
            <Button variant="link" onClick={onSort}>
              გამოქვეყნდა
              <IconArrowsSort aria-hidden="true" />
            </Button>
          ),
          cell: ({ row }) => formatAnnouncementDate(row.original.publishedAt),
        }),
        helper.accessor('showOnLogin', {
          header: 'ჩვენება',
          cell: ({ row }) => (
            <Badge variant={row.original.showOnLogin ? 'blue' : 'secondary'}>
              {row.original.showOnLogin ? 'შესვლისას' : 'შეტყობინება'}
            </Badge>
          ),
        }),
        helper.accessor('readAt', {
          header: 'სტატუსი',
          cell: ({ row }) => (
            <Badge variant={row.original.readAt ? 'secondary' : 'purple'}>
              {row.original.readAt ? 'წაკითხული' : 'წაუკითხავი'}
            </Badge>
          ),
        }),
      ]),
    [onOpen, onSort],
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
              <TableHead
                key={header.id}
                className="px-5"
                aria-sort={
                  header.column.id === 'publishedAt'
                    ? sort === 'newest'
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
              <TableCell key={cell.id} className="px-5 py-4">
                <table.FlexRender cell={cell} />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
