# Attendance sessions and manager review

Attendance measures actual check-in to check-out intervals. The company schedule is a reference for deviations, never an automatic timer start or stop. All displays use the timezone retained on the session, normally `Asia/Tbilisi`.

Employees inherit company hours unless assigned an individual recurring working week at account creation.
Individual assignments define working days and hours in the company timezone; the attendance snapshot
retains the resolved expectations so subsequent schedule changes cannot rewrite past or open sessions.

## Workday ownership

- A session belongs to the company-local date on which it starts, including all time after midnight.
- Midnight does not create a checkout, reset the counter, or mark attendance as missing.
- A new check-in requires the previous session to be closed. It belongs to the new check-in date, even before 10:00.
- Several sessions on one date are summed without counting gaps. The dashboard continues showing the entire starting day's total during overnight work.
- Check-in requires a configured employee schedule. On a configured nonworking day, the employee can start after confirming in the shared dialog. The server checks the confirmed company-local date against the current effective employee workday. Unconfigured schedules remain blocked. Existing sessions can continue into a day off; planned overnight schedules remain outside the current schedule model.

## Labels and time calculations

Early start and late start compare the day's first arrival to scheduled start. Early finish compares its final departure to scheduled end. The manager list suppresses arrival/departure flags on intermediate sessions so returning after a gap is not another late arrival.

Outside-schedule time is the sum of actual recorded portions before scheduled start and after scheduled end. Gaps never count. It is a candidate for manager review, not automatically approved overtime. The one-hour break remains an allowance in the interface. No hypothetical break is subtracted, and attendance cannot establish productive working time by itself.

For a 10:00 to 19:00 schedule:

| Actual session                         | Recorded time     | Schedule deviations                                               |
| -------------------------------------- | ----------------- | ----------------------------------------------------------------- |
| 08:00 to 19:00                         | 11 hours          | Early start 2 hours, outside schedule 2 hours                     |
| 09:00 to 19:00                         | 10 hours          | Early start 1 hour, outside schedule 1 hour                       |
| 11:00 to 19:00                         | 8 hours           | Late start 1 hour                                                 |
| 10:00 to 18:00                         | 8 hours           | Early finish 1 hour                                               |
| 10:00 to 21:00                         | 11 hours          | Outside schedule 2 hours                                          |
| November 4, 22:58 to November 5, 00:15 | 1 hour 17 minutes | All time remains on November 4 and is outside its scheduled hours |

The duration badge retains the eight-hour reference: yellow below eight recorded hours, green from eight through nine, orange above nine. Digits remain neutral. This display does not calculate overtime approval.

## Reviewer setup and permissions

The company attendance page is an account directory at `/manage/attendance`, including accounts without sessions. Search by name or employee code and sort by either column. `page`, `q` and `sort` search parameters drive server-side filtering, sorting and 20-account pagination using shared shadcn controls. Opening an account navigates to `/manage/attendance/<userId>`. Its validated `date` parameter selects the Monday-to-Sunday week containing that date, defaulting to the current company-local week. A single table shows all sessions in that complete week in descending check-in order, with the latest sessions first and weekly totals. Previous/next controls move by seven days and the current-week action returns to the company-local current week. Legacy `/manage/attendance?userId=...` links redirect to the detail route. Both server entry points independently recheck company-wide or assigned-employee read permissions.

HR managers, administrators, and owners can view all employees through the `/manage/attendance` directory and its employee detail tabs for attendance and monthly hours without reviewer assignments. This separate `attendance.read.all` grant covers reads only. HR and owners additionally receive `attendance.correct.all`, permitting company-wide time corrections without assignments. Administrators need an explicit correction grant. Approval continues to require an assignment.

1. Give the reviewer an existing role with `attendance.read.team` and `attendance.review.team`, such as supervisor or HR manager.
2. An account with `attendance.configure` assigns that reviewer to the relevant employee in `/manage/schedule`.
3. The reviewer opens `/manage/attendance`, selects an assigned employee, and uses that employee's attendance tab for session history, pending reviews, corrections and overdue-session warnings.

Direct employee-to-reviewer assignments provide scope. Teams and team memberships are outside current product scope. Roles, assignments and access state are rechecked from persistence on every protected server operation. Owner status does not bypass approval assignments. Company-wide corrections use a separate explicit permission. No account can review or correct itself. Assignments can be revoked, including assignments to inactive reviewers. Configuration lists are bounded at 500 entries and display a truncation notice if needed. Company-wide read access does not grant review or correction permissions. Hours-only readers receive no raw attendance sessions.

## Approval and corrections

