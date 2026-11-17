# Attendance-based timesheets

Timesheets summarize existing attendance sessions. They do not create a separate attendance store or introduce payroll, period submission, locking, or period approval states.

- `/timesheets` shows the signed-in employee's monthly totals and daily rows. `/timesheets/2026-11` is a personal month permalink.
- `/manage/attendance` is the `დასწრებები` employee directory. Its `/manage/attendance/<userId>` detail page contains local attendance and monthly-hours tabs for that employee. HR managers, administrators, and owners require `manage.access` and `attendance.read.all`; reviewer assignments are not required for these read-only views. The standalone company-timesheets route has been removed.
- Employee profiles link directly to `/manage/attendance/<userId>` and to the selected account's timesheets. The attendance directory includes accounts without records. Its detail page defaults to the company-local current day and loads one validated work date at a time. Management attendance links still apply the selected account filter before pagination while retaining reviewer scope.
- Daily rows include first arrival, last departure, recorded duration, explicitly approved outside-schedule seconds and session review status. Approval and correction actions are available on the selected employee's attendance tab when independently authorized.

The default month comes from the effective company timezone on the server. Historical month membership follows the retained session work date, including overnight hours. Multiple sessions on one date are summed without counting gaps or deducting hypothetical breaks. Open sessions contribute provisional elapsed time and are explicitly identified. Rejected sessions remain visible as recorded facts and retain their rejected status.

Daily rows are paginated at 50 rows. Monthly totals are computed independently across the entire authorized filtered period, so changing page does not change the totals. A repeatable-read transaction keeps row and total reads consistent.

The employee timesheet tab reuses the shared Data Table, month picker, status filter, summary, and pagination. Employee search is omitted because the subject comes from the route. The URL stores `view=timesheet`, `month`, `hoursPage`, `hoursSort`, and `hoursStatus`, independently of attendance history `date`. The timesheet page is zero-based internally and displays one-based pagination. Sorting, filtering, and pagination use server queries scoped to the selected employee, including after filter reset. Profile shortcuts open the same employee URL with the appropriate tab. Both tabs retain the attendance sidebar selection.

Personal reads derive ownership from the current authenticated actor. Management reads recheck persisted roles and active employment, require `manage.access` and `timesheets.review.team`, exclude self-review and use explicit attendance reviewer assignments. Company-wide reads separately require `manage.access` and `attendance.read.all`; they do not grant mutation rights. Counts, totals, selected-employee filters and detail routes use their corresponding scope. Empty and inaccessible employee filters return no private employee metadata.

No migration is required. Run the regular Vitest suite for UI and validation checks. The existing isolated attendance database suite also verifies timesheet arithmetic, month boundaries, pagination, filters, suspended accounts, changed permissions and revoked assignments:

```powershell
$env:RUN_ATTENDANCE_DB_TESTS='1'
pnpm exec vitest run src/features/attendance/server/attendance.integration.test.ts
```

Assigned managers use the same attendance directory and employee-detail timesheet tab. Without `attendance.read.all`, monthly queries enforce `timesheets.review.team`, active employment, direct assignments, and self-exclusion in SQL. A timesheet-only reader can open the hours tab without gaining raw attendance-session access. The separate assigned-manager timesheet pages and their server-function wrapper are removed.
