# Authorization

Teamwork uses Better Auth 1.7.15 for session identity and its `better-auth/plugins/access` helpers for fixed RBAC roles. The existing `user.roles` column remains the only role source. It is a server-assigned, comma-separated field with `input: false`. No new schema or migration is required for this change.

## Roles and permission checks

`src/lib/authorization/permissions.ts` defines the permission vocabulary, Georgian role labels, and Better Auth role objects. Existing route permission identifiers remain stable. The `teamwork` access-control resource groups those identifiers without introducing a second permission vocabulary.

- `hasPermission(roles, permission)` checks one grant.
- `hasEveryPermission(roles, permissions)` requires all grants, including grants combined across roles. Empty requirements deny access.
- `hasAnyPermission(roles, permissions)` requires at least one grant. Empty requirements deny access.
- `assertPermission(actor, permission)` and `assertPermissions(actor, permissions)` throw a safe Georgian `AuthorizationError` on denial.

Employees have access to authenticated personal page shells but no privileged management permissions. Supervisors, operations managers, and HR managers have separate explicit grants. The `admin` role grants platform administration only: account/access management, company and policy configuration, locations, integrations, and audit access. It does not grant team attendance, approvals, scheduling, jobs, employee/team operations, or reporting. An administrator who also performs operational work needs an additional management role; grants combine across roles. Owners retain every declared permission. Every operational actor still must satisfy resource policies and cannot approve their own records. Owner-only account protections remain in account services. Unknown permission identifiers do not become owner grants.

UI checks only determine presentation. Never use client roles or an actor supplied by a request as proof of authority.

## Entry points

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

`EmployeeScope` in `src/lib/authorization/resource-scope.ts` describes server-loaded employment linkage and managed team IDs. `assertActiveEmployee` verifies that this linkage belongs to the authenticated actor and that employment is active. Do not construct this context from request payloads, client caches, route context, or `sendContext`.

- Attendance policy: `src/features/attendance/server/attendance.policy.server.ts` requires active employment, the team-read permission, and a managed team matching the requested team.
- Timesheet policy: `src/features/timesheets/server/timesheets.policy.server.ts` requires active employment, review permission, managed-team scope, a submitted/unlocked record, and excludes the reviewer as the subject employee, owner, or submitter.

These are policy functions for the upcoming business services. Employee/team/timesheet persistence and approval workflows remain unimplemented. No fake scope or employee records are supplied, and disabled business controls remain disabled. When implementing persistence, load scope and records from trusted repositories, apply equivalent scope predicates to SQL lists/counts/exports before pagination, then call the policy from the service. Recheck mutable workflow and scope conditions atomically with writes and persist approval/audit changes together. A policy function alone does not prevent races.

## Better Auth plugins and provisioning

The [Admin plugin](https://better-auth.com/docs/plugins/admin) provides account-management endpoints in addition to roles. It is not required to use Better Auth's access-control evaluator. This foundation deliberately retains the existing role storage and does not enable account creation, impersonation, arbitrary role grants, or unaudited account mutations. There is no organization plugin or tenant model for this single-company application.

Role-assignment UI/API and invitation acceptance remain unavailable. Implement them as audited service workflows with server validation, explicit grant authority, no self-escalation, protected owner/admin assignment, and session/cache invalidation as appropriate. Bootstrap the first privileged account through a separately authorized operational process. Existing deployments still need the earlier `0001_user_roles.sql` migration if it has not yet been applied.

## Workspace navigation

`/dashboard` remains the shared personal workspace for every authenticated role. The normal sidebar shows personal and permitted management links, plus one administration shortcut for admins and owners. The admin sidebar shows only administration links and a return link to the normal workspace. `/admin/dashboard` is the separate administration overview; `/admin` redirects there after authorization. The `/admin/*` layout and dashboard independently require the server-validated `admin.access` permission, granted only to admins and owners. Administration cards distinguish working account management from unavailable settings and audit views.

Daily team operations belong under `/manage/*`, independently guarded by `manage.access` and each operation's permission. Administration configures the platform and workflow rules; it does not perform attendance approval or job assignment. Attendance exceptions are linked from the team-attendance section, and new jobs from the jobs page. Their URLs and server permission checks remain intact. Existing administrators with only `admin` lose the previous implicit management grants; assign any additional management role through an authorized provisioning process rather than bypassing guards or granting new roles automatically.