Personal `/timesheets` keeps daily aggregates and marks days containing correction audits. Each day offers a read-only session sheet, showing all clock-in/out intervals separately, newest first. Corrected sessions carry their own badge and show original values beneath changed timestamps, including seconds. The sheet retains overnight dates, uses validated `day` and `sessionPage` URL state, and loads 20 sessions per page through an authenticated self-service endpoint. The subject employee is derived from the current account, never from a supplied employee identifier. Opening or paging the sheet does not refetch daily totals. Existing notification SSE updates refresh open session details and totals.

Only a pending, closed session can be approved or rejected. Confirming the attendance interval and approving its outside-schedule time are separate decisions. The overtime checkbox defaults off. Approval covers all recorded outside-schedule seconds for that session; partial overtime approval is not implemented.

An authorized assigned reviewer, or a company-wide reader with `attendance.correct.all`, can correct start/end times, including resolving a forgotten checkout. The correction editor opens in a right-side shadcn Sheet with a form Card and a history Card. It uses the Georgian shadcn Calendar and separate time inputs in the retained timezone. The header remains fixed and the body scrolls; redundant summaries and explanatory paragraphs are omitted. It accepts minute-precision edits, preserving seconds on unchanged fields. It rejects future end times, reversed intervals, invalid local times and overlaps with another session. The starting work date and schedule snapshot remain fixed; transferring a session to a different starting date requires a separate workflow.

Every correction requires a reason and returns the record to pending, clearing prior overtime approval. Corrections to approved records are deliberate reviewed operations, not silent edits to locked data. The original server punches remain retained, including a null original checkout if no checkout occurred. The employee sees a corrected badge in the daily summary and a read-only correction history on `/attendance`. The server scopes that history to the authenticated employee, with 20 changes per page, newest first. Each entry shows both check-in and checkout before and after the edit with seconds, editor, reason and change timestamp. Times are formatted in the retained timezone without displaying its name. Repeated edits remain separate entries, including changes back to the original values. The SSE notification includes before/after times and refreshes open attendance and correction history queries, including on reconnect. Managers can inspect original times and the latest 20 review/correction audit entries in the dialog. Complete audit entries retain before/after values in persistence.

Employee-row locks serialize clock actions and corrections. Record revisions reject stale decisions. Assignment locks prevent revocation from racing a review. Audit records commit in the same transaction as the decision or correction; failure to write the audit rolls back the change.

## Long sessions

The default warning threshold is 16 continuous hours. Attendance settings permit 8 through 72 hours and require a reason for changes. Each new session captures its threshold; changing the setting does not reinterpret existing sessions. Reaching the threshold asks for review and leaves the session running. It never invents a checkout. An employee may still explicitly check out, or an assigned reviewer may resolve the actual interval with a correction.

Warning and summary data refresh from the server every minute while the timer remains live. Background refresh and ordinary navigation do not emit success toasts. Explicit actions use Georgian success/error toasts and pending spinners.

## Validation

`pnpm test` exercises display rules, forms, manager UI and existing authorization tests. `$env:RUN_ATTENDANCE_DB_TESTS='1'; pnpm exec vitest run src/features/attendance/server/attendance.integration.test.ts` runs the workflow suite in an isolated temporary local PostgreSQL database. It never fabricates punches in the application database.

Migration `0007_attendance_review.sql` adds review state, original-punch retention, revision counters, warning snapshots, reviewer assignments, settings and audit history. Existing punches are backfilled into the original-punch columns before corrections are used.

## Employee attendance day view

`/manage/attendance/$userId` shows a complete Monday-to-Sunday week in one table. Validated `date` URL state chooses the containing week; existing dated links remain valid. The weekly UI explicitly requests a validated week period; existing internal day reads remain supported. The service resolves today in the configured company timezone and computes the inclusive week bounds in the same transaction as the scoped read. Repository queries filter the employee and retained work-date range in SQL. Overnight sessions remain on their clock-in work date; their historical timezone is preserved.

The shared day picker provides previous day, next day and today controls with a Georgian calendar. Future dates are disabled in the picker. Date changes preserve focus, show local loading rows, and retain the selected date when switching to monthly hours. A single table and compact session count and duration replace repeated day cards. An empty day means no records, without inferring absence. Monthly timesheet filters remain independent URL state. Review and correction actions retain their existing authorization checks.

## Confirmed work on nonworking days

Migration `0018_nonworking_day_attendance` permits an empty retained expected interval, with equal expected endpoints captured from the server at check-in. This represents no scheduled hours rather than an invented shift. The actual interval remains unchanged. All recorded time is outside schedule, with no late-arrival, early-start or early-departure deviation and no automatic approval. Reviewer and correction scope stays unchanged. Day summaries and per-session calculations share these semantics. The management table labels these intervals as nonworking days in Georgian.

The employee clock shows a nonworking-day badge near the start action. Canceling the confirmation makes no request. Confirmation includes the work date, preserves the operation key across lost responses, prevents repeat submission and dismissal while pending, and uses existing Georgian outcome toasts.
