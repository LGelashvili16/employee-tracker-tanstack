import { AttendanceOverview } from '../components/attendance-overview'
import { attendanceContent } from '../attendance.content'

export function AttendancePage({ actorId }: { actorId: string }) {
  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        {attendanceContent.attendance.title}
      </h1>
      <AttendanceOverview key={actorId} actorId={actorId} />
    </section>
  )
}
