# Application route and module foundation

This project serves one company. Payroll, finance, CRM, and sales functionality are excluded. All user-facing page content and document titles are Georgian.

## Implemented boundaries

- Thin TanStack route files compose pages from `src/features/<feature>/pages/`. Feature-owned content supplies both page headings and `head` metadata.
- `_authenticated/route.tsx` validates the current Better Auth session before rendering. Management/admin layouts and their restricted child routes check explicit server-side permissions.
- `src/lib/auth/auth.middleware.ts` supplies reusable session/permission middleware for future feature server functions. Attendance and timesheet resource policies are defined, but must be called by services using server-loaded scope when domain persistence is implemented. A page guard alone never authorizes record reads or writes. See [authorization](authorization.md) for helpers, execution boundaries, and remaining provisioning work.
- Shared shadcn application navigation filters links using the same permission vocabulary. Hidden links are presentation only; the receiving server checks access independently.
- Authentication identity is projected into a minimal actor DTO. Session tokens and provider credentials are never returned by application session functions.

## Current functionality

The shared `/jobs` workspace implements installation and measurement pins, map/list views, creation, editing, claims, arrival, completion, rejection and reopening. Creation and details open inside the shared workspace. See [the jobs map](jobs-map.md) for permissions, state transitions, map limits and persistence.

Employee management exposes the `დასწრებები` directory at `/manage/attendance`. Opening `/manage/attendance/$userId` shows that employee's attendance and monthly timesheet in local tabs. HR managers, administrators, and owners can view every employee without reviewer assignments through the explicit `attendance.read.all` permission. Actors with `attendance.read.team` or `timesheets.review.team` use this same directory restricted to assigned employees; attendance and hours tabs are independently authorized. Review and correction appear in the selected employee's attendance sessions and retain the existing assignment, permission and self-review checks. Employee profile shortcuts open the company views filtered to that employee.

Personal and management timesheets now show monthly totals and paginated daily attendance rows. Admin profile shortcuts preserve the selected employee in both attendance and timesheet filters. Period approval/submission remains outside this read workflow; session review and corrections use the existing attendance service. See [attendance-based timesheets](timesheets.md) for scope, timezone rules and verification.

Login uses Better Auth with a TanStack Form/Zod form and accepts an employee code or legacy auth email. `/manage/employees` provisions employee accounts, issues activation/reset codes, and suspends or restores existing accounts. `/auth/register` redeems an activation code; `/auth/reset-password` redeems a reset code. `/manage/schedule` saves company schedules. `/dashboard` and `/attendance` share persisted self-service check-in/out, a live server-derived timer, today's schedule, weekly totals, and five recent attendance days. Check-in requires an active linked employee and a configured working day. Every checkout requires confirmation. Overnight sessions remain assigned to their starting day; only excessive session length triggers review warnings. Manager review, separate overtime approval and audited corrections are implemented under explicit reviewer assignments. Personal correction requests, recorded breaks, notifications and external delivery remain unavailable. See [attendance sessions and review](attendance-review.md) for setup, examples and limits.

Email delivery, email verification, and MFA are not configured. Account activation and recovery use expiring, single-use administrator-issued codes. Public signup remains disabled on the server. Initial owner creation and emergency owner recovery are operator-only commands, never public routes. See [employee accounts](employee-accounts.md).

## Route audit (2026-11-09)

Reviewed every route file and its composed feature implementation. The table below distinguishes working pages from unfinished workflows. These are source-level findings; they do not imply every workflow was exercised against live data.

Removed obsolete routes rather than keeping compatibility redirects. Old bookmarks are no longer supported. Current destinations are:

- Employee list, creation, and profiles: `/manage/employees` and `/manage/employees/$employeeId`.
- Personal attendance history: `/timesheets`.
- Account activation: `/auth/register`.
- Job creation and management: `/jobs`; selecting a job uses its validated `pin` search parameter.

The starter about page, old admin landing pages, admin user aliases, invitation-acceptance shell, attendance-history alias, job detail aliases, and separate new-job page have been removed. The admin layout remains solely to guard its child pages and rejects the bare admin URL. The attendance tabs and sidebar use current destinations directly.

