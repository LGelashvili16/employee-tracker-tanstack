import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  IconArrowRight,
  IconMapPin,
  IconUser,
  IconUserPlus,
  IconCalendarDue,
} from '@tabler/icons-react'
import { Button } from '#/components/ui/button'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Skeleton } from '#/components/ui/skeleton'
import { Separator } from '#/components/ui/separator'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuTrigger,
} from '#/components/ui/context-menu'
import { cn } from '#/lib/utils'
import { jobQueryOptions } from '../jobs.queries'
import { jobKinds, jobStatuses } from '../jobs.presentation'
import { useMapLongPress } from '../hooks/use-map-long-press'
import { JobStatusBadge } from './job-status-badge'
import { JobKindBadge } from './job-kind-badge'
import { formatJobDay } from '../jobs.dates'
import { JobActionDialog, JobActions } from './job-actions'
import type { JobAction } from './job-actions'
import type { Actor } from '#/lib/authorization/actor'
import type { JobMarker as Marker } from '../jobs.types'

export function JobMarker({
  pin,
  actor,
  selected,
  onSelect,
}: {
  pin: Marker
  actor: Actor
  selected: boolean
  onSelect: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [action, setAction] = useState<JobAction | null>(null)
  const hold = useMapLongPress()
  const status = jobStatuses[pin.status]
  const kind = jobKinds[pin.kind]
  const Icon = kind.icon
  const StatusIcon = status.icon
  return (
    <>
      <ContextMenu open={open} onOpenChange={setOpen}>
        <ContextMenuTrigger {...hold} data-job-marker>
          <Button
            variant="outline"
            depth="raised"
            className={cn(
              'relative size-11 rounded-2xl border-2 p-0 shadow-md',
              selected &&
                'ring-4 ring-ring/40 ring-offset-2 ring-offset-background',
            )}
            style={kind.markerStyle}
            aria-label={`${pin.title}, ${kind.label}, ${status.label}`}
            aria-pressed={selected}
            aria-haspopup="menu"
            title={`${pin.title} · ${kind.label} · ${status.label}`}
            onClick={(event) => {
              event.stopPropagation()
              if (!open) onSelect(pin.id)
            }}
          >
            <Icon className="size-5" aria-hidden="true" />
            <span
              aria-hidden="true"
              className="absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full border-2"
              style={{
                ...status.markerStyle,
                borderColor: 'var(--background)',
              }}
            >
              <StatusIcon className="size-3" />
            </span>
          </Button>
        </ContextMenuTrigger>
        {open ? (
          <JobMarkerMenu
            pin={pin}
            actor={actor}
            onSelect={onSelect}
            onAction={(next) => {
              setAction(next)
              setOpen(false)
            }}
          />
        ) : null}
      </ContextMenu>
      <JobActionDialog
        actor={actor}
        action={action}
        onClose={() => setAction(null)}
      />
    </>
  )
}

function JobMarkerMenu({
  pin,
  actor,
  onSelect,
  onAction,
}: {
  pin: Marker
  actor: Actor
  onSelect: (id: string) => void
  onAction: (action: JobAction) => void
}) {
  // Fetch permissions-relevant assignment/version only while the menu is open, using the shared detail cache.
  const query = useQuery(jobQueryOptions(actor.id, pin.id))
  const job = query.data
  return (
    <ContextMenuContent
      aria-label={`სამუშაო: ${job?.title ?? pin.title}`}
      className="w-80 max-w-[calc(100vw-2rem)]"
    >
      <ContextMenuGroup>
        <ContextMenuLabel className="flex flex-col gap-3 p-3 text-sm">
          <span className="flex flex-wrap items-center gap-2">
            <JobStatusBadge status={job?.status ?? pin.status} />
            <JobKindBadge kind={job?.kind ?? pin.kind} />
          </span>
          <span className="font-semibold break-words text-foreground">
            {job?.title ?? pin.title}
          </span>
        </ContextMenuLabel>
        {query.isPending ? (
          <div
            role="status"
            aria-busy="true"
            className="flex flex-col gap-2 px-3 pb-3"
          >
            <span className="sr-only">სამუშაოს მოქმედებები იტვირთება</span>
            <Skeleton aria-hidden="true" className="h-4 w-full" />
            <Skeleton aria-hidden="true" className="h-4 w-2/3" />
            <Skeleton aria-hidden="true" className="h-4 w-3/4" />
            <Skeleton aria-hidden="true" className="h-4 w-1/2" />
          </div>
        ) : query.isError ? (
          <Alert variant="destructive" className="mb-2">
            <AlertDescription>
              მოქმედებები ვერ ჩაიტვირთა. გახსენით სამუშაოს დეტალები და სცადეთ
              ხელახლა.
            </AlertDescription>
          </Alert>
        ) : job ? (
          <div className="flex flex-col gap-2 px-3 pb-3 text-sm text-muted-foreground">
            {job.address ? (
              <p className="flex items-start gap-2">
                <IconMapPin
                  className="mt-0.5 size-4 shrink-0"
                  aria-hidden="true"
                />
                <span className="break-words">{job.address}</span>
              </p>
            ) : null}
            <p className="flex items-center gap-2">
              <IconUser className="size-4 shrink-0" aria-hidden="true" />
              {job.assigneeName ?? 'თავისუფალია'}
            </p>
            <p className="flex items-start gap-2">
              <IconUserPlus
                className="mt-0.5 size-4 shrink-0"
                aria-hidden="true"
              />
              <span className="min-w-0 break-words">
                დაამატა:{' '}
                <span className="text-foreground">{job.creatorName}</span>
              </span>
            </p>
            <p className="flex items-start gap-2">
              <IconCalendarDue
                className="mt-0.5 size-4 shrink-0"
                aria-hidden="true"
              />
              <span>
                ვადა:{' '}
                {job.deadline ? (
                  <time
                    dateTime={job.deadline}
                    className="tabular-nums text-foreground"
                  >
                    {formatJobDay(job.deadline)}
                  </time>
                ) : (
                  'არ არის მითითებული'
                )}
              </span>
            </p>
          </div>
        ) : null}
        <Separator className="my-1" />
        <ContextMenuItem onClick={() => onSelect(pin.id)}>
          <IconArrowRight aria-hidden="true" />
          სამუშაოს დეტალები
        </ContextMenuItem>
        {job && !query.isError ? (
          <JobActions actor={actor} job={job} contextMenu onAction={onAction} />
        ) : null}
      </ContextMenuGroup>
    </ContextMenuContent>
  )
}
