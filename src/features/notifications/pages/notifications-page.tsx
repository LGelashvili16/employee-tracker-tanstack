import { useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { FeaturePage } from '#/components/common/feature-page'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import { notificationsContent } from '../notifications.content'
import { notificationsQueryOptions } from '../notifications.queries'
import { NotificationsFeed } from '../components/notifications-feed'

const authenticatedRoute = getRouteApi('/_authenticated')
const pageSize = 20

export function NotificationsPage() {
  const { actor } = authenticatedRoute.useRouteContext()
  const [offset, setOffset] = useState(0)
  const query = useQuery(notificationsQueryOptions(actor.id, pageSize, offset))
  return (
    <FeaturePage {...notificationsContent.notifications}>
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>თქვენი შეტყობინებები</CardTitle>
            {query.data && !query.isError ? (
              <Badge variant="secondary">
                {query.data.unseenCount} წაუკითხავი
              </Badge>
            ) : null}
          </div>
          <CardDescription>
            {notificationsContent.notifications.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-2">
          <NotificationsFeed
            actorId={actor.id}
            limit={pageSize}
            offset={offset}
          />
        </CardContent>
        <CardFooter className="flex flex-wrap justify-between gap-3">
          <Button
            variant="outline"
            disabled={offset === 0 || query.isFetching}
            onClick={() =>
              setOffset((current) => Math.max(0, current - pageSize))
            }
          >
            წინა
          </Button>
          <span className="text-sm text-muted-foreground" aria-live="polite">
            გვერდი {offset / pageSize + 1}
          </span>
          <Button
            variant="outline"
            disabled={
              !query.data?.hasMore ||
              query.isFetching ||
              query.isError ||
              offset >= 100000
            }
            onClick={() => setOffset((current) => current + pageSize)}
          >
            შემდეგი
          </Button>
        </CardFooter>
      </Card>
    </FeaturePage>
  )
}
