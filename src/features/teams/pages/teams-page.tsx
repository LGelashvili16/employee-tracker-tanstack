import { useEffect, useMemo, useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  createColumnHelper,
  tableFeatures,
  useTable,
} from '@tanstack/react-table'
import {
  IconArrowsSort,
  IconPlus,
  IconRefresh,
  IconEdit,
  IconEye,
  IconCircleCheck,
  IconArchive,
} from '@tabler/icons-react'
import { toast } from 'sonner'
import { formatGeorgianDateTime } from '#/lib/date-format'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Badge } from '#/components/ui/badge'
import { Spinner } from '#/components/ui/spinner'
import { Skeleton } from '#/components/ui/skeleton'
import { Alert, AlertDescription } from '#/components/ui/alert'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '#/components/ui/sheet'
import { Field, FieldError, FieldLabel } from '#/components/ui/field'
import { Tabs, TabsList, TabsTrigger } from '#/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { DataPagination } from '#/components/common/data-pagination'
import { TeamEditor } from '../components/team-editor'
import {
  teamSearchFormSchema,
  teamSearchSchema,
  teamsPageSize,
} from '../teams.schemas'
import { teamsKey, teamsQuery } from '../teams.queries'
import type { TeamSearch } from '../teams.schemas'

type Team = {
  id: string
  name: string
  active: boolean
  version: number
  createdAt: Date
  memberCount: number
  leaderName: string | null
}
const features = tableFeatures({})
const helper = createColumnHelper<typeof features, Team>()
const empty: Array<Team> = []

