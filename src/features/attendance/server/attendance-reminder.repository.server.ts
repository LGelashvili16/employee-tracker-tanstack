import '@tanstack/react-start/server-only'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { attendanceDigestReceipt, attendanceSession } from '#/db/schema'
import {
  hasPermission,
  permissionSchema,
  roleSchema,
} from '#/lib/authorization/permissions'
import type { Permission } from '#/lib/authorization/permissions'
import type { AttendanceTransaction } from './attendance.repository.server'

type Candidate = {
  subject: string
  recipient: string
  date: string
  key: string
}
type DigestCandidate = Candidate & { session: string; revision: number }
const limit = 64
const activeEmployees = sql`select e.id, e.user_id from employee e join "user" u on u.id=e.user_id
  where e.status='active' and u.access_state='active'`
const undelivered = sql`not exists (select 1 from notification n where n.event_key=c.key and n.recipient_id=c.recipient)`
const array = (items: ReadonlyArray<string>) =>
  sql`array[${sql.join(
    items.map((item) => sql`${item}`),
    sql`,`,
  )}]::text[]`
function grant(permission: Permission) {
  const roles = roleSchema.options.filter((role) =>
    hasPermission([role], permission),
  )
  return sql`(not (p.deny ? ${permission}) and (p.allow ? ${permission} or
    (p.roles <@ ${array(roleSchema.options)} and p.roles && ${array(roles)})))`
}
// Mirror the current policy, including fail-closed handling of malformed persisted overrides.
const reviewers = sql`select a.employee_id, u.id as recipient from attendance_reviewer a
  join "user" u on u.id=a.reviewer_id and u.access_state='active'
  join employee re on re.user_id=u.id and re.status='active' and re.id<>a.employee_id
  cross join lateral (select case when u.permission_overrides='null'::jsonb then '{"allow":[],"deny":[]}'::jsonb else u.permission_overrides end as overrides) o
  cross join lateral (select o.overrides->'allow' as allow,o.overrides->'deny' as deny,
    array(select regexp_replace(token,'^[[:space:]]+|[[:space:]]+$','','g') from unnest(string_to_array(u.roles,',')) token) as roles) p
  where case when jsonb_typeof(p.allow)='array' and jsonb_typeof(p.deny)='array' then
    jsonb_array_length(p.allow)<=${permissionSchema.options.length} and jsonb_array_length(p.deny)<=${permissionSchema.options.length}
    and p.allow <@ ${JSON.stringify(permissionSchema.options)}::jsonb and p.deny <@ ${JSON.stringify(permissionSchema.options)}::jsonb
    and not exists (select 1 from jsonb_array_elements_text(p.allow) g(value) where p.deny ? g.value)
    and ${grant('manage.access')} and ${grant('attendance.review.team')}
    and (${grant('attendance.read.team')} or ${grant('attendance.read.all')}) else false end`

// Match employeeWorkingWeekSchema for the entire assignment before converting any stored wall time.
const customDay = sql`select (jsonb_agg(hours) filter (where weekday=to_jsonb(w.weekday)))->0 as hours
  from (select value->'weekday' as weekday, value->'hours' as hours from jsonb_array_elements(ew.days)) days
  having count(*)=7 and count(distinct weekday)=7 and bool_or(hours <> 'null'::jsonb)
    and bool_and(coalesce(weekday in ('1'::jsonb,'2'::jsonb,'3'::jsonb,'4'::jsonb,'5'::jsonb,'6'::jsonb,'7'::jsonb)
      and (hours='null'::jsonb or (jsonb_typeof(hours->'start')='string' and jsonb_typeof(hours->'end')='string'
        and (hours->>'start') ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
        and (hours->>'end') ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
        and (hours->>'start') collate "C" < (hours->>'end') collate "C")),false))`

