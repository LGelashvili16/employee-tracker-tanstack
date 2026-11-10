# Authorization

Teamwork uses Better Auth 1.7.15 for session identity and its `better-auth/plugins/access` helpers for fixed RBAC roles. The existing `user.roles` column remains the only role source. It is a server-assigned, comma-separated field with `input: false`. Migration `0016_user_permission_overrides.sql` adds validated per-user allow/deny exceptions to the auth user.

## Roles and permission checks

`src/lib/authorization/permissions.ts` defines the permission vocabulary, Georgian role labels, and Better Auth role objects. Existing route permission identifiers remain stable. The `teamwork` access-control resource groups those identifiers without introducing a second permission vocabulary.

- `hasPermission(roles, permission)` checks one grant.
- `hasEveryPermission(roles, permissions)` requires all grants, including grants combined across roles. Empty requirements deny access.
- `hasAnyPermission(roles, permissions)` requires at least one grant. Empty requirements deny access.
- `assertPermission(actor, permission)` and `assertPermissions(actor, permissions)` throw a safe Georgian `AuthorizationError` on denial.

Employees have access to authenticated personal page shells but no privileged management permissions. The employee choices, in order, are თანამშრომელი (`employee`), წარმოების სპეციალისტი (`production_specialist`), წარმოების უფროსი (`supervisor`), გაყიდვების მენეჯერი (`sales_manager`), and HR (`hr_manager`). Production leads and HR have separate explicit grants. The stable `supervisor` identifier now represents the production lead. Admin and the protected bootstrap/recovery owner remain outside employee provisioning. HR managers have `manage.access` and `employees.manage` for employee creation, profile editing, activation/reset codes, and suspension/restoration. They also have `attendance.read.all` for company-wide reads and `attendance.configure` for schedules, reviewer assignments, and attendance limits. They do not receive platform access or role assignment. The `admin` role explicitly grants `manage.access`, `employees.read`, and `employees.manage` to retain account management in its new location, alongside company and policy configuration, locations, integrations, audit access and the explicit self-service `jobs.claim` action. It does not grant team attendance review, approvals, scheduling, job management, team operations, or reporting. An administrator who also manages operational work needs an additional management role; grants combine across roles. Owners retain every declared permission. Every operational actor still must satisfy resource policies and cannot approve their own records. Owner accounts remain protected from non-owner administrators. Administrators may manage other administrators; self-access changes are forbidden. Unknown permission identifiers do not become owner grants.

UI checks only determine presentation. Never use client roles or an actor supplied by a request as proof of authority.

## Entry points

HR managers, administrators, and owners have the explicit `attendance.read.all` permission. Together with `manage.access`, it permits read-only company-wide attendance and timesheet views through `/manage/attendance` and the selected employee's `/manage/attendance/$userId` detail tabs. These reads include all employee records without reviewer assignments. This grant does not confer attendance review, correction, self-approval, or company-wide write access. Management review endpoints retain their permission and assignment checks.

| Entry point                            | Protection                                                                                                      |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Page `beforeLoad`                      | `ensureSession()` or `requirePagePermission({ data: { permission } })`; anonymous navigation redirects to login |
| Self-service server function           | `.middleware([authenticatedMiddleware])`; anonymous direct calls return 401                                     |
| Restricted server function             | `.middleware([permissionMiddleware('attendance.read.team')])`                                                   |
| Several required permissions           | `.middleware([permissionsMiddleware('manage.access', 'attendance.read.team')])`                                 |
| HTTP server handler                    | `await requireActor()` or `await requirePermissions('attendance.read.team')` inside the handler                 |
| Feature policy at a transport boundary | `await enforcePolicy(() => service(...))` maps policy denials to 403 and preserves other errors                 |

Middleware lives in `src/lib/auth/auth.middleware.ts`. Server-only HTTP guards and error mapping live in `src/lib/authorization/guards.server.ts`. Services/policies throw `AuthorizationError`; they do not need HTTP response APIs. Add Zod validation before consuming request input. A read uses GET; mutations use POST.

`readActor()` always asks Better Auth for a current session with `disableCookieCache: true`; auth configuration also disables cookie caching. The current database-backed setup returns current role grants on subsequent requests and recognizes revoked sessions. It returns only the actor projection and marks responses private/no-store. Keep this guarantee if secondary storage or session caching is introduced later. In-flight writes still need transactional authorization/workflow checks when mutable conditions matter.

## Resource policies and ABAC

Attendance and timesheet reads use direct employee-to-reviewer assignments from `attendance_reviewer`, independently from role grants. Attendance review services recheck persisted access, lock assignments and subjects for writes, exclude self-review, and enforce session workflow rules. Company-wide read permissions remain separate from review or correction rights.

The application does not create teams or memberships. The unused team-scope policy scaffolds and the `teams.manage` permission have been removed. Migration `0017_retire_teams_permission.sql` removes that obsolete permission from stored allow/deny arrays while retaining all other exceptions. Existing `.team` permission identifiers remain stable internal names for assigned-employee operations; they do not require or create teams. Do not construct reviewer scope from request payloads, client caches, route context, or `sendContext`.

