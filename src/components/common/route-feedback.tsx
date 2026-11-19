import { Link, useLocation } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  IconAlertTriangle,
  IconArrowLeft,
  IconRefresh,
} from '@tabler/icons-react'
import { Button } from '#/components/ui/button'
import { Card, CardContent } from '#/components/ui/card'
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
} from '#/components/ui/empty'
import { APP_NAME } from '#/lib/app'
import { errorStatus, reportError } from '#/lib/error-diagnostics'
import { PageSkeleton } from './page-skeleton'

const errorCopy = {
  401: [
    'საჭიროა ავტორიზაცია',
    'თქვენი სესია შესაძლოა დასრულდა. გასაგრძელებლად გაიარეთ ავტორიზაცია.',
  ],
  403: [
    'წვდომა შეზღუდულია',
    'ამ გვერდზე წვდომის უფლება არ გაქვთ. თუ წვდომა სამუშაოდ გჭირდებათ, დაუკავშირდით ადმინისტრატორს.',
  ],
  404: [
    'გვერდი ვერ მოიძებნა',
    'გვერდი ან ჩანაწერი აღარ არის ხელმისაწვდომი. შეამოწმეთ ბმული ან დაბრუნდით მთავარ გვერდზე.',
  ],
  429: [
    'მოთხოვნები ძალიან ხშირია',
    'ცოტა ხანში სცადეთ ხელახლა. განმეორებითი მცდელობები შეზღუდვას ვერ მოხსნის.',
  ],
  503: [
    'სერვისი დროებით მიუწვდომელია',
    'ცოტა ხანში სცადეთ ხელახლა. თუ პრობლემა განმეორდება, დაუკავშირდით ადმინისტრატორს.',
  ],
  500: [
    'გვერდის გახსნა ვერ მოხერხდა',
    'შეამოწმეთ ინტერნეტთან კავშირი და სცადეთ ხელახლა ან დაბრუნდით მთავარ გვერდზე.',
  ],
} as const

export function RouteError({ error }: { error?: unknown }) {
  const href = useLocation({ select: (location) => location.href })
  const status = errorStatus(error)
  const [title, description] = errorCopy[status]
  const [diagnostic, setDiagnostic] = useState<ReturnType<typeof reportError>>()
  useEffect(() => {
    if (status === 500 || status === 503) {
      setDiagnostic(reportError('route', error, status))
    } else {
      setDiagnostic(undefined)
    }
  }, [error, status])
  return (
    <main className="flex min-h-svh flex-col bg-background px-5 text-foreground sm:px-10">
      <header className="mx-auto flex w-full max-w-6xl items-center py-6 sm:py-8">
        <Link
          to="/"
          className="inline-flex min-h-11 items-center gap-3 rounded-lg font-semibold tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <img src="/favicon.svg" alt="" className="size-8" />
          {APP_NAME}
        </Link>
      </header>
      <section
        aria-labelledby="route-error-title"
        className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-6 py-12"
      >
        <Card className="w-full">
          <CardContent>
            <Empty className="px-2 py-8 sm:px-6 sm:py-10">
              <EmptyMedia>
                <IconAlertTriangle aria-hidden="true" />
              </EmptyMedia>
              <EmptyHeader className="max-w-md gap-3">
                <h1
                  id="route-error-title"
                  className="text-xl leading-relaxed font-semibold tracking-tight sm:text-2xl"
                >
                  {title}
                </h1>
                <p className="text-sm leading-7 text-muted-foreground">
                  {description}
                </p>
              </EmptyHeader>
              <EmptyContent className="max-w-md sm:flex-row sm:justify-center">
                <Button
                  nativeButton={false}
                  role="link"
                  size="lg"
                  className="min-h-11 w-full px-4 sm:w-auto"
                  render={<a href={status === 401 ? '/auth/login' : href} />}
                >
                  <IconRefresh data-icon="inline-start" aria-hidden="true" />
                  {status === 401 ? 'ავტორიზაცია' : 'ხელახლა ცდა'}
                </Button>
                <Button
                  nativeButton={false}
                  role="link"
                  variant="outline"
                  depth="raised"
                  size="lg"
                  className="min-h-11 w-full px-4 sm:w-auto"
                  render={<Link to="/dashboard" />}
                >
                  <IconArrowLeft data-icon="inline-start" aria-hidden="true" />
                  მთავარ გვერდზე დაბრუნება
                </Button>
              </EmptyContent>
            </Empty>
          </CardContent>
        </Card>
        <p className="text-center text-xs leading-6 text-muted-foreground">
          თუ პრობლემა განმეორდება, დაუკავშირდით ადმინისტრატორს.
          {diagnostic && (
            <>
              <br />
              მიუთითეთ შეცდომის კოდი:{' '}
              <span className="wrap-anywhere">{diagnostic.reference}</span>
              <br />
              <time dateTime={diagnostic.timestamp}>
                {diagnostic.timestamp}
              </time>
            </>
          )}
        </p>
      </section>
    </main>
  )
}
export function RouteNotFound() {
  return (
    <main className="flex min-h-svh flex-col bg-background px-5 text-foreground sm:px-10">
      <header className="mx-auto flex w-full max-w-6xl items-center py-6 sm:py-8">
        <Link
          to="/"
          className="inline-flex min-h-11 items-center gap-3 rounded-lg font-semibold tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <img src="/favicon.svg" alt="" className="size-8" />
          {APP_NAME}
        </Link>
      </header>
      <section
        aria-labelledby="not-found-title"
        className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-8 py-12 text-center"
      >
        <p className="text-[7rem] leading-none font-semibold tracking-tighter text-muted-foreground/30 select-none sm:text-[10rem]">
          404
        </p>
        <div className="flex flex-col gap-4">
          <h1
            id="not-found-title"
            className="text-2xl leading-relaxed font-semibold tracking-tight sm:text-3xl"
          >
            გვერდი ვერ მოიძებნა
          </h1>
          <p className="text-sm leading-7 text-muted-foreground sm:text-base">
            ეს გვერდი არ არსებობს ან მისი მისამართი შეიცვალა.
            <br />
            შეამოწმეთ ბმული ან დაბრუნდით მთავარ გვერდზე.
          </p>
        </div>
        <Button
          nativeButton={false}
          role="link"
          size="lg"
          className="min-h-11 max-w-full px-4"
          render={<Link to="/" />}
        >
          <IconArrowLeft data-icon="inline-start" aria-hidden="true" />
          მთავარ გვერდზე დაბრუნება
        </Button>
      </section>
      <footer className="py-6 text-center text-xs leading-6 text-muted-foreground sm:py-8">
        თუ ბმული სამუშაოდ გჭირდებათ, გადაამოწმეთ მისამართი ადმინისტრატორთან.
      </footer>
    </main>
  )
}
export function RoutePending() {
  return <PageSkeleton />
}
