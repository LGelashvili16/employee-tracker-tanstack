import { dashboardContent } from '../dashboard.content'
import { AttendanceOverview } from '#/features/attendance/components/attendance-overview'

export function DashboardPage({ actorId }: { actorId: string }) {
  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        {dashboardContent.dashboard.title}
      </h1>
      <AttendanceOverview key={actorId} actorId={actorId} />
    </section>
  )
}
