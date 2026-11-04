# Application route and module foundation

This project serves one company. Payroll, finance, CRM, and sales functionality are excluded. All user-facing page content and document titles are Georgian.

## Implemented boundaries

- Thin TanStack route files compose pages from `src/features/<feature>/pages/`. Feature-owned content supplies both page headings and `head` metadata.
- `_authenticated/route.tsx` validates the current Better Auth session before rendering. Management/admin layouts and their restricted child routes check explicit server-side permissions.
- `src/lib/auth/auth.middleware.ts` supplies reusable session/permission middleware for future feature server functions. Attendance and timesheet resource policies are defined, but must be called by services using server-loaded scope when domain persistence is implemented. A page guard alone never authorizes record reads or writes. See [authorization](authorization.md) for helpers, execution boundaries, and remaining provisioning work.
- Shared shadcn application navigation filters links using the same permission vocabulary. Hidden links are presentation only; the receiving server checks access independently.
- Authentication identity is projected into a minimal actor DTO. Session tokens and provider credentials are never returned by application session functions.

## Current functionality

Login uses Better Auth with a TanStack Form/Zod form and accepts an employee code or legacy auth email. `/admin/users` provisions employee accounts, issues activation/reset codes, and suspends or restores existing accounts. `/auth/register` redeems an activation code; `/auth/reset-password` redeems a reset code. `/admin/settings/attendance` saves company schedules. `/dashboard` and `/attendance` share persisted self-service check-in/out, a live server-derived timer, today's schedule, weekly totals, and five recent attendance days. Check-in requires an active linked employee and a configured working day. Early check-out requires confirmation; unresolved previous-day sessions are explicitly marked. Other unimplemented pages remain honest shells. Approvals, corrections, breaks, notifications, and external delivery are not simulated.

Email delivery, email verification, and MFA are not configured. Account activation and recovery use expiring, single-use administrator-issued codes. Public signup remains disabled on the server. Initial owner creation and emergency owner recovery are operator-only commands, never public routes. See [employee accounts](employee-accounts.md).

## Database migration

Run `pnpm db:migrate` against the intended environment before signing in with the updated auth schema. Migration `0001_user_roles.sql` adds server-provisioned roles. Migration `0002_amused_red_hulk.sql` adds employee/account linkage, hashed challenges, audit rows, username/lifecycle fields, and auth throttling. The latter was applied to the verified local PostgreSQL 18 database. Other deployment targets still require migration. Existing auth IDs and passwords are preserved. Drizzle Kit reads the single schema index to avoid duplicate discovery.

Role grants are comma-separated validated identifiers provisioned only by trusted server/database administration. Better Auth marks the roles field `input: false`; browser signup/profile requests cannot grant themselves roles. Account creation allows fixed employee/management roles and rechecks role-assignment permission. Administrator/owner creation is excluded from this screen. Available roles remain employee, supervisor, operations manager, HR manager, system administrator, and company owner. Administrators configure the platform and manage accounts; operational management requires an additional management role. Owners retain all declared permissions. Resource scope and self-approval restrictions still apply. Employee records are now persisted for account ownership; other unimplemented domains have no speculative tables.

## Pages

