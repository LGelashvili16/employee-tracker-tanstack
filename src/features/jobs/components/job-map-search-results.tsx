import { IconMapPin } from '@tabler/icons-react'
import { useId } from 'react'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { jobKinds } from '../jobs.presentation'
import { JobStatusBadge } from './job-status-badge'
import type {
  JobMapSearchModel,
  MapSearchItem,
} from '../hooks/use-job-map-search'

function ResultGroup({
  title,
  items,
  loading,
  error,
  hint,
  onSelect,
}: {
  title: string
  items: Array<MapSearchItem>
  loading: boolean
  error: boolean
  hint: string
  onSelect: (item: MapSearchItem) => void
}) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId}>
      <h3
        id={headingId}
        className="px-2.5 pt-3 pb-2 text-xs font-medium text-muted-foreground"
      >
        {title}
      </h3>
      {loading ? (
        <div
          role="status"
          aria-busy="true"
          className="flex flex-col gap-2 px-2.5 pb-3"
        >
          <span className="sr-only">შედეგები იტვირთება</span>
          <Skeleton className="h-10 w-full" aria-hidden="true" />
          <Skeleton className="h-10 w-4/5" aria-hidden="true" />
        </div>
      ) : error ? (
        <Alert variant="destructive" className="mx-2 mb-2 w-auto">
          <AlertDescription>
            ძიება დროებით მიუწვდომელია. სცადეთ ხელახლა მოგვიანებით.
          </AlertDescription>
        </Alert>
      ) : items.length ? (
        items.map((item) => {
          const Icon =
            item.type === 'location' ? IconMapPin : jobKinds[item.job.kind].icon
          return (
            <Button
              data-search-result
              key={item.key}
              type="button"
              variant="ghost"
              depth="raised"
              className="h-auto min-h-12 w-full justify-start gap-3 rounded-lg px-2.5 py-2.5 text-left whitespace-normal"
              onClick={() => onSelect(item)}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="leading-relaxed font-medium break-words">
                  {item.label}
                </span>
                {item.type === 'location' &&
                item.location.labelKa &&
                item.location.labelEn ? (
                  <span lang="en" className="text-xs text-muted-foreground">
                    {item.location.labelEn}
                  </span>
                ) : item.type === 'job' ? (
                  <span className="text-xs text-muted-foreground">
                    {jobKinds[item.job.kind].label}
                    {item.job.address ? ' · ' + item.job.address : ''}
                  </span>
                ) : null}
                {item.type === 'job' ? (
                  <span>
                    <JobStatusBadge status={item.job.status} />
                  </span>
                ) : null}
              </span>
            </Button>
          )
        })
      ) : (
        <p className="px-2.5 pb-3 text-sm leading-relaxed text-muted-foreground">
          {hint}
        </p>
      )}
    </section>
  )
}
export function JobMapSearchResults({
  model,
  onSelect,
}: {
  model: JobMapSearchModel
  onSelect: (item: MapSearchItem) => void
}) {
  return (
    <>
      <ResultGroup
        title="ქუჩები და მისამართები"
        onSelect={onSelect}
        items={model.locations}
        loading={model.addressLoading}
        error={model.addressError}
        hint={
          model.query.length < 3
            ? 'შეიყვანეთ მინიმუმ 3 სიმბოლო, ქართულად ან ინგლისურად.'
            : 'მისამართი ვერ მოიძებნა. სცადეთ ქალაქის სახელის დამატება.'
        }
      />
      <ResultGroup
        title="სამუშაოები"
        onSelect={onSelect}
        items={model.work}
        loading={model.jobsLoading}
        error={model.jobsError}
        hint={
          model.query.length < 2
            ? 'სამუშაოს მოსაძებნად შეიყვანეთ მინიმუმ 2 სიმბოლო.'
            : 'ამ ფილტრებით შესაბამისი სამუშაო ვერ მოიძებნა.'
        }
      />
    </>
  )
}
