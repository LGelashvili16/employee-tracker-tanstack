# Application route and module foundation

This project serves one company. Payroll, finance, CRM, and sales functionality are excluded. All user-facing page content and document titles are Georgian.

## Implemented boundaries

- Thin TanStack route files compose pages from `src/features/<feature>/pages/`. Feature-owned content supplies both page headings and `head` metadata.
- `_authenticated/route.tsx` validates the current Better Auth session before rendering. Management/admin layouts and their restricted child routes check explicit server-side permissions.
- `src/lib/auth/auth.middleware.ts` supplies reusable session/permission middleware for future feature server functions. Resource-level team/assignment policies must be added when domain data is introduced; a page guard alone never authorizes record reads or writes.
- Shared shadcn application navigation filters links using the same permission vocabulary. Hidden links are presentation only; the receiving server checks access independently.
- Authentication identity is projected into a minimal actor DTO. Session tokens and provider credentials are never returned by application session functions.

## Current functionality

Login uses Better Auth with a TanStack Form/Zod form. Logout and the profile identity view use the existing account/session infrastructure. The remaining pages are explicit module/page shells, with Georgian availability notices. Clock controls on the dashboard and attendance page are disabled until the attendance persistence workflow exists. No clock punches, approvals, profile updates, invites, notifications, or settings writes are simulated.

Email delivery, invitation acceptance, account recovery, verification, and MFA are not configured by this foundation. Their pages do not claim to perform those operations. Public signup is disabled on the server until invitation-only provisioning is implemented. No public first-admin registration is provided.

## Database migration

Run `pnpm db:migrate` against the intended environment before signing in with the updated auth schema. The generated `drizzle/0001_user_roles.sql` adds only `user.roles`, defaulting to `employee`. This change has not been applied automatically. Existing auth tables are organized under `src/db/schema/auth/`, with explanation comments for their tables and columns. Drizzle Kit reads the single schema index to avoid duplicate discovery through compatibility exports.

Role grants are comma-separated validated identifiers provisioned only by trusted server/database administration. Better Auth marks the roles field `input: false`; browser signup/profile requests cannot grant themselves roles. There is no role assignment mutation in this scaffold. Available roles are employee, supervisor, operations manager, HR manager, system administrator, and company owner. System administration alone does not grant team attendance approval. No extra employee/domain tables are created before their workflows are implemented.

## Pages

