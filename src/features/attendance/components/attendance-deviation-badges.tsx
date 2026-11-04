import { Badge } from '#/components/ui/badge'
import { formatAttendanceDuration } from '../attendance.rules'

export function AttendanceDeviationBadges({
  earlyStartSeconds,
  lateSeconds,
  earlySeconds,
  outsideSeconds,
  approvedOutsideSeconds = 0,
  rejectedReviews = 0,
  corrected = false,
}: {
  earlyStartSeconds: number
  lateSeconds: number
  earlySeconds: number
  outsideSeconds: number
  approvedOutsideSeconds?: number
  rejectedReviews?: number
  corrected?: boolean
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {corrected ? <Badge variant="secondary">შესწორებულია</Badge> : null}
      {earlyStartSeconds > 0 ? (
        <Badge variant="secondary">
          ადრე დაწყება {formatAttendanceDuration(earlyStartSeconds)}
        </Badge>
      ) : null}
      {lateSeconds > 0 ? (
        <Badge variant="orange">
          გვიან დაწყება {formatAttendanceDuration(lateSeconds)}
        </Badge>
      ) : null}
      {earlySeconds > 0 ? (
        <Badge variant="yellow">
          ადრე დასრულება {formatAttendanceDuration(earlySeconds)}
        </Badge>
      ) : null}
      {outsideSeconds > 0 ? (
        <Badge variant="secondary">
          განრიგს გარეთ {formatAttendanceDuration(outsideSeconds)}
        </Badge>
      ) : null}
      {approvedOutsideSeconds > 0 ? (
        <Badge variant="green">
          დამტკიცებული ზეგანაკვეთური{' '}
          {formatAttendanceDuration(approvedOutsideSeconds)}
        </Badge>
      ) : null}
      {rejectedReviews > 0 ? <Badge variant="red">არ დადასტურდა</Badge> : null}
    </div>
  )
}
