# Shared live events

Teamwork uses one authenticated, same-origin SSE connection at `/api/events` per open application tab. PostgreSQL records remain authoritative; signals only tell connected clients to reconcile. Announcements, complaints, notifications and jobs are registered features. Recipient-only notification signals reconcile every active inbox query variant, replacing periodic polling. Reconnect snapshots never replay notification toasts.

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

## Notification delivery

Business services call `deliverNotifications(tx, input)` inside their domain transaction. Supply a stable eventKey, authorized recipient account IDs, actorId, Georgian title/body and an optional typed destination. Delivery deduplicates recipients and event identities, excludes the actor and inactive or suspended accounts, and returns only inserted identities. PostgreSQL publishes the bulk identifier-only signals on commit. The additive notification migration must be deployed before the new application.

Generic deliveries default to live toasts. Legacy complaint and announcement wrappers retain their foreign keys and disable generic toasts because feature hooks own display. Announcements preserve invited recipients. Read and unread acknowledgements signal inbox state without a toast subject. A live handler rechecks recipient ownership and current account state before exposing a minimal title/destination projection. Typed destinations compose allowlisted application routes, whose own policies recheck access. Leave notifications use a validated requestId list filter.

## Jobs and immediate business updates

Jobs broadcast identifier-only wakeups for committed creations, edits and status transitions. Its feature handler independently checks current workspace access and emits only actor-scoped invalidation. Reconnect snapshots reconcile list/detail caches and availability never shows a toast. Jobs list/detail polling is removed. Immediate persisted business notifications and their recipients are listed in [business notifications](notifications.md). An application composition hook refreshes open destination records from validated notification events and reconnect snapshots, while shared transport remains feature-independent.

Timed attendance tasks use the same transactional notification delivery as immediate workflows. Only recipient and notification identifiers reach PostgreSQL listeners. Quiet pending-review digests reconcile the bell without a toast.
