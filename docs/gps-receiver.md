# GPS receiver

For the planned database, website, telemetry, tracking, and job-map geofencing
work, see [GPS implementation plan](gps-implementation-plan.md).

The GPS receiver is a standalone Node.js TCP worker in this repository. Run it in
its own Docker container on the VPS. It does not start from TanStack routes or
web application imports, and web releases do not own its listening port.

The worker records and decodes traffic in a private diagnostic journal. Optional
JT808 database mode also stores positions and uses the website device registry.

## Start from a full checkout

For the deployed VPS, use the [VPS layout and GPS release runbook](vps-deployment.md),
which uses the persistent `.env.gps` and a prebuilt image. The commands below
are for a first run from a full repository checkout. Ensure the chosen public
TCP port is free before starting the service.

```bash
cp docker/gps/gps.env.example docker/gps/gps.env
chmod 600 docker/gps/gps.env
openssl rand -hex 32
```

Edit `docker/gps/gps.env` using your preferred editor:

- Set `GPS_DEVICE_IDS` to the numeric ID from the tracker label/SMS. Multiple IDs
  are comma separated. Leading zeroes are preserved in recordings and normalized
  only for allowlist comparisons.
- Paste the generated random value into `GPS_AUTH_SECRET`. Keep this value stable
  across restarts because JT808 terminals may reuse their registration token.
- Set `GPS_REPLY=true` to enable replies for the allowed devices. Leave it `false`
  for passive capture. In `raw` mode no replies are ever generated.
- Start with `GPS_PROTOCOL=auto` and `GPS_PUBLIC_PORT=5505`.
- Set `GPS_UTC_OFFSET_MINUTES` according to the device's packet timestamps. `0`
  means UTC; `480` means UTC+8; `240` means UTC+4. Georgian UI language and VPS
  timezone do not establish the device timezone. Compare a received device time
  with receipt time before using it for business records.

```bash
docker compose --env-file docker/gps/gps.env -f compose.gps.yaml up -d --build gps
docker compose --env-file docker/gps/gps.env -f compose.gps.yaml logs -f --tail=50 gps
```

The independent Compose project is named `team-adwings-gps`; do not combine this
file with the web app's Compose files. This starts only the GPS container.
Open the chosen TCP port in the VPS provider firewall. Docker-published ports can
bypass ordinary UFW rules; enforce exposure through the provider firewall and
Docker-aware host firewall rules. UDP is intentionally not published or supported
by this worker. The observed device connection attempts are TCP.

The container runs as the non-root Node user with a read-only root filesystem,
dropped capabilities, resource limits, and a private persistent `/data` volume.
It contains compiled worker code and production dependencies.

## PostgreSQL and the website registry

1. Apply the app's migrations through the usual migration runner and deploy the
   web build. As an administrator or owner, open `/manage/gps` and add the JT808
   tracker using the numeric ID from its label or SMS. Matching normalizes
   leading zeroes in the incoming packet and the registered ID.
2. Give the receiver a private PostgreSQL connection. Use a dedicated database
   login with `CONNECT` to the app database, `USAGE` on its schema, `SELECT` on
   `gps_device`, `UPDATE (last_contact_at)` on `gps_device`, and `INSERT` plus
   `SELECT (device_id, fingerprint)` on `gps_position`. Diagnostics also need
   `SELECT`, `INSERT` and `UPDATE (received_at, error_code)` on
   `gps_device_diagnostic`.
   The receiver does not need access to employee data or the device audit table.
3. In the receiver's private configuration, set `GPS_DATABASE_URL` to the
   PostgreSQL URL, leave the existing `GPS_AUTH_SECRET` stable, and set
   `GPS_PROTOCOL=jt808` and `GPS_REPLY=true`. Keep the tracker and
   `GPS_PUBLIC_PORT` on the existing public port (15505 on the test VPS).
4. When PostgreSQL is on the existing Docker backend network, also set
   `GPS_DATABASE_NETWORK` to that network's actual name. Use its database service
   address and private port in the URL. Run the GPS project with the database
   override so network attachment survives restarts:

   ```bash
   docker compose --env-file docker/gps/gps.env -f compose.gps.yaml -f compose.gps.database.yaml up -d --build gps
   ```

   In the VPS deployment directory, use its private `.env.gps` path, transfer
   both Compose files, and use `--no-build` with the updated image already loaded.
   If the database is reachable over a separate private network, the override
   is unnecessary.