| URL                               | Feature module     | Page                        | Access                                                      |
| --------------------------------- | ------------------ | --------------------------- | ----------------------------------------------------------- |
| `/auth/login`                     | `auth`             | შესვლა                      | Public; no private domain data                              |
| `/auth/register`                  | `auth`             | ანგარიშის გააქტიურება       | Public; valid single-use administrator-issued code required |
| `/auth/accept-invitation`         | `auth`             | მოწვევის მიღება             | Public; no private domain data                              |
| `/auth/forgot-password`           | `auth`             | პაროლის აღდგენა             | Public; no private domain data                              |
| `/auth/reset-password`            | `auth`             | ახალი პაროლი                | Public; no private domain data                              |
| `/auth/verify-email`              | `auth`             | ელფოსტის დადასტურება        | Public; no private domain data                              |
| `/auth/mfa`                       | `auth`             | დამატებითი დადასტურება      | Public; no private domain data                              |
| `/dashboard`                      | `dashboard`        | მთავარი გვერდი              | Authenticated account                                       |
| `/attendance`                     | `attendance`       | დასწრება                    | Authenticated account                                       |
| `/attendance/history`             | `attendance`       | დასწრების ისტორია           | Authenticated account                                       |
| `/attendance/corrections`         | `attendance`       | დროის შესწორებები           | Authenticated account                                       |
| `/timesheets`                     | `timesheets`       | სამუშაო საათები             | Authenticated account                                       |
| `/timesheets/$timesheetId`        | `timesheets`       | საათების დეტალები           | Authenticated account                                       |
| `/schedule`                       | `scheduling`       | ჩემი განრიგი                | Authenticated account                                       |
| `/jobs`                           | `jobs`             | ჩემი სამუშაოები             | Authenticated account                                       |
| `/jobs/$jobId`                    | `jobs`             | სამუშაოს დეტალები           | Authenticated account                                       |
| `/leave`                          | `leave`            | შვებულება და გაცდენა        | Authenticated account                                       |
| `/notifications`                  | `notifications`    | შეტყობინებები               | Authenticated account                                       |
| `/settings/profile`               | `account`          | ჩემი პროფილი                | Authenticated account                                       |
| `/settings/security`              | `account`          | ანგარიშის უსაფრთხოება       | Authenticated account                                       |
| `/manage`                         | `dashboard`        | მართვის მიმოხილვა           | `manage.access` plus the authenticated parent               |
| `/manage/attendance`              | `attendance`       | გუნდის დასწრება             | `attendance.read.team` plus the authenticated parent        |
| `/manage/attendance/exceptions`   | `attendance`       | დასწრების გამონაკლისები     | `attendance.review.team` plus the authenticated parent      |
| `/manage/timesheets`              | `timesheets`       | საათების განხილვა           | `timesheets.review.team` plus the authenticated parent      |
| `/manage/timesheets/$timesheetId` | `timesheets`       | საათების განხილვის დეტალები | `timesheets.review.team` plus the authenticated parent      |
| `/manage/schedule`                | `scheduling`       | განრიგის მართვა             | `schedule.manage` plus the authenticated parent             |
| `/manage/jobs`                    | `jobs`             | სამუშაოების მართვა          | `jobs.manage` plus the authenticated parent                 |
| `/manage/jobs/new`                | `jobs`             | ახალი სამუშაო               | `jobs.manage` plus the authenticated parent                 |
| `/manage/jobs/$jobId`             | `jobs`             | სამუშაოს მართვა             | `jobs.manage` plus the authenticated parent                 |
| `/manage/employees`               | `employees`        | თანამშრომლები               | `employees.read` plus the authenticated parent              |
| `/manage/employees/$employeeId`   | `employees`        | თანამშრომლის დეტალები       | `employees.read` plus the authenticated parent              |
| `/manage/teams`                   | `teams`            | გუნდები                     | `teams.manage` plus the authenticated parent                |
| `/manage/leave`                   | `leave`            | შვებულების განხილვა         | `leave.review` plus the authenticated parent                |
| `/manage/reports`                 | `reports`          | ანგარიშები                  | `reports.read` plus the authenticated parent                |
| `/admin/dashboard`                | `company-settings` | ადმინისტრირების მიმოხილვა   | `admin.access` plus the authenticated parent                |
| `/admin`                          | `company-settings` | ადმინისტრირება              | `admin.access` plus the authenticated parent                |
| `/admin/users`                    | `access`           | მომხმარებლები               | `users.manage` plus the authenticated parent                |
| `/admin/users/$userId`            | `access`           | მომხმარებლის ანგარიში       | `users.manage` plus the authenticated parent                |
| `/admin/invitations`              | `invitations`      | მოწვევები                   | `invitations.manage` plus the authenticated parent          |
| `/admin/roles`                    | `access`           | როლები და უფლებები          | `roles.manage` plus the authenticated parent                |
| `/admin/settings/company`         | `company-settings` | კომპანიის პარამეტრები       | `company.configure` plus the authenticated parent           |
| `/admin/settings/attendance`      | `attendance`       | დასწრების წესები            | `attendance.configure` plus the authenticated parent        |
| `/admin/settings/approvals`       | `approvals`        | დადასტურების წესები         | `approvals.configure` plus the authenticated parent         |
| `/admin/settings/leave`           | `leave`            | შვებულების წესები           | `leave.configure` plus the authenticated parent             |
| `/admin/settings/security`        | `access`           | უსაფრთხოების პოლიტიკა       | `security.configure` plus the authenticated parent          |
| `/admin/settings/notifications`   | `notifications`    | შეტყობინებების პარამეტრები  | `notifications.configure` plus the authenticated parent     |
| `/admin/locations`                | `locations`        | სამუშაო ადგილები            | `locations.manage` plus the authenticated parent            |
| `/admin/integrations`             | `integrations`     | ინტეგრაციები                | `integrations.manage` plus the authenticated parent         |
| `/admin/audit-log`                | `audit-log`        | მოქმედებების ჟურნალი        | `audit.read` plus the authenticated parent                  |

## Compatibility routes

- `/` redirects to login or the authenticated dashboard.
- The old starter `/about` page redirects to the application entry point.
- Better Auth retains its HTTP handler at `/api/auth/*`.

## Validation

Run `pnpm test`, `pnpm exec tsc --noEmit`, and `pnpm build`. Tests exercise role grants, denied direct permission checks, input validation, and attendance UI states. `RUN_ATTENDANCE_DB_TESTS=1 pnpm test src/features/attendance/server/attendance.integration.test.ts` runs isolated local PostgreSQL checks for employee scope, concurrent clock actions, idempotency, exact time calculations, schedule snapshots, and timezone transitions. Manager attendance scope and correction/approval workflows remain pending.

`/dashboard` is shared by all authenticated roles. `/admin` redirects to `/admin/users` after the admin permission check. One shared sidebar shows personal links, permission-scoped management links, and an Administration group at the bottom. Administration requires both `admin.access` and each destination's permission. Only the working Users and Attendance Rules pages are listed. Admin URLs use the same inset shell, breadcrumb header, and account menu; there is no workspace switch. Existing route and server guards remain independent from navigation visibility.

## Employee navigation

The personal navigation group contains dashboard, attendance, schedule, jobs, and leave, and stays available on admin pages. Attendance history, corrections, and timesheets are reachable through the attendance section navigation. Profile and security remain in the shared account popup; notifications use the header bell. Permission-scoped team and administration groups are available to authorized actors.

The team-management group contains operational overviews, team attendance, timesheet review, scheduling, jobs, employees, teams, leave review, and reports according to explicit grants. Attendance exceptions appear in team-attendance section navigation; job creation is a page action on the jobs screen. Both routes remain available and independently guarded. A platform-only administrator sees personal and administration navigation, with management links appearing only when additional permissions grant access. Account provisioning and daily operations share the same application navigation.

Removed the unimplemented onboarding shell and unused legacy dashboard employee/settings redirects. The protected canonical profile, employee-management, attendance, timesheet, and notification routes remain available.
