import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { IconBell, IconChecks, IconInbox } from '@tabler/icons-react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Separator } from '#/components/ui/separator'
import { Spinner } from '#/components/ui/spinner'
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from '#/components/ui/popover'
import { notificationsQueryOptions } from '../notifications.queries'
import { useMarkAllNotificationsSeen } from '../hooks/use-mark-notifications-seen'
import { NotificationsFeed } from './notifications-feed'

export function NotificationsPopover({ actorId }: { actorId: string }) {
  const [open, setOpen] = useState(false)
  const query = useQuery(notificationsQueryOptions(actorId))
  const markSeen = useMarkAllNotificationsSeen(actorId)
  const unseenCount = query.isError ? 0 : (query.data?.unseenCount ?? 0)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="icon"
            className="relative size-[2.625rem] rounded-xl"
          />
        }
        aria-label={
          unseenCount > 0 ? 'შეტყობინებები, ახალი შეტყობინება' : 'შეტყობინებები'
        }
      >
        <IconBell aria-hidden="true" />
        {unseenCount > 0 ? (
          <span
            aria-hidden="true"
            data-slot="notification-unread-dot"
            className="absolute top-2 right-2 size-2 rounded-full bg-destructive ring-2 ring-background"
          />
        ) : null}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={12}
        className="max-h-[min(36rem,var(--available-height))] w-[min(28rem,calc(100vw-2rem))] gap-0 overflow-hidden rounded-2xl p-0 shadow-xl motion-reduce:animate-none"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 bg-muted/15 px-5 py-5">
          <div
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-2xl border bg-background shadow-sm"
          >
            <IconInbox className="size-5 text-muted-foreground" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <PopoverTitle className="text-base font-semibold tracking-tight">
                შეტყობინებები
              </PopoverTitle>
              {query.data && !query.isError ? (
                <Badge variant="secondary">
                  {unseenCount > 0
                    ? `${unseenCount} წაუკითხავი`
                    : 'ყველა ნანახია'}
                </Badge>
              ) : null}
            </div>
            <PopoverDescription className="text-xs leading-5">
              თქვენი სამუშაო სივრცის სიახლეები
            </PopoverDescription>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="size-11 rounded-xl"
            aria-label="ყველა შეტყობინების ნანახად მონიშვნა"
            title="ყველა შეტყობინების ნანახად მონიშვნა"
            disabled={
              unseenCount === 0 ||
              markSeen.isPending ||
              markSeen.pendingIds.length > 0 ||
              query.isError
            }
            aria-busy={markSeen.isPending}
            onClick={() => markSeen.mutate([])}
          >
            {markSeen.isPending ? (
              <Spinner aria-hidden="true" />
            ) : (
              <IconChecks data-icon="inline-start" aria-hidden="true" />
            )}
          </Button>
        </div>
        <Separator className="shrink-0" />
        <div className="app-scrollbar min-h-0 overflow-y-auto overscroll-contain">
          {open ? (
            <NotificationsFeed
              actorId={actorId}
              onNavigate={() => setOpen(false)}
            />
          ) : null}
        </div>
        <Separator className="shrink-0" />
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 bg-muted/15 px-5 py-2">
          <span className="text-xs text-muted-foreground">
            ბოლო შეტყობინებები
          </span>
          <Link
            to="/notifications"
            onClick={() => setOpen(false)}
            className="inline-flex min-h-11 items-center rounded-md text-sm font-medium text-primary underline underline-offset-4 hover:decoration-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            ყველას ნახვა
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  )
}
