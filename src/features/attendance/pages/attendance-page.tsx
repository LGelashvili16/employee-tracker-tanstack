import { AttendanceOverview } from '../components/attendance-overview'
import { AttendanceCorrections } from '../components/attendance-corrections'

export function AttendancePage({
  actorId,
  correctionsPage,
  onCorrectionsPageChange,
}: {
  actorId: string
  correctionsPage: number
  onCorrectionsPageChange: (page: number) => void
}) {
  return (
    <section className="flex flex-col gap-6">
      <AttendanceOverview key={actorId} actorId={actorId} />
      <AttendanceCorrections
        key={actorId}
        actorId={actorId}
        page={correctionsPage}
        onPageChange={onCorrectionsPageChange}
      />
    </section>
  )
}
