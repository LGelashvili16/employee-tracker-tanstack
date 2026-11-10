import { lazy, Suspense, useRef, useState } from 'react'
import { ClientOnly } from '@tanstack/react-router'

import { Skeleton } from '#/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { cn } from '#/lib/utils'
import { hasJobCoordinates } from '../jobs.rules'
import { useJobMapSearch } from '../hooks/use-job-map-search'
import { JobsMapOverlays, JobsMapLegend } from './jobs-map-overlays'
import { JobMapSearch } from './job-map-search'
import type { ReactNode } from 'react'
import type { MapCamera } from '#/components/ui/map'
import type {
  JobDetail,
  JobMarker,
  JobSearch,
  JobMapPosition,
} from '../jobs.types'
import type { ResolvedLocation } from '../job-locations.types'
import type { Actor } from '#/lib/authorization/actor'

const JobsMap = lazy(() => import('./jobs-map'))
function MapSkeleton() {
  return (
    <div role="status" aria-busy="true" className="h-full min-h-96">
      <span className="sr-only">რუკა იტვირთება</span>
      <Skeleton className="h-full min-h-96 rounded-none" aria-hidden="true" />
    </div>
  )
}

export function JobsMapPanel({
  actor,
  search,
  pins,
  selected,
  canCreate,
  location,
  sidebar,
  editor,
  onSelect,
  onLocation,
  onCreate,
  onShowJobs,
  onQueryChange,
  showEmpty,
}: {
  actor: Actor
  search: JobSearch
  pins: Array<JobMarker>
  selected?: JobDetail
  canCreate: boolean
  location: ResolvedLocation | null
  sidebar: ReactNode
  editor: ReactNode
  onSelect: (id: string) => void
  onLocation: (location: ResolvedLocation | null) => void
  onCreate: (position: JobMapPosition) => void
  onShowJobs: (q: string) => void
  onQueryChange: (q: string) => void
  showEmpty: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const [showPlaces, setShowPlaces] = useState(false)
  const [showBuildings, setShowBuildings] = useState(false)
  const camera = useRef<MapCamera | null>(null)
  const focused = useRef<string | null>(null)
  const inline = useRef<HTMLDivElement>(null)
  const model = useJobMapSearch(actor.id, search, onQueryChange)
  const [focusRequest, setFocusRequest] = useState(0)
  function selectJob(id: string) {
    setFocusRequest((value) => value + 1)
    onSelect(id)
  }
  function toggleExpanded() {
    model.setOpen(false)
    setExpanded((value) => !value)
  }
  const content = (
    <div
      className={cn(
        'grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]',
        expanded &&
          'min-h-0 flex-1 grid-rows-[minmax(24rem,1fr)_auto] overflow-y-auto lg:grid-rows-1',
      )}
    >
      <div
        className={cn(
          'relative h-[32rem] min-w-0 overflow-hidden rounded-xl border lg:h-[min(72dvh,52rem)]',
          expanded && 'h-full min-h-96 lg:min-h-0 lg:h-full',
        )}
      >
        <ClientOnly fallback={<MapSkeleton />}>
          <Suspense fallback={<MapSkeleton />}>
            <JobsMap
              actor={actor}
              showPlaces={showPlaces}
              onPlacesChange={setShowPlaces}
              showBuildings={showBuildings}
              onBuildingsChange={setShowBuildings}
              pins={pins}
              selected={
                selected && hasJobCoordinates(selected) ? selected : undefined
              }
              location={search.pin ? undefined : (location ?? undefined)}
              onSelect={selectJob}
              onPick={onCreate}
              showEmpty={showEmpty}
              focusRequest={focusRequest}
              camera={camera}
              focused={focused}
              canCreate={canCreate}
              expanded={expanded}
              onExpand={toggleExpanded}
            >
              <div className="absolute top-4 right-20 left-4 z-20 max-w-sm">
                <JobMapSearch
                  model={model}
                  onLocation={(result) => {
                    setFocusRequest((value) => value + 1)
                    onLocation(result)
                  }}
                  onJob={selectJob}
                  onShowJobs={(q) => {
                    setExpanded(false)
                    onShowJobs(q)
                  }}
                />
              </div>
              <JobsMapOverlays
                location={search.pin ? null : location}
                canCreate={canCreate}
                onCreate={onCreate}
                onLocation={onLocation}
              />
            </JobsMap>
          </Suspense>
        </ClientOnly>
      </div>
      <aside
        className={cn(
          'min-w-0 overflow-hidden rounded-xl border bg-card lg:max-h-[min(72dvh,52rem)] lg:overflow-y-auto',
          expanded && 'max-h-[40dvh] overflow-y-auto lg:max-h-none',
        )}
      >
        {sidebar}
      </aside>
    </div>
  )
  return (
    <Dialog
      open={expanded}
      onOpenChange={(open) => {
        model.setOpen(false)
        setExpanded(open)
      }}
    >
      <div
        ref={inline}
        tabIndex={-1}
        className="flex min-w-0 flex-col gap-4 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {expanded ? (
          <div className="h-[32rem] rounded-xl border bg-muted lg:h-[min(72dvh,52rem)]" />
        ) : (
          <>
            {content}
            {editor}
          </>
        )}
        <JobsMapLegend />
      </div>
      {expanded ? (
        <DialogContent
          className="flex h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-none flex-col gap-3 p-3 sm:max-w-none"
          finalFocus={() =>
            inline.current?.querySelector<HTMLButtonElement>(
              '[data-map-expand]',
            ) ??
            inline.current ??
            false
          }
        >
          <DialogHeader className="pr-10">
            <DialogTitle>სამუშაოების რუკა</DialogTitle>
            <DialogDescription className="sr-only">
              გაშლილი რუკა, მისამართების ძიება და სამუშაოების მართვა.
            </DialogDescription>
          </DialogHeader>
          {content}
          {editor}
        </DialogContent>
      ) : null}
    </Dialog>
  )
}
