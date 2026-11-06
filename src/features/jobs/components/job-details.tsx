import { useState } from 'react'
import {
  IconChevronDown,
  IconExternalLink,
  IconHistory,
  IconMapPin,
  IconNotes,
  IconUser,
  IconCalendarDue,
} from '@tabler/icons-react'
import { Button } from '#/components/ui/button'
import { Card, CardContent } from '#/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '#/components/ui/collapsible'
import { Separator } from '#/components/ui/separator'
import { hasJobCoordinates } from '../jobs.rules'
import { formatJobDate, jobStatuses } from '../jobs.presentation'
import { formatJobDay } from '../jobs.dates'
import { JobStatusBadge } from './job-status-badge'
import { JobKindBadge } from './job-kind-badge'
import { JobActionDialog, JobActions } from './job-actions'
import type { JobAction } from './job-actions'
import type { Actor } from '#/lib/authorization/actor'
import type { JobDetail } from '../jobs.types'

export function JobDetails({ job, actor }: { job: JobDetail; actor: Actor }) {
  const [action, setAction] = useState<JobAction | null>(null)
  const latestChange = job.history.at(0)
  const address =
    job.address ||
    job.locationLabelKa ||
    job.locationLabelEn ||
    job.streetNameKa ||
    job.streetNameEn
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-5 overflow-y-auto p-4">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <JobStatusBadge status={job.status} />
          <JobKindBadge kind={job.kind} />
        </div>
        <h2 className="text-lg leading-relaxed font-semibold break-words">
          {job.title}
        </h2>
      </header>
      <Card size="sm" className="shrink-0">
        <CardContent>
          <dl className="flex flex-col gap-4 text-sm">
            <div>
              <dt className="mb-1 flex items-center gap-3 text-xs text-muted-foreground">
                <IconMapPin className="size-4 shrink-0" aria-hidden="true" />
                მდებარეობა
              </dt>
              <dd className="pl-7 leading-relaxed break-words">
                {address ||
                  (hasJobCoordinates(job)
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
            {latestChange ? (
              <div>
                <dt className="mb-1 flex items-center gap-3 text-xs text-muted-foreground">
                  <IconHistory className="size-4 shrink-0" aria-hidden="true" />
                  ბოლო ცვლილება
                </dt>
                <dd className="flex flex-col gap-1 pl-7">
                  <span className="break-words">{latestChange.actorName}</span>
                  <time
                    dateTime={latestChange.createdAt}
                    title="თბილისის დროით"
                    className="text-xs text-muted-foreground"
                  >
                    {formatJobDate(latestChange.createdAt)}
                  </time>
                </dd>
              </div>
            ) : null}
          </dl>
        </CardContent>
      </Card>
      {job.notes ? (
        <section
          className="flex flex-col gap-2"
          aria-label="ინსტრუქციები და შენიშვნები"
        >
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <IconNotes
              className="size-4 text-muted-foreground"
              aria-hidden="true"
            />
            ინსტრუქციები და შენიშვნები
          </h3>
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {job.notes}
          </p>
        </section>
      ) : null}
      <div
        role="group"
        className="flex flex-col gap-2"
        aria-label="სამუშაოს მოქმედებები"
      >
        <JobActions actor={actor} job={job} onAction={setAction} />
        {hasJobCoordinates(job) ? (
          <Button
            variant="outline"
            depth="raised"
            nativeButton={false}
            render={
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${job.latitude},${job.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
              />
            }
            className="min-h-11 justify-start"
          >
            <IconExternalLink data-icon="inline-start" aria-hidden="true" />
            მარშრუტის გახსნა
          </Button>
        ) : null}
      </div>
      <Separator />
      <Collapsible>
        <CollapsibleTrigger
          render={
            <Button
              variant="outline"
              depth="raised"
              className="group min-h-11 w-full justify-start"
            />
          }
        >
          <IconHistory data-icon="inline-start" aria-hidden="true" />
          ცვლილებების ისტორია
          <IconChevronDown
            data-icon="inline-end"
            aria-hidden="true"
            className="ml-auto transition-transform group-data-panel-open:rotate-180 motion-reduce:transition-none"
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="flex flex-col gap-4 pt-4">
            <p className="text-xs text-muted-foreground">თბილისის დროით</p>
            <ol className="flex flex-col gap-4 border-l pl-4">
              {job.history.map((event) => (
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
            {job.hasMoreHistory ? (
              <p className="text-xs text-muted-foreground">
                ნაჩვენებია ბოლო 25 ცვლილება.
              </p>
            ) : null}
          </div>
        </CollapsibleContent>
      </Collapsible>
      <JobActionDialog
        actor={actor}
        action={action}
        onClose={() => setAction(null)}
      />
    </div>
  )
}