export async function checkinCandidates(
  tx: AttendanceTransaction,
  instant: string,
) {
  return (
    await tx.execute<Candidate>(sql`with dates as (
    select (${instant}::timestamptz at time zone timezone)::date + extra as day
    from (select timezone from company_schedule order by effective_from desc limit 1) zone
    cross join (values(0),(1)) offsets(extra)
  ), c as (
    select e.user_id subject, e.user_id recipient, d.day::text date,
      'checkin:'||e.id||':'||d.day as key
    from dates d cross join lateral (select * from company_schedule where effective_from<=d.day
      order by effective_from desc limit 1) cfg
    join company_schedule_day w on w.effective_from=cfg.effective_from and w.weekday=extract(isodow from d.day)
    cross join (${activeEmployees}) e left join employee_work_schedule ew on ew.employee_id=e.id
    left join lateral (${customDay}) custom on true
    cross join lateral (select case when ew.employee_id is null then w.start_time else (custom.hours->>'start')::time end as start,
      case when ew.employee_id is null then w.end_time else (custom.hours->>'end')::time end as finish) h
    cross join lateral (select (d.day+h.start) at time zone cfg.timezone as start,
      (d.day+h.finish) at time zone cfg.timezone as finish) t
    where t.start-make_interval(mins=>cfg.reminder_minutes_before)<=${instant}::timestamptz and ${instant}::timestamptz<t.finish
      and t.start at time zone cfg.timezone=d.day+h.start and t.finish at time zone cfg.timezone=d.day+h.finish
      and not exists (select 1 from attendance_session s where s.employee_id=e.id and (s.ended_at is null or s.work_date=d.day))
      and not exists (select 1 from leave_request l where l.requester_id=e.user_id and l.status='approved' and l.start_date<=d.day and (l.end_date is null or d.day<=l.end_date))
  ) select * from c where ${undelivered} order by date,subject limit ${limit}`)
  ).rows
}

export async function openCandidates(
  tx: AttendanceTransaction,
  instant: string,
  excessive: boolean,
) {
  const recipients = excessive
    ? sql`select active.user_id as recipient from (${activeEmployees}) active where active.id=e.id union all select r.recipient from (${reviewers}) r where r.employee_id=e.id`
    : sql`select active.user_id as recipient from (${activeEmployees}) active where active.id=e.id`
  const due = excessive
    ? sql`s.started_at+make_interval(hours=>s.max_open_hours)`
    : sql`s.expected_end_at-make_interval(mins=>cfg.checkout_reminder_minutes_before)`
  return (
    await tx.execute<Candidate>(sql`with c as (select e.user_id subject,r.recipient,s.work_date::text date,
    ${excessive ? 'excessive:' : 'checkout:'}::text||s.id as key from attendance_session s join employee e on e.id=s.employee_id
    join company_schedule cfg on cfg.effective_from=s.schedule_effective_from cross join lateral (${recipients}) r
    where s.ended_at is null and ${due}<=${instant}::timestamptz and ${excessive ? sql`true` : sql`s.expected_end_at>s.expected_start_at`})
    select * from c where ${undelivered} order by key,recipient limit ${limit}`)
  ).rows
}

export async function digestCandidates(
  tx: AttendanceTransaction,
  instant: string,
) {
  return (
    await tx.execute<DigestCandidate>(sql`with c as (select e.user_id subject, r.recipient, s.work_date::text date, s.id session,s.revision,
    'review-digest:'||e.id||':'||s.work_date||':'||floor(extract(epoch from ${instant}::timestamptz)/3600)::bigint as key
    from attendance_session s join employee e on e.id=s.employee_id join (${reviewers}) r on r.employee_id=e.id
    left join attendance_digest_receipt seen on seen.reviewer_id=r.recipient and seen.session_id=s.id
    where s.ended_at is not null and s.review_state='pending' and (seen.revision is null or seen.revision<s.revision)
    and (s.work_date<(${instant}::timestamptz at time zone s.timezone)::date or s.expected_end_at<=${instant}::timestamptz)
    ) select * from c where ${undelivered} order by date,subject,recipient,session limit ${limit}`)
  ).rows
}

export async function saveDigestReceipts(
  tx: AttendanceTransaction,
  rows: Array<DigestCandidate>,
) {
  if (!rows.length) return
  await tx
    .insert(attendanceDigestReceipt)
    .values(
      rows.map((row) => ({
        reviewerId: row.recipient,
        sessionId: row.session,
        revision: row.revision,
      })),
    )
    .onConflictDoUpdate({
      target: [
        attendanceDigestReceipt.reviewerId,
        attendanceDigestReceipt.sessionId,
      ],
      set: { revision: sql`excluded.revision` },
    })
}

/** A later fresh assignment should receive still-pending work even if the same person previously reviewed this employee. */
export async function clearAssignmentReceipts(
  tx: AttendanceTransaction,
  reviewerId: string,
  employeeId: string,
) {
  await tx
    .delete(attendanceDigestReceipt)
    .where(
      and(
        eq(attendanceDigestReceipt.reviewerId, reviewerId),
        inArray(
          attendanceDigestReceipt.sessionId,
          tx
            .select({ id: attendanceSession.id })
            .from(attendanceSession)
            .where(eq(attendanceSession.employeeId, employeeId)),
        ),
      ),
    )
}
