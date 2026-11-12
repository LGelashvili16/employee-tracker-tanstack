import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { IconList, IconMap, IconPlus, IconRefresh } from '@tabler/icons-react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Spinner } from '#/components/ui/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '#/components/ui/sheet'
import { DataPagination } from '#/components/common/data-pagination'
import { canManageJobs } from '../jobs.rules'
import { jobQueryOptions, jobsQueryOptions } from '../jobs.queries'
import { jobsPageSize } from '../jobs.schemas'
import { JobsFilters } from './jobs-filters'
import { JobsList } from './jobs-list'
import { JobsCards, JobsEmpty } from './jobs-results'
import { JobDetailPanel, JobDetailSkeleton } from './job-detail-panel'
import { JobEditor } from './job-editor'
import { JobsMapPanel } from './jobs-map-panel'
import type { JobMapPosition, JobSearch } from '../jobs.types'
import type { ResolvedLocation } from '../job-locations.types'
import type { Actor } from '#/lib/authorization/actor'

const noMarkers: [] = []
export function JobsWorkspace({
  actor,
  search,
}: {
  actor: Actor
  search: JobSearch
}) {
  const navigate = useNavigate()
  const query = useQuery(jobsQueryOptions(actor.id, search))
  const selected = useQuery({
    ...jobQueryOptions(actor.id, search.pin ?? ''),
    enabled: Boolean(search.pin),
  })
  const [editor, setEditor] = useState<JobMapPosition | 'new' | null>(null)
  const [location, setLocation] = useState<ResolvedLocation | null>(null)
  const manager = canManageJobs(actor)
  function update(next: JobSearch, replace = false) {
    void navigate({ to: '/jobs', search: next, replace })
  }
  function select(id: string) {
    setLocation(null)
    update({ ...search, pin: id })
  }
  function create(position: JobMapPosition) {
    setEditor(position)
  }
  function openEditor() {
    setEditor('new')
  }
  const records = query.data
  const empty = (
    <JobsEmpty
      search={search.view === 'map' ? { ...search, page: 1 } : search}
      total={records?.total ?? 0}
      canCreate={manager}
      onCreate={openEditor}
    />
  )
  const details = search.pin ? (
    <JobDetailPanel
      key={search.pin}
      actor={actor}
      id={search.pin}
      onClose={() => update({ ...search, pin: undefined })}
    />
  ) : null
  const cards = query.isPending ? (
    <JobDetailSkeleton />
  ) : query.isError ? null : records?.items.length ? (
    <JobsCards items={records.items} search={search} />
  ) : (
    empty
  )
  const sidebar = details ?? (
    <>
      <div className="flex items-center justify-between border-b p-4">
        <h2 className="font-medium">სამუშაოები</h2>
        <span className="text-sm tabular-nums text-muted-foreground">
          {records?.total ?? '...'}
        </span>
      </div>
      {cards}
      {records && records.total > records.items.length ? (
        <div className="border-t p-4 text-sm text-muted-foreground">
          ნაჩვენებია {records.items.length} / {records.total} სამუშაო.{' '}
          <Link
            to="/jobs"
            search={{ ...search, view: 'list', page: 1, pin: undefined }}
            className="underline underline-offset-4"
          >
            ყველა სამუშაოს ნახვა
          </Link>
        </div>
      ) : null}
    </>
  )
  const editorDialog = editor ? (
    <JobEditor
      actorId={actor.id}
      position={editor === 'new' ? undefined : editor}
      suggestedAddress={editor === 'new' ? undefined : editor.address}
      suggestedKind={editor === 'new' ? undefined : editor.kind}
      onClose={() => setEditor(null)}
      onSaved={(id) => {
        setEditor(null)
        select(id)
      }}
    />
  ) : null
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          სამუშაოების რუკა
        </h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            depth="raised"
            disabled={query.isFetching}
            aria-busy={query.isFetching}
            onClick={async () => {
              const results = await Promise.all([
                query.refetch(),
                ...(search.pin ? [selected.refetch()] : []),
              ])
              if (results.some((result) => result.isError))
                toast.error('განახლება ვერ მოხერხდა. სცადეთ ხელახლა.')
              else toast.success('სამუშაოები განახლებულია.')
            }}
          >
            {query.isFetching ? (
              <Spinner aria-hidden="true" />
            ) : (
              <IconRefresh aria-hidden="true" />
            )}
            განახლება
          </Button>
          {manager ? (
            <Button onClick={openEditor}>
              <IconPlus aria-hidden="true" />
              ახალი სამუშაო
            </Button>
          ) : null}
        </div>
      </header>
      <Tabs
        className="min-w-0 gap-6"
        value={search.view}
        onValueChange={(value) => {
          if (value === 'map' || value === 'list') {
            update({ ...search, view: value })
          }
        }}
      >
        <TabsList
          className="w-max gap-1 rounded-xl border p-0.5 group-data-horizontal/tabs:h-auto"
          aria-label="სამუშაოების ხედი"
        >
          <TabsTrigger value="map" className="h-9 px-4">
            <IconMap aria-hidden="true" />
            რუკა
          </TabsTrigger>
          <TabsTrigger value="list" className="h-9 px-4">
            <IconList aria-hidden="true" />
            სია
          </TabsTrigger>
        </TabsList>
        <TabsContent
          value={search.view}
          className="flex min-w-0 flex-col gap-6"
        >
          <JobsFilters
            search={search}
            onChange={update}
            showSearch={search.view === 'list'}
          />
          {query.isError ? (
            <Alert variant="destructive">
              <AlertTitle>სამუშაოები ვერ ჩაიტვირთა</AlertTitle>
              <AlertDescription>
                გადაამოწმეთ წვდომა და გამოიყენეთ განახლება ხელახლა საცდელად.
              </AlertDescription>
            </Alert>
          ) : null}
          {records?.mapTruncated && search.view === 'map' ? (
            <Alert variant="info">
              <AlertTitle>
                რუკაზე ნაჩვენებია პირველი {records.markers.length} სამუშაო
              </AlertTitle>
              <AlertDescription>
                სულ {records.total} სამუშაოა. გამოიყენეთ ფილტრები ან გვერდებად
                დაყოფილი სია დანარჩენი სამუშაოების სანახავად.
              </AlertDescription>
            </Alert>
          ) : null}
          {records && records.unmappedTotal > 0 && search.view === 'map' ? (
            <Alert variant="info">
              <AlertTitle>
                {records.unmappedTotal} სამუშაოს ზუსტი მდებარეობა არ აქვს
              </AlertTitle>
              <AlertDescription>
                ეს სამუშაოები ხელმისაწვდომია სამუშაოების სიაში.
              </AlertDescription>
            </Alert>
          ) : null}
          {search.view === 'map' ? (
            <JobsMapPanel
              actor={actor}
              search={search}
              pins={records?.markers ?? noMarkers}
              pinsReady={Boolean(records) && !query.isFetching}
              selected={selected.data}
              canCreate={manager}
              location={location}
              sidebar={sidebar}
              editor={editorDialog}
              onSelect={select}
              onLocation={(result) => {
                setLocation(result)
                update({ ...search, pin: undefined })
              }}
              onCreate={create}
              onShowJobs={(q) =>
                update({ ...search, q, view: 'list', page: 1 })
              }
              onQueryChange={(q) => update({ ...search, q, page: 1 }, true)}
              showEmpty={
                query.isSuccess && query.data.total === 0 && !search.pin
              }
            />
          ) : (
            <>
              <div className="min-w-0">
                {query.isPending ? (
                  <JobDetailSkeleton />
                ) : query.isError ? null : records?.items.length ? (
                  <JobsList items={records.items} search={search} />
                ) : (
                  empty
                )}
              </div>
              <Sheet
                open={Boolean(search.pin)}
                onOpenChange={(open) => {
                  if (!open) update({ ...search, pin: undefined })
                }}
              >
                <SheetContent
                  className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-xl"
                  aria-describedby={undefined}
                >
                  <SheetHeader className="shrink-0 border-b px-6 py-5">
                    <SheetTitle>სამუშაოს დეტალები</SheetTitle>
                  </SheetHeader>
                  <div className="min-h-0 flex-1 overflow-y-auto">
                    {search.pin ? (
                      <JobDetailPanel
                        key={search.pin}
                        actor={actor}
                        id={search.pin}
                        inSheet
                        onClose={() => update({ ...search, pin: undefined })}
                      />
                    ) : null}
                  </div>
                </SheetContent>
              </Sheet>
              {editorDialog}
            </>
          )}
          {records && search.view === 'list' ? (
            <div aria-busy={query.isFetching}>
              <DataPagination
                page={search.page}
                total={records.total}
                pageSize={jobsPageSize}
                renderLink={(page) => (
                  <Link to="/jobs" search={{ ...search, page }} />
                )}
              />
            </div>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  )
}