export function TeamsPage({
  actorId,
  search,
  onSearch,
}: {
  actorId: string
  search: TeamSearch
  onSearch: (next: TeamSearch, replace?: boolean) => void
}) {
  const client = useQueryClient()
  const query = useQuery(teamsQuery(actorId, { ...search, team: undefined }))
  const detail = useQuery({
    ...teamsQuery(actorId, search),
    enabled: Boolean(search.team),
  })
  const refresh = useMutation({
    mutationFn: async () => {
      await client.invalidateQueries({ queryKey: teamsKey(actorId) })
      await query.refetch({ throwOnError: true })
    },
    onSuccess: () => {
      toast.success('მონაცემები განახლებულია.')
    },
    onError: () => toast.error('განახლება ვერ მოხერხდა. სცადეთ ხელახლა.'),
    retry: false,
  })
  const [creating, setCreating] = useState(false)
  useEffect(() => {
    if (search.team) setCreating(false)
  }, [search.team])
  const [saving, setSaving] = useState(false)
  const selected = detail.data?.selected
  const searchForm = useForm({
    defaultValues: { q: search.q },
    validators: { onChange: teamSearchFormSchema },
  })
  const [draft, setDraft] = useState(search.q)
  useEffect(() => {
    setDraft(search.q)
    searchForm.setFieldValue('q', search.q)
  }, [search.q])
  useEffect(() => {
    if (draft === search.q) return
    const timer = setTimeout(() => {
      const parsed = teamSearchSchema.safeParse({
        ...search,
        q: draft,
        page: 1,
      })
      if (parsed.success) onSearch(parsed.data, true)
    }, 300)
    return () => clearTimeout(timer)
  }, [draft, search, onSearch])
  const columns = useMemo(
    () =>
      helper.columns([
        helper.accessor('name', {
          header: () => (
            <Link
              to="/manage/teams"
              search={{
                ...search,
                sort: 'name',
                page: 1,
              }}
              className="inline-flex items-center gap-2 text-primary underline-offset-4 hover:underline"
            >
              გუნდი <IconArrowsSort className="size-4" aria-hidden="true" />
            </Link>
          ),
          cell: ({ row }) => (
            <Link
              to="/manage/teams"
              search={{ ...search, team: row.original.id }}
              className="font-medium text-primary hover:underline"
            >
              {row.original.name}
            </Link>
          ),
        }),
        helper.accessor('memberCount', {
          header: 'წევრები',
          cell: ({ row }) => (
            <span className="tabular-nums">{row.original.memberCount}</span>
          ),
        }),
        helper.accessor('leaderName', {
          header: 'ხელმძღვანელი',
          cell: ({ row }) => (
            <span
              className={
                row.original.leaderName ? undefined : 'text-muted-foreground'
              }
            >
              {row.original.leaderName ?? 'არ არის მითითებული'}
            </span>
          ),
        }),
        helper.accessor('active', {
          header: 'სტატუსი',
          cell: ({ row }) => (
            <Badge variant={row.original.active ? 'green' : 'secondary'}>
              {row.original.active ? 'მოქმედი' : 'გაუქმებული'}
            </Badge>
          ),
        }),
        helper.accessor('createdAt', {
          header: () => (
            <Link
              to="/manage/teams"
              search={{ ...search, sort: 'newest', page: 1 }}
              className="inline-flex items-center gap-2 text-primary underline-offset-4 hover:underline"
            >
              შექმნის თარიღი{' '}
              <IconArrowsSort className="size-4" aria-hidden="true" />
            </Link>
          ),
          cell: ({ row }) => (
            <time dateTime={new Date(row.original.createdAt).toISOString()}>
              {formatGeorgianDateTime(
                new Date(row.original.createdAt).toISOString(),
                'Asia/Tbilisi',
              )}
            </time>
          ),
        }),
        helper.display({
          id: 'actions',
          header: 'მოქმედება',
          cell: ({ row }) => (
            <Button
              type="button"
              variant="outline"
              size="sm"
              depth="raised"
              aria-label={`${row.original.name}: ${row.original.active ? 'რედაქტირება' : 'ნახვა'}`}
              onClick={() => onSearch({ ...search, team: row.original.id })}
            >
              {row.original.active ? (
                <IconEdit data-icon="inline-start" aria-hidden="true" />
              ) : (
                <IconEye data-icon="inline-start" aria-hidden="true" />
              )}
              {row.original.active ? 'რედაქტირება' : 'ნახვა'}
            </Button>
          ),
        }),
      ]),
    [search, onSearch],
  )
  const table = useTable({
    features,
    columns,
    data: query.data?.items ?? empty,
    getRowId: (row) => row.id,
  })
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">გუნდები</h1>
        <Button
          variant="outline"
          disabled={refresh.isPending}
          aria-busy={refresh.isPending}
          onClick={() => refresh.mutate()}
        >
          {refresh.isPending ? <Spinner /> : <IconRefresh aria-hidden="true" />}
          განახლება
        </Button>
        <Button
          onClick={() => {
            setCreating(true)
          }}
        >
          <IconPlus aria-hidden="true" />
          გუნდის შექმნა
        </Button>
      </div>
      <Tabs
        value={search.status}
        onValueChange={(status) => {
          const parsed = teamSearchSchema.safeParse({
            ...search,
            status,
            page: 1,
            team: undefined,
          })
          if (parsed.success) onSearch(parsed.data)
        }}
      >
        <TabsList
          aria-label="გუნდის სტატუსი"
          className="w-max gap-1 rounded-xl border p-0.5 group-data-horizontal/tabs:h-auto"
        >
          <TabsTrigger value="active" className="h-9 px-4">
            <IconCircleCheck aria-hidden="true" />
            მოქმედი
          </TabsTrigger>
          <TabsTrigger value="inactive" className="h-9 px-4">
            <IconArchive aria-hidden="true" />
            გაუქმებული
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <searchForm.Field name="q">
        {(field) => (
          <Field className="max-w-sm">
            <FieldLabel htmlFor="teams-search">გუნდის ძიება</FieldLabel>
            <Input
              id="teams-search"
              value={draft}
              maxLength={100}
              onChange={(e) => {
                setDraft(e.target.value)
                field.handleChange(e.target.value)
              }}
              aria-invalid={!field.state.meta.isValid}
            />
            <FieldError errors={field.state.meta.errors} />
          </Field>
        )}
      </searchForm.Field>
      {query.isPending ? (
        <div role="status" aria-busy="true">
          <span className="sr-only">გუნდები იტვირთება</span>
          <Skeleton className="h-48 w-full" aria-hidden="true" />
        </div>
      ) : query.isError ? (
        <Alert variant="destructive">
          <AlertDescription>
            გუნდები ვერ ჩაიტვირთა. განაახლეთ გვერდი.
          </AlertDescription>
        </Alert>
      ) : (
        <>
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
                          header.column.id === 'name' && search.sort === 'name'
                            ? 'ascending'
                            : header.column.id === 'createdAt' &&
                                search.sort === 'newest'
                              ? 'descending'
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
                      <TableCell key={cell.id} className="px-4 py-4">
                        <table.FlexRender cell={cell} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
                {!query.data.items.length && (
                  <TableRow>
                    <TableCell colSpan={6} className="px-4 py-6">
                      {search.q
                        ? 'გუნდები ვერ მოიძებნა.'
                        : query.data.total > 0
                          ? 'ამ გვერდზე გუნდები არ არის.'
                          : 'ამ სიაში გუნდები ჯერ არ არის.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <div className="border-t px-4 py-4">
              <DataPagination
                page={search.page}
                total={query.data.total}
                pageSize={teamsPageSize}
                renderLink={(page) => (
                  <Link to="/manage/teams" search={{ ...search, page }} />
                )}
              />
            </div>
          </div>
        </>
      )}
      <Sheet
        open={creating || Boolean(search.team)}
        onOpenChange={(open) => {
          if (!open && !saving) {
            setCreating(false)
            if (search.team) onSearch({ ...search, team: undefined })
          }
        }}
      >
        <SheetContent
          showCloseButton={!saving}
          className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-xl"
        >
          <SheetHeader className="border-b px-6 py-5 pr-14">
            <SheetTitle>
              {creating ? 'გუნდის შექმნა' : (selected?.name ?? 'გუნდი')}
            </SheetTitle>
          </SheetHeader>
          {creating || selected ? (
            <TeamEditor
              key={creating ? 'new' : selected?.id}
              actorId={actorId}
              onBusyChange={setSaving}
              team={creating ? null : (selected ?? null)}
              onClose={() => {
                setCreating(false)
                if (search.team) onSearch({ ...search, team: undefined })
              }}
            />
          ) : detail.isPending ? (
            <div role="status" aria-busy="true" className="p-6">
              <span className="sr-only">გუნდი იტვირთება</span>
              <Skeleton className="h-72 w-full" aria-hidden="true" />
            </div>
          ) : (
            <Alert className="m-6">
              <AlertDescription>გუნდი ვერ მოიძებნა.</AlertDescription>
            </Alert>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
