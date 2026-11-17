import { useState } from 'react'
import {
  IconCalendarDue,
  IconChevronDown,
  IconDots,
  IconExternalLink,
  IconHistory,
  IconMapPin,
  IconNotes,
  IconPencil,
  IconUser,
} from '@tabler/icons-react'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import {
  allowedJobTransitions,
  canEditJob,
  hasJobCoordinates,
} from '../jobs.rules'
import { formatJobDate, jobStatuses } from '../jobs.presentation'
import { formatJobDay } from '../jobs.dates'
import { JobStatusBadge } from './job-status-badge'
import { JobKindBadge } from './job-kind-badge'
import { JobActionDialog } from './job-actions'
import type { JobAction } from './job-actions'
import type { Actor } from '#/lib/authorization/actor'
import type { JobDetail } from '../jobs.types'

export function JobDetails({ job, actor }: { job: JobDetail; actor: Actor }) {
  const [action, setAction] = useState<JobAction | null>(null)
  const [showAllHistory, setShowAllHistory] = useState(false)
  const transitions = allowedJobTransitions(actor, job)
  const primary = transitions.find(
    (status) => status !== 'rejected' && status !== 'pending',
  )
  const secondary = transitions.filter((status) => status !== primary)
  const editable = canEditJob(actor, job)
  const located = hasJobCoordinates(job)
  const PrimaryIcon = primary ? jobStatuses[primary].icon : null
  const address =
    job.address ||
    job.locationLabelKa ||
    job.locationLabelEn ||
    job.streetNameKa ||
    job.streetNameEn
  const history = showAllHistory ? job.history : job.history.slice(0, 3)
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-5 overflow-y-auto p-4">
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <JobStatusBadge status={job.status} />
            <JobKindBadge kind={job.kind} />
          </div>
          <h2 className="text-lg leading-snug font-semibold break-words">
            {job.title}
          </h2>
        </div>
        {secondary.length || editable || located ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  depth="raised"
                  size="icon"
                  aria-label="სამუშაოს მოქმედებები"
                />
              }
            >
              <IconDots aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-52">
              <DropdownMenuGroup>
                {editable ? (
                  <DropdownMenuItem
                    onClick={() => setAction({ type: 'edit', job })}
                  >
                    <IconPencil aria-hidden="true" />
                    რედაქტირება
                  </DropdownMenuItem>
                ) : null}
                {located ? (
                  <DropdownMenuItem
                    render={
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${job.latitude},${job.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      />
                    }
                  >
                    <IconExternalLink aria-hidden="true" />
                    მარშრუტის გახსნა
                  </DropdownMenuItem>
                ) : null}
                {secondary.map((status) => {
                  const Icon = jobStatuses[status].icon
                  return (
                    <DropdownMenuItem
                      key={status}
                      variant={
                        status === 'rejected' ? 'destructive' : 'default'
                      }
                      onClick={() =>
                        setAction({ type: 'transition', job, status })
                      }
                    >
                      <Icon aria-hidden="true" />
                      {jobStatuses[status].action}
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </header>
      {primary && PrimaryIcon ? (
        <Button
          depth="raised"
          className="min-h-11 w-full"
          onClick={() =>
            setAction({ type: 'transition', job, status: primary })
          }
        >
          <PrimaryIcon aria-hidden="true" />
          {jobStatuses[primary].action}
        </Button>
      ) : null}
      <Card size="sm" className="shrink-0">
        <CardHeader>
          <CardTitle>სამუშაოს ინფორმაცია</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="flex flex-col gap-4 text-sm">
            <div>
              <dt className="mb-1 flex items-center gap-3 text-xs text-muted-foreground">
                <IconMapPin className="size-4 shrink-0" aria-hidden="true" />
                მდებარეობა
              </dt>
              <dd className="pl-7 leading-relaxed break-words">
                {address ||
                  (located
                    ? `${job.latitude.toFixed(6)}, ${job.longitude.toFixed(6)}`
                    : 'არ არის მითითებული')}
              </dd>
            </div>
            <div>
              <dt className="mb-1 flex items-center gap-3 text-xs text-muted-foreground">
                <IconUser className="size-4 shrink-0" aria-hidden="true" />
                პასუხისმგებელი
              </dt>
              <dd className="pl-7 break-words">
                {job.assigneeName ?? 'თავისუფალია'}
              </dd>
            </div>
            <div>
              <dt className="mb-1 flex items-center gap-3 text-xs text-muted-foreground">
                <IconCalendarDue
                  className="size-4 shrink-0"
                  aria-hidden="true"
                />
                ვადა
              </dt>
              <dd className="pl-7">
                {job.deadline ? (
                  <time dateTime={job.deadline} className="tabular-nums">
                    {formatJobDay(job.deadline)}
                  </time>
                ) : (
                  'არ არის მითითებული'
                )}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
      {job.notes ? (
        <Card size="sm" className="shrink-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconNotes
                className="size-4 text-muted-foreground"
                aria-hidden="true"
              />
              ინსტრუქციები და შენიშვნები
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
              {job.notes}
            </p>
          </CardContent>
        </Card>
      ) : null}
      <Card size="sm" className="shrink-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconHistory
              className="size-4 text-muted-foreground"
              aria-hidden="true"
            />
            ცვლილებების ისტორია
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.length ? (
            <ol className="ml-1 flex flex-col gap-4 border-l pl-4">
              {history.map((event) => (
                <li
                  key={event.id}
                  className="relative flex flex-col gap-1 text-sm"
                >
                  <span
                    aria-hidden="true"
                    className="absolute -left-5 top-1.5 size-2 rounded-full bg-border"
                  />
                  <p className="font-medium">
                    {event.action === 'created'
                      ? 'სამუშაო დამატებულია'
                      : event.action === 'edited'
                        ? 'ინფორმაცია განახლებულია'
                        : jobStatuses[event.status].label}
                  </p>
                  <p className="break-words text-muted-foreground">
                    {event.actorName}
                  </p>
                  <time
                    dateTime={event.createdAt}
                    className="text-xs text-muted-foreground"
                  >
                    {formatJobDate(event.createdAt)}
                  </time>
                  {event.note ? (
                    <p className="mt-1 whitespace-pre-wrap break-words">
                      {event.note}
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground">
              ცვლილებები ჯერ არ არის.
            </p>
          )}
          {job.history.length > 3 ? (
            <Button
              variant="ghost"
              className="mt-3 w-full justify-between"
              aria-expanded={showAllHistory}
              onClick={() => setShowAllHistory(!showAllHistory)}
            >
              {showAllHistory ? 'ნაკლების ნახვა' : 'ყველა ცვლილების ნახვა'}
              <IconChevronDown
                aria-hidden="true"
                className={showAllHistory ? 'rotate-180' : undefined}
              />
            </Button>
          ) : null}
          {job.hasMoreHistory && (showAllHistory || job.history.length <= 3) ? (
            <p className="mt-3 text-xs text-muted-foreground">
              ნაჩვენებია ბოლო 25 ცვლილება.
            </p>
          ) : null}
        </CardContent>
      </Card>
      <JobActionDialog
        actor={actor}
        action={action}
        onClose={() => setAction(null)}
      />
    </div>
  )
}
