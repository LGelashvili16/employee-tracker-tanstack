import { AttendanceOverview } from '../components/attendance-overview'

export function AttendancePage({ actorId }: { actorId: string }) {
  return (
    <section className="flex flex-col gap-6">
      <AttendanceOverview key={actorId} actorId={actorId} />
    </section>
  )
}