| Routes                                                  | Current state                                                                                                         |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `/`                                                     | Entry redirects to the signed-in workspace or login.                                                                  |
| `/api/auth/$`                                           | Better Auth HTTP protocol handler.                                                                                    |
| `/auth/login`, `/auth/register`, `/auth/reset-password` | Login, activation, and code-based reset forms.                                                                        |
| `/auth/forgot-password`                                 | Recovery instructions and the reset form link.                                                                        |
| `/dashboard`, `/attendance`                             | Shared attendance clock and summaries in landing and focused layouts.                                                 |
| `/timesheets`, `/timesheets/$timesheetId`               | Personal monthly totals and daily attendance records.                                                                 |
| `/jobs`                                                 | Shared job workspace with creation and job details in dialogs.                                                        |
| `/schedule`                                             | Personal schedule view.                                                                                               |
| `/notifications`                                        | Persisted notification feed with read state and pagination.                                                           |
| `/settings/profile`, `/settings/security`               | Profile/phone and password controls.                                                                                  |
| `/manage/employees`, `/manage/employees/$employeeId`    | Employee creation, account lifecycle, profile, schedule, and attendance shortcuts for HR, administrators, and owners. |
| `/manage/attendance`, `/manage/attendance/$userId`      | Unified attendance and employee timesheets, with scoped review/correction controls.                                   |
| `/manage/schedule`                                      | Company schedules, reviewer assignments, and attendance limits.                                                       |

Remaining page shells are intentional unfinished workflows, not implemented duplicates. They are retained without broadening permissions or pretending the workflow works:

| Routes                                                                                                              | Unavailable workflow                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `/auth/verify-email`, `/auth/mfa`                                                                                   | Email verification and MFA.                                                                                              |
| `/attendance/corrections`                                                                                           | Personal correction requests. Manager corrections are a separate authorized workflow.                                    |
| `/vacation`, `/manage/vacations`, `/admin/settings/leave`                                                           | Leave requests, review, and configuration.                                                                               |
| `/manage/reports`                                                                                                   | Employee attendance and job reports.                                                                                     |
| `/admin/invitations`                                                                                                | Invitation management. Role assignment and per-user exceptions are implemented in the separate account-access workflow.  |
| `/admin/settings/company`, `/admin/settings/approvals`, `/admin/settings/security`, `/admin/settings/notifications` | Company information, approval policy, security policy, and notification configuration.                                   |
| `/admin/locations`, `/admin/integrations`, `/admin/audit-log`                                                       | Location management, integrations, and audit-log browsing. Persisting audit events does not implement a browsing screen. |

## Employee management relocation (2026-11-09)

The working account list, creation form, and profile/lifecycle screens now own `/manage/employees` and `/manage/employees/$employeeId`. The former management placeholders were removed. The detail parameter carries the linked auth user ID. The existing `hr_manager` role already grants `manage.access` and `employees.manage`; all employee server functions and services now enforce these grants rather than requiring platform administration. Administrators receive these grants explicitly to preserve their existing employee-management access after the move.

HR creates ordinary employee accounts. Management-role assignment still requires `roles.manage`; custom schedule configuration requires `attendance.configure`, now explicitly granted to HR as well. Self-management and admin/owner target restrictions remain enforced inside transactions. Old admin user routes have been deleted. No schema change or migration is needed.

## HR attendance ownership (2026-11-09)

Company attendance, per-employee history, company timesheets, and attendance rules live at `/manage/attendance`, `/manage/attendance/$userId`, and `/manage/schedule`. Their old admin routes were removed without redirects. HR has company-wide read and attendance-configuration grants. Services require current management/read permissions rather than platform administration. Reviewer assignments, correction scope, self-approval restrictions, and transactional permission rechecks remain intact.

## Platform administration (2026-11-09)

`/admin/access` is the working platform account directory. It includes identities without employee profiles and supports role changes, individual allow/deny exceptions, suspension/restoration, and revoking sessions. Owner and self-account protections remain. `/admin/roles` shows the real role permission matrix. `/admin/audit-log`, `/admin/settings/security`, `/admin/settings/company`, `/admin/settings/notifications`, and `/admin/integrations` contain explicit Georgian lists of planned work, with a planned badge and no simulated controls. Existing guards and page metadata remain in force. The sidebar exposes exactly these platform pages under administration; HR operations remain under management.

## Database migration

Run `pnpm db:migrate` against the intended environment before signing in with the updated auth schema. Migration `0001_user_roles.sql` adds server-provisioned roles. Migration `0002_amused_red_hulk.sql` adds employee/account linkage, hashed challenges, audit rows, username/lifecycle fields, and auth throttling. The latter was applied to the verified local PostgreSQL 18 database. Other deployment targets still require migration. Existing auth IDs and passwords are preserved. Drizzle Kit reads the single schema index to avoid duplicate discovery.

