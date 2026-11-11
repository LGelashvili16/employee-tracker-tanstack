# Shared live events

Teamwork uses one authenticated, same-origin SSE connection at `/api/events` per open application tab. PostgreSQL records remain authoritative; signals only tell connected clients to reconcile. Announcements are currently the only registered feature. Notifications continue to poll until their workflow is explicitly migrated.

## Ownership

- `src/server/realtime/events.server.ts` composes the feature handlers used by the HTTP route. Register new feature handlers here instead of adding another endpoint.
- `src/lib/realtime/events-response.server.ts` validates request input and origin, authenticates the connection, refreshes the actor before each queued operation and heartbeat, filters recipient-specific signals, and dispatches by topic. It imports no business feature.
- `src/lib/realtime/event-stream.server.ts` owns ordered work, single or multiple event framing, keepalives, reconnect snapshots, slow-client limits, abort and cleanup.
- `src/lib/realtime/postgres-events.server.ts` owns transactional signals and one shared PostgreSQL listener per active app process.
- `src/lib/realtime/realtime.schemas.ts` defines the allowlisted topics and identifier-only database signals. Browser and server use the same topic names.
- `src/providers/realtime-provider.tsx` owns the browser connection. The authenticated shell mounts it keyed by actor ID so account changes also clear feature state and subscriptions. It stays outside the root document because anonymous pages must not open a private stream.
- `src/contexts/realtime-context.ts` defines the subscription contract; `src/hooks/use-realtime-events.ts` subscribes feature consumers without opening more connections.

## Adding a feature

1. Add its topic to `realtimeTopicSchema` when implementing the actual feature. Do not add placeholder handlers.
2. Implement a server-only feature handler satisfying `RealtimeHandler`. Both `snapshot(actor)` and `changed(actor, signal)` must independently enforce current resource permissions and return minimal safe projections, or null when there is nothing authorized to send. The central session check is not resource authorization.
3. Register the handler in `applicationEventsResponse`. Snapshots from all handlers are reconciled on initial connection and PostgreSQL listener reconnection. Signals reach only handlers with the matching topic.
4. Call `signalRealtime(tx, { topic, subjectId, recipientId })` from the owning business transaction. Signals contain identifiers, never private content. PostgreSQL publishes only after commit. Omit `recipientId` only when the feature must check multiple potential recipients.
5. Subscribe with `useRealtimeEvents(topic, callback)` inside the authenticated provider. Validate the unknown payload against a feature-owned Zod schema before updating state, invalidating actor-scoped TanStack Query caches, or showing a toast.
6. Test unauthorized access, recipient isolation, current permissions, transaction rollback, initial/reconnect reconciliation, malformed payloads, and subscription cleanup.

Keep notification events responsible for inbox/bell state and business-feature events responsible for their own records. New consumers share the existing connection. SSE does not deliver while the application is closed, persist alerts, or guarantee replay of transient events. Persist anything users must see later and reconcile on reconnect without historical toast replay.

## Operational behavior

Native EventSource reconnects with the existing three-second retry hint. Session checks run before queued events and every 25 seconds while idle; revoked sessions close the connection. Each stream retains its bounded queue and buffer. Preserve private uncached responses, unbuffered proxy delivery, and a session-persistent PostgreSQL connection for LISTEN. See [announcement live updates](announcements-realtime.md) for feature behavior and existing database integration coverage.
