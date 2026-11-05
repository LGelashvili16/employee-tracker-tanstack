# Employee accounts

Employees cannot create accounts themselves. An authorized administrator provisions
one company employee and one linked Better Auth identity in a transaction. The
employee then sets their own password using a one-time activation code.

## Initial owner

Apply migrations with `pnpm db:migrate`. On the server, from the workspace root, run:

```powershell
pnpm exec tsx scripts/bootstrap-owner.ts --code owner-code --name "Your name"
```

An optional `--email "name@example.com"` stores a real contact email. The command
refuses to create an owner if any owner or administrator already exists. It uses a
database advisory lock so two operators cannot bootstrap separate owners concurrently.

The command deliberately displays a new activation code once to the operator. Treat
this output as a credential; do not capture it in shared logs or commit it. Open
`/auth/register`, enter that code, and choose a password of at least 8 characters.
Then log in with the username and that password. No initial password is shared.

If the original owner code expires or the owner loses access, a database operator
can recover the existing owner rather than create a duplicate:

```powershell
pnpm exec tsx scripts/bootstrap-owner.ts --recover --code owner-code --reason "Verified owner identity in person"
```

This operator-only path revokes existing sessions and challenges, restores the same
owner identity, audits the reason, and displays an activation or reset code once.
It is never exposed by an HTTP route or server function.

## Administrator workflow

Open `/admin/users`. The route and every server function independently require
`admin.access` and `users.manage`. Choose an immutable username, full name,
optional email, job title, phone number, and role. Account creation records an automatic audit reason;
subsequent access changes still require an administrative reason. Management-role assignment
also requires `roles.manage`. This screen cannot create administrators or owners.

Usernames are normalized to lowercase. Existing `code` columns and request keys retain their names for compatibility.
Database constraints enforce unique codes, unique usernames, one employee record
per auth account, and one credential record per auth account. Do not assign a new
code to an existing person returning to work; restore their original record.
An administrator can still mistakenly enter the same person under another code;
the employee roster remains the source for identifying people, not email addresses.

The first activation code expires after 24 hours. It is shown only in the response
dialog and is not persisted in Query or browser storage. Close the dialog to discard
the UI copy. Deliver the code privately after verifying the employee's identity.

Codes are 12 characters from a 32-symbol alphabet without look-alikes (no I, O, 0, 1),
about 60 bits of randomness, displayed as `XXXX-XXXX-XXXX`. Employees may type them in
lowercase, with or without dashes or spaces. That is ample because a code is single-use,
stored only as a SHA-256 hash, expires within hours, and the redeem endpoints are
rate limited. The rules live in `access.rules.ts`.

- An invited employee can receive a replacement activation code.
- An active employee can receive a password-reset code that expires after 15 minutes.
- Issuing either code invalidates the previous code for that account.
- Suspending login access revokes sessions and outstanding codes and immediately
  makes application session guards deny access. It does not terminate employment.
- Restoring access reuses the same employee and auth identity. An account that has
  never activated still needs a new activation code. Inactive employment independently
  blocks login, activation, and password reset; account restoration cannot override it.
- An administrator cannot suspend or reset themselves through this administrative
  interface. Acting on an owner/admin account requires an owner. The operator
  recovery command is the emergency route for an inaccessible sole owner.

Privileged operations re-read and lock the acting account and target account.
Changes and their audit rows commit together. Audit rows contain actor, target,
action, reason, and timestamps; they contain neither codes nor passwords.

## Employee workflow

Use `/auth/register` to activate and `/auth/reset-password` to redeem a reset code.
These pages do not accept employee IDs, names, roles, or email to choose an identity.
The hashed code binds the request to the administrator-created account. Codes are
deleted atomically with the password update, and expiration and workflow status are
rechecked while the account is locked. Concurrent consumption can succeed only once.

Better Auth hashes passwords and remains the session and cookie authority. Custom
activation/reset endpoints use its native origin/CSRF middleware and shared
database-backed rate limits. Successful password resets revoke existing sessions.
The main auth handler keeps public signup, public identity updates, and
username-availability lookup disabled. Self-service password change remains under
Better Auth's existing credential checks.

The login page accepts a username or email through Better Auth's native sign-in methods.
New accounts with email use the normalized email as their auth identity as well as contact email.
Better Auth enforces email uniqueness; activation is still required before either sign-in method works.
Existing accounts retain their current auth email; older contact-only addresses are not silently promoted to login identities.
Email is not marked verified by provisioning. Email delivery is not configured; recovery still uses administrator-issued codes.

## Editing details after creation

Who may change what:

- **Administrators** (`admin.access` and `users.manage`) edit full name, email, job title and
  phone from the row menu on `/admin/users` ("მონაცემების რედაქტირება"). A reason is required
  and audited as `account.details_updated`. The username and role cannot be edited here, and the
  usual target rules apply (not yourself, owner required for admin/owner accounts).
- **Employees** edit only their own phone number on `/settings/profile`. The subject is always
  the signed-in account; no identifier is accepted from the browser.
- **Email** changes are administrator-only because email is not verified yet. For accounts that
  sign in with email, the login email follows the contact email, must stay unique, and cannot be
  removed. For email-less accounts the address is stored as contact information only.
- **Passwords** are changed by the employee on `/settings/security` (current password required,
  other devices are signed out, five attempts per minute). A forgotten password goes through
  `/auth/forgot-password`: the administrator issues a reset code and the employee redeems it on
  `/auth/reset-password`.

## Assigned working week

New employees inherit the effective company schedule by default. An administrator with
`attendance.configure` may instead assign a complete seven-day recurring week during creation.
Each day specifies start/end hours or explicitly marks a day off. The company timezone
remains authoritative, and an active company schedule must exist before a custom assignment.
The assignment and account are saved in one transaction, with the assigning actor retained.
For example, office staff can work Monday through Friday while another employee inherits Saturday work.
Existing employees without an assignment continue using company defaults. Editing an existing
assignment is not exposed by this creation flow. Open sessions retain their original expected times.

## Required auth email field

Better Auth still requires an email-shaped protocol identifier. Newly provisioned
employees without email receive a random `employee-<identifier>@accounts.teamwork.invalid`. The reserved `.invalid`
domain cannot deliver mail and is never presented as an employee contact address.
Real optional contact email lives on the employee record, and the application actor
projection exposes that value or null. Do not send verification or recovery email
to the internal identifier.

The private provisioning SDK instance has signup enabled only inside the authorized
database transaction. It is never mounted as an HTTP handler, never auto-signs in,
and generates a discarded random initial password. The committed account remains
invited and cannot authenticate until activation. The application auth instance
continues to reject public signup.

## Tests and migration

Migration `0002_amused_red_hulk.sql` adds employee records, hashed challenges, audit
rows, username/lifecycle fields, and Better Auth's rate-limit storage. Existing auth
IDs and passwords remain unchanged. Legacy accounts stay active and retain email
login; their activation timestamp is backfilled. Legacy accounts without an employee
record need an intentional reviewed linkage before employee-account actions can
target them. The current local database had no legacy accounts.

Run normal tests with `pnpm test`. To exercise real database constraints, concurrent
creation/activation, password resets, suspension, HTTP origin checks, and throttling:

```powershell
$env:RUN_ACCOUNT_DB_TESTS='1'
pnpm test src/features/access/server/access.integration.test.ts
```

The integration suite requires a local PostgreSQL connection with permission to
create databases. It creates a uniquely named test database, applies all migrations,
and drops that database afterward. It refuses remote database hosts and does not
provision test employees in the development employee roster.