| URL                               | Feature module     | Page                        | Access                                                  |
| --------------------------------- | ------------------ | --------------------------- | ------------------------------------------------------- |
| `/auth/login`                     | `auth`             | შესვლა                      | Public; no private domain data                          |
| `/auth/register`                  | `auth`             | ანგარიშის შექმნა            | Public; no private domain data                          |
| `/auth/accept-invitation`         | `auth`             | მოწვევის მიღება             | Public; no private domain data                          |
| `/auth/forgot-password`           | `auth`             | პაროლის აღდგენა             | Public; no private domain data                          |
| `/auth/reset-password`            | `auth`             | ახალი პაროლი                | Public; no private domain data                          |
| `/auth/verify-email`              | `auth`             | ელფოსტის დადასტურება        | Public; no private domain data                          |
| `/auth/mfa`                       | `auth`             | დამატებითი დადასტურება      | Public; no private domain data                          |
| `/dashboard`                      | `dashboard`        | მთავარი გვერდი              | Authenticated account                                   |
| `/attendance`                     | `attendance`       | დასწრება                    | Authenticated account                                   |
| `/attendance/history`             | `attendance`       | დასწრების ისტორია           | Authenticated account                                   |
| `/attendance/corrections`         | `attendance`       | დროის შესწორებები           | Authenticated account                                   |
| `/timesheets`                     | `timesheets`       | სამუშაო საათები             | Authenticated account                                   |
| `/timesheets/$timesheetId`        | `timesheets`       | საათების დეტალები           | Authenticated account                                   |
| `/schedule`                       | `scheduling`       | ჩემი განრიგი                | Authenticated account                                   |
| `/jobs`                           | `jobs`             | ჩემი სამუშაოები             | Authenticated account                                   |
| `/jobs/$jobId`                    | `jobs`             | სამუშაოს დეტალები           | Authenticated account                                   |
| `/leave`                          | `leave`            | შვებულება და გაცდენა        | Authenticated account                                   |
| `/notifications`                  | `notifications`    | შეტყობინებები               | Authenticated account                                   |
| `/settings/profile`               | `account`          | ჩემი პროფილი                | Authenticated account                                   |
| `/settings/security`              | `account`          | ანგარიშის უსაფრთხოება       | Authenticated account                                   |
| `/onboarding`                     | `onboarding`       | სამუშაო სივრცეში დაწყება    | Authenticated account                                   |
| `/manage`                         | `dashboard`        | მართვის მიმოხილვა           | `manage.access` plus the authenticated parent           |
| `/manage/attendance`              | `attendance`       | გუნდის დასწრება             | `attendance.read.team` plus the authenticated parent    |
| `/manage/attendance/exceptions`   | `attendance`       | დასწრების გამონაკლისები     | `attendance.review.team` plus the authenticated parent  |
| `/manage/timesheets`              | `timesheets`       | საათების განხილვა           | `timesheets.review.team` plus the authenticated parent  |
| `/manage/timesheets/$timesheetId` | `timesheets`       | საათების განხილვის დეტალები | `timesheets.review.team` plus the authenticated parent  |
| `/manage/schedule`                | `scheduling`       | განრიგის მართვა             | `schedule.manage` plus the authenticated parent         |
| `/manage/jobs`                    | `jobs`             | სამუშაოების მართვა          | `jobs.manage` plus the authenticated parent             |
| `/manage/jobs/new`                | `jobs`             | ახალი სამუშაო               | `jobs.manage` plus the authenticated parent             |
| `/manage/jobs/$jobId`             | `jobs`             | სამუშაოს მართვა             | `jobs.manage` plus the authenticated parent             |
| `/manage/employees`               | `employees`        | თანამშრომლები               | `employees.read` plus the authenticated parent          |
| `/manage/employees/$employeeId`   | `employees`        | თანამშრომლის დეტალები       | `employees.read` plus the authenticated parent          |
| `/manage/teams`                   | `teams`            | გუნდები                     | `teams.manage` plus the authenticated parent            |
| `/manage/leave`                   | `leave`            | შვებულების განხილვა         | `leave.review` plus the authenticated parent            |
| `/manage/reports`                 | `reports`          | ანგარიშები                  | `reports.read` plus the authenticated parent            |
| `/admin`                          | `company-settings` | ადმინისტრირება              | `admin.access` plus the authenticated parent            |
| `/admin/users`                    | `access`           | მომხმარებლები               | `users.manage` plus the authenticated parent            |
| `/admin/users/$userId`            | `access`           | მომხმარებლის ანგარიში       | `users.manage` plus the authenticated parent            |
| `/admin/invitations`              | `invitations`      | მოწვევები                   | `invitations.manage` plus the authenticated parent      |
| `/admin/roles`                    | `access`           | როლები და უფლებები          | `roles.manage` plus the authenticated parent            |
| `/admin/settings/company`         | `company-settings` | კომპანიის პარამეტრები       | `company.configure` plus the authenticated parent       |
| `/admin/settings/attendance`      | `attendance`       | დასწრების წესები            | `attendance.configure` plus the authenticated parent    |
| `/admin/settings/approvals`       | `approvals`        | დადასტურების წესები         | `approvals.configure` plus the authenticated parent     |
| `/admin/settings/leave`           | `leave`            | შვებულების წესები           | `leave.configure` plus the authenticated parent         |
| `/admin/settings/security`        | `access`           | უსაფრთხოების პოლიტიკა       | `security.configure` plus the authenticated parent      |
| `/admin/settings/notifications`   | `notifications`    | შეტყობინებების პარამეტრები  | `notifications.configure` plus the authenticated parent |
| `/admin/locations`                | `locations`        | სამუშაო ადგილები            | `locations.manage` plus the authenticated parent        |
| `/admin/integrations`             | `integrations`     | ინტეგრაციები                | `integrations.manage` plus the authenticated parent     |
| `/admin/audit-log`                | `audit-log`        | მოქმედებების ჟურნალი        | `audit.read` plus the authenticated parent              |

## Compatibility routes

- `/` redirects to login or the authenticated dashboard.
- `/dashboard/employees` redirects to `/manage/employees`, where management permission is enforced.
- `/dashboard/settings` redirects to `/settings/profile`.
- The old starter `/about` page redirects to the application entry point.
- Better Auth retains its HTTP handler at `/api/auth/*`.

## Validation

Run `pnpm test`, `pnpm exec tsc --noEmit`, and `pnpm build`. Tests exercise least-privilege role grants, denied direct permission checks, input validation, and disabled attendance controls. Do not interpret these tests as verification of future record-level ABAC or attendance persistence.
