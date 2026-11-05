import { AttendanceOverview } from '#/features/attendance/components/attendance-overview'

export function DashboardPage({
  actorId,
  actorName,
}: {
  actorId: string
  actorName: string
}) {
  return (
    <section className="flex flex-col gap-6">
      <AttendanceOverview
        key={actorId}
        actorId={actorId}
        dashboardLayout
        greetingName={actorName}
      />
    </section>
  )
}
