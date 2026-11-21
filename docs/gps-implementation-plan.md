# Team Adwings GPS implementation plan

Status: planned work, not implemented unless explicitly marked complete below.
Updated: 2026-11-21.

This document preserves the agreed next steps for permanent GPS storage, device
management, live tracking, telemetry inspection, and automatic geofence presence
updates for work marked on the jobs map. It is a delivery checklist, not a claim
that database tables, routes, or automatic status changes already exist.

For the existing worker, Docker commands, protocol selection, recordings, and
replay, see [GPS receiver](gps-receiver.md). All future product screens and
validation messages must follow the Georgian language requirements and
[UI design guidelines](ui-design-guidelines.md).

## Current implementation and hardware evidence

- [x] Independent Dockerized TCP receiver with interchangeable JT808, Watch, and
      H02 decoder strategies, plus automatic recognition and raw capture modes.
- [x] Per-connection stream buffering, validation, controlled replies, private
      rotating JSONL recordings, and offline replay.
- [x] Physical TK905-4G confirmed to register with JT808 (`0100`), authenticate
      (`0102`, `authenticated=true`), and send valid positions (`0200`, `valid=true`).
- [x] Add regression coverage for the legacy one-byte JT808 heartbeat inferred
      from the observed 16-byte packets rejected as `invalid_heartbeat`. The legacy
      decoder accepts exactly zero or one body byte after normal frame validation.
      The extra byte stays uninterpreted and remains available in the raw journal.
- [ ] Confirm the heartbeat fix on the TK905-4G. Replay a captured heartbeat,
      verify the reply is `8001` for `0002`, and check that the device continues
      reporting positions beyond an idle interval.

The first JT808 milestone adds PostgreSQL device and position storage and the
protected `/manage/gps` directory. The hardware still needs to be verified in
database mode. The current journal has bounded retention.

## 1. Permanent data storage

- [x] Add the JT808 device registry, position history, and registry audit tables
      with a generated migration. Verify against disposable PostgreSQL.
- [x] For the initial position flow, commit authenticated reports before sending
      success replies, deduplicate exact frames, and select the latest valid fix
      by device time. Preserve server receipt time separately.
- [ ] Add general message/connection persistence, durable backlog recovery, and
      historical journal import.

- [ ] Add feature-owned Drizzle schemas, constraints, indexes, reviewed migrations,
      and shared Zod contracts for the following records:

| Record     | Responsibility                                                                                                                                       |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Device     | Stable internal ID, website display name, protocol, exact reported identifier, normalized identity, enabled status, configuration, and last contact. |
| Connection | Device where identified, connection/disconnection times, peer metadata with restricted access, and disconnect reason.                                |
| Message    | Device, connection, message type, device timestamp, server receipt timestamp, decoder version, decoding outcome, and validated telemetry.            |
| Position   | Source message, device, coordinates, validity, speed, direction, altitude, and supported additional fields.                                          |

- [ ] Preserve both device and server timestamps as UTC instants, with an explicit
      device timestamp interpretation. Do not infer timezone from language or VPS time.
- [ ] Deduplicate retransmitted reports without discarding evidence of repeated
      delivery. A protocol sequence number alone is not globally unique across
      reconnects, wraparound, and devices.
- [ ] Persist accepted messages before acknowledging them. Define recovery during
      database outages using a bounded durable backlog; do not silently rotate away
      unprocessed records or report a successful database save before commit.
- [ ] Ensure delayed or out-of-order history cannot overwrite a newer current
      position. Keep the latest contact, latest report, and latest valid fix distinct.
- [ ] Use deterministic ordering, bounded queries, and appropriate device/time
      indexes for lists, histories, and exports when introduced.

## 2. Device registration and naming from the website

- [x] Let authorized users register a JT808 tracker by reported identifier,
      name and rename it, and enable or disable it from the website.
- [ ] Keep a stable internal device ID so renaming or updating configuration never
      detaches historical data. Prevent duplicate identities with database constraints.
- [ ] Preserve transmitted identifiers, including leading zeroes, and normalize
      only according to the protocol. A SIM change must not create a new device when
      the tracker's identity remains the same.
- [ ] Configure expected reporting interval and timestamp interpretation per
      device where needed. Record configuration changes in the application audit log.
- [x] Use the database registry for JT808 admission when database mode is enabled.
      Website changes take effect without a container restart.
- [ ] Provide a restricted discovery view for unknown devices with bounded
      retention. Do not silently create trusted devices or assign them to employees.
