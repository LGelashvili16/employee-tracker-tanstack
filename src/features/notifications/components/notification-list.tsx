import {
  IconBell,
  IconBellCheck,
  IconCheck,
  IconClock,
  IconMail,
} from '@tabler/icons-react'
import { cn } from 'cn'
import { Link } from '@tanstack/react-router'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import { Spinner } from '#/components/ui/spinner'
import type { NotificationItem } from '../notifications.types'
import { notificationDestination } from '../notification-destination'

const notificationDate = new Intl.DateTimeFormat('ka-GE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'Asia/Tbilisi',
})

export function NotificationList({
  items,
  pendingIds,
  onMarkSeen,
  onMarkUnseen,
  onNavigate,
  actorId = '',
}: {
  items: Array<NotificationItem>
  pendingIds: Array<string>
  onMarkSeen: (ids: Array<string>) => void
  onMarkUnseen: (ids: Array<string>) => void
  onNavigate?: () => void
  actorId?: string
}) {
  return (
    <ul aria-label="შეტყობინებების სია" className="flex flex-col gap-1 p-2">
      {items.map((item) => {
        const unseen = item.seenAt === null
        const pending = pendingIds.includes(item.id)
        const destination = notificationDestination(item.destination, actorId)
        return (
          <li
            key={item.id}
            className={cn(
              'flex items-start gap-3 rounded-xl px-3 py-3.5 transition-colors hover:bg-muted/40 motion-reduce:transition-none',
              unseen && 'bg-muted/30',
            )}
          >
            <div
              aria-hidden="true"
              data-slot="notification-item-icon"
              className={cn(
                'relative flex size-10 shrink-0 items-center justify-center rounded-2xl bg-muted text-muted-foreground ring-1 ring-border/60',
                unseen && 'bg-background text-foreground',
              )}
            >
              {unseen ? (
                <IconBell className="size-4" />
              ) : (
                <IconBellCheck className="size-4" />
              )}
              {unseen ? (
                <span
                  data-slot="notification-item-unread-dot"
                  className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-destructive ring-2 ring-popover"
                />
              ) : null}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <p
                className={cn(
                  'text-sm leading-5 font-medium wrap-anywhere',
                  !unseen && 'text-muted-foreground',
                )}
              >
                {destination ? (
                  <Link
                    {...destination}
                    onClick={onNavigate}
                    className="rounded-sm underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    {item.title}
                  </Link>
                ) : item.announcementId ? (
                  <Link
                    to="/announcements"
                    onClick={onNavigate}
                    search={{ announcementId: item.announcementId }}
                    className="rounded-sm underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    {item.title}
                  </Link>
                ) : item.complaintId ? (
                  <Link
                    to={
                      item.complaintReview
                        ? '/manage/complaints'
                        : '/complaints'
                    }
                    search={{ complaintId: item.complaintId }}
                    onClick={onNavigate}
                    className="rounded-sm underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    {item.title}
                  </Link>
                ) : (
                  item.title
                )}
                {unseen ? <span className="sr-only">, ახალი</span> : null}
              </p>
              <p className="text-[0.8125rem] leading-5 wrap-anywhere text-muted-foreground">
                {item.body}
              </p>
              <time
                dateTime={item.createdAt}
                className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"
              >
                <IconClock className="size-3 shrink-0" aria-hidden="true" />
                {notificationDate.format(new Date(item.createdAt))}
              </time>
              {!unseen ? <span className="sr-only">ნანახია</span> : null}
            </div>
            <div className="flex w-11 shrink-0 items-center justify-center self-center">
              {unseen ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-11 rounded-xl"
                  disabled={pendingIds.length > 0}
                  aria-busy={pending}
                  aria-label={`ნანახად მონიშვნა: ${item.title}`}
                  title="ნანახად მონიშვნა"
                  onClick={() => onMarkSeen([item.id])}
                >
                  {pending ? (
                    <Spinner aria-hidden="true" />
                  ) : (
                    <IconCheck data-icon="inline-start" aria-hidden="true" />
                  )}
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-11 rounded-xl"
                  disabled={pendingIds.length > 0}
                  aria-busy={pending}
                  aria-label={`წაუკითხავად მონიშვნა: ${item.title}`}
                  title="წაუკითხავად მონიშვნა"
                  onClick={() => onMarkUnseen([item.id])}
                >
                  {pending ? (
                    <Spinner aria-hidden="true" />
                  ) : (
                    <IconMail aria-hidden="true" />
                  )}
                </Button>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export function NotificationsLoading() {
  return (
    <div
      role="status"
      aria-busy="true"
      className="flex flex-col gap-2 px-5 py-4"
    >
      <span className="sr-only">შეტყობინებები იტვირთება</span>
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          aria-hidden="true"
          className="flex gap-3 rounded-xl py-3"
        >
          <Skeleton className="size-9 shrink-0 rounded-xl motion-reduce:animate-none" />
          <div className="flex flex-1 flex-col gap-3">
            <Skeleton className="h-4 w-2/3 motion-reduce:animate-none" />
            <Skeleton className="h-4 w-full motion-reduce:animate-none" />
            <Skeleton className="h-3 w-1/3 motion-reduce:animate-none" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function NotificationsEmpty() {
  return (
    <div
      role="status"
      className="flex flex-col items-center gap-3 px-6 py-12 text-center"
    >
      <div
        className="flex size-16 items-center justify-center rounded-2xl border bg-muted/50"
        aria-hidden="true"
      >
        <IconBellCheck className="size-7 text-muted-foreground" />
      </div>
      <p className="font-medium">შეტყობინებები ჯერ არ გაქვთ</p>
      <p className="max-w-64 text-sm leading-6 text-muted-foreground">
        ახალი შეტყობინებები აქ გამოჩნდება.
      </p>
    </div>
  )
}
