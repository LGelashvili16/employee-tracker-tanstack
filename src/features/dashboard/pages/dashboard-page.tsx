import { dashboardContent } from '../dashboard.content'

export function DashboardPage() {
  return (
    <>
      <h1 className="sr-only">{dashboardContent.dashboard.title}</h1>
      <div
        className="grid auto-rows-min gap-4 md:grid-cols-3"
        aria-hidden="true"
      >
        <div className="aspect-video rounded-xl bg-muted/50" />
        <div className="aspect-video rounded-xl bg-muted/50" />
        <div className="aspect-video rounded-xl bg-muted/50" />
      </div>
      <section
        className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 p-4 md:min-h-min"
        aria-label="სამუშაო სივრცის მიმოხილვა"
      >
        <p className="text-sm text-muted-foreground">
          მიმოხილვის მონაცემები ჯერ არ არის ხელმისაწვდომი.
        </p>
      </section>
    </>
  )
}
