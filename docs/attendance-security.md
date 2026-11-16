# Attendance security

Attendance uses Better Auth sessions and SimpleWebAuthn (`@simplewebauthn/server` 14.1.0 and `@simplewebauthn/browser` 14.0.0). Password sign-in is unchanged. WebAuthn is an additional check for an attendance action and never creates another login session.

## Controls and setup

- `/admin/settings/security` requires `security.configure`. It controls the extra passkey check, company attendance IP allowlist, and application IP blocklist. Changes use an automatic audit description and reject stale policy revisions. Passkey verification defaults to off for new policies; existing saved settings are preserved.
- Passkey verification and attendance IP allowlisting default to disabled. Deployment addresses must be configured explicitly. Browser approval is always required, including when the passkey check is disabled.
- `/settings/security` lets an employee request a browser registration and register a passkey. The clock screen also offers enrollment directly when extra verification is enabled and the current browser lacks a passkey. Selecting that action provisions a pending browser if needed, then starts native enrollment. Enrollment never clocks in/out. Registration starts pending, and registering a key on an already approved browser returns that browser to pending HR review.
- The clock setup prompt contains an informational Alert and an add-passkey action. For a revoked or rejected browser with an existing key, the action requests HR review again using the retained key instead of creating a duplicate. The existing reapplication cooldown and HR approval checks still apply.
- Browser requests and passkey enrollment use the account's attendance network rules too. When IP restrictions are enabled, complete enrollment from an allowed network.
- `/manage/devices` requires `attendance.devices.manage`. HR, administrators, and owners receive this explicit permission. The default view includes all device states, with URL-backed tabs for pending and active registrations and other statuses. Reviewers verify the employee through an independent channel, then approve or reject the specific registration. They can revoke an active browser. Decisions have no reason input and are audited with the actor, target, time, status change, and an automatic description. Self-review is prohibited. Rejected and revoked browsers can explicitly request review again after one minute.
- The first reviewer can sign in normally and approve another reviewer's registration. That reviewer can approve the first reviewer's browser. Unapproved attendance devices do not prevent access to account settings or authorized device review.
- Administrators can override an employee's attendance allowlist on their employee profile. Inheritance uses the company list; an explicit empty list denies attendance when IP restrictions are enabled. Global blocked IPs always win. Changing one's own individual network override is prohibited.
- Up to 20 pending or approved browsers per account are allowed. Revoke unused registrations before adding another. Previous registrations and their audit history are retained. Lists use server search, status filtering, sorting, and validated URL pagination.

Disabling the passkey switch changes the next clock request. It does not approve a pending browser, restore a revoked browser, remove IP restrictions, suspend an account, or erase credentials/history. Existing approved browsers remain usable while a different browser awaits review.

## Hosting and trustworthy IP addresses

Set `BETTER_AUTH_URL` to the application's stable canonical origin. Production passkeys require HTTPS. Local `http://localhost:3005` works for development. Credentials are scoped to the configured relying-party hostname; changing the hostname needs a registration/recovery plan.

By default, request IPs come only from the runtime's direct peer address. Client-supplied forwarded headers are ignored. Some Nitro deployments do not expose a peer address to Start; in that case the address is unknown. IP-restricted attendance denies unknown addresses.

When behind a controlled proxy, set `TEAMWORK_CLIENT_IP_HEADER=x-real-ip` or `TEAMWORK_CLIENT_IP_HEADER=cf-connecting-ip`. Only configure this after the proxy overwrites the chosen header and direct origin access is prevented. An environment switch cannot establish that network trust itself. `x-forwarded-for` is deliberately unsupported. Do not copy an incoming arbitrary header into the trusted header.

Enter exact public IPv4 or IPv6 addresses, one per line. CIDR ranges, hostnames, ports, and comma-separated forwarded chains are not individual IP entries. IPv6 and IPv4-mapped IPv6 addresses are normalized before comparison. Company devices behind NAT may share one public address. A VPN/proxy or remote access to an office computer can undermine location assumptions.

