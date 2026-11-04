import { Link } from '@tanstack/react-router'
import { IconArrowLeft } from '@tabler/icons-react'
import { Button } from '#/components/ui/button'
import { APP_NAME } from '#/lib/app'
import { PageSkeleton } from './page-skeleton'
import { FeaturePage } from './feature-page'

export function RouteError() {
  return (
    <FeaturePage
      title="გვერდის გახსნა ვერ მოხერხდა"
      description="შეამოწმეთ თქვენი წვდომა ან სცადეთ მოგვიანებით."
    >
      <Button
        nativeButton={false}
        role="link"
        variant="outline"
        render={<Link to="/dashboard" />}
      >
        მთავარ გვერდზე დაბრუნება
      </Button>
    </FeaturePage>
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
        ერთი სივრცე თქვენი სამუშაო დღის სამართავად.
      </footer>
    </main>
  )
}
export function RoutePending() {
  return <PageSkeleton />
}