Role grants are comma-separated validated identifiers provisioned only by trusted server/database administration. Better Auth marks the roles field `input: false`; browser signup/profile requests cannot grant themselves roles. Account creation allows fixed employee/management roles and rechecks role-assignment permission. Administrator/owner creation is excluded from this screen. Available roles remain employee, supervisor, operations manager, HR manager, system administrator, and company owner. Administrators configure the platform and manage accounts; attendance review and other operational workflows require an additional management role. Owners retain all declared permissions. Resource scope and self-approval restrictions still apply. Employee records are now persisted for account ownership; other unimplemented domains have no speculative tables.

## Pages

| URL                             | Feature module     | Page                               | Access                                                                                                 |
| ------------------------------- | ------------------ | ---------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `/auth/login`                   | `auth`             | შესვლა                             | Public; no private domain data                                                                         |
| `/auth/register`                | `auth`             | ანგარიშის გააქტიურება              | Public; valid single-use administrator-issued code required                                            |
| `/auth/forgot-password`         | `auth`             | პაროლის აღდგენა                    | Public; no private domain data                                                                         |
| `/auth/reset-password`          | `auth`             | ახალი პაროლი                       | Public; no private domain data                                                                         |
| `/auth/verify-email`            | `auth`             | ელფოსტის დადასტურება               | Public; no private domain data                                                                         |
| `/auth/mfa`                     | `auth`             | დამატებითი დადასტურება             | Public; no private domain data                                                                         |
| `/dashboard`                    | `dashboard`        | მთავარი გვერდი                     | Authenticated account                                                                                  |
| `/attendance`                   | `attendance`       | დასწრება                           | Authenticated account                                                                                  |
| `/attendance/corrections`       | `attendance`       | დროის შესწორებები                  | Authenticated account                                                                                  |
| `/timesheets`                   | `timesheets`       | სამუშაო საათები                    | Authenticated account                                                                                  |
| `/timesheets/$timesheetId`      | `timesheets`       | საათების დეტალები                  | Authenticated account                                                                                  |
| `/schedule`                     | `scheduling`       | ჩემი განრიგი                       | Authenticated account                                                                                  |
| `/jobs`                         | `jobs`             | სამუშაოების რუკა                   | Authenticated account                                                                                  |
| `/vacation`                     | `leave`            | შვებულება და გაცდენა               | Authenticated account                                                                                  |
| `/notifications`                | `notifications`    | შეტყობინებები                      | Authenticated account                                                                                  |
| `/settings/profile`             | `account`          | ჩემი პროფილი                       | Authenticated account                                                                                  |
| `/settings/security`            | `account`          | ანგარიშის უსაფრთხოება              | Authenticated account                                                                                  |
| `/manage/schedule`              | `scheduling`       | სამუშაო განრიგი                    | `attendance.configure` plus the authenticated parent                                                   |
| `/manage/employees`             | `access`           | თანამშრომლები                      | `employees.manage` plus the management parent                                                          |
| `/manage/employees/$employeeId` | `access`           | თანამშრომლის ანგარიში              | `employees.manage` plus the management parent                                                          |
| `/manage/vacations`             | `leave`            | შვებულებები                        | `leave.review` plus the authenticated parent                                                           |
| `/manage/reports`               | `reports`          | რეპორტები                          | `reports.read` plus the authenticated parent                                                           |
| `/manage/attendance`            | `attendance`       | დასწრებები                         | Any of `attendance.read.all`, `attendance.read.team`, `timesheets.review.team`, plus management access |
| `/manage/attendance/$userId`    | `attendance`       | თანამშრომლის დასწრებები და საათები | Any of `attendance.read.all`, `attendance.read.team`, `timesheets.review.team`, plus management access |
| `/admin/invitations`            | `invitations`      | მოწვევები                          | `invitations.manage` plus the authenticated parent                                                     |
| `/admin/access`                 | `access`           | მომხმარებლების წვდომა              | `users.manage` plus the admin parent                                                                   |
| `/admin/roles`                  | `access`           | როლები და უფლებები                 | `roles.manage` plus the authenticated parent                                                           |
| `/admin/settings/company`       | `company-settings` | კომპანიის პარამეტრები              | `company.configure` plus the authenticated parent                                                      |
| `/admin/settings/approvals`     | `approvals`        | დადასტურების წესები                | `approvals.configure` plus the authenticated parent                                                    |
| `/admin/settings/leave`         | `leave`            | შვებულების წესები                  | `leave.configure` plus the authenticated parent                                                        |
| `/admin/settings/security`      | `access`           | უსაფრთხოების პოლიტიკა              | `security.configure` plus the authenticated parent                                                     |
| `/admin/settings/notifications` | `notifications`    | შეტყობინებების პარამეტრები         | `notifications.configure` plus the authenticated parent                                                |
| `/admin/locations`              | `locations`        | სამუშაო ადგილები                   | `locations.manage` plus the authenticated parent                                                       |
| `/admin/integrations`           | `integrations`     | ინტეგრაციები                       | `integrations.manage` plus the authenticated parent                                                    |
| `/admin/audit-log`              | `audit-log`        | მოქმედებების ჟურნალი               | `audit.read` plus the authenticated parent                                                             |

