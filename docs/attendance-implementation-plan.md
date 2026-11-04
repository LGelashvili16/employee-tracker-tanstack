# Teamwork attendance implementation plan

This document tracks delivery in small, verifiable steps. Company work schedules are configured at `/admin/settings/attendance`. The dashboard and attendance page now share working self-service check-in/out, a persistent timer, today's schedule, weekly summaries, and recent attendance. Other unimplemented workflows remain explicit shells. Notification delivery, manager attendance, corrections, and breaks remain pending.

## Product rules

- One company default weekly schedule, with effective-dated versions. Each version applies from its effective date until the next version starts. Historical versions must remain immutable once effective.
- Use the explicit company timezone, initially proposed as `Asia/Tbilisi`. Do not infer it from the browser or Georgian language.
- Weekly hours are local wall-clock values. Effective dates are PostgreSQL `date` values. Creation, audit, and actual attendance instants use Drizzle `timestamp(..., { withTimezone: true })` and UTC application semantics. PostgreSQL timestamps do not retain the timezone name, so store that separately.
- Capture actual server timestamps. New schedules do not use grace periods: flag arrivals after scheduled start and departures before scheduled end, preserving exact timestamps. Historical grace columns are retained only to preserve existing versions. Preserve seconds and choose consistent minute display rounding when implementing calculations.
- Late arrival and early departure are independent flags. Additional time at the end of the day does not erase lateness.
- Approved leave, holidays, nonworking days, and approved schedule exceptions suppress missing-attendance alerts. Missing check-out remains unresolved until corrected; never invent a successful check-out.
- Employee identity comes from the authenticated actor. Self-service and scoped management use the same attendance services.
- All product copy and validation messages are Georgian. Keep payroll and finance out of scope.

## 1. Company schedule data foundation

- [x] Inspect existing schemas, permissions, route shells, and timestamp helpers.
- [x] Add company schedule versions and weekday rows with constraints and retained history.
- [x] Add shared Zod contracts for dates, timezone, weekly hours, grace periods, and reminders.
- [x] Add validation tests and generate a migration for review.
- [x] Apply the migration in the target development environment after checking it.

The first version supports one same-day work interval per weekday. Every submitted week must explicitly include all seven ISO weekdays (Monday = 1, Sunday = 7), with at least one working day. A nonworking day has no start or end time. No schedule or working hours are silently seeded. Overnight and split shifts require the explicit extension in step 8.

## 2. Company schedule configuration workflow

- [x] Add server functions, repository, and transactional service under scheduling.
- [x] Require `attendance.configure` on every server call and retain protected admin routes.
- [x] Select the applicable schedule by company-local date; return an explicit unconfigured state when none exists.
- [x] Save the complete version and seven weekday rows atomically. Prevent edits/deletion of effective history and concurrent conflicting versions. Validate effective dates against the company-local current date on the server.
- [x] Audit schedule changes atomically with actor, effective date, and a server-generated action description. Per the revised UI requirement, the save contract does not require a free-text reason.
- [x] Replace the attendance-settings shell with a Georgian TanStack Form/Zod editor using existing shadcn controls, pending Spinner, and loading Skeleton.
- [x] Test direct service calls with missing actors, forbidden, allowed, and conflicting writes against PostgreSQL, plus the form and timezone boundaries. Endpoint authentication reuses the existing tested session/permission middleware.

Versions are append-only. The first version may start today; subsequent versions must start after both today and the latest saved effective date. Future versions cannot currently be edited or cancelled. This preserves the timeline without retroactively changing attendance expectations. Company timezone is canonicalized and fixed after the first save; changing it requires a separately designed transition policy. The settings screen shows the current version and the first 20 upcoming versions. No working hours are configured automatically.

## 3. Schedule exceptions and assignments

The shared sidebar has personal, team-management, and administration groups, filtered by permissions. The administration group sits at the bottom and currently surfaces only Users and Attendance Rules. It opens automatically on admin URLs; personal navigation and the account menu remain available there. The `/admin` entry opens Users. Other existing admin routes retain their guards and URLs but stay hidden until their workflows are needed. Attendance settings uses compact weekday rows and separate effective-date and reminder panels with a sticky save footer. Saved versions remain in the database and are not listed on this settings page.