- [ ] Keep device identifiers separate from authentication credentials. A numeric
      identifier is not strong proof of device identity.

## 3. Additional telemetry and decoder support

- [ ] Keep frequently queried common fields structured and protocol-specific data
      in a validated JSONB object associated with its source message.
- [ ] Inspect real device extensions and implement supported battery, satellites,
      cellular signal, alarm flags, charging/power, mileage, and other reported data.
      Do not claim support for fields the device has not actually transmitted.
- [ ] Distinguish missing/unknown values from zero, false, or an empty string.
- [ ] Preserve unsupported messages and extension items in restricted diagnostic
      storage, with decoder version and clear errors, so they can be reprocessed.
- [ ] Separate raw diagnostic retention from normalized telemetry retention.
      Raw captures can include protocol credentials and must not become public or
      general-purpose audit logs. Keep secrets out of ordinary application logs.
- [ ] Extend fixture tests for each supported packet variant, including the
      observed heartbeat issue, checksums, lengths, time interpretation, and replies.

## 4. Protected GPS inspection area

- `/manage/gps`: device list and map.
- `/manage/gps/$deviceId`: device summary and recorded location history. Telemetry and message inspection are planned here.

- [ ] Add explicit permissions for location viewing, device management, and raw
      diagnostics. Enforce them on every server operation as well as route guards.
- [x] Build the searchable device list with TanStack Table, shared pagination,
      debounced search, server filtering/sorting, and validated URL search parameters.
- [ ] Show the device name, connection state, last contact, latest valid location,
      fix freshness, supported telemetry, and safe decoding error information.
- [ ] Provide paginated message inspection with type, timestamps, decoding outcome,
      and decoded fields. Restrict raw packet inspection separately.
- [x] Show the latest registration request, successful authentication, heartbeat,
      and decode error on the device details page. Store one timestamp per kind
      and attribute decode errors only after authentication on the same connection.
- [ ] Use existing Base UI/shadcn controls, badges, loading/error/empty states,
      Georgian copy, TanStack Form/Zod validation, and the app's feedback conventions.

## 5. Live map and position history

- [x] Reuse MapLibre for named markers on the current device result page and show
      the latest valid fix, its timestamp, and last contact. Poll in the first
      milestone before adding subscriptions and richer selection.
- [ ] Reuse the existing realtime infrastructure to notify authorized clients
      after database commits. Reconnects must refetch authoritative persisted state.
- [ ] Distinguish server connection, recent reports, valid fix, and stale location.
      A connected tracker can still have an old position or a decoder error.
- [ ] Prevent invalid fixes from replacing a valid current marker. Clearly label
      an old marker rather than presenting it as a fresh location.
- [x] Add up to seven calendar days of history (Tbilisi time), a route map, and
      paginated report details. Break the route at invalid fixes or reporting gaps
      longer than five minutes. The map uses up to the newest 2,000 reports in the
      selected range. All reports in that range are accessible in the table.

## 6. Automatic geofencing on the jobs map

Required behavior: when a tracker enters the configured area of an installation,
measurement, or other task marked on the jobs map, automatically show that the
device is at that location. When it leaves, automatically update its presence
status and record that it left. Re-entry must update the status again.

Use the existing jobs feature and its `installation`, `measurement`, and `other`
types. Do not introduce separate competing task or measurement modules.

### Areas and device presence

- [ ] Add a configurable geofence to a mapped job/task location. A point marker
      needs a defined area before entry/exit can be evaluated. Start with a center
      and configurable radius in meters; add polygon areas if required by actual use.
- [ ] Jobs without coordinates or an enabled area must show geofencing as
      unconfigured. Do not silently apply an arbitrary radius to every map pin.
- [ ] Define eligible devices/targets and their relationship explicitly. Track
      presence per device and area, rather than one global status on the device.
- [ ] Evaluate all relevant enabled areas. Overlapping areas can legitimately
      contain the same device, and several devices can be at the same task location.
- [ ] Keep automatic location presence distinct from job execution/completion,
      employee attendance, and timesheet approval. The automatic status requested
      here means the device is at or outside the location; it does not establish
      that a person started or completed the work.

### Automatic transitions