## Better Auth plugins and provisioning

Shared company pins are readable by every active account. Claiming pending work requires `jobs.claim`, explicitly granted to `production_specialist`, `admin` and `owner`. Production leads manage jobs and review attendance/timesheets only for their assigned employees; they cannot claim unassigned jobs without a separate grant. Ordinary employees retain personal attendance, schedule, leave and assigned-work access without management grants. HR manages employees, company attendance and leave, without platform or role administration. Sales managers (`sales_manager`, გაყიდვების მენეჯერი) have only `manage.access` and `jobs.manage`, without job claiming, employee administration, attendance review or platform access. Existing sales accounts and their permission exceptions are unchanged by the migration. Creating a non-employee role still requires `roles.manage`. Job policies reload current account/employment state and grants inside their transactions. See [jobs map workflow](jobs-map.md).

Migration `0026_consolidate_employee_roles.sql` retires `operations_manager` from role validation and all assignment controls. Existing accounts retain any other roles, or become `employee` when none remain. Their former grants move to individual allow exceptions, respecting existing denials and retaining invalid exceptions as fail-closed data. This avoids promoting former operations accounts to attendance reviewers. Affected sessions are revoked. Apply this migration together with the application release; administrators can subsequently assign the appropriate current role through the audited access workflow. Existing owner protection and bootstrap/recovery remain unchanged.

The [Admin plugin](https://better-auth.com/docs/plugins/admin) provides account-management endpoints in addition to roles. It is not required to use Better Auth's access-control evaluator. This application retains its existing role storage and audited provisioning service instead of exposing the plugin's separate account-management endpoints. Impersonation remains unavailable. There is no organization plugin or tenant model for this single-company application.

Invitation acceptance remains unavailable. Role assignment and individual allow/deny permissions are available through `/admin/access`. These are audited service workflows with server validation, explicit grant authority, no self-access changes, protected owner assignment, and session/cache invalidation. Bootstrap the first privileged account through a separately authorized operational process. Existing deployments still need the earlier `0001_user_roles.sql` migration if it has not yet been applied.

## Workspace navigation

`/dashboard` remains the shared personal workspace for every authenticated role. The shared sidebar shows personal and permitted management links. Company attendance, timesheets, and attendance rules appear in management alongside employees. A separate administration group contains working account-access controls, the role permission matrix, and clearly marked future-work pages for platform concerns. The `/admin/*` layout requires the server-validated `admin.access` permission, granted only to admins and owners. It has no landing page. Employee list/detail pages and their server functions require `manage.access` and `employees.manage`. Obsolete admin employee routes and their redirects have been deleted. The obsolete overview screen has been removed; see the [route audit](application-routes.md#route-audit-2026-11-09) for retained unfinished workflows.

Daily team operations belong under `/manage/*`, independently guarded by `manage.access` and each operation's permission. Administration configures the platform and workflow rules; it does not perform attendance approval or job assignment. Attendance exceptions are linked from the team-attendance section. Job creation opens in the shared jobs workspace; its service permission checks remain intact. Administrators retain explicit employee-management grants but no implicit attendance review or other operational grants; assign any additional management role through an authorized provisioning process rather than bypassing guards or granting new roles automatically.

## Account access administration

`/admin/access` lists every login identity, including accounts without employee profiles. The route and endpoints require `admin.access` and `users.manage`; authorization updates additionally require `roles.manage`. Server-side search, status filters, sorting, and pagination use validated URL state. `/admin/roles` shows the fixed role permission matrix; custom role definitions remain outside this implementation.

Per-user exceptions are stored in `user.permission_overrides` as validated `allow` and `deny` arrays. A denial takes precedence over a role grant. Invalid stored exceptions deny privileged operations. The trusted actor includes these exceptions; attendance, jobs, scheduling, navigation, and common guards use the same evaluation rules. Domain services reload current roles and exceptions from the database rather than retaining client projections. Record ownership, reviewer assignments, and self-review rules still apply to an allowed permission.

Access mutations serialize before taking actor/target locks, recheck active actor access, protect owner and self accounts, audit the action with its required reason, and revoke sessions and outstanding setup codes atomically. Role/exception edits compare the displayed snapshot with current persisted grants, rejecting stale edits. Only owners can grant the owner role or manage another owner. Platform administration does not remove the existing employee or workflow scope restrictions.

## Unified attendance workspace

The management attendance layout requires any of `attendance.read.all`, `attendance.read.team`, or `timesheets.review.team`, in addition to the inherited `manage.access` check. This is navigation protection only. Directory/detail services reload current access from persistence. Company readers see all authorized accounts; other readers require active employment and direct reviewer assignments. Assignment predicates also constrain search, totals, pagination and detail lookup, and exclude the reviewer's own account.

Employee detail returns independent attendance/hour capabilities. Hours-only readers receive subject metadata but no attendance sessions. The monthly-hours service falls back to assignment-scoped SQL for actors without company-wide read access. Review/correction controls use persisted assignment facts plus attendance read/review grants and exclude self-review. Mutation services still recheck active access, assignment locks, revisions and workflow state atomically. Retired management pages and their list server-function wrappers are removed.