- [ ] Add holidays and single-date exceptions; integrate approved leave through its service contract when available.
- [ ] Add employee/team overrides only with real assignment workflows. Define precedence: date exception, employee override, team override, company default. Resolve competing team assignments explicitly.
- [ ] Define employment eligibility and unscheduled work policy. Do not label an unscheduled employee late or absent.
- [ ] Test effective-date changes, leave, holidays, and historical interpretation.

## 4. Employee check-in and check-out

- [x] Persist sessions linked to existing employee records, with timezone-aware start/end timestamps and retained schedule expectations.
- [x] Enforce one open session per employee through a database unique partial index. Check out using a conditional atomic write; reject negative durations and duplicate actions safely.
- [x] Derive employee identity and active employment on the server; never accept client timestamps for ordinary punches.
- [x] Replace clock-control placeholders with persisted state, today's schedule, clear confirmation, and pending/error states. Reconcile concurrent tabs through focus/60-second refetch and invalidate affected Query caches. Stop automatic polling after failed/forbidden reads.
- [ ] Add personal attendance history with bounded, Zod-validated pagination/date filters and self-only authorization.
- [x] Test concurrent check-ins/check-outs, repeated check-outs, inactive employment, and direct unauthorized service calls against PostgreSQL.

The first delivery includes five recent attendance days, not a full paginated history. One day can contain several nonoverlapping sessions; the first arrival determines lateness and the last completed departure determines early departure. Gaps are excluded from worked duration. Missing prior-day check-outs remain open and block a new interval; closing one records the current actual time after confirmation. Corrections are explicitly unavailable until step 6. No unscheduled/day-off check-ins are accepted yet; holiday/leave exceptions still require step 3. Browser counters use a monotonic elapsed clock anchored to a server sample and recover from persisted timestamps after reopening. Ordinary punches do not accept historical client timestamps. DST gaps in schedule hours are rejected; repeated wall times use PostgreSQL's standard-time interpretation.

Bklit UI's `chart-stat-flow` source was installed from its official registry with the MIT license retained under `src/components/charts/`. Motion and `@number-flow/react` power the dashboard's transitions and animated numeric widgets. The component was adapted to existing aliases, Georgian formatting, semantic tokens, and deterministic SSR hydration; no second component library or chart dataset was introduced. Motion respects reduced-motion preferences, and the timer avoids live screen-reader announcements each second.

## 5. Attendance evaluation and manager visibility

- [ ] Calculate late and early seconds against retained schedule expectations. Keep original punches independent of flags and summaries.
- [ ] Show expected, checked in, checked out, late, on leave, and incomplete states. Keep confirmed absence separate from missing check-in.
- [ ] Implement manager scope in SQL for records, counts, searches, and summaries. Platform administration alone does not grant team attendance access.
- [ ] Test exact schedule boundaries, date boundaries, corrected records, and independent late/early flags.

## 6. Corrections and attendance review

- [ ] Employee submits proposed times and a required explanation for missing or incorrect entries.
- [ ] Scoped authorized reviewer approves/rejects atomically; prohibit self-approval.
- [ ] Keep originals, approved changes, actor, reason, decision, and timestamps. Add locked-period rules and prevent concurrent conflicting decisions.
- [ ] Add correction queue, history, and incomplete-session resolution. Test rollback, scope, audit integrity, and races.

## 7. Durable reminders and notifications

