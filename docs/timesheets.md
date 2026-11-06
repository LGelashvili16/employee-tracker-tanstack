# Attendance-based timesheets

Timesheets summarize existing attendance sessions. They do not create a separate attendance store or introduce payroll, period submission, locking, or period approval states.

- `/timesheets` shows the signed-in employee's monthly totals and daily rows. `/timesheets/2026-11` is a personal month permalink.
- `/manage/timesheets` shows monthly attendance for employees explicitly assigned to the reviewer. `userId`, `month` and `page` are validated search parameters. `/manage/timesheets/<userId>?month=2026-11` opens one assigned employee's month.
- `/admin/timesheets` and `/admin/attendance` provide read-only company-wide records for administrators and owners with `admin.access` and `attendance.read.all`. They include all employees, including the viewer, without reviewer assignments. Admin profile links prefer these views and preserve the selected employee filter.
- Admin employee profiles link directly to `/admin/attendance/<userId>` and to the selected account's timesheets. The attendance directory includes accounts without records. Its detail page groups sessions by complete work dates with URL-backed server pagination and sorting. Management attendance links still apply the selected account filter before pagination while retaining reviewer scope.
- Daily rows include first arrival, last departure, recorded duration, explicitly approved outside-schedule seconds and session review status. Approval and correction actions remain in `/manage/attendance`.

The default month comes from the effective company timezone on the server. Historical month membership follows the retained session work date, including overnight hours. Multiple sessions on one date are summed without counting gaps or deducting hypothetical breaks. Open sessions contribute provisional elapsed time and are explicitly identified. Rejected sessions remain visible as recorded facts and retain their rejected status.

Daily rows are paginated at 50 rows. Monthly totals are computed independently across the entire authorized period, so changing page does not change the totals. A repeatable-read transaction keeps row and total reads consistent.

Personal reads derive ownership from the current authenticated actor. Management reads recheck persisted roles and active employment, require `manage.access` and `timesheets.review.team`, exclude self-review and use explicit attendance reviewer assignments. Administrative company-wide reads separately require `admin.access` and `attendance.read.all`; they do not grant mutation rights. Counts, totals, selected-employee filters and detail routes use their corresponding scope. Empty and inaccessible employee filters return no private employee metadata.

No migration is required. Run the regular Vitest suite for UI and validation checks. The existing isolated attendance database suite also verifies timesheet arithmetic, month boundaries, pagination, filters, suspended accounts, changed permissions and revoked assignments:

```powershell
$env:RUN_ATTENDANCE_DB_TESTS='1'
pnpm exec vitest run src/features/attendance/server/attendance.integration.test.ts
```
