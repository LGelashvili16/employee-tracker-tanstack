# GPS receiver

The GPS receiver is a standalone Node.js TCP worker in this repository. Run it in
its own Docker container on the VPS. It does not start from TanStack routes or
web application imports, and web releases do not own its listening port.

This implementation records and decodes traffic to identify the TK905-4G variant.
Decoded positions are stored in the private diagnostic journal, not the company
database or map yet. Nothing marks attendance or assigns employees. Live hardware
compatibility still requires a successful connection and real device packets.

## Start on the VPS

Run from the repository root. Stop `nc` or any other listener on TCP 5505 first.

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
It contains compiled worker code and Zod, not the web application's dependencies.

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
  reassembled. Standard TLV extensions are checked for truncation but not decoded;
  this initial JT808 decoder does not expose vendor-specific battery fields.
- **Watch ASCII**: declared hex content length and optional four-digit index;
  `INIT`, `LK`, `TKQ`, `TKQ2`; standard `UD`, `UD2`, `AL`, `AL2`, `WT` location
  layout with decimal degrees, knots converted to km/h, and battery percentage.
  Unsupported layouts remain raw. Alarm replies use `AL`; location uploads do
  not receive invented acknowledgments.
- **H02 ASCII**: standard `*HQ` V1 location layout with degrees/minutes converted
  to decimal degrees, knots converted to km/h, and the V1 response with UTC
  `yyyyMMddHHmmss`. Other V-types and binary H02 are not guessed.

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