The registry controls admission on each supported frame in database mode. An
authenticated device's position is committed before the worker sends its reply.
When the database is unavailable, the connection closes without a success reply
so the tracker can retry. The rotating raw journal remains a diagnostic record.
Automatic backlog recovery and import of earlier captures are future work.

The map shows the latest valid fix for enabled devices in the current search
result page, with a visible fix time and separate last-contact time. The page
refreshes every 15 seconds while active. Select a device name to view its route
and paginated reports for up to seven calendar days in Tbilisi time. History
uses only reports saved in PostgreSQL. Additional telemetry and geofences are
tracked in the implementation plan.

The device detail page shows the most recent registration request, successful
authentication, heartbeat, and decode error for that device. Decode errors are
attributed only on authenticated connections. The panel refreshes every 15 seconds
while open. Deploy the diagnostics migration before restarting the database-mode
receiver with the new image. The panel starts filling with new traffic after
deployment. Earlier journal entries stay in the private journal.

## Switching decoders

Edit `GPS_PROTOCOL` in the private config and rerun the same `up -d` command:

| Mode    | Behavior                                                                                                                                 |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `auto`  | Choose a strategy from the opening delimiter, then validate the full frame. Pin the strategy to that TCP connection after a valid frame. |
| `jt808` | Accept only `7e ... 7e` JT/T 808 frames.                                                                                                 |
| `watch` | Accept only `[SG*...]`, `[3G*...]`, and equivalent standard Watch ASCII frames.                                                          |
| `h02`   | Accept only `*HQ,...#` H02 ASCII frames.                                                                                                 |
| `raw`   | Record incoming bytes without decoding or replying.                                                                                      |

Delimiters identify a candidate family, not a confirmed model or firmware. Check
the `deviceId`, `type`, `supported`, and `position` in the journal. A valid unknown
message type has `supported=false` and receives no blanket success reply.
Unknown/malformed frames are saved with a machine-readable error code.

The same port can test all these strategies. Changing the port does not change
the protocol spoken by a device. `GPS_PUBLIC_PORT` changes the host port only;
the container always listens on TCP 5505.

## Recordings and replay

Console output contains protocol/type summaries without coordinates, raw bytes,
or authentication tokens. Raw traffic and decoded positions are in
`/data/journal.jsonl` with rotated files `.1`, `.2`, etc. The default budget is
five files of at most 10 MiB each. Oldest data is automatically removed, so copy
interesting captures before they rotate. The volume survives container recreation.
Do not run `down -v` if you need the recordings.

Record types:

- `connect` / `disconnect`: connection UUID, receipt time, peer metadata, close
  reason, and unfinished byte count.
- `receive`: exact application bytes in lossless hex, before decoding.
- `frame`: complete frame hex, decoded message and optional normalized position,
  or a safe error code.
- `send`: intended response hex recorded before writing to the socket. This is
  not proof the remote device received it.
- `rejected`: stream/resource limits. Connections rejected before admission and
  data beyond traffic budgets are deliberately not recorded.

These are sensitive diagnostic captures. They include location/identifier data
and may contain protocol authentication tokens exchanged on the wire. File and
directory permissions are private; do not publish them, put them in `public/`,
or use them as general application audit logs. No server authentication secret
or SMS password is added to records. Writes use synchronous filesystem calls to
bound memory; they do not promise power-loss durability equivalent to a database
transaction/fsync. A storage error stops the receiver before sending more replies.

Copy a snapshot into the Git-ignored diagnostic directory:

```bash
mkdir -p .gps-data
docker compose --env-file docker/gps/gps.env -f compose.gps.yaml cp gps:/data/journal.jsonl ./.gps-data/tracker.jsonl
```

Replay inside the container (the container already has the persistent recordings):

```bash
docker compose --env-file docker/gps/gps.env -f compose.gps.yaml exec -e GPS_PROTOCOL=jt808 gps node scripts/gps-replay.js /data/journal.jsonl
```

Or replay a copied recording locally:

```bash
pnpm gps:replay ./.gps-data/tracker.jsonl
```

Set `GPS_PROTOCOL` in your shell to force another strategy. On PowerShell:

```powershell
$env:GPS_PROTOCOL = 'watch'
pnpm gps:replay ./.gps-data/tracker.jsonl
Remove-Item Env:GPS_PROTOCOL
```

