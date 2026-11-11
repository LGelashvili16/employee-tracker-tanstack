# Employee complaints

Employees submit complaints at `/complaints`; HR and assigned supervisors review them at `/manage/complaints`. The validated `complaintId` search parameter opens a detail sheet and `activityPage` pages its shared conversation/history.

## Access and workflow

- Every active account may submit and read its own complaints. Identity comes from the session and current account/employment state is rechecked in persistence.
- HR has `complaints.review.all` and `complaints.read.confidential`. Supervisors have `complaints.review.assigned` and see only explicitly assigned ordinary complaints. Administrators have ordinary complaint review access through complaints.review.all; confidential access remains restricted to HR and owners. Owners retain their existing all-permissions policy.
- Employees do not choose visibility or recipients. New complaints use the server-owned ordinary workflow: HR, administrators and the owner can read them, and supervisors receive access only after explicit assignment. The create endpoint rejects client-provided visibility. Existing `hr_only` records remain restricted to the requester, HR and owner. No one may review their own complaint.
- Ordinary records are visible to HR, administrators, the owner and their assigned reviewer. Attendance reviewer assignments do not confer complaint access.
- Status transitions are new to in_review or closed, in_review to resolved or closed, and resolved/closed to in_review for reopening. Every transition and assignment requires an employee-visible explanation.
- Original topic, description, category and visibility are immutable. Replies remain available while the complaint is new or in review. Completed complaints must be reopened by an authorized reviewer before another reply.
- Append-only activities record creation, replies, assignment changes and status changes. There are no private internal notes, attachments, anonymous submissions, deletion, or external delivery in this version.

## Persistence and live updates

Migration `0029_employee_complaints.sql` adds complaint/activity tables, checks and list indexes, plus complaint destinations and per-activity deduplication for existing notifications. Client-generated submission keys prevent duplicate submissions/replies on retry. A reused key with changed content is rejected rather than silently accepting different content.

Services establish current authorization, own transactions, and coordinate repositories and notification delivery. Complaint row locks and revisions serialize replies, assignment and status changes. Stale reviewer forms retain their draft and require explicit reconciliation before saving.

Notifications use generic copy without complaint titles, descriptions or employee names. Recipients are chosen from current permissions and assignment, exclude the actor, and are persisted with the change. Opening a notification rechecks complaint access. Existing notification read controls remain independent of complaint status.

The feature registers the complaints topic on the shared SSE coordinator. PostgreSQL publishes an identifier-only signal after commit. Each browser receives only authorized projections and invalidates actor-scoped complaint and bell queries. Reassignment also sends the previous reviewer a recipient-only refresh hint to remove stale list/detail access. Reconnect snapshots reconcile data without historical toast replay. Notification polling remains in place for workflows not yet migrated to SSE. See [shared live events](realtime.md).

## Verification

Use the existing Vitest runner for `src/features/complaints`, the shared real-time tests and shell/navigation/notification tests. Set `RUN_COMPLAINTS_DB_TESTS=1` for isolated local PostgreSQL tests. They create a uniquely named test database, apply all versioned migrations, test privacy, retries, assignment, concurrent decisions, current permissions and rollback, then remove the database. They never create fixtures in the running application database.

Live recipient notifications produce a six-second generic Sonner toast with a complaint link. Reconnect snapshots restore the management unread dot without replaying toasts. The dot appears beside the complaint destination and its collapsed management group, and reflects unseen notifications for active (new or in_review) records the actor may currently review. Closed and resolved records do not keep the management dot lit; their unread inbox entries remain available. Reopening can restore the dot. Marking notifications seen or unseen emits an actor-specific SSE refresh, keeping dots in other tabs/devices in sync. Toast dismissal does not mark an entry read. Old publications are not replayed as live toasts.

The review sheet uses one composer: keep the current status to add a comment, or select a permitted transition to save the status and comment together. Closed/resolved complaints offer reopening through this same form. Employee detail has a single comment field while active. Reviewer assignment controls and redundant access/assignee metadata are omitted from the sheets; existing scoped assignments and history are preserved. Complaint dates use explicit Georgian month names, with Tbilisi-local date/time parts, including in the table and history.

A successful status change, reply or assignment acknowledges only the acting account's existing notifications for that complaint in the same transaction. Other recipients and other complaints remain unread. New replies restore unread state. Failed mutations roll back acknowledgement with the workflow. The committed SSE signal reconciles the actor's dot and inbox across devices.