Blocked IPs are denied at the global Start request middleware, including authenticated application/server-function and Better Auth requests. Existing SSE connections recheck the blocklist before sending events and at their next heartbeat, at most 25 seconds later. If a blocklist exists and the address cannot be established, access fails closed. Policy saves prevent adding the administrator's current address to the global blocklist. Other reviewers behind the same public address can also be affected. Public assets served directly by a CDN/Nitro static handler are outside Start: configure corresponding edge restrictions if those must also be inaccessible. Never rely on public asset secrecy.

If a deployment changes address/proxy configuration and locks out access, a trusted database operator can remove the erroneous blocked address in `attendance_security_policy`, recording the maintenance reason through the operational change process. There is no hidden browser bypass or administrator URL exception.

## Action authorization and attribution

Every clock action checks the current active account, approved browser cookie, configured networks, and current passkey policy on the server. A random 256-bit persistent HttpOnly browser cookie is stored as a SHA-256 hash server-side, independently for each account using that browser. It has a one-year browser lifetime and matching server-side maximum registration age. Secure production cookies use the `__Host-` prefix. Clearing cookies or using another browser requires registration again. This is browser registration, not proof of a unique physical device. Synced passkeys may exist on multiple authenticators.

WebAuthn challenges expire after two minutes. They are bound to the current actor, login session, browser, operation kind, validated payload, target employee, and HR reason. Verification checks the expected origin, RP ID, signature, counter, and user verification. Challenge consumption, attendance changes, punch attribution, and required notifications share one database transaction. Competing actions serialize on the approved device and employee; existing attendance overlap, active-employment, schedule, nonworking-day confirmation, and stale-state protections remain in force.

Challenge creation is serialized and limited to 10 outstanding recent challenges per account per minute. Registration requests are deduplicated per account/browser; denied clock events are journaled with a maximum of 20 entries per actor per minute. Credentials, cookie values, and assertions are never written into audit details or returned by device-list reads.

`attendance_punch` records the attendance employee, subject account, actual acting account, in/out kind, employee/HR source, authoritative effective time, database recording time, acting IP, approved browser, credential reference, verification result, and HR reason. The clock-in and clock-out actors can differ. Corrections preserve these original punch facts and use the existing append-only before/after correction audit. Historical sessions without punch attribution are labeled as historical instead of inventing an actor. Automatic closures remain identified by `auto_closed_at` and display the system as the source when no human checkout punch exists.

## HR-assisted attendance

`attendance.clock.assist` is granted explicitly to HR, administrators, and owners. It allows acting for another active employee through their management attendance page. Self-assistance and client-supplied role claims are rejected. HR uses their own approved browser, applicable IP rules, and passkey when the extra check is enabled. The employee's broken/revoked browser is not needed and is not silently approved. A reason and explicit confirmation are required; the employee receives a notification.

Assisted actions record the server's current time. Restoring an earlier worked time remains a separate correction workflow, with its own permission, reason, original values, and audit history. Approval of a device never creates or backdates attendance. Global account suspension and blocked-IP restrictions remain independent.

## Verification

Migrations `0033_attendance_security` and `0034_attendance_security_constraints` preserve existing sessions and attendance. Apply them before running the changed server. Neither migration fabricates approvals or historical punch attribution.

Run `pnpm exec tsc --noEmit`, `pnpm test`, and `pnpm build`. Run the isolated PostgreSQL suites with:

```powershell
$env:RUN_ATTENDANCE_SECURITY_DB_TESTS='1'
$env:RUN_ATTENDANCE_DB_TESTS='1'
pnpm test src/features/attendance-security/server/attendance-security.integration.test.ts src/features/attendance/server/attendance.integration.test.ts
```

The security suite creates genuine ES256 registration and authentication responses and exercises the real SimpleWebAuthn verifier. It covers session/action binding, replay, missing verification, wrong origins, expiration, revocation, network rules, policy disabling, actor attribution, permission spoofing, and competing punches. Tests require local PostgreSQL and create/drop only randomly named test databases.
