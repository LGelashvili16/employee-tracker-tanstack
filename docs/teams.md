# Production teams

`/manage/teams` manages production crews. The server checks the explicit `teams.manage` permission, granted by default to production supervisors, administrators and owners. Sales managers, HR and specialists receive no team-management grant by default. Existing individual permission denials still apply.

A team has a name, active state, revision and zero or one leader. Members must be active employees with active accounts and an operational role: `production_specialist`, `employee`, `supervisor` or `sales_manager`. Accounts holding `hr_manager`, `admin` or `owner` are excluded even if they also hold an operational role. A leader is a member designation, not an account role or permission grant. Specialists can remain outside teams for solo work.

Each specialist has at most one current membership. Adding someone from another team requires explicit transfer confirmation. The server checks their expected previous team, ends that membership and creates the next membership atomically. Leadership does not transfer with the member. Leader changes, roster changes and renaming advance the team's revision. Stale writes fail rather than overwrite a newer change.

Only empty teams may be deactivated. Deactivation retains the team, ended memberships and immutable audit events. A new team can reuse an inactive team's name. Active names are unique after trimming and case normalization. Authorized managers can permanently delete a team after a confirmation. The transaction snapshots the full team, membership and event history into `team_deletion_audit`, then removes the live records and releases current members. Disabled teams can be restored when the name is available.

The directory uses server-side search, status filters, sorting and pagination. Search parameters, including the selected team's ID, are validated at both route and server boundaries. The member picker searches active specialists on the server and identifies their current team before transfer. The detail shows the latest 50 audit events; complete membership and event history remains persisted.

Team writes serialize through a transaction-scoped advisory lock. Partial unique indexes independently protect one current membership per specialist and one current leader per team. Current actor permissions and account/employment state are reread under locks. Mutations and their audit entries commit together.

Attendance reviewer assignments remain independent. This change does not alter current job claims, create GPS devices or introduce geofencing. Future job assignments must record actual participants rather than infer historical participation from today's roster.

Migrations: `0039_production_teams.sql` and `0040_team_deletion_audit.sql`. Database verification uses a disposable isolated local database:

```powershell
$env:RUN_TEAMS_DB_TESTS='1'
pnpm test src/features/teams/server/teams.integration.test.ts
```

## Saving a team

Creation and editing share one draft sheet. Users choose a name, specialists and an optional leader before saving. Each selected transfer identifies its source team and takes effect only on Save. The server validates the complete draft, the original team revision, current source memberships and specialist eligibility under the team-write lock. Name, membership, leadership, source-team revisions and audit events commit in one transaction. Any failure rolls back the entire operation. Cancel and sheet dismissal discard unsaved changes. There are no intermediate create, rename or membership mutation endpoints.

## Employee selection

The employee picker defaults to production specialists and allows selecting additional eligible operational roles through a checkbox group. HR and platform-administration roles are excluded in the query and the save policy. It immediately loads the first 20, then uses TanStack Query infinite queries and an intersection observer within the bounded list to request later pages on scroll. Search matches full name or username; the job-title filter uses the existing employee job-title field. Both filters run on the server after 300ms debounce and restart at page one. Already selected draft members stay selected across searches and page loads. The list retains loaded employees if a later page fails, provides a retry action, and includes a keyboard-accessible load-more fallback. No employee records are created to populate the interface.