| Observation                                               | Required result                                                                                                     |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| No reliable fix or no configured area                     | Presence is unknown or unconfigured. Do not invent an arrival or departure.                                         |
| First reliable observation inside an area                 | Confirm presence at the location and record an initial observed entry; do not infer an earlier arrival time.        |
| First reliable observation outside an area                | Initialize outside status without falsely claiming that the device previously left it.                              |
| Confirmed outside-to-inside transition                    | Set presence to at location, record an entry event, and update the device/job map views automatically.              |
| Confirmed inside-to-outside transition                    | Set presence to outside, record an exit event with last departure time, and update the views automatically.         |
| Repeated reports in the same confirmed state              | Refresh evidence without duplicating entry/exit events.                                                             |
| Signal loss, invalid fix, disconnect, or decoding failure | Mark freshness as stale/unknown as appropriate; preserve the last confirmed presence and never manufacture an exit. |

- [ ] Store area configuration/version, current device-area presence, and immutable
      entry/exit events linked to the source position, device, and job/task. Include
      observed device time and receipt/processing times for traceability.
- [ ] Calculate presence server-side using validated positions and meter-based
      distances. Reuse PostgreSQL/PostGIS capabilities where appropriate; do not
      compare latitude/longitude degrees as if they were meters.
- [ ] Define boundary tolerance and confirmation/dwell rules to avoid status
      flicker caused by GPS drift. Make any confirmation delay explicit to the UI.
- [ ] Use suitable fresh, valid fixes. Reject implausible positions for presence
      decisions without discarding the original diagnostic evidence.
- [ ] Apply transitions atomically and idempotently, including concurrent reports.
      Duplicate or older packets must not reverse current presence or duplicate events.
- [ ] Historical replay/backfill may create explicitly historical results but must
      not trigger current live transitions, notifications, or overwrite newer state.
- [ ] Handle area edits, task relocation, device disablement, and removed areas
      explicitly. Re-evaluation caused by configuration is not a physical crossing;
      preserve its distinct cause and the historical area version.
- [ ] Publish committed transitions through the existing realtime mechanism so
      both GPS details and the jobs map update without a manual refresh.
- [ ] Show explicit Georgian presence labels and arrival/departure times. Preserve
      existing job kind colors and execution status; do not communicate presence by
      color alone or overwrite existing job workflow badges.

### Geofence verification

- [ ] Test initial inside/outside observations, entry, exit, and re-entry.
- [ ] Test GPS drift, boundary tolerance, confirmation rules, and inaccurate fixes.
- [ ] Test gaps, disconnects, stale data, and the observed heartbeat decoder errors
      without falsely recording a departure.
- [ ] Test overlapping areas, multiple devices, duplicate/concurrent/out-of-order
      reports, historical replay, and reconnects.
- [ ] Test area edits/removal, disabled devices, missing map coordinates, and all
      supported job kinds, including measurements and other tasks.
- [ ] Test persistence and authorization, and verify the rendered live map updates
      with clear Georgian state labels.

## 7. Permissions, retention, and production delivery

- [ ] Apply scoped reads to positions, counts, maps, messages, history, and realtime
      subscriptions. Raw packet access must remain more restricted than map access.
- [ ] Audit privileged device/geofence changes and record automatic transitions
      with their system cause and source evidence. Never audit credentials.
- [ ] Decide separate retention for positions, decoded telemetry, connections,
      geofence events, and raw diagnostics before adding cleanup jobs.
- [ ] Add the GPS image and required operational files to the existing deployment
      workflow, preserving independent worker releases and stable private configuration.
- [ ] Connect the worker to PostgreSQL privately with appropriate credentials and
      bounded failure handling. Do not expose the database as a public GPS endpoint.
- [ ] Test migrations, restart/reconnect recovery, database outages, backlog
      recovery, and rollback compatibility without deleting history or volumes.

## Delivery order and open decisions

1. Confirm the heartbeat fix with a real packet and a live device session.
2. Deliver database persistence, website registration/naming, and latest-position
   viewing as the first usable vertical slice.
3. Add message inspection, additional telemetry, and live updates. Location history
   and recent connection diagnostics are available. For verified device-reported
   battery percentages, use a proportional battery fill, a percentage label,
   green/yellow/red charge levels, and an explicit unknown state.
4. Deliver geofence configuration, persisted entry/exit transitions, and automatic
   presence updates on the jobs map, including measurements and other tasks.
5. Verify the complete flow with physical devices and production delivery/recovery.

Keep these choices explicit when implementing: permission grants; retention
periods; reporting/staleness thresholds; area radius and boundary/confirmation
defaults; device-to-task eligibility; and whether transition notifications are
needed. Notifications and any mapping from presence to job execution transitions
require separately defined product rules. These choices do not remove the required
automatic at-location and left-area behavior described above.