Pass rotated files oldest first (for example `.4 .3 .2 .1 journal.jsonl`) to
reassemble frames crossing a rotation. Each connection has independent replay
state. A file starting halfway through a frame cannot reconstruct missing bytes.
Replay validates records, never opens a network listener, and never sends replies.
It prints sensitive decoded data and frame hex intentionally for local diagnosis.
An incomplete final JSONL line from a crash causes a safe replay failure; recover
a copy of the recording rather than modifying the original evidence.

## How the code fits together

```text
scripts/gps-receiver.ts
  -> TCP transport -> raw journal
  -> GpsSession (per-connection buffering and framing)
  -> ProtocolAdapter (JT808 / Watch / H02 strategy)
  -> validated decoded frame -> journal -> permitted replies
```

`ProtocolAdapter` is the strategy interface. Each factory creates connection-local
state; there is no shared current-device variable. A decoder receives a complete
frame and returns a normalized message plus proposed response buffers. The
transport owns sockets and storage and never interprets coordinate offsets.
`GpsJournal` is a small storage adapter; decoding does not depend on file I/O.

To add a protocol, implement an adapter and register its factory in
`gps-session.ts`, add its name to `protocolIds`, then add real packet fixtures and
stream tests. Current framing handles delimiter-terminated variants. A future
length-prefixed or binary Watch/H02 extension needs its own framing strategy;
do not force that format through ASCII delimiter framing.

Zod validates configuration, normalized decoded messages/positions, and replay
inputs. Protocol-specific checks validate checksums, BCD digits, headers,
advertised lengths, timestamp calendars, ASCII fields, and coordinates. Limits
bound connections, idle/lifetime duration, pending frames, traffic, reply buffers,
and storage. Partial frames and coalesced TCP chunks use the same session logic
in live reception and replay.

### Implemented protocol subset

