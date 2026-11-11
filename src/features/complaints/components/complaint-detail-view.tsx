import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Badge } from '#/components/ui/badge'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Skeleton } from '#/components/ui/skeleton'
import { Separator } from '#/components/ui/separator'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '#/components/ui/card'
import { Avatar, AvatarFallback } from '#/components/ui/avatar'
import { DataPagination } from '#/components/common/data-pagination'
import { complaintDetailOptions } from '../complaints.queries'
import {
  complaintActionLabels,
  complaintCategoryLabels,
  complaintDate,
  complaintStatusLabels,
  complaintStatusVariants,
} from '../complaints.presentation'
import { complaintStatusSchema } from '../complaints.schemas'
import type { ComplaintSearch } from '../complaints.schemas'
import {
  ComplaintReplyForm,
  ComplaintReviewForm,
} from './complaint-action-forms'

export function ComplaintsLoading() {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-4 p-4">
      <span className="sr-only">საჩივრები იტვირთება</span>
      {[0, 1, 2, 3].map((i) => (
        <Skeleton
          key={i}
          aria-hidden="true"
          className="h-12 w-full motion-reduce:animate-none"
        />
      ))}
    </div>
  )
}
export function ComplaintDetailView({
  actorId,
  id,
  search,
  review,
}: {
  actorId: string
  id: string
  search: ComplaintSearch
  review: boolean
}) {
  const query = useQuery(
    complaintDetailOptions(actorId, id, search.activityPage ?? 1),
  )
  if (query.isPending) return <ComplaintsLoading />
  if (query.isError)
    return (
      <Alert variant="destructive">
        <AlertDescription>
          საჩივარი ვერ ჩაიტვირთა ან წვდომა შეზღუდულია.
        </AlertDescription>
      </Alert>
    )
  const item = query.data
  const active = item.status === 'new' || item.status === 'in_review'
  return (
    <div className="flex flex-col gap-6">
      <Card role="region" aria-label="საჩივრის დეტალები">
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={complaintStatusVariants[item.status]}>
              {complaintStatusLabels[item.status]}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {complaintCategoryLabels[item.category]}
            </span>
            {item.visibility === 'hr_only' ? (
              <Badge variant="outline">კონფიდენციალური</Badge>
            ) : null}
          </div>
          <CardTitle>
            <h2 className="text-xl leading-snug font-semibold break-words">
              {item.title}
            </h2>
          </CardTitle>
          <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-medium">{item.requesterName}</span>
            <time dateTime={item.createdAt} className="text-muted-foreground">
              {complaintDate(item.createdAt)}
            </time>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-6 whitespace-pre-wrap break-words">
            {item.description}
          </p>
        </CardContent>
      </Card>
      <Card role="region" aria-label="კომენტარები და განხილვა">
        <CardHeader>
          <CardTitle>
            <h3>კომენტარები და განხილვა</h3>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {item.canManage ? (
            <ComplaintReviewForm key={item.id} item={item} actorId={actorId} />
          ) : active ? (
            <ComplaintReplyForm key={item.id} item={item} actorId={actorId} />
          ) : (
            <p role="status" className="text-sm text-muted-foreground">
              საჩივრის განხილვა დასრულებულია.
            </p>
          )}
          <Separator />
          <div className="flex flex-col gap-5">
            <ol className="flex flex-col gap-6">
              {item.activity.items.map((entry) => {
                const status = complaintStatusSchema.safeParse(entry.nextStatus)
                return (
                  <li key={entry.id} className="flex min-w-0 gap-3">
                    <Avatar aria-hidden="true" className="size-8 shrink-0">
                      <AvatarFallback>
                        {entry.actorName
                          .trim()
                          .split(/\s+/)
                          .slice(0, 2)
                          .map((part) => part.slice(0, 1))
                          .join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-sm font-medium">
                          {entry.actorName}
                        </span>
                        {status.success ? (
                          <Badge variant={complaintStatusVariants[status.data]}>
                            {complaintStatusLabels[status.data]}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {complaintActionLabels[entry.action]}
                          </span>
                        )}
                      </div>
                      {entry.action !== 'created' ? (
                        <p className="text-sm leading-6 whitespace-pre-wrap break-words">
                          {entry.body}
                        </p>
                      ) : null}
                      <time
                        dateTime={entry.createdAt}
                        className="text-xs text-muted-foreground"
                      >
                        {complaintDate(entry.createdAt)}
                      </time>
                    </div>
                  </li>
                )
              })}
            </ol>
            {item.activity.total > item.activity.pageSize ||
            (search.activityPage ?? 1) > 1 ? (
              <DataPagination
                page={search.activityPage ?? 1}
                total={item.activity.total}
                pageSize={item.activity.pageSize}
                renderLink={(activityPage) => (
                  <Link
                    to={review ? '/manage/complaints' : '/complaints'}
                    search={{ ...search, activityPage }}
                  />
                )}
              />
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