## Application entry points

- `/` redirects to login or the authenticated dashboard.
- Better Auth retains its HTTP handler at `/api/auth/*`.

## Validation

Run `pnpm test`, `pnpm exec tsc --noEmit`, and `pnpm build`. Tests exercise role grants, denied direct permission checks, input validation, and attendance UI states. `RUN_ATTENDANCE_DB_TESTS=1 pnpm test src/features/attendance/server/attendance.integration.test.ts` runs isolated local PostgreSQL checks for employee scope, concurrent clock actions, idempotency, exact time calculations, schedule snapshots, and timezone transitions. Manager review tests cover explicit scope, current permissions, self-review denial, original-punch retention, atomic audit persistence, overlaps, stale versions and competing updates.

`/dashboard` is shared by all authenticated roles. The admin layout has no standalone landing page. One shared sidebar shows personal links and permission-scoped management links. Company attendance, company timesheets, Attendance Rules, and employees appear under employee management. Administration now lists account access, role permissions, and explicitly planned platform pages. Remaining platform routes retain `admin.access` guards. Admin URLs use the same inset shell, breadcrumb header, and account menu; there is no workspace switch. Existing route and server guards remain independent from navigation visibility.

## Employee navigation

The personal navigation group contains dashboard, attendance, schedule, jobs, and leave, and stays available on admin pages. Corrections and timesheets are reachable through the attendance section navigation; daily attendance history is part of timesheets. Profile and security remain in the shared account popup; notifications use the header bell. The employee-management group is available to authorized actors, alongside administration for actors with its explicit grants.

The employee-management group contains assigned-employee attendance, timesheet review, scheduling, employees, leave review, and reports according to explicit grants. Attendance exceptions appear in assigned-employee attendance section navigation; job creation is a page action on the jobs screen. The attendance exceptions route remains independently guarded; the jobs service separately authorizes creation. HR managers, administrators, and owners see personal and explicit company attendance, rule configuration, and employee-management links; attendance review and other operational links still require additional grants. Account provisioning and daily operations share the same application navigation.

Removed the unimplemented onboarding shell, the management overview placeholder at `/manage`, and unused legacy dashboard employee/settings redirects. The management layout continues to protect its child pages; `/manage` has no standalone page. The protected canonical profile, employee-management, attendance, timesheet, and notification routes remain available.

Teams are outside the current product scope. `/manage/teams` and its placeholder feature have been removed without a redirect alias. Employee reviewer assignments, employee records, and existing attendance history remain intact.

The standalone `/manage/company-timesheets` route is removed without an alias. Employee detail uses `view=attendance|timesheet`; `month`, `hoursPage`, `hoursSort`, and `hoursStatus` retain timesheet state independently of attendance `date`. Both tabs keep the attendance sidebar destination active.

The duplicate assigned-manager attendance/exception screens and `/manage/timesheets` routes were consolidated into the attendance directory and employee detail. Assigned managers and company readers share the attendance directory and employee detail pages. Review/correction dialogs are available only when the server returns an explicit resource-specific `canReview` grant. Personal `/timesheets` pages remain self-service.

The dedicated work-schedule page at `/manage/schedule` contains the company schedule, attendance configuration and reminders. It requires `attendance.configure`, has its own sidebar item and replaces the old scheduling placeholder. Attendance has no settings shortcut. The old `/manage/company-attendance` and `/manage/settings/attendance` paths have no route aliases.

Employee attendance detail uses validated `date=YYYY-MM-DD` state. Without a date, the server resolves today from the company schedule timezone. Date controls include a Georgian calendar, previous/next day and today; the page shows one chronological sessions table with compact count/duration totals. Empty dates mean no recorded sessions, not absence. Overnight sessions remain on their original retained work date.