- **JT808**: legacy six-byte BCD IDs and versioned 2019 ten-byte BCD IDs; escape
  validation, XOR checksum, exact body length; registration `0100 -> 8100`,
  authentication `0102 -> 8001`, heartbeat `0002 -> 8001`, standard location
  `0200 -> 8001`. Authentication uses a per-device HMAC-derived token. Heartbeat
  and position acknowledgments require authentication on that connection. Unknown,
  encrypted and subpackaged messages are retained but not acknowledged or
  reassembled. TK905-4G battery percentages from the BSJ `0xEB/0x00A8`
  extension are saved with authenticated position reports and displayed with
  the report timestamp. Missing or out-of-range percentages stay unknown.
  See the [Traccar TK905-4G implementation notes](https://github.com/traccar/traccar/issues/5234).
  Apply migration `0044_gps_position_battery.sql` before updating the GPS image.
  Standard position extensions also expose the odometer in kilometers
  (`0x01`), the device's reported cellular signal value (`0x30`), and
  satellite count (`0x31`) when included. Migration
  `0045_gps_telemetry_diagnostics.sql` adds these fields and the latest
  decode error reason. Signal is displayed as the raw value reported by the
  tracker.

- **Watch ASCII**: declared hex content length and optional four-digit index;
  `INIT`, `LK`, `TKQ`, `TKQ2`; standard `UD`, `UD2`, `AL`, `AL2`, `WT` location
  layout with decimal degrees, knots converted to km/h, and battery percentage.
  Unsupported layouts remain raw. Alarm replies use `AL`; location uploads do
  not receive invented acknowledgments.
- **H02 ASCII**: standard `*HQ` V1 location layout with degrees/minutes converted
  to decimal degrees, knots converted to km/h, and the V1 response with UTC
  `yyyyMMddHHmmss`. Other V-types and binary H02 are not guessed.

Legacy JT808 heartbeat frames may include one extra body byte. The receiver
accepts this shape after checksum and length validation and keeps the byte in
the journal without assigning a meaning to it. To verify the TK905-4G in the
field, watch for `0102` with `authenticated: true`, then supported `0002` frames
and continued `0200` position reports. The private journal records intended
`8001` replies, which can be correlated by connection and message serial.

### Verify a live heartbeat on the VPS

Keep the tracker powered on, connected to mobile data, and enabled in the
website registry. Leave sleep mode off. Let it sit stationary while watching
the receiver. A heartbeat is a JT808 keepalive (`0002`), so the tracker can
confirm contact without reporting a new position. Position reports (`0200`)
also show contact. Heartbeat timing depends on the firmware, so a test window
with only position reports leaves the heartbeat check pending.

```bash
docker logs --since 5m -f team-adwings-gps-gps-1
```

Look for `type:"0002"`, `supported:true`, `authenticated:true`, and
`allowed:true`. Confirm the last heartbeat under Connection Diagnostics
advances, then move the tracker and confirm another valid `0200` arrives.
Press Ctrl+C to stop following the logs.

To check the recorded success reply, run this on the VPS. It reads the active
private journal and prints only timestamps and a count for the selected
tracker. Run it soon after the heartbeat so the records are still in the
active journal.

```bash
docker exec -i team-adwings-gps-gps-1 node --input-type=module - 9590089273 <<'JS'
import { readFileSync } from 'node:fs'
import { unescapeJt808 } from './src/features/gps/server/protocols/jt808.js'
import { canonicalDeviceId } from './src/features/gps/server/protocols/protocol.js'

const target = canonicalDeviceId(process.argv[2])
const pending = new Map()
const lines = readFileSync('/data/journal.jsonl', 'utf8').split('\n')
lines.pop() // A concurrent write may leave the last line incomplete.
let matches = 0

for (const line of lines) {
  const record = JSON.parse(line)
  if (record.event === 'frame') {
    pending.delete(record.connection)
    const { decoded } = record
    if (decoded?.protocol !== 'jt808' || decoded.type !== '0002' ||
        !decoded.authenticated || canonicalDeviceId(decoded.deviceId) !== target) continue
    const bytes = unescapeJt808(Buffer.from(record.hex, 'hex'))
    const header = bytes.readUInt16BE(2) & 0x4000 ? 17 : 12
    pending.set(record.connection, { serial: bytes.readUInt16BE(header - 2), at: record.receivedAt })
  } else if (record.event === 'send' && pending.has(record.connection)) {
    const heartbeat = pending.get(record.connection)
    pending.delete(record.connection)
    const bytes = unescapeJt808(Buffer.from(record.hex, 'hex'))
    const header = bytes.readUInt16BE(2) & 0x4000 ? 17 : 12
    if (bytes.length === header + 6 && bytes.readUInt16BE(0) === 0x8001 &&
        bytes.readUInt16BE(header) === heartbeat.serial &&
        bytes.readUInt16BE(header + 2) === 0x0002 && bytes[header + 4] === 0) {
      matches++
      console.log({ heartbeatAt: heartbeat.at, replyRecordedAt: record.receivedAt })
    }
  }
}
console.log({ matchingSuccessReplies: matches })
JS
```

A matching journal entry confirms that the receiver recorded the intended
success reply. Continued reports on the live connection help verify the
tracker kept communicating after it.

Allowlisting a numeric device ID is a diagnostic filter, not strong identity
verification. Plain TCP protocols can be spoofed, and on-wire tokens can be
observed/replayed. Decoded records are untrusted telemetry even when allowlisted;
do not use them directly for attendance, authorization, or employee records.
Unknown devices remain visible in private raw captures for protocol diagnosis.

## Connection troubleshooting

If console output never shows frames, inspect packets independently:

```bash
sudo tcpdump -nn -i any -s 0 -X 'tcp port 5505'
```

Incoming SYN followed by repeated outgoing SYN-ACK without a final ACK means the
TCP connection has not completed. Application acknowledgments and decoder changes
cannot resolve that network-stage failure. Kernel-level incomplete handshakes
never appear as application `connect` records. Correlate power cycles or a fresh
destination port before attributing traffic to the GPS device.

## Verification and references

```bash
pnpm gps:build
pnpm exec vitest run src/features/gps/server
docker compose -f compose.gps.yaml config --quiet
```

Tests include published TK905-4G packets, all two-chunk splits of a registration,
coalesced/shared delimiters, escaping/checksums, authentication/allowlists, 2019
headers, malformed data, timezone conversion, rotation, and real loopback TCP.
These checks do not substitute for testing your device on the VPS.

Protocol references used for independent implementation, not a copied decoder:

- [Traccar protocol identification](https://www.traccar.org/identify-protocol/)
- [TK905-4G raw registration and position captures](https://www.traccar.org/forums/topic/port-protocol-winnes-tk905-4g/)
- [JT808 decoder reference](https://github.com/traccar/traccar/blob/master/src/main/java/org/traccar/protocol/Jt808ProtocolDecoder.java)
- [Watch decoder reference](https://github.com/traccar/traccar/blob/master/src/main/java/org/traccar/protocol/WatchProtocolDecoder.java)
- [H02 decoder reference](https://github.com/traccar/traccar/blob/master/src/main/java/org/traccar/protocol/H02ProtocolDecoder.java)
