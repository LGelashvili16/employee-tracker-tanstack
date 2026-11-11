# Announcement live updates

Teamwork uses a same-origin, authenticated SSE connection at `/api/events`. Announcements and complaints share this transport. General notification polling remains unchanged. See [shared live events](realtime.md) for the centralized coordinator, provider, and feature extension instructions.

Creators do not receive their own publication's unread dot, bell alert, live toast or login modal. Their publications remain visible and read in the directory. Legacy self-delivery rows are excluded from these indicators as well.

## How it works

1. The announcement service creates the publication, recipient snapshot and optional bell notifications in one transaction. It also calls `pg_notify` with the announcement identifier. PostgreSQL sends the signal only after commit. Failed transactions and idempotent publication retries do not broadcast a publication.
2. Each app process shares one dedicated PostgreSQL `LISTEN` connection among its browser streams. The connection is acquired lazily, reconnects after failure, and closes when the last browser disconnects. Multiple app processes receive the same committed signal without Redis.
3. Each browser stream revalidates its Better Auth session and current account/employment access. The announcements service returns only that actor's unread count and an eligible publication's identifier/title. Publishers receive state updates without a publication toast.
4. The browser updates the personal announcement navigation dot, invalidates announcement/bell queries, and shows a Georgian Sonner toast for 6 seconds at the bottom right. The ნახვა action opens the publication. Toast dismissal never changes read state.
5. Acknowledgement emits an actor-specific signal in its transaction. Reading in another tab/device updates that actor's dot and bell. Closing a login modal leaves the announcement unread until explicit reading.

Both delivery modes receive live dot updates. Non-modal publications also receive a six-second toast and inbox entry. Modal publications invalidate the server-owned modal queue immediately and suppress the publication toast, avoiding duplicate interruptions. Their bodies are shown one at a time, oldest first. Closing advances the queue for the current sign-in; a subsequent sign-in reminds unread dismissed items again. Explicit reading permanently removes the item from automatic delivery. Future employees can browse historical announcements without receiving an old unread-dot backlog.

## Files and ownership

| File                                                                   | Responsibility                                                                                                                                              |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/realtime/realtime.schemas.ts`                                 | Internal identifier-only wake-up contract.                                                                                                                  |
| `src/lib/realtime/postgres-events.server.ts`                           | Transactional signaling, shared database listener and reconnection.                                                                                         |
| `src/lib/realtime/event-stream.server.ts`                              | SSE framing, private headers, ordered processing, keepalive, limits and cleanup.                                                                            |
| `src/hooks/use-realtime-events.ts`                                     | Feature topic subscription through the shared RealtimeProvider.                                                                                             |
| `src/routes/api/events.ts`                                             | Thin HTTP route selecting the shared application stream coordinator.                                                                                        |
| `src/lib/auth/session.server.ts`                                       | Header-based actor reading for long-lived HTTP requests, without session refresh or cookie caching. Ordinary requests keep their previous refresh behavior. |
| `src/features/announcements/server/announcements-stream.server.ts`     | Feature-owned authorized announcement snapshots and live projections.                                                                                       |
| `src/features/announcements/server/announcements.service.server.ts`    | Publication/acknowledgement signals and authorized minimal stream state.                                                                                    |
| `src/features/announcements/server/announcements.repository.server.ts` | Recipient unread count and recipient-scoped publication lookup.                                                                                             |
| `src/features/announcements/announcements-realtime.schemas.ts`         | Browser payload validation.                                                                                                                                 |
| `src/features/announcements/hooks/use-announcement-realtime.ts`        | Dot state, cache invalidation, toast deduplication and navigation action.                                                                                   |
| `src/components/layout/app-shell.tsx`                                  | One subscription under the existing account-scoped QueryClient provider.                                                                                    |
| `src/components/layout/app-sidebar.tsx`                                | Boolean unread prop and Georgian accessible dot.                                                                                                            |

The shared transport imports no announcement UI or persistence. Notification streaming can later extend the topic schema and register its handler in src/server/realtime/events.server.ts, sharing the existing provider connection. No second browser connection or separate WebSocket server is needed.

## Recovery and performance

- Native EventSource reconnects with a 3-second retry hint. Every new connection receives current state without old toasts. PostgreSQL listener reconnection also sends snapshots, covering listener gaps.
- Live publication IDs deduplicate toasts within the mounted tab using a bounded 256-entry set. Separate tabs can each display a toast; cross-tab toast suppression is not implemented.
- Signals are wake-up hints, not a durable event queue. PostgreSQL recipient/read records are authoritative. Reconnect restores dot/list/bell state without replaying missed transient alerts. `Last-Event-ID` is intentionally not consumed for alert replay.
- One HTTP stream per open tab, one extra database connection per active app process. Authorization checks run before events and every 25 seconds while idle. Those checks still perform database reads; SSE does not mean zero idle database work.
- Per-stream work is serialized, capped at 32 queued tasks and a 64 KiB buffer. Slow clients disconnect and reconcile instead of accumulating memory. Abort/cancel releases timers and subscriptions.
- Session expiry/revocation ends an idle stream within 25 seconds or at its next event check. Streams do not renew sessions indefinitely. Transport failures reconnect silently without error-toast loops.
- Responses are private, uncached and `no-transform`. Existing `docker/Caddyfile` already flushes streaming responses. Production should use HTTP/2; HTTP/1.1 limits connections across tabs. Additional proxies must allow long-lived unbuffered `text/event-stream`.
- `LISTEN` needs a session-persistent PostgreSQL connection. Transaction-pooling proxies require a direct/session-pooling path for this listener.

No package, table or environment variable is added. Migration `0028_announcement_unread_index.sql` adds a partial index for recipient unread counts, including dismissed-but-unread announcements. The original pending-modal index remains in place.

## Tests

- `src/lib/realtime/event-stream.server.test.ts`: framing, caching, reconnect snapshots, revoked sessions, abort/cancel, already-aborted requests and bounded bursts.
- `src/lib/realtime/events-response.server.test.ts`: anonymous/cross-origin/client-selected identity rejection, recipient isolation, refreshed authorization and handler composition. Feature handler tests cover announcement projections; provider tests cover shared connection and subscription cleanup.
- `src/features/announcements/hooks/use-announcement-realtime.test.tsx`: dot updates, invalidation, no historical toasts, duplicate suppression, toast duration/position/action, malformed payloads and cleanup.
- `src/features/announcements/server/announcements.integration.test.ts`: real PostgreSQL commit/rollback delivery, retry deduplication, recipient projections, publisher suppression, employment denial, shared connection count and recovery after terminating only the test listener.
- Shell/sidebar tests cover integration and the accessible unread indicator.

Enable the isolated PostgreSQL suite with `RUN_ANNOUNCEMENTS_DB_TESTS=1`. It creates/removes a dedicated database and never publishes fixtures into the running application.
