import { Link } from '@tanstack/react-router'
import {
  IconCalendarDue,
  IconChevronRight,
  IconMapPin,
  IconUser,
} from '@tabler/icons-react'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '#/components/ui/card'
import { formatJobDay } from '../jobs.dates'
import { hasJobCoordinates } from '../jobs.rules'
import { JobStatusBadge } from './job-status-badge'
import { JobKindBadge } from './job-kind-badge'
import type { JobSearch, JobSummary } from '../jobs.types'

export function JobsEmpty({
  search,
  total,
  canCreate,
  onCreate,
}: {
  search: JobSearch
  total: number
  canCreate: boolean
  onCreate: () => void
}) {
  const filtered = Boolean(
    search.q ||
    search.kind !== 'all' ||
    search.status !== 'all' ||
    search.scope !== 'all',
  )
  return (
    <div className="flex min-h-48 flex-col items-center justify-center gap-3 p-6 text-center">
      <IconMapPin className="size-8 text-muted-foreground" aria-hidden="true" />
      <h2 className="font-medium">
        {search.page > 1 && total
          ? 'ამ გვერდზე სამუშაოები არ არის'
          : filtered
            ? 'სამუშაოები ვერ მოიძებნა'
            : 'ამ პერიოდში სამუშაოები არ არის'}
      </h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        {filtered
          ? 'შეცვალეთ პერიოდი, ძიება ან ფილტრები.'
          : 'შეცვალეთ პერიოდი ან დაამატეთ ახალი სამუშაო.'}
      </p>
      {search.page > 1 ? (
        <Button
          variant="outline"
          depth="raised"
          nativeButton={false}
          render={<Link to="/jobs" search={{ ...search, page: 1 }} />}
        >
          პირველ გვერდზე დაბრუნება
        </Button>
      ) : canCreate && !filtered ? (
        <Button onClick={onCreate}>ახალი სამუშაო</Button>
      ) : null}
    </div>
  )
}
export function JobsCards({
  items,
  search,
}: {
  items: Array<JobSummary>
  search: JobSearch
}) {
  return (
    <ul className="flex flex-col gap-3 p-3">
      {items.map((job) => {
        return (
          <li key={job.id}>
            <Link
              to="/jobs"
              search={{ ...search, pin: job.id }}
              className="group block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Card
                size="sm"
                className="transition-colors group-hover:bg-muted/50 motion-reduce:transition-none"
              >
                <CardHeader className="gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <JobStatusBadge status={job.status} />
                    <JobKindBadge kind={job.kind} />
                  </div>
                  <CardTitle>
                    <h3 className="leading-relaxed break-words">{job.title}</h3>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  <p className="flex items-start gap-2 text-sm text-muted-foreground">
                    <IconMapPin
                      className="mt-0.5 size-4 shrink-0"
                      aria-hidden="true"
                    />
                    <span className="break-words">
                      {job.address ||
                        (hasJobCoordinates(job)
                          ? `${job.latitude.toFixed(5)}, ${job.longitude.toFixed(5)}`
                          : 'მდებარეობა არ არის მითითებული')}
                    </span>
                  </p>
                  {job.deadline ? (
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                      <IconCalendarDue
                        className="size-4 shrink-0"
                        aria-hidden="true"
                      />
                      <span>
                        ვადა:{' '}
                        <time dateTime={job.deadline} className="tabular-nums">
                          {formatJobDay(job.deadline)}
                        </time>
                      </span>
                    </p>
                  ) : null}
                </CardContent>
                <CardFooter className="justify-between gap-2">
                  <p className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                    <IconUser className="size-4 shrink-0" aria-hidden="true" />
                    <span className="break-words">
                      {job.assigneeName ?? 'თავისუფალია'}
                    </span>
                  </p>
                  <IconChevronRight
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                </CardFooter>
              </Card>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