Redis is already defined in `compose.yaml` under the optional `cache` profile, with an append-only persistence volume and `noeviction`. No second Redis container is needed. BullMQ is a candidate for delayed work and retries, but is not installed or required for schedule configuration. If selected, deploy a continuously running worker alongside the web app, graceful shutdown and monitoring, and durable notification records/outbox with unique occurrence keys. Queue retries alone do not guarantee exactly-once delivery. Keep the provider channel separate from queue processing. Configure access/networking for the actual deployment before enabling the profile. See [BullMQ production guidance](https://docs.bullmq.io/guide/going-to-production).

- [ ] Implement durable notifications and select an actual scheduler/worker and delivery adapter based on deployment capabilities.
- [ ] Send a reminder five minutes before scheduled start by default, only if not checked in.
- [ ] Notify after scheduled start when check-in is missing; escalate once at a configurable manager threshold.
- [ ] Remind still-clocked-in employees the configured number of minutes before scheduled end (default zero, at the end) and again after a configured forgotten-check-out delay. Check-in reminder lead time remains independently configurable, default five minutes.
- [ ] Recheck current attendance, employment, schedule changes, holidays, and leave at delivery time. Use idempotency keys per employee, scheduled occurrence, and notification type, with bounded retries.
- [ ] Add in-app notifications and preferences. Deliver while the app is closed only through a configured external channel such as permission-based web push. Do not promise exact delivery times.
- [ ] Test duplicate worker runs, delayed jobs, changed schedules, completed actions, and provider failures. Surface unavailable delivery honestly.

## 8. Breaks, advanced schedules, and reporting

- [ ] Add break start/end and overlap constraints before subtracting breaks from worked time. Never subtract hypothetical breaks automatically.
- [ ] Add overnight/split shifts, daylight-saving ambiguity rules, and shift assignment UI when required. Preserve occurrence identity across midnight.
- [ ] Add monthly scheduled/recorded hours and late/early totals, unresolved counts, and authorized audited exports with Georgian labels.
- [ ] Consider location verification, kiosks, offline submissions, and job allocation separately when actual operational requirements justify them.

## Verification and delivery

Reminder settings now expose only check-in and check-out lead times. Check-in defaults to five minutes before start; check-out defaults to zero minutes before end. New schedule versions require zero late/early grace. Existing version values are retained for history, and migration `0005_checkout_reminders.sql` adds the check-out setting without dropping data. This migration was applied to the local development database. Delivery remains pending in step 7.

Each step includes targeted tests, formatting/lint, TypeScript checks, and a production build when routes or execution boundaries change. Database steps require generated migration inspection and isolated PostgreSQL integration checks. Update this checklist as work ships; distinguish implemented source, applied migrations, and usable workflows.

### Foundation verification, 2026-11-04

- Full default Vitest run: 113 passed, 23 opt-in database tests skipped.
- Schedule validation coverage: 23 tests included in that default run.
- Separate local PostgreSQL run with `RUN_SCHEDULE_DB_TESTS=1`: 12 passed. All migrations were applied to an isolated temporary database, which was removed after the tests. Application data was not changed.
- TypeScript (`tsc --noEmit`), targeted ESLint, Drizzle migration checks, and diff whitespace checks passed.
- At foundation delivery, migration `0003_company_work_schedules.sql` was generated and tested but not yet applied. It was subsequently applied during the configuration step below.

### Configuration verification, 2026-11-04

- Both additive migrations `0003_company_work_schedules.sql` and `0004_schedule_creation_audit.sql` were applied successfully to the configured local development database.
- Isolated PostgreSQL coverage: 19 passed, including fresh stored permission checks, suspended/inactive accounts, concurrent first saves, audit rollback, and retained current versions when future versions are added.
- Form coverage: missing workdays, saving without a change-reason input, successful submission, repeat-submission protection, server rejection, and invalid hours. Date-rule tests cover company-local midnight, leap days, and append-only effective dates.
- Full default regression run: 120 passed, 30 opt-in database tests skipped. Three subsequently added page-state tests passed in a targeted run together with the 23 schedule validation tests. TypeScript, targeted lint, formatting, and migration checks passed.
- Production build passed. Signed-in browser verification remains outstanding because no usable authenticated browser session was available; no test schedules were saved to the application database.

### Attendance dashboard delivery, 2026-11-04

- Installed the reviewed Bklit `chart-stat-flow` registry source with its license, Motion, and NumberFlow. No full chart catalog or unused dependencies were added.
- Migration `0006_attendance_sessions.sql` was generated, inspected, tested, and applied to the local development database. All actual/expected instants use timezone-aware columns; one-open-session and request uniqueness constraints protect concurrent actions.
- Default regression run: 143 passed, with 46 opt-in database tests skipped. Follow-up UI/time-rule run: 11 passed. Final separate PostgreSQL attendance/scheduling run: 36 passed, including a schedule-write/attendance-read race across a company-date boundary. New UI coverage includes server-confirmed actions, pending submissions, early-out confirmation, failed writes, persisted timer recovery, monotonic ticking, and unresolved prior-day sessions.
- Production build, TypeScript, lint, and migration checks passed. A temporary production server confirmed an anonymous dashboard redirect to login and HTTP 401 for attendance reads and validly serialized check-in/out requests; that server was stopped afterward.
- Live browser preview timed out, so signed-in visual verification remains outstanding. No employee attendance punches were fabricated in the application database. Reminder delivery, leave/holiday exceptions, breaks, manager attendance, corrections, and full paginated history remain future work.
